from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.auth import get_current_user
from app.services.langflow_service import LangFlowService
from app.services.ai_usage_service import AiUsageService
from app.services.livro_service import LivroService
from app.services.ato_service import AtoService
from app.schemas.ia import (
    ProcessPdfRequest, ProcessPdfResponse, ExtractDetailsRequest,
    ExtractDetailsResponse, SemanticSearchRequest, SemanticSearchResponse,
    GenerateSummaryRequest, GenerateSummaryResponse, ClassifyDocumentRequest,
    ClassifyDocumentResponse, AiUsageLogResponse
)
from app.schemas import MessageResponse
from app.models.user import User
from app.core.logging import logger
import time
from datetime import datetime

router = APIRouter(prefix="/ai", tags=["ia"])
langflow_service = LangFlowService()
ai_usage_service = AiUsageService()
livro_service = LivroService()
ato_service = AtoService()


@router.post("/process-pdf", response_model=ProcessPdfResponse)
async def process_pdf(
    request: ProcessPdfRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Processar PDF usando IA para extrair metadados e atos."""
    start_time = time.time()
    
    # Criar log de uso da IA
    ai_log = await ai_usage_service.create_log(
        db=db,
        tipo_operacao="process_pdf",
        modelo="langflow_pdf_processor",
        prompt_tokens=0,  # Será atualizado depois
        completion_tokens=0,
        total_tokens=0,
        custo=0.0,
        tempo_resposta=0.0,
        dados_entrada={"pdf_url": request.pdf_url, "livro_id": request.livro_id},
        usuario_id=current_user.id
    )
    
    try:
        # Verificar se o livro existe
        if request.livro_id:
            livro = await livro_service.get_by_id(db, request.livro_id)
            if not livro:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Livro não encontrado"
                )
        
        # Chamar o LangFlow para processar o PDF
        result = await langflow_service.process_pdf(
            pdf_url=request.pdf_url,
            livro_id=request.livro_id,
            extract_metadata=request.extract_metadata,
            extract_acts=request.extract_acts
        )
        
        # Calcular tempo de resposta
        tempo_resposta = time.time() - start_time
        
        # Atualizar log de uso da IA com sucesso
        await ai_usage_service.update_log(
            db=db,
            log_id=ai_log.id,
            status="sucesso",
            dados_resposta=result,
            prompt_tokens=result.get("usage", {}).get("prompt_tokens", 0),
            completion_tokens=result.get("usage", {}).get("completion_tokens", 0),
            total_tokens=result.get("usage", {}).get("total_tokens", 0),
            custo=result.get("usage", {}).get("cost", 0.0),
            tempo_resposta=tempo_resposta
        )
        
        logger.info(
            f"PDF processado com sucesso por {current_user.email}. "
            f"Tempo: {tempo_resposta:.2f}s"
        )
        
        return ProcessPdfResponse(
            sucesso=True,
            metadados=result.get("metadados"),
            atos=result.get("atos", []),
            total_atos=len(result.get("atos", [])),
            tempo_processamento=tempo_resposta,
            log_id=ai_log.id
        )
        
    except Exception as e:
        # Calcular tempo de resposta mesmo em caso de erro
        tempo_resposta = time.time() - start_time
        
        # Atualizar log de uso da IA com erro
        await ai_usage_service.update_log(
            db=db,
            log_id=ai_log.id,
            status="erro",
            erro=str(e),
            tempo_resposta=tempo_resposta
        )
        
        logger.error(f"Erro ao processar PDF: {str(e)}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar PDF: {str(e)}"
        )


@router.post("/extract-details", response_model=ExtractDetailsResponse)
async def extract_details(
    request: ExtractDetailsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Extrair detalhes específicos de um ato usando IA."""
    start_time = time.time()
    
    # Criar log de uso da IA
    ai_log = await ai_usage_service.create_log(
        db=db,
        tipo_operacao="extract_details",
        modelo="langflow_detail_extractor",
        prompt_tokens=0,
        completion_tokens=0,
        total_tokens=0,
        custo=0.0,
        tempo_resposta=0.0,
        dados_entrada={
            "ato_id": request.ato_id,
            "campos_extrair": request.campos_extrair
        },
        usuario_id=current_user.id
    )
    
    try:
        # Verificar se o ato existe
        ato = await ato_service.get_by_id(db, request.ato_id)
        if not ato:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ato não encontrado"
            )
        
        # Chamar o LangFlow para extrair detalhes
        result = await langflow_service.extract_details(
            conteudo=ato.conteudo_original or ato.conteudo_markdown,
            campos_extrair=request.campos_extrair,
            contexto=request.contexto
        )
        
        # Calcular tempo de resposta
        tempo_resposta = time.time() - start_time
        
        # Atualizar log de uso da IA com sucesso
        await ai_usage_service.update_log(
            db=db,
            log_id=ai_log.id,
            status="sucesso",
            dados_resposta=result,
            prompt_tokens=result.get("usage", {}).get("prompt_tokens", 0),
            completion_tokens=result.get("usage", {}).get("completion_tokens", 0),
            total_tokens=result.get("usage", {}).get("total_tokens", 0),
            custo=result.get("usage", {}).get("cost", 0.0),
            tempo_resposta=tempo_resposta
        )
        
        # Atualizar o ato com os detalhes extraídos se solicitado
        if request.atualizar_ato and result.get("detalhes"):
            await ato_service.update_ai_processing(
                db=db,
                ato_id=request.ato_id,
                status="processado",
                detalhes_ia=result["detalhes"]
            )
        
        logger.info(
            f"Detalhes extraídos do ato {request.ato_id} por {current_user.email}. "
            f"Tempo: {tempo_resposta:.2f}s"
        )
        
        return ExtractDetailsResponse(
            sucesso=True,
            detalhes=result.get("detalhes", {}),
            confianca=result.get("confianca", 0.0),
            tempo_processamento=tempo_resposta,
            log_id=ai_log.id
        )
        
    except Exception as e:
        # Calcular tempo de resposta mesmo em caso de erro
        tempo_resposta = time.time() - start_time
        
        # Atualizar log de uso da IA com erro
        await ai_usage_service.update_log(
            db=db,
            log_id=ai_log.id,
            status="erro",
            erro=str(e),
            tempo_resposta=tempo_resposta
        )
        
        logger.error(f"Erro ao extrair detalhes: {str(e)}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao extrair detalhes: {str(e)}"
        )


@router.post("/semantic-search", response_model=SemanticSearchResponse)
async def semantic_search(
    request: SemanticSearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Realizar busca semântica em atos usando IA."""
    start_time = time.time()
    
    # Criar log de uso da IA
    ai_log = await ai_usage_service.create_log(
        db=db,
        tipo_operacao="semantic_search",
        modelo="langflow_semantic_search",
        prompt_tokens=0,
        completion_tokens=0,
        total_tokens=0,
        custo=0.0,
        tempo_resposta=0.0,
        dados_entrada={
            "consulta": request.consulta,
            "filtros": request.filtros,
            "limite": request.limite
        },
        usuario_id=current_user.id
    )
    
    try:
        # Chamar o LangFlow para busca semântica
        result = await langflow_service.semantic_search(
            consulta=request.consulta,
            filtros=request.filtros,
            limite=request.limite
        )
        
        # Calcular tempo de resposta
        tempo_resposta = time.time() - start_time
        
        # Atualizar log de uso da IA com sucesso
        await ai_usage_service.update_log(
            db=db,
            log_id=ai_log.id,
            status="sucesso",
            dados_resposta=result,
            prompt_tokens=result.get("usage", {}).get("prompt_tokens", 0),
            completion_tokens=result.get("usage", {}).get("completion_tokens", 0),
            total_tokens=result.get("usage", {}).get("total_tokens", 0),
            custo=result.get("usage", {}).get("cost", 0.0),
            tempo_resposta=tempo_resposta
        )
        
        logger.info(
            f"Busca semântica realizada por {current_user.email}. "
            f"Consulta: '{request.consulta}', Resultados: {len(result.get('resultados', []))}, "
            f"Tempo: {tempo_resposta:.2f}s"
        )
        
        return SemanticSearchResponse(
            sucesso=True,
            resultados=result.get("resultados", []),
            total_encontrados=len(result.get("resultados", [])),
            tempo_processamento=tempo_resposta,
            log_id=ai_log.id
        )
        
    except Exception as e:
        # Calcular tempo de resposta mesmo em caso de erro
        tempo_resposta = time.time() - start_time
        
        # Atualizar log de uso da IA com erro
        await ai_usage_service.update_log(
            db=db,
            log_id=ai_log.id,
            status="erro",
            erro=str(e),
            tempo_resposta=tempo_resposta
        )
        
        logger.error(f"Erro na busca semântica: {str(e)}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na busca semântica: {str(e)}"
        )


@router.post("/generate-summary", response_model=GenerateSummaryResponse)
async def generate_summary(
    request: GenerateSummaryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Gerar resumo de conteúdo usando IA."""
    start_time = time.time()
    
    # Criar log de uso da IA
    ai_log = await ai_usage_service.create_log(
        db=db,
        tipo_operacao="generate_summary",
        modelo="langflow_summarizer",
        prompt_tokens=0,
        completion_tokens=0,
        total_tokens=0,
        custo=0.0,
        tempo_resposta=0.0,
        dados_entrada={
            "tipo_resumo": request.tipo_resumo,
            "tamanho_maximo": request.tamanho_maximo
        },
        usuario_id=current_user.id
    )
    
    try:
        # Chamar o LangFlow para gerar resumo
        result = await langflow_service.generate_summary(
            conteudo=request.conteudo,
            tipo_resumo=request.tipo_resumo,
            tamanho_maximo=request.tamanho_maximo
        )
        
        # Calcular tempo de resposta
        tempo_resposta = time.time() - start_time
        
        # Atualizar log de uso da IA com sucesso
        await ai_usage_service.update_log(
            db=db,
            log_id=ai_log.id,
            status="sucesso",
            dados_resposta=result,
            prompt_tokens=result.get("usage", {}).get("prompt_tokens", 0),
            completion_tokens=result.get("usage", {}).get("completion_tokens", 0),
            total_tokens=result.get("usage", {}).get("total_tokens", 0),
            custo=result.get("usage", {}).get("cost", 0.0),
            tempo_resposta=tempo_resposta
        )
        
        logger.info(
            f"Resumo gerado por {current_user.email}. "
            f"Tipo: {request.tipo_resumo}, Tempo: {tempo_resposta:.2f}s"
        )
        
        return GenerateSummaryResponse(
            sucesso=True,
            resumo=result.get("resumo", ""),
            palavras_chave=result.get("palavras_chave", []),
            tempo_processamento=tempo_resposta,
            log_id=ai_log.id
        )
        
    except Exception as e:
        # Calcular tempo de resposta mesmo em caso de erro
        tempo_resposta = time.time() - start_time
        
        # Atualizar log de uso da IA com erro
        await ai_usage_service.update_log(
            db=db,
            log_id=ai_log.id,
            status="erro",
            erro=str(e),
            tempo_resposta=tempo_resposta
        )
        
        logger.error(f"Erro ao gerar resumo: {str(e)}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao gerar resumo: {str(e)}"
        )


@router.post("/classify-document", response_model=ClassifyDocumentResponse)
async def classify_document(
    request: ClassifyDocumentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Classificar documento usando IA."""
    start_time = time.time()
    
    # Criar log de uso da IA
    ai_log = await ai_usage_service.create_log(
        db=db,
        tipo_operacao="classify_document",
        modelo="langflow_classifier",
        prompt_tokens=0,
        completion_tokens=0,
        total_tokens=0,
        custo=0.0,
        tempo_resposta=0.0,
        dados_entrada={
            "categorias_possiveis": request.categorias_possiveis
        },
        usuario_id=current_user.id
    )
    
    try:
        # Chamar o LangFlow para classificar documento
        result = await langflow_service.classify_document(
            conteudo=request.conteudo,
            categorias_possiveis=request.categorias_possiveis
        )
        
        # Calcular tempo de resposta
        tempo_resposta = time.time() - start_time
        
        # Atualizar log de uso da IA com sucesso
        await ai_usage_service.update_log(
            db=db,
            log_id=ai_log.id,
            status="sucesso",
            dados_resposta=result,
            prompt_tokens=result.get("usage", {}).get("prompt_tokens", 0),
            completion_tokens=result.get("usage", {}).get("completion_tokens", 0),
            total_tokens=result.get("usage", {}).get("total_tokens", 0),
            custo=result.get("usage", {}).get("cost", 0.0),
            tempo_resposta=tempo_resposta
        )
        
        logger.info(
            f"Documento classificado por {current_user.email}. "
            f"Categoria: {result.get('categoria')}, Tempo: {tempo_resposta:.2f}s"
        )
        
        return ClassifyDocumentResponse(
            sucesso=True,
            categoria=result.get("categoria", ""),
            confianca=result.get("confianca", 0.0),
            categorias_alternativas=result.get("categorias_alternativas", []),
            tempo_processamento=tempo_resposta,
            log_id=ai_log.id
        )
        
    except Exception as e:
        # Calcular tempo de resposta mesmo em caso de erro
        tempo_resposta = time.time() - start_time
        
        # Atualizar log de uso da IA com erro
        await ai_usage_service.update_log(
            db=db,
            log_id=ai_log.id,
            status="erro",
            erro=str(e),
            tempo_resposta=tempo_resposta
        )
        
        logger.error(f"Erro ao classificar documento: {str(e)}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao classificar documento: {str(e)}"
        )


# Endpoints para monitoramento de uso da IA

@router.get("/usage/logs")
async def get_ai_usage_logs(
    tipo_operacao: Optional[str] = Query(None, description="Filtrar por tipo de operação"),
    modelo: Optional[str] = Query(None, description="Filtrar por modelo"),
    status: Optional[str] = Query(None, description="Filtrar por status"),
    page: int = Query(1, ge=1, description="Número da página"),
    size: int = Query(20, ge=1, le=100, description="Itens por página"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar logs de uso da IA."""
    filters = {}
    if tipo_operacao:
        filters["tipo_operacao"] = tipo_operacao
    if modelo:
        filters["modelo"] = modelo
    if status:
        filters["status"] = status
    
    # Usuários não-admin só podem ver seus próprios logs
    if not current_user.is_admin:
        filters["usuario_id"] = current_user.id
    
    result = await ai_usage_service.list_logs(
        db, filters=filters, page=page, size=size
    )
    
    return result


@router.get("/usage/stats")
async def get_ai_usage_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter estatísticas de uso da IA."""
    # Usuários não-admin só podem ver suas próprias estatísticas
    usuario_id = None if current_user.is_admin else current_user.id
    
    stats = await ai_usage_service.get_stats(db, usuario_id=usuario_id)
    return stats


@router.get("/usage/costs")
async def get_ai_cost_analysis(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter análise de custos da IA (apenas administradores)."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem ver análise de custos."
        )
    
    analysis = await ai_usage_service.analyze_costs(db)
    return analysis


@router.get("/usage/logs/{log_id}", response_model=AiUsageLogResponse)
async def get_ai_usage_log(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter log específico de uso da IA."""
    log = await ai_usage_service.get_by_id(db, log_id)
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Log não encontrado"
        )
    
    # Usuários não-admin só podem ver seus próprios logs
    if not current_user.is_admin and log.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado"
        )
    
    return log


@router.delete("/usage/logs/cleanup", response_model=MessageResponse)
async def cleanup_old_logs(
    dias_retencao: int = Query(90, ge=1, description="Dias de retenção dos logs"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Limpar logs antigos de uso da IA (apenas administradores)."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem limpar logs."
        )
    
    try:
        deleted_count = await ai_usage_service.cleanup_old_logs(db, dias_retencao)
        
        logger.info(f"Limpeza de logs realizada por {current_user.email}: {deleted_count} logs removidos")
        
        return MessageResponse(
            message=f"{deleted_count} logs antigos foram removidos"
        )
        
    except Exception as e:
        logger.error(f"Erro na limpeza de logs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na limpeza de logs: {str(e)}"
        )


@router.get("/usage/export")
async def export_ai_usage_logs(
    formato: str = Query("json", description="Formato de exportação (json)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Exportar logs de uso da IA (apenas administradores)."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem exportar logs."
        )
    
    try:
        export_data = await ai_usage_service.export_logs(db)
        
        logger.info(f"Logs de IA exportados por {current_user.email}")
        
        return export_data
        
    except Exception as e:
        logger.error(f"Erro na exportação de logs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na exportação de logs: {str(e)}"
        )