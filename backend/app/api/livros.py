from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.auth import get_current_user
from app.services.livro_service import LivroService
from app.services.pdf_processor import pdf_processor
from app.schemas.livro import (
    LivroCreate, LivroUpdate, LivroResponse, LivroListResponse,
    LivroStatsResponse, LivroWithAtos
)
from app.schemas import MessageResponse
from app.models.user import User
from app.core.logging import logger
import io

router = APIRouter(prefix="/livros", tags=["livros"])
livro_service = LivroService()


@router.post("/", response_model=LivroResponse, status_code=status.HTTP_201_CREATED)
async def create_livro(
    livro_data: LivroCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Criar um novo livro notarial."""
    try:
        livro = await livro_service.create(db, livro_data)
        logger.info(f"Livro criado: {livro.numero}/{livro.ano} por {current_user.email}")
        return livro
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/", response_model=LivroListResponse)
async def list_livros(
    tipo: Optional[str] = Query(None, description="Filtrar por tipo"),
    status: Optional[str] = Query(None, description="Filtrar por status"),
    ano: Optional[int] = Query(None, description="Filtrar por ano"),
    busca: Optional[str] = Query(None, description="Buscar por número, tipo ou observações"),
    page: int = Query(1, ge=1, description="Número da página"),
    size: int = Query(20, ge=1, le=100, description="Itens por página"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar livros com filtros e paginação."""
    filters = {}
    if tipo:
        filters["tipo"] = tipo
    if status:
        filters["status"] = status
    if ano:
        filters["ano"] = ano
    if busca:
        filters["busca"] = busca
    
    result = await livro_service.list_livros(
        db, filters=filters, page=page, size=size
    )
    
    return result


@router.get("/stats", response_model=LivroStatsResponse)
async def get_livro_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter estatísticas de livros."""
    stats = await livro_service.get_stats(db)
    return stats


@router.get("/{livro_id}", response_model=LivroResponse)
async def get_livro(
    livro_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter livro por ID."""
    livro = await livro_service.get_by_id(db, livro_id)
    if not livro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Livro não encontrado"
        )
    
    return livro


@router.get("/{livro_id}/with-atos", response_model=LivroWithAtos)
async def get_livro_with_atos(
    livro_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter livro com seus atos associados."""
    livro = await livro_service.get_with_atos(db, livro_id)
    if not livro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Livro não encontrado"
        )
    
    return livro


@router.get("/numero/{numero}/ano/{ano}", response_model=LivroResponse)
async def get_livro_by_numero_ano(
    numero: int,
    ano: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter livro por número e ano."""
    livro = await livro_service.get_by_numero_ano(db, numero, ano)
    if not livro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Livro não encontrado"
        )
    
    return livro


@router.put("/{livro_id}", response_model=LivroResponse)
async def update_livro(
    livro_id: int,
    livro_data: LivroUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualizar livro por ID."""
    try:
        updated_livro = await livro_service.update(db, livro_id, livro_data)
        if not updated_livro:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Livro não encontrado"
            )
        
        logger.info(f"Livro {livro_id} atualizado por {current_user.email}")
        return updated_livro
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{livro_id}", response_model=MessageResponse)
async def delete_livro(
    livro_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Excluir livro (soft delete)."""
    try:
        success = await livro_service.delete(db, livro_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Livro não encontrado"
            )
        
        logger.info(f"Livro {livro_id} excluído por {current_user.email}")
        return MessageResponse(message="Livro excluído com sucesso")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# Endpoints para upload e processamento de PDF

@router.post("/{livro_id}/upload-pdf")
async def upload_pdf(
    livro_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    process_immediately: bool = Query(True, description="Processar PDF imediatamente"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fazer upload de PDF para um livro e iniciar processamento."""
    try:
        result = await pdf_processor.upload_and_process_pdf(
            file=file,
            livro_id=livro_id,
            db=db,
            background_tasks=background_tasks,
            process_immediately=process_immediately
        )
        
        logger.info(f"PDF enviado para livro {livro_id} por {current_user.email}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no upload de PDF para livro {livro_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro no upload: {str(e)}"
        )


@router.post("/{livro_id}/reprocess-pdf")
async def reprocess_pdf(
    livro_id: int,
    background_tasks: BackgroundTasks,
    force: bool = Query(False, description="Forçar reprocessamento mesmo se já estiver processando"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reprocessar PDF de um livro."""
    try:
        result = await pdf_processor.reprocess_pdf(
            livro_id=livro_id,
            db=db,
            background_tasks=background_tasks,
            force=force
        )
        
        logger.info(f"Reprocessamento de PDF iniciado para livro {livro_id} por {current_user.email}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no reprocessamento de PDF para livro {livro_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro no reprocessamento: {str(e)}"
        )


@router.get("/{livro_id}/processing-status")
async def get_processing_status(
    livro_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter status de processamento de um livro."""
    try:
        status_info = await pdf_processor.get_processing_status(
            livro_id=livro_id,
            db=db
        )
        
        return status_info
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter status de processamento do livro {livro_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter status: {str(e)}"
        )


@router.get("/{livro_id}/download-pdf")
async def get_pdf_download_url(
    livro_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter URL para download do PDF."""
    try:
        download_info = await pdf_processor.download_pdf(
            livro_id=livro_id,
            db=db,
            generate_presigned=True
        )
        
        return download_info
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao gerar URL de download para livro {livro_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro no download: {str(e)}"
        )


@router.get("/{livro_id}/download-pdf/direct")
async def download_pdf_direct(
    livro_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download direto do PDF."""
    try:
        download_info = await pdf_processor.download_pdf(
            livro_id=livro_id,
            db=db,
            generate_presigned=False
        )
        
        file_content = download_info["file_content"]
        file_info = download_info["file_info"]
        
        # Criar stream de resposta
        file_stream = io.BytesIO(file_content)
        
        headers = {
            "Content-Disposition": f"attachment; filename={file_info['original_filename']}"
        }
        
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type=file_info["content_type"],
            headers=headers
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no download direto do PDF para livro {livro_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro no download: {str(e)}"
        )


# Endpoints para gerenciamento de status

@router.put("/{livro_id}/status")
async def update_processing_status(
    livro_id: int,
    new_status: str = Query(..., description="Novo status (pendente, processando, concluido, erro)"),
    error_message: Optional[str] = Query(None, description="Mensagem de erro (se status for 'erro')"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualizar status de processamento de um livro."""
    try:
        # Validar status
        valid_statuses = ["pendente", "processando", "concluido", "erro"]
        if new_status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Status inválido. Valores aceitos: {', '.join(valid_statuses)}"
            )
        
        success = await livro_service.update_processing_status(
            db, livro_id, new_status, error_message
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Livro não encontrado"
            )
        
        logger.info(f"Status do livro {livro_id} atualizado para '{new_status}' por {current_user.email}")
        
        return {
            "livro_id": livro_id,
            "new_status": new_status,
            "error_message": error_message,
            "updated_by": current_user.email,
            "message": "Status atualizado com sucesso"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar status do livro {livro_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar status: {str(e)}"
        )