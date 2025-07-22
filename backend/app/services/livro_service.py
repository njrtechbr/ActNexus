from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status, UploadFile
from app.models.livro import Livro, StatusLivro
from app.models.ato import Ato
from app.schemas.livro import LivroCreate, LivroUpdate, AtoProcessado
from app.core.logging import logger
from datetime import datetime
import uuid
import os


class LivroService:
    """Serviço para gerenciamento de livros notariais."""
    
    @staticmethod
    async def create_livro(
        session: AsyncSession,
        livro_data: LivroCreate
    ) -> Livro:
        """Cria um novo livro."""
        try:
            # Verificar se já existe livro com mesmo número e ano
            existing_livro = await LivroService.get_livro_by_numero_ano(
                session, livro_data.numero, livro_data.ano
            )
            if existing_livro:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Já existe um livro {livro_data.numero}/{livro_data.ano}"
                )
            
            # Criar novo livro
            livro = Livro(
                numero=livro_data.numero,
                ano=livro_data.ano,
                tipo=livro_data.tipo,
                status=livro_data.status or StatusLivro.ATIVO,
                data_abertura=livro_data.data_abertura or datetime.now(),
                data_encerramento=livro_data.data_encerramento,
                observacoes=livro_data.observacoes
            )
            
            session.add(livro)
            await session.commit()
            await session.refresh(livro)
            
            logger.info(f"Livro criado: {livro.identificacao}")
            
            return livro
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao criar livro: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def get_livro_by_id(session: AsyncSession, livro_id: int) -> Optional[Livro]:
        """Busca livro por ID."""
        try:
            result = await session.execute(
                select(Livro).where(Livro.id == livro_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Erro ao buscar livro por ID {livro_id}: {str(e)}")
            return None
    
    @staticmethod
    async def get_livro_by_numero_ano(
        session: AsyncSession, 
        numero: int, 
        ano: int
    ) -> Optional[Livro]:
        """Busca livro por número e ano."""
        try:
            result = await session.execute(
                select(Livro).where(
                    and_(Livro.numero == numero, Livro.ano == ano)
                )
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Erro ao buscar livro {numero}/{ano}: {str(e)}")
            return None
    
    @staticmethod
    async def get_livro_with_atos(
        session: AsyncSession, 
        livro_id: int
    ) -> Optional[Livro]:
        """Busca livro com seus atos."""
        try:
            result = await session.execute(
                select(Livro)
                .options(selectinload(Livro.atos))
                .where(Livro.id == livro_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Erro ao buscar livro com atos {livro_id}: {str(e)}")
            return None
    
    @staticmethod
    async def update_livro(
        session: AsyncSession,
        livro_id: int,
        livro_data: LivroUpdate
    ) -> Livro:
        """Atualiza dados do livro."""
        try:
            livro = await LivroService.get_livro_by_id(session, livro_id)
            if not livro:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Livro não encontrado"
                )
            
            # Verificar se número/ano já existe (se está sendo alterado)
            if (livro_data.numero and livro_data.numero != livro.numero) or \
               (livro_data.ano and livro_data.ano != livro.ano):
                numero = livro_data.numero or livro.numero
                ano = livro_data.ano or livro.ano
                
                existing_livro = await LivroService.get_livro_by_numero_ano(
                    session, numero, ano
                )
                if existing_livro and existing_livro.id != livro.id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Já existe um livro {numero}/{ano}"
                    )
            
            # Atualizar campos
            update_data = livro_data.model_dump(exclude_unset=True)
            livro.update_from_dict(update_data)
            
            await session.commit()
            await session.refresh(livro)
            
            logger.info(f"Livro atualizado: {livro.identificacao}")
            
            return livro
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao atualizar livro {livro_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def upload_pdf(
        session: AsyncSession,
        livro_id: int,
        pdf_file: UploadFile,
        upload_dir: str
    ) -> Livro:
        """Faz upload do PDF do livro."""
        try:
            livro = await LivroService.get_livro_by_id(session, livro_id)
            if not livro:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Livro não encontrado"
                )
            
            # Validar arquivo
            if not pdf_file.filename.lower().endswith('.pdf'):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Arquivo deve ser um PDF"
                )
            
            # Gerar nome único para o arquivo
            file_extension = os.path.splitext(pdf_file.filename)[1]
            unique_filename = f"livro_{livro.id}_{uuid.uuid4().hex}{file_extension}"
            file_path = os.path.join(upload_dir, unique_filename)
            
            # Criar diretório se não existir
            os.makedirs(upload_dir, exist_ok=True)
            
            # Salvar arquivo
            with open(file_path, "wb") as buffer:
                content = await pdf_file.read()
                buffer.write(content)
            
            # Atualizar livro
            livro.caminho_pdf = file_path
            livro.nome_arquivo_original = pdf_file.filename
            livro.tamanho_arquivo = len(content)
            livro.status_processamento = "pendente"
            
            await session.commit()
            await session.refresh(livro)
            
            logger.info(f"PDF carregado para livro {livro.identificacao}: {file_path}")
            
            return livro
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao fazer upload do PDF para livro {livro_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def update_processing_status(
        session: AsyncSession,
        livro_id: int,
        status: str,
        metadata: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None
    ) -> Livro:
        """Atualiza status de processamento do livro."""
        try:
            livro = await LivroService.get_livro_by_id(session, livro_id)
            if not livro:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Livro não encontrado"
                )
            
            livro.status_processamento = status
            
            if metadata:
                livro.metadados_pdf = metadata
            
            if error_message:
                if not livro.metadados_pdf:
                    livro.metadados_pdf = {}
                livro.metadados_pdf['error'] = error_message
            
            if status == "concluido":
                livro.data_processamento = datetime.now()
            
            await session.commit()
            await session.refresh(livro)
            
            logger.info(f"Status de processamento atualizado para {livro.identificacao}: {status}")
            
            return livro
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao atualizar status de processamento do livro {livro_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def add_atos_processados(
        session: AsyncSession,
        livro_id: int,
        atos_data: List[AtoProcessado]
    ) -> List[Ato]:
        """Adiciona atos processados ao livro."""
        try:
            livro = await LivroService.get_livro_by_id(session, livro_id)
            if not livro:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Livro não encontrado"
                )
            
            atos_criados = []
            
            for ato_data in atos_data:
                ato = Ato(
                    livro_id=livro.id,
                    numero_ato=ato_data.numero_ato,
                    tipo_ato=ato_data.tipo_ato,
                    data_ato=ato_data.data_ato,
                    conteudo_original=ato_data.conteudo_original,
                    conteudo_markdown=ato_data.conteudo_markdown,
                    partes=ato_data.partes,
                    dados_extraidos=ato_data.dados_extraidos,
                    status_processamento_ia="concluido"
                )
                
                session.add(ato)
                atos_criados.append(ato)
            
            await session.commit()
            
            # Refresh dos atos criados
            for ato in atos_criados:
                await session.refresh(ato)
            
            logger.info(f"Adicionados {len(atos_criados)} atos ao livro {livro.identificacao}")
            
            return atos_criados
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao adicionar atos processados ao livro {livro_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def list_livros(
        session: AsyncSession,
        skip: int = 0,
        limit: int = 20,
        tipo: Optional[str] = None,
        status: Optional[StatusLivro] = None,
        ano: Optional[int] = None,
        search: Optional[str] = None
    ) -> tuple[List[Livro], int]:
        """Lista livros com filtros e paginação."""
        try:
            # Construir query base
            query = select(Livro)
            
            # Aplicar filtros
            conditions = []
            
            if tipo:
                conditions.append(Livro.tipo == tipo)
            
            if status:
                conditions.append(Livro.status == status)
            
            if ano:
                conditions.append(Livro.ano == ano)
            
            if search:
                search_term = f"%{search}%"
                conditions.append(
                    or_(
                        Livro.numero.cast(func.text('TEXT')).ilike(search_term),
                        Livro.tipo.ilike(search_term),
                        Livro.observacoes.ilike(search_term)
                    )
                )
            
            if conditions:
                query = query.where(and_(*conditions))
            
            # Contar total
            count_query = select(func.count(Livro.id))
            if conditions:
                count_query = count_query.where(and_(*conditions))
            
            count_result = await session.execute(count_query)
            total = count_result.scalar()
            
            # Aplicar paginação e ordenação
            query = query.order_by(Livro.ano.desc(), Livro.numero.desc()).offset(skip).limit(limit)
            
            result = await session.execute(query)
            livros = result.scalars().all()
            
            return list(livros), total
            
        except Exception as e:
            logger.error(f"Erro ao listar livros: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def get_livros_stats(session: AsyncSession) -> Dict[str, Any]:
        """Obtém estatísticas dos livros."""
        try:
            # Total de livros
            total_result = await session.execute(select(func.count(Livro.id)))
            total_livros = total_result.scalar()
            
            # Livros por status
            status_result = await session.execute(
                select(Livro.status, func.count(Livro.id))
                .group_by(Livro.status)
            )
            livros_por_status = {status.value: count for status, count in status_result.all()}
            
            # Livros por tipo
            tipo_result = await session.execute(
                select(Livro.tipo, func.count(Livro.id))
                .group_by(Livro.tipo)
            )
            livros_por_tipo = dict(tipo_result.all())
            
            # Livros por ano
            ano_result = await session.execute(
                select(Livro.ano, func.count(Livro.id))
                .group_by(Livro.ano)
                .order_by(Livro.ano.desc())
                .limit(5)
            )
            livros_por_ano = dict(ano_result.all())
            
            # Livros com PDF
            pdf_result = await session.execute(
                select(func.count(Livro.id))
                .where(Livro.caminho_pdf.isnot(None))
            )
            livros_com_pdf = pdf_result.scalar()
            
            # Livros processados
            processados_result = await session.execute(
                select(func.count(Livro.id))
                .where(Livro.status_processamento == "concluido")
            )
            livros_processados = processados_result.scalar()
            
            return {
                "total_livros": total_livros,
                "livros_por_status": livros_por_status,
                "livros_por_tipo": livros_por_tipo,
                "livros_por_ano": livros_por_ano,
                "livros_com_pdf": livros_com_pdf,
                "livros_processados": livros_processados,
                "taxa_processamento": round(
                    (livros_processados / livros_com_pdf * 100) if livros_com_pdf > 0 else 0, 2
                )
            }
            
        except Exception as e:
            logger.error(f"Erro ao obter estatísticas de livros: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def delete_livro(
        session: AsyncSession,
        livro_id: int
    ) -> bool:
        """Exclui um livro (soft delete)."""
        try:
            livro = await LivroService.get_livro_by_id(session, livro_id)
            if not livro:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Livro não encontrado"
                )
            
            # Verificar se tem atos associados
            atos_result = await session.execute(
                select(func.count(Ato.id)).where(Ato.livro_id == livro_id)
            )
            total_atos = atos_result.scalar()
            
            if total_atos > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Não é possível excluir livro com {total_atos} atos associados"
                )
            
            # Marcar como inativo ao invés de deletar
            livro.status = StatusLivro.INATIVO
            
            await session.commit()
            
            logger.info(f"Livro marcado como inativo: {livro.identificacao}")
            
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao excluir livro {livro_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )