from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.auth import get_current_user, require_admin
from app.services.config_service import ConfigService
from app.schemas.config import (
    ConfigCreate, ConfigUpdate, ConfigResponse, ConfigListResponse,
    ConfigBatchUpdate, ConfigExportResponse, ConfigImportRequest
)
from app.schemas import MessageResponse
from app.models.user import User
from app.core.logging import logger
import json

router = APIRouter(prefix="/config", tags=["configurações"])
config_service = ConfigService()


@router.post("/", response_model=ConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_config(
    config_data: ConfigCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Criar uma nova configuração (apenas administradores)."""
    try:
        config = await config_service.create(db, config_data)
        logger.info(f"Configuração criada: {config.chave} por {current_user.email}")
        return config
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/", response_model=ConfigListResponse)
async def list_configs(
    categoria: Optional[str] = Query(None, description="Filtrar por categoria"),
    tipo: Optional[str] = Query(None, description="Filtrar por tipo"),
    editavel: Optional[bool] = Query(None, description="Filtrar por editabilidade"),
    busca: Optional[str] = Query(None, description="Buscar por chave ou descrição"),
    page: int = Query(1, ge=1, description="Número da página"),
    size: int = Query(20, ge=1, le=100, description="Itens por página"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar configurações com filtros e paginação."""
    filters = {}
    if categoria:
        filters["categoria"] = categoria
    if tipo:
        filters["tipo"] = tipo
    if editavel is not None:
        filters["editavel"] = editavel
    if busca:
        filters["busca"] = busca
    
    result = await config_service.list_configs(
        db, filters=filters, page=page, size=size
    )
    
    return result


@router.get("/chave/{chave}", response_model=ConfigResponse)
async def get_config_by_key(
    chave: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter configuração por chave."""
    config = await config_service.get_by_key(db, chave)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuração não encontrada"
        )
    
    return config


@router.get("/valor/{chave}")
async def get_config_value(
    chave: str,
    default: Optional[str] = Query(None, description="Valor padrão se não encontrado"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter apenas o valor de uma configuração por chave."""
    try:
        valor = await config_service.get_value(db, chave, default)
        return {"chave": chave, "valor": valor}
    except Exception as e:
        logger.error(f"Erro ao obter valor da configuração {chave}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter configuração: {str(e)}"
        )


@router.get("/categoria/{categoria}")
async def get_configs_by_category(
    categoria: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter todas as configurações de uma categoria."""
    configs = await config_service.get_by_category(db, categoria)
    return {"categoria": categoria, "configuracoes": configs}


@router.get("/{config_id}", response_model=ConfigResponse)
async def get_config(
    config_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter configuração por ID."""
    config = await config_service.get_by_id(db, config_id)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuração não encontrada"
        )
    
    return config


@router.put("/{config_id}", response_model=ConfigResponse)
async def update_config(
    config_id: int,
    config_data: ConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Atualizar configuração por ID (apenas administradores)."""
    try:
        updated_config = await config_service.update(db, config_id, config_data)
        if not updated_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Configuração não encontrada"
            )
        
        logger.info(f"Configuração {config_id} atualizada por {current_user.email}")
        return updated_config
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/chave/{chave}", response_model=ConfigResponse)
async def update_config_by_key(
    chave: str,
    config_data: ConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Atualizar configuração por chave (apenas administradores)."""
    try:
        # Primeiro, obter a configuração pela chave
        config = await config_service.get_by_key(db, chave)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Configuração não encontrada"
            )
        
        updated_config = await config_service.update(db, config.id, config_data)
        
        logger.info(f"Configuração {chave} atualizada por {current_user.email}")
        return updated_config
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/batch", response_model=MessageResponse)
async def batch_update_configs(
    batch_data: ConfigBatchUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Atualizar múltiplas configurações em lote (apenas administradores)."""
    try:
        success_count = await config_service.batch_update(db, batch_data.configuracoes)
        
        logger.info(f"Atualização em lote de {success_count} configurações por {current_user.email}")
        
        return MessageResponse(
            message=f"{success_count} configurações atualizadas com sucesso"
        )
    except Exception as e:
        logger.error(f"Erro na atualização em lote: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na atualização em lote: {str(e)}"
        )


@router.delete("/{config_id}", response_model=MessageResponse)
async def delete_config(
    config_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Excluir configuração (apenas administradores)."""
    try:
        success = await config_service.delete(db, config_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Configuração não encontrada"
            )
        
        logger.info(f"Configuração {config_id} excluída por {current_user.email}")
        return MessageResponse(message="Configuração excluída com sucesso")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Erro ao excluir configuração {config_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao excluir configuração: {str(e)}"
        )


# Endpoints para gerenciamento de cache

@router.post("/cache/invalidate/{chave}", response_model=MessageResponse)
async def invalidate_cache_key(
    chave: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Invalidar cache de uma configuração específica (apenas administradores)."""
    try:
        await config_service.invalidate_cache(chave)
        
        logger.info(f"Cache da configuração {chave} invalidado por {current_user.email}")
        
        return MessageResponse(message=f"Cache da configuração '{chave}' invalidado")
    except Exception as e:
        logger.error(f"Erro ao invalidar cache: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao invalidar cache: {str(e)}"
        )


@router.post("/cache/clear", response_model=MessageResponse)
async def clear_cache(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Limpar todo o cache de configurações (apenas administradores)."""
    try:
        await config_service.clear_cache()
        
        logger.info(f"Cache de configurações limpo por {current_user.email}")
        
        return MessageResponse(message="Cache de configurações limpo")
    except Exception as e:
        logger.error(f"Erro ao limpar cache: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao limpar cache: {str(e)}"
        )


@router.get("/cache/status")
async def get_cache_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Obter status do cache de configurações (apenas administradores)."""
    try:
        status_info = {
            "habilitado": config_service.cache_enabled,
            "total_itens": len(config_service._cache),
            "chaves_em_cache": list(config_service._cache.keys())
        }
        
        return status_info
    except Exception as e:
        logger.error(f"Erro ao obter status do cache: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter status do cache: {str(e)}"
        )


@router.post("/cache/enable", response_model=MessageResponse)
async def enable_cache(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Habilitar cache de configurações (apenas administradores)."""
    try:
        await config_service.enable_cache()
        
        logger.info(f"Cache de configurações habilitado por {current_user.email}")
        
        return MessageResponse(message="Cache de configurações habilitado")
    except Exception as e:
        logger.error(f"Erro ao habilitar cache: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao habilitar cache: {str(e)}"
        )


@router.post("/cache/disable", response_model=MessageResponse)
async def disable_cache(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Desabilitar cache de configurações (apenas administradores)."""
    try:
        await config_service.disable_cache()
        
        logger.info(f"Cache de configurações desabilitado por {current_user.email}")
        
        return MessageResponse(message="Cache de configurações desabilitado")
    except Exception as e:
        logger.error(f"Erro ao desabilitar cache: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao desabilitar cache: {str(e)}"
        )


# Endpoints para exportação e importação

@router.get("/export", response_model=ConfigExportResponse)
async def export_configs(
    categoria: Optional[str] = Query(None, description="Exportar apenas uma categoria"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Exportar configurações (apenas administradores)."""
    try:
        export_data = await config_service.export_configs(db, categoria)
        
        logger.info(f"Configurações exportadas por {current_user.email}")
        
        return export_data
    except Exception as e:
        logger.error(f"Erro ao exportar configurações: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao exportar configurações: {str(e)}"
        )


@router.post("/import", response_model=MessageResponse)
async def import_configs(
    import_data: ConfigImportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Importar configurações (apenas administradores)."""
    try:
        result = await config_service.import_configs(
            db, import_data.configuracoes, import_data.sobrescrever
        )
        
        logger.info(
            f"Configurações importadas por {current_user.email}: "
            f"{result['criadas']} criadas, {result['atualizadas']} atualizadas, "
            f"{result['ignoradas']} ignoradas"
        )
        
        return MessageResponse(
            message=f"Importação concluída: {result['criadas']} criadas, "
                   f"{result['atualizadas']} atualizadas, {result['ignoradas']} ignoradas"
        )
    except Exception as e:
        logger.error(f"Erro ao importar configurações: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao importar configurações: {str(e)}"
        )


@router.post("/import-file", response_model=MessageResponse)
async def import_configs_from_file(
    file: UploadFile = File(...),
    sobrescrever: bool = Query(False, description="Sobrescrever configurações existentes"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Importar configurações de um arquivo JSON (apenas administradores)."""
    try:
        # Verificar se é um arquivo JSON
        if not file.filename.endswith('.json'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Apenas arquivos JSON são aceitos"
            )
        
        # Ler o conteúdo do arquivo
        content = await file.read()
        
        try:
            data = json.loads(content.decode('utf-8'))
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Arquivo JSON inválido"
            )
        
        # Verificar se tem a estrutura esperada
        if 'configuracoes' not in data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Arquivo deve conter uma chave 'configuracoes'"
            )
        
        result = await config_service.import_configs(
            db, data['configuracoes'], sobrescrever
        )
        
        logger.info(
            f"Configurações importadas de arquivo por {current_user.email}: "
            f"{result['criadas']} criadas, {result['atualizadas']} atualizadas, "
            f"{result['ignoradas']} ignoradas"
        )
        
        return MessageResponse(
            message=f"Importação de arquivo concluída: {result['criadas']} criadas, "
                   f"{result['atualizadas']} atualizadas, {result['ignoradas']} ignoradas"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao importar configurações de arquivo: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao importar configurações: {str(e)}"
        )