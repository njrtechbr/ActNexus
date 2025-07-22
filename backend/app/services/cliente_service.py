from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, text
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.cliente import (
    Cliente, Contato, Endereco, DocumentoCliente, 
    Observacao, Evento, CampoAdicionalCliente
)
from app.schemas.cliente import (
    ClienteCreate, ClienteUpdate, ContatoCreate, ContatoUpdate,
    EnderecoCreate, EnderecoUpdate, DocumentoClienteCreate, DocumentoClienteUpdate,
    ObservacaoCreate, ObservacaoUpdate, CampoAdicionalClienteCreate, CampoAdicionalClienteUpdate
)
from app.core.logging import logger
from datetime import datetime
import re


class ClienteService:
    """Serviço para gerenciamento de clientes."""
    
    @staticmethod
    def _validate_cpf(cpf: str) -> bool:
        """Valida CPF."""
        # Remove caracteres não numéricos
        cpf = re.sub(r'\D', '', cpf)
        
        # Verifica se tem 11 dígitos
        if len(cpf) != 11:
            return False
        
        # Verifica se todos os dígitos são iguais
        if cpf == cpf[0] * 11:
            return False
        
        # Calcula primeiro dígito verificador
        soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
        resto = soma % 11
        digito1 = 0 if resto < 2 else 11 - resto
        
        # Calcula segundo dígito verificador
        soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
        resto = soma % 11
        digito2 = 0 if resto < 2 else 11 - resto
        
        # Verifica se os dígitos calculados conferem
        return cpf[9] == str(digito1) and cpf[10] == str(digito2)
    
    @staticmethod
    def _validate_cnpj(cnpj: str) -> bool:
        """Valida CNPJ."""
        # Remove caracteres não numéricos
        cnpj = re.sub(r'\D', '', cnpj)
        
        # Verifica se tem 14 dígitos
        if len(cnpj) != 14:
            return False
        
        # Verifica se todos os dígitos são iguais
        if cnpj == cnpj[0] * 14:
            return False
        
        # Calcula primeiro dígito verificador
        pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        soma = sum(int(cnpj[i]) * pesos1[i] for i in range(12))
        resto = soma % 11
        digito1 = 0 if resto < 2 else 11 - resto
        
        # Calcula segundo dígito verificador
        pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        soma = sum(int(cnpj[i]) * pesos2[i] for i in range(13))
        resto = soma % 11
        digito2 = 0 if resto < 2 else 11 - resto
        
        # Verifica se os dígitos calculados conferem
        return cnpj[12] == str(digito1) and cnpj[13] == str(digito2)
    
    @staticmethod
    async def create_cliente(
        session: AsyncSession,
        cliente_data: ClienteCreate
    ) -> Cliente:
        """Cria um novo cliente."""
        try:
            # Validar CPF/CNPJ se fornecido
            if cliente_data.cpf_cnpj:
                cpf_cnpj_clean = re.sub(r'\D', '', cliente_data.cpf_cnpj)
                
                if cliente_data.tipo == "PF":
                    if not ClienteService._validate_cpf(cpf_cnpj_clean):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="CPF inválido"
                        )
                elif cliente_data.tipo == "PJ":
                    if not ClienteService._validate_cnpj(cpf_cnpj_clean):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="CNPJ inválido"
                        )
                
                # Verificar se CPF/CNPJ já existe
                existing_cliente = await ClienteService.get_cliente_by_cpf_cnpj(
                    session, cpf_cnpj_clean
                )
                if existing_cliente:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="CPF/CNPJ já cadastrado"
                    )
            
            # Criar novo cliente
            cliente = Cliente(
                nome=cliente_data.nome,
                cpf_cnpj=cliente_data.cpf_cnpj,
                tipo=cliente_data.tipo,
                data_nascimento=cliente_data.data_nascimento,
                estado_civil=cliente_data.estado_civil,
                profissao=cliente_data.profissao,
                nacionalidade=cliente_data.nacionalidade,
                naturalidade=cliente_data.naturalidade,
                nome_fantasia=cliente_data.nome_fantasia,
                razao_social=cliente_data.razao_social,
                inscricao_estadual=cliente_data.inscricao_estadual,
                inscricao_municipal=cliente_data.inscricao_municipal,
                atividade_principal=cliente_data.atividade_principal,
                data_abertura=cliente_data.data_abertura,
                status=cliente_data.status or "Ativo",
                observacoes_gerais=cliente_data.observacoes_gerais
            )
            
            session.add(cliente)
            await session.commit()
            await session.refresh(cliente)
            
            logger.info(f"Cliente criado: {cliente.nome_completo} (ID: {cliente.id})")
            
            return cliente
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao criar cliente: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def get_cliente_by_id(session: AsyncSession, cliente_id: int) -> Optional[Cliente]:
        """Busca cliente por ID."""
        try:
            result = await session.execute(
                select(Cliente).where(Cliente.id == cliente_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Erro ao buscar cliente por ID {cliente_id}: {str(e)}")
            return None
    
    @staticmethod
    async def get_cliente_by_cpf_cnpj(session: AsyncSession, cpf_cnpj: str) -> Optional[Cliente]:
        """Busca cliente por CPF/CNPJ."""
        try:
            # Remove caracteres não numéricos
            cpf_cnpj_clean = re.sub(r'\D', '', cpf_cnpj)
            
            result = await session.execute(
                select(Cliente).where(
                    func.regexp_replace(Cliente.cpf_cnpj, r'\D', '', 'g') == cpf_cnpj_clean
                )
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Erro ao buscar cliente por CPF/CNPJ {cpf_cnpj}: {str(e)}")
            return None
    
    @staticmethod
    async def get_cliente_with_details(
        session: AsyncSession, 
        cliente_id: int
    ) -> Optional[Cliente]:
        """Busca cliente com todos os detalhes relacionados."""
        try:
            result = await session.execute(
                select(Cliente)
                .options(
                    selectinload(Cliente.contatos),
                    selectinload(Cliente.enderecos),
                    selectinload(Cliente.documentos),
                    selectinload(Cliente.observacoes),
                    selectinload(Cliente.eventos),
                    selectinload(Cliente.campos_adicionais)
                )
                .where(Cliente.id == cliente_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Erro ao buscar cliente com detalhes {cliente_id}: {str(e)}")
            return None
    
    @staticmethod
    async def update_cliente(
        session: AsyncSession,
        cliente_id: int,
        cliente_data: ClienteUpdate
    ) -> Cliente:
        """Atualiza dados do cliente."""
        try:
            cliente = await ClienteService.get_cliente_by_id(session, cliente_id)
            if not cliente:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Cliente não encontrado"
                )
            
            # Validar CPF/CNPJ se está sendo alterado
            if cliente_data.cpf_cnpj and cliente_data.cpf_cnpj != cliente.cpf_cnpj:
                cpf_cnpj_clean = re.sub(r'\D', '', cliente_data.cpf_cnpj)
                
                if cliente_data.tipo == "PF":
                    if not ClienteService._validate_cpf(cpf_cnpj_clean):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="CPF inválido"
                        )
                elif cliente_data.tipo == "PJ":
                    if not ClienteService._validate_cnpj(cpf_cnpj_clean):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="CNPJ inválido"
                        )
                
                # Verificar se CPF/CNPJ já existe
                existing_cliente = await ClienteService.get_cliente_by_cpf_cnpj(
                    session, cpf_cnpj_clean
                )
                if existing_cliente and existing_cliente.id != cliente.id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="CPF/CNPJ já cadastrado"
                    )
            
            # Atualizar campos
            update_data = cliente_data.model_dump(exclude_unset=True)
            cliente.update_from_dict(update_data)
            
            await session.commit()
            await session.refresh(cliente)
            
            logger.info(f"Cliente atualizado: {cliente.nome_completo} (ID: {cliente.id})")
            
            return cliente
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao atualizar cliente {cliente_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def list_clientes(
        session: AsyncSession,
        skip: int = 0,
        limit: int = 20,
        tipo: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> tuple[List[Cliente], int]:
        """Lista clientes com filtros e paginação."""
        try:
            # Construir query base
            query = select(Cliente)
            
            # Aplicar filtros
            conditions = []
            
            if tipo:
                conditions.append(Cliente.tipo == tipo)
            
            if status:
                conditions.append(Cliente.status == status)
            
            if search:
                search_term = f"%{search}%"
                conditions.append(
                    or_(
                        Cliente.nome.ilike(search_term),
                        Cliente.nome_fantasia.ilike(search_term),
                        Cliente.razao_social.ilike(search_term),
                        Cliente.cpf_cnpj.ilike(search_term)
                    )
                )
            
            if conditions:
                query = query.where(and_(*conditions))
            
            # Contar total
            count_query = select(func.count(Cliente.id))
            if conditions:
                count_query = count_query.where(and_(*conditions))
            
            count_result = await session.execute(count_query)
            total = count_result.scalar()
            
            # Aplicar paginação e ordenação
            query = query.order_by(Cliente.nome).offset(skip).limit(limit)
            
            result = await session.execute(query)
            clientes = result.scalars().all()
            
            return list(clientes), total
            
        except Exception as e:
            logger.error(f"Erro ao listar clientes: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def search_clientes_by_names(
        session: AsyncSession,
        names: List[str]
    ) -> List[Cliente]:
        """Busca clientes por lista de nomes."""
        try:
            if not names:
                return []
            
            # Criar condições de busca para cada nome
            conditions = []
            for name in names:
                name_pattern = f"%{name.strip()}%"
                conditions.append(
                    or_(
                        Cliente.nome.ilike(name_pattern),
                        Cliente.nome_fantasia.ilike(name_pattern),
                        Cliente.razao_social.ilike(name_pattern)
                    )
                )
            
            query = select(Cliente).where(or_(*conditions))
            
            result = await session.execute(query)
            clientes = result.scalars().all()
            
            return list(clientes)
            
        except Exception as e:
            logger.error(f"Erro ao buscar clientes por nomes: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def get_clientes_stats(session: AsyncSession) -> Dict[str, Any]:
        """Obtém estatísticas dos clientes."""
        try:
            # Total de clientes
            total_result = await session.execute(select(func.count(Cliente.id)))
            total_clientes = total_result.scalar()
            
            # Clientes por tipo
            tipo_result = await session.execute(
                select(Cliente.tipo, func.count(Cliente.id))
                .group_by(Cliente.tipo)
            )
            clientes_por_tipo = dict(tipo_result.all())
            
            # Clientes por status
            status_result = await session.execute(
                select(Cliente.status, func.count(Cliente.id))
                .group_by(Cliente.status)
            )
            clientes_por_status = dict(status_result.all())
            
            # Clientes cadastrados por mês (últimos 12 meses)
            clientes_por_mes_result = await session.execute(
                text("""
                    SELECT 
                        DATE_TRUNC('month', created_at) as mes,
                        COUNT(*) as total
                    FROM clientes 
                    WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
                    GROUP BY DATE_TRUNC('month', created_at)
                    ORDER BY mes DESC
                """)
            )
            clientes_por_mes = {str(mes): total for mes, total in clientes_por_mes_result.all()}
            
            return {
                "total_clientes": total_clientes,
                "clientes_por_tipo": clientes_por_tipo,
                "clientes_por_status": clientes_por_status,
                "clientes_por_mes": clientes_por_mes
            }
            
        except Exception as e:
            logger.error(f"Erro ao obter estatísticas de clientes: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def add_evento(
        session: AsyncSession,
        cliente_id: int,
        tipo_evento: str,
        descricao: str
    ) -> Evento:
        """Adiciona um evento ao histórico do cliente."""
        try:
            cliente = await ClienteService.get_cliente_by_id(session, cliente_id)
            if not cliente:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Cliente não encontrado"
                )
            
            evento = Evento(
                cliente_id=cliente_id,
                tipo_evento=tipo_evento,
                descricao=descricao,
                data_evento=datetime.now()
            )
            
            session.add(evento)
            await session.commit()
            await session.refresh(evento)
            
            logger.info(f"Evento adicionado ao cliente {cliente.nome_completo}: {tipo_evento}")
            
            return evento
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao adicionar evento ao cliente {cliente_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )


class ContatoService:
    """Serviço para gerenciamento de contatos de clientes."""
    
    @staticmethod
    async def create_contato(
        session: AsyncSession,
        contato_data: ContatoCreate
    ) -> Contato:
        """Cria um novo contato."""
        try:
            # Verificar se o cliente existe
            cliente_result = await session.execute(
                select(Cliente).where(Cliente.id == contato_data.cliente_id)
            )
            cliente = cliente_result.scalar_one_or_none()
            if not cliente:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Cliente não encontrado"
                )
            
            contato = Contato(
                cliente_id=contato_data.cliente_id,
                tipo=contato_data.tipo,
                valor=contato_data.valor,
                principal=contato_data.principal or False,
                observacoes=contato_data.observacoes
            )
            
            session.add(contato)
            await session.commit()
            await session.refresh(contato)
            
            logger.info(f"Contato criado para cliente {cliente.nome_completo}: {contato.tipo} - {contato.valor}")
            
            return contato
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao criar contato: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def update_contato(
        session: AsyncSession,
        contato_id: int,
        contato_data: ContatoUpdate
    ) -> Contato:
        """Atualiza dados do contato."""
        try:
            result = await session.execute(
                select(Contato).where(Contato.id == contato_id)
            )
            contato = result.scalar_one_or_none()
            
            if not contato:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Contato não encontrado"
                )
            
            # Atualizar campos
            update_data = contato_data.model_dump(exclude_unset=True)
            contato.update_from_dict(update_data)
            
            await session.commit()
            await session.refresh(contato)
            
            logger.info(f"Contato atualizado: {contato.tipo} - {contato.valor}")
            
            return contato
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao atualizar contato {contato_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def delete_contato(session: AsyncSession, contato_id: int) -> bool:
        """Exclui um contato."""
        try:
            result = await session.execute(
                select(Contato).where(Contato.id == contato_id)
            )
            contato = result.scalar_one_or_none()
            
            if not contato:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Contato não encontrado"
                )
            
            await session.delete(contato)
            await session.commit()
            
            logger.info(f"Contato excluído: {contato.tipo} - {contato.valor}")
            
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao excluir contato {contato_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )


class EnderecoService:
    """Serviço para gerenciamento de endereços de clientes."""
    
    @staticmethod
    async def create_endereco(
        session: AsyncSession,
        endereco_data: EnderecoCreate
    ) -> Endereco:
        """Cria um novo endereço."""
        try:
            # Verificar se o cliente existe
            cliente_result = await session.execute(
                select(Cliente).where(Cliente.id == endereco_data.cliente_id)
            )
            cliente = cliente_result.scalar_one_or_none()
            if not cliente:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Cliente não encontrado"
                )
            
            endereco = Endereco(
                cliente_id=endereco_data.cliente_id,
                tipo=endereco_data.tipo,
                logradouro=endereco_data.logradouro,
                numero=endereco_data.numero,
                complemento=endereco_data.complemento,
                bairro=endereco_data.bairro,
                cidade=endereco_data.cidade,
                estado=endereco_data.estado,
                cep=endereco_data.cep,
                principal=endereco_data.principal or False,
                observacoes=endereco_data.observacoes
            )
            
            session.add(endereco)
            await session.commit()
            await session.refresh(endereco)
            
            logger.info(f"Endereço criado para cliente {cliente.nome_completo}: {endereco.endereco_completo}")
            
            return endereco
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao criar endereço: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def update_endereco(
        session: AsyncSession,
        endereco_id: int,
        endereco_data: EnderecoUpdate
    ) -> Endereco:
        """Atualiza dados do endereço."""
        try:
            result = await session.execute(
                select(Endereco).where(Endereco.id == endereco_id)
            )
            endereco = result.scalar_one_or_none()
            
            if not endereco:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Endereço não encontrado"
                )
            
            # Atualizar campos
            update_data = endereco_data.model_dump(exclude_unset=True)
            endereco.update_from_dict(update_data)
            
            await session.commit()
            await session.refresh(endereco)
            
            logger.info(f"Endereço atualizado: {endereco.endereco_completo}")
            
            return endereco
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao atualizar endereço {endereco_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def delete_endereco(session: AsyncSession, endereco_id: int) -> bool:
        """Exclui um endereço."""
        try:
            result = await session.execute(
                select(Endereco).where(Endereco.id == endereco_id)
            )
            endereco = result.scalar_one_or_none()
            
            if not endereco:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Endereço não encontrado"
                )
            
            await session.delete(endereco)
            await session.commit()
            
            logger.info(f"Endereço excluído: {endereco.endereco_completo}")
            
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao excluir endereço {endereco_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )