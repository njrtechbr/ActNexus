from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, text
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.ato import Ato, Averbacao
from app.models.livro import Livro
from app.schemas.ato import AtoCreate, AtoUpdate, AverbacaoCreate, AverbacaoUpdate
from app.core.logging import logger
from datetime import datetime


class AtoService:
    """Serviço para gerenciamento de atos notariais."""
    
    @staticmethod
    async def create_ato(
        session: AsyncSession,
        ato_data: AtoCreate
    ) -> Ato:
        """Cria um novo ato."""
        try:
            # Verificar se o livro existe
            livro_result = await session.execute(
                select(Livro).where(Livro.id == ato_data.livro_id)
            )
            livro = livro_result.scalar_one_or_none()
            if not livro:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Livro não encontrado"
                )
            
            # Verificar se já existe ato com mesmo número no livro
            existing_ato = await AtoService.get_ato_by_numero_livro(
                session, ato_data.numero_ato, ato_data.livro_id
            )
            if existing_ato:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Já existe ato {ato_data.numero_ato} no livro {livro.identificacao}"
                )
            
            # Criar novo ato
            ato = Ato(
                livro_id=ato_data.livro_id,
                numero_ato=ato_data.numero_ato,
                tipo_ato=ato_data.tipo_ato,
                data_ato=ato_data.data_ato,
                data_lavratura=ato_data.data_lavratura,
                conteudo_original=ato_data.conteudo_original,
                conteudo_markdown=ato_data.conteudo_markdown,
                partes=ato_data.partes or {},
                dados_extraidos=ato_data.dados_extraidos or {},
                observacoes=ato_data.observacoes
            )
            
            session.add(ato)
            await session.commit()
            await session.refresh(ato)
            
            logger.info(f"Ato criado: {ato.identificacao}")
            
            return ato
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao criar ato: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def get_ato_by_id(session: AsyncSession, ato_id: int) -> Optional[Ato]:
        """Busca ato por ID."""
        try:
            result = await session.execute(
                select(Ato)
                .options(selectinload(Ato.livro))
                .where(Ato.id == ato_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Erro ao buscar ato por ID {ato_id}: {str(e)}")
            return None
    
    @staticmethod
    async def get_ato_by_numero_livro(
        session: AsyncSession, 
        numero_ato: int, 
        livro_id: int
    ) -> Optional[Ato]:
        """Busca ato por número e livro."""
        try:
            result = await session.execute(
                select(Ato).where(
                    and_(Ato.numero_ato == numero_ato, Ato.livro_id == livro_id)
                )
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Erro ao buscar ato {numero_ato} do livro {livro_id}: {str(e)}")
            return None
    
    @staticmethod
    async def get_ato_with_averbacoes(
        session: AsyncSession, 
        ato_id: int
    ) -> Optional[Ato]:
        """Busca ato com suas averbações."""
        try:
            result = await session.execute(
                select(Ato)
                .options(
                    selectinload(Ato.livro),
                    selectinload(Ato.averbacoes)
                )
                .where(Ato.id == ato_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Erro ao buscar ato com averbações {ato_id}: {str(e)}")
            return None
    
    @staticmethod
    async def update_ato(
        session: AsyncSession,
        ato_id: int,
        ato_data: AtoUpdate
    ) -> Ato:
        """Atualiza dados do ato."""
        try:
            ato = await AtoService.get_ato_by_id(session, ato_id)
            if not ato:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Ato não encontrado"
                )
            
            # Verificar se número do ato já existe no livro (se está sendo alterado)
            if ato_data.numero_ato and ato_data.numero_ato != ato.numero_ato:
                existing_ato = await AtoService.get_ato_by_numero_livro(
                    session, ato_data.numero_ato, ato.livro_id
                )
                if existing_ato and existing_ato.id != ato.id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Já existe ato {ato_data.numero_ato} neste livro"
                    )
            
            # Atualizar campos
            update_data = ato_data.model_dump(exclude_unset=True)
            ato.update_from_dict(update_data)
            
            await session.commit()
            await session.refresh(ato)
            
            logger.info(f"Ato atualizado: {ato.identificacao}")
            
            return ato
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao atualizar ato {ato_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def update_processing_status(
        session: AsyncSession,
        ato_id: int,
        status: str,
        dados_extraidos: Optional[Dict[str, Any]] = None
    ) -> Ato:
        """Atualiza status de processamento IA do ato."""
        try:
            ato = await AtoService.get_ato_by_id(session, ato_id)
            if not ato:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Ato não encontrado"
                )
            
            ato.status_processamento_ia = status
            
            if dados_extraidos:
                ato.dados_extraidos = dados_extraidos
            
            await session.commit()
            await session.refresh(ato)
            
            logger.info(f"Status de processamento IA atualizado para {ato.identificacao}: {status}")
            
            return ato
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao atualizar status de processamento do ato {ato_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def list_atos(
        session: AsyncSession,
        skip: int = 0,
        limit: int = 20,
        livro_id: Optional[int] = None,
        tipo_ato: Optional[str] = None,
        data_inicio: Optional[datetime] = None,
        data_fim: Optional[datetime] = None,
        search: Optional[str] = None
    ) -> tuple[List[Ato], int]:
        """Lista atos com filtros e paginação."""
        try:
            # Construir query base
            query = select(Ato).options(selectinload(Ato.livro))
            
            # Aplicar filtros
            conditions = []
            
            if livro_id:
                conditions.append(Ato.livro_id == livro_id)
            
            if tipo_ato:
                conditions.append(Ato.tipo_ato == tipo_ato)
            
            if data_inicio:
                conditions.append(Ato.data_ato >= data_inicio)
            
            if data_fim:
                conditions.append(Ato.data_ato <= data_fim)
            
            if search:
                search_term = f"%{search}%"
                conditions.append(
                    or_(
                        Ato.numero_ato.cast(text('TEXT')).ilike(search_term),
                        Ato.tipo_ato.ilike(search_term),
                        Ato.conteudo_markdown.ilike(search_term),
                        Ato.observacoes.ilike(search_term)
                    )
                )
            
            if conditions:
                query = query.where(and_(*conditions))
            
            # Contar total
            count_query = select(func.count(Ato.id))
            if conditions:
                count_query = count_query.where(and_(*conditions))
            
            count_result = await session.execute(count_query)
            total = count_result.scalar()
            
            # Aplicar paginação e ordenação
            query = query.order_by(
                Ato.livro_id.desc(), 
                Ato.numero_ato.desc()
            ).offset(skip).limit(limit)
            
            result = await session.execute(query)
            atos = result.scalars().all()
            
            return list(atos), total
            
        except Exception as e:
            logger.error(f"Erro ao listar atos: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def search_atos_by_content(
        session: AsyncSession,
        search_term: str,
        skip: int = 0,
        limit: int = 20
    ) -> tuple[List[Ato], int]:
        """Busca atos por conteúdo usando busca textual."""
        try:
            search_pattern = f"%{search_term}%"
            
            # Query com busca textual
            query = (
                select(Ato)
                .options(selectinload(Ato.livro))
                .where(
                    or_(
                        Ato.conteudo_markdown.ilike(search_pattern),
                        Ato.conteudo_original.ilike(search_pattern)
                    )
                )
            )
            
            # Contar total
            count_query = (
                select(func.count(Ato.id))
                .where(
                    or_(
                        Ato.conteudo_markdown.ilike(search_pattern),
                        Ato.conteudo_original.ilike(search_pattern)
                    )
                )
            )
            
            count_result = await session.execute(count_query)
            total = count_result.scalar()
            
            # Aplicar paginação
            query = query.offset(skip).limit(limit)
            
            result = await session.execute(query)
            atos = result.scalars().all()
            
            return list(atos), total
            
        except Exception as e:
            logger.error(f"Erro ao buscar atos por conteúdo: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def get_atos_stats(session: AsyncSession) -> Dict[str, Any]:
        """Obtém estatísticas dos atos."""
        try:
            # Total de atos
            total_result = await session.execute(select(func.count(Ato.id)))
            total_atos = total_result.scalar()
            
            # Atos por tipo
            tipo_result = await session.execute(
                select(Ato.tipo_ato, func.count(Ato.id))
                .group_by(Ato.tipo_ato)
                .order_by(func.count(Ato.id).desc())
            )
            atos_por_tipo = dict(tipo_result.all())
            
            # Atos por status de processamento IA
            status_result = await session.execute(
                select(Ato.status_processamento_ia, func.count(Ato.id))
                .group_by(Ato.status_processamento_ia)
            )
            atos_por_status_ia = dict(status_result.all())
            
            # Atos por mês (últimos 12 meses)
            atos_por_mes_result = await session.execute(
                text("""
                    SELECT 
                        DATE_TRUNC('month', data_ato) as mes,
                        COUNT(*) as total
                    FROM atos 
                    WHERE data_ato >= CURRENT_DATE - INTERVAL '12 months'
                    GROUP BY DATE_TRUNC('month', data_ato)
                    ORDER BY mes DESC
                """)
            )
            atos_por_mes = {str(mes): total for mes, total in atos_por_mes_result.all()}
            
            # Total de averbações
            averbacoes_result = await session.execute(select(func.count(Averbacao.id)))
            total_averbacoes = averbacoes_result.scalar()
            
            return {
                "total_atos": total_atos,
                "atos_por_tipo": atos_por_tipo,
                "atos_por_status_ia": atos_por_status_ia,
                "atos_por_mes": atos_por_mes,
                "total_averbacoes": total_averbacoes,
                "media_averbacoes_por_ato": round(
                    (total_averbacoes / total_atos) if total_atos > 0 else 0, 2
                )
            }
            
        except Exception as e:
            logger.error(f"Erro ao obter estatísticas de atos: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )


class AverbacaoService:
    """Serviço para gerenciamento de averbações."""
    
    @staticmethod
    async def create_averbacao(
        session: AsyncSession,
        averbacao_data: AverbacaoCreate
    ) -> Averbacao:
        """Cria uma nova averbação."""
        try:
            # Verificar se o ato existe
            ato_result = await session.execute(
                select(Ato).where(Ato.id == averbacao_data.ato_id)
            )
            ato = ato_result.scalar_one_or_none()
            if not ato:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Ato não encontrado"
                )
            
            # Verificar se já existe averbação com mesmo número no ato
            existing_averbacao = await AverbacaoService.get_averbacao_by_numero_ato(
                session, averbacao_data.numero_averbacao, averbacao_data.ato_id
            )
            if existing_averbacao:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Já existe averbação {averbacao_data.numero_averbacao} no ato {ato.identificacao}"
                )
            
            # Criar nova averbação
            averbacao = Averbacao(
                ato_id=averbacao_data.ato_id,
                numero_averbacao=averbacao_data.numero_averbacao,
                tipo_averbacao=averbacao_data.tipo_averbacao,
                texto=averbacao_data.texto,
                data_averbacao=averbacao_data.data_averbacao,
                data_registro=averbacao_data.data_registro or datetime.now(),
                observacoes=averbacao_data.observacoes
            )
            
            session.add(averbacao)
            await session.commit()
            await session.refresh(averbacao)
            
            logger.info(f"Averbação criada: {averbacao.identificacao}")
            
            return averbacao
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao criar averbação: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def get_averbacao_by_id(session: AsyncSession, averbacao_id: int) -> Optional[Averbacao]:
        """Busca averbação por ID."""
        try:
            result = await session.execute(
                select(Averbacao)
                .options(selectinload(Averbacao.ato))
                .where(Averbacao.id == averbacao_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Erro ao buscar averbação por ID {averbacao_id}: {str(e)}")
            return None
    
    @staticmethod
    async def get_averbacao_by_numero_ato(
        session: AsyncSession, 
        numero_averbacao: int, 
        ato_id: int
    ) -> Optional[Averbacao]:
        """Busca averbação por número e ato."""
        try:
            result = await session.execute(
                select(Averbacao).where(
                    and_(
                        Averbacao.numero_averbacao == numero_averbacao, 
                        Averbacao.ato_id == ato_id
                    )
                )
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Erro ao buscar averbação {numero_averbacao} do ato {ato_id}: {str(e)}")
            return None
    
    @staticmethod
    async def update_averbacao(
        session: AsyncSession,
        averbacao_id: int,
        averbacao_data: AverbacaoUpdate
    ) -> Averbacao:
        """Atualiza dados da averbação."""
        try:
            averbacao = await AverbacaoService.get_averbacao_by_id(session, averbacao_id)
            if not averbacao:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Averbação não encontrada"
                )
            
            # Verificar se número da averbação já existe no ato (se está sendo alterado)
            if averbacao_data.numero_averbacao and averbacao_data.numero_averbacao != averbacao.numero_averbacao:
                existing_averbacao = await AverbacaoService.get_averbacao_by_numero_ato(
                    session, averbacao_data.numero_averbacao, averbacao.ato_id
                )
                if existing_averbacao and existing_averbacao.id != averbacao.id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Já existe averbação {averbacao_data.numero_averbacao} neste ato"
                    )
            
            # Atualizar campos
            update_data = averbacao_data.model_dump(exclude_unset=True)
            averbacao.update_from_dict(update_data)
            
            await session.commit()
            await session.refresh(averbacao)
            
            logger.info(f"Averbação atualizada: {averbacao.identificacao}")
            
            return averbacao
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao atualizar averbação {averbacao_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def list_averbacoes_by_ato(
        session: AsyncSession,
        ato_id: int,
        skip: int = 0,
        limit: int = 20
    ) -> tuple[List[Averbacao], int]:
        """Lista averbações de um ato."""
        try:
            # Construir query
            query = (
                select(Averbacao)
                .options(selectinload(Averbacao.ato))
                .where(Averbacao.ato_id == ato_id)
                .order_by(Averbacao.numero_averbacao)
            )
            
            # Contar total
            count_result = await session.execute(
                select(func.count(Averbacao.id)).where(Averbacao.ato_id == ato_id)
            )
            total = count_result.scalar()
            
            # Aplicar paginação
            query = query.offset(skip).limit(limit)
            
            result = await session.execute(query)
            averbacoes = result.scalars().all()
            
            return list(averbacoes), total
            
        except Exception as e:
            logger.error(f"Erro ao listar averbações do ato {ato_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def delete_averbacao(
        session: AsyncSession,
        averbacao_id: int
    ) -> bool:
        """Exclui uma averbação."""
        try:
            averbacao = await AverbacaoService.get_averbacao_by_id(session, averbacao_id)
            if not averbacao:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Averbação não encontrada"
                )
            
            await session.delete(averbacao)
            await session.commit()
            
            logger.info(f"Averbação excluída: {averbacao.identificacao}")
            
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao excluir averbação {averbacao_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )