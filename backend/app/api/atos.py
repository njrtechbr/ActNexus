from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.auth import get_current_user
from app.services.ato_service import AtoService, AverbacaoService
from app.services.langflow_service import langflow_service
from app.schemas.ato import (
    AtoCreate, AtoUpdate, AtoResponse, AtoListResponse,
    AtoWithAverbacoes, AtoSearchRequest, ExtractActDetailsRequest,
    ExtractActDetailsResponse, AtoComLivro, AdicionarAverbacaoRequest,
    AdicionarAverbacaoResponse, AverbacaoCreate, AverbacaoUpdate,
    AverbacaoResponse
)
from app.schemas import MessageResponse
from app.models.user import User
from app.core.logging import logger
from datetime import datetime, date

router = APIRouter(prefix="/atos", tags=["atos"])
ato_service = AtoService()
averbacao_service = AverbacaoService()


@router.post("/", response_model=AtoResponse, status_code=status.HTTP_201_CREATED)
async def create_ato(
    ato_data: AtoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Criar um novo ato notarial."""
    try:
        ato = await ato_service.create(db, ato_data)
        logger.info(f"Ato criado: {ato.numero} (Livro {ato.livro_id}) por {current_user.email}")
        return ato
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/", response_model=AtoListResponse)
async def list_atos(
    livro_id: Optional[int] = Query(None, description="Filtrar por livro"),
    tipo: Optional[str] = Query(None, description="Filtrar por tipo"),
    data_inicio: Optional[date] = Query(None, description="Data inicial do ato"),
    data_fim: Optional[date] = Query(None, description="Data final do ato"),
    status_ia: Optional[str] = Query(None, description="Filtrar por status de IA"),
    busca: Optional[str] = Query(None, description="Buscar no conteúdo"),
    page: int = Query(1, ge=1, description="Número da página"),
    size: int = Query(20, ge=1, le=100, description="Itens por página"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar atos com filtros e paginação."""
    filters = {}
    if livro_id:
        filters["livro_id"] = livro_id
    if tipo:
        filters["tipo"] = tipo
    if data_inicio:
        filters["data_inicio"] = data_inicio
    if data_fim:
        filters["data_fim"] = data_fim
    if status_ia:
        filters["status_ia"] = status_ia
    if busca:
        filters["busca"] = busca
    
    result = await ato_service.list_atos(
        db, filters=filters, page=page, size=size
    )
    
    return result


@router.get("/stats")
async def get_ato_stats(
    livro_id: Optional[int] = Query(None, description="Estatísticas de um livro específico"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter estatísticas de atos."""
    if livro_id:
        stats = await ato_service.get_stats_by_livro(db, livro_id)
    else:
        stats = await ato_service.get_stats(db)
    
    return stats


@router.get("/{ato_id}", response_model=AtoResponse)
async def get_ato(
    ato_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter ato por ID."""
    ato = await ato_service.get_by_id(db, ato_id)
    if not ato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ato não encontrado"
        )
    
    return ato


@router.get("/{ato_id}/with-averbacoes", response_model=AtoWithAverbacoes)
async def get_ato_with_averbacoes(
    ato_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter ato com suas averbações."""
    ato = await ato_service.get_with_averbacoes(db, ato_id)
    if not ato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ato não encontrado"
        )
    
    return ato


@router.get("/livro/{livro_id}/numero/{numero}", response_model=AtoResponse)
async def get_ato_by_numero_livro(
    livro_id: int,
    numero: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter ato por número e livro."""
    ato = await ato_service.get_by_numero_livro(db, numero, livro_id)
    if not ato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ato não encontrado"
        )
    
    return ato


@router.put("/{ato_id}", response_model=AtoResponse)
async def update_ato(
    ato_id: int,
    ato_data: AtoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualizar ato por ID."""
    try:
        updated_ato = await ato_service.update(db, ato_id, ato_data)
        if not updated_ato:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ato não encontrado"
            )
        
        logger.info(f"Ato {ato_id} atualizado por {current_user.email}")
        return updated_ato
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# Endpoints de busca e IA

@router.post("/search")
async def search_atos(
    search_request: AtoSearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Buscar atos usando IA semântica."""
    try:
        # Buscar usando LangFlow
        langflow_result = await langflow_service.search_acts(
            query=search_request.query,
            filters=search_request.filters,
            limit=search_request.limit or 10
        )
        
        # Buscar também no banco de dados para complementar
        db_filters = {"busca": search_request.query}
        if search_request.filters:
            db_filters.update(search_request.filters)
        
        db_result = await ato_service.list_atos(
            db, filters=db_filters, page=1, size=search_request.limit or 10
        )
        
        # Combinar resultados
        combined_results = {
            "ai_results": langflow_result,
            "database_results": db_result,
            "query": search_request.query,
            "total_ai_results": langflow_result.get("total", 0),
            "total_db_results": db_result.total
        }
        
        logger.info(f"Busca de atos realizada por {current_user.email}: '{search_request.query}'")
        
        return combined_results
        
    except Exception as e:
        logger.error(f"Erro na busca de atos: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na busca: {str(e)}"
        )


@router.post("/search/content")
async def search_atos_by_content(
    query: str = Query(..., description="Texto a buscar no conteúdo"),
    search_in: str = Query("both", description="Onde buscar: 'original', 'markdown' ou 'both'"),
    page: int = Query(1, ge=1, description="Número da página"),
    size: int = Query(20, ge=1, le=100, description="Itens por página"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Buscar atos por conteúdo (original ou markdown)."""
    try:
        result = await ato_service.search_by_content(
            db, query, search_in, page, size
        )
        
        logger.info(f"Busca por conteúdo realizada por {current_user.email}: '{query}'")
        
        return result
        
    except Exception as e:
        logger.error(f"Erro na busca por conteúdo: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na busca: {str(e)}"
        )


@router.post("/{ato_id}/extract-details", response_model=ExtractActDetailsResponse)
async def extract_act_details(
    ato_id: int,
    request: ExtractActDetailsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Extrair detalhes específicos de um ato usando IA."""
    try:
        # Verificar se o ato existe
        ato = await ato_service.get_by_id(db, ato_id)
        if not ato:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ato não encontrado"
            )
        
        # Usar o conteúdo especificado ou o markdown como padrão
        content = request.content or ato.conteudo_markdown or ato.conteudo_original
        
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ato não possui conteúdo para análise"
            )
        
        # Extrair detalhes usando LangFlow
        langflow_result = await langflow_service.extract_act_details(
            ato_content=content,
            ato_id=ato_id,
            context=request.context
        )
        
        # Atualizar ato com informações extraídas se solicitado
        if request.update_ato and langflow_result:
            update_data = {}
            
            if "partes" in langflow_result and langflow_result["partes"]:
                update_data["partes"] = langflow_result["partes"]
            
            if "observacoes_ia" in langflow_result and langflow_result["observacoes_ia"]:
                current_obs = ato.observacoes or ""
                new_obs = f"{current_obs}\n\nIA: {langflow_result['observacoes_ia']}".strip()
                update_data["observacoes"] = new_obs
            
            if "confianca" in langflow_result:
                update_data["confianca_ia"] = langflow_result["confianca"]
            
            if update_data:
                from app.schemas.ato import AtoUpdate
                ato_update = AtoUpdate(**update_data)
                await ato_service.update(db, ato_id, ato_update)
        
        response = ExtractActDetailsResponse(
            ato_id=ato_id,
            extracted_data=langflow_result,
            processing_time=langflow_result.get("processing_time", 0),
            confidence=langflow_result.get("confianca", 0.0),
            updated_ato=request.update_ato and bool(update_data if 'update_data' in locals() else False)
        )
        
        logger.info(f"Detalhes extraídos do ato {ato_id} por {current_user.email}")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro na extração de detalhes do ato {ato_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na extração: {str(e)}"
        )


# Endpoints para averbações

@router.post("/{ato_id}/averbacoes", response_model=AdicionarAverbacaoResponse)
async def add_averbacao(
    ato_id: int,
    request: AdicionarAverbacaoRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Adicionar averbação a um ato."""
    try:
        # Verificar se o ato existe
        ato = await ato_service.get_by_id(db, ato_id)
        if not ato:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ato não encontrado"
            )
        
        # Criar averbação
        averbacao_data = AverbacaoCreate(
            ato_id=ato_id,
            numero=request.numero,
            data_averbacao=request.data_averbacao,
            tipo=request.tipo,
            conteudo=request.conteudo,
            observacoes=request.observacoes
        )
        
        averbacao = await averbacao_service.create(db, averbacao_data)
        
        response = AdicionarAverbacaoResponse(
            ato_id=ato_id,
            averbacao=averbacao,
            message="Averbação adicionada com sucesso"
        )
        
        logger.info(f"Averbação {averbacao.numero} adicionada ao ato {ato_id} por {current_user.email}")
        
        return response
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Erro ao adicionar averbação ao ato {ato_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao adicionar averbação: {str(e)}"
        )


@router.get("/{ato_id}/averbacoes")
async def list_averbacoes(
    ato_id: int,
    page: int = Query(1, ge=1, description="Número da página"),
    size: int = Query(20, ge=1, le=100, description="Itens por página"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar averbações de um ato."""
    try:
        # Verificar se o ato existe
        ato = await ato_service.get_by_id(db, ato_id)
        if not ato:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ato não encontrado"
            )
        
        result = await averbacao_service.list_by_ato(db, ato_id, page, size)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao listar averbações do ato {ato_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar averbações: {str(e)}"
        )


@router.get("/averbacoes/{averbacao_id}", response_model=AverbacaoResponse)
async def get_averbacao(
    averbacao_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter averbação por ID."""
    averbacao = await averbacao_service.get_by_id(db, averbacao_id)
    if not averbacao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Averbação não encontrada"
        )
    
    return averbacao


@router.put("/averbacoes/{averbacao_id}", response_model=AverbacaoResponse)
async def update_averbacao(
    averbacao_id: int,
    averbacao_data: AverbacaoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualizar averbação por ID."""
    try:
        updated_averbacao = await averbacao_service.update(db, averbacao_id, averbacao_data)
        if not updated_averbacao:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Averbação não encontrada"
            )
        
        logger.info(f"Averbação {averbacao_id} atualizada por {current_user.email}")
        return updated_averbacao
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/averbacoes/{averbacao_id}", response_model=MessageResponse)
async def delete_averbacao(
    averbacao_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Excluir averbação."""
    try:
        success = await averbacao_service.delete(db, averbacao_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Averbação não encontrada"
            )
        
        logger.info(f"Averbação {averbacao_id} excluída por {current_user.email}")
        return MessageResponse(message="Averbação excluída com sucesso")
    except Exception as e:
        logger.error(f"Erro ao excluir averbação {averbacao_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao excluir averbação: {str(e)}"
        )