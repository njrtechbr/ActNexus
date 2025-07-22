from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.auth import get_current_user, require_admin
from app.services.user_service import UserService
from app.schemas.user import (
    UserCreate, UserUpdate, UserResponse, UserListResponse,
    UserStatsResponse, PasswordUpdateRequest
)
from app.schemas import MessageResponse
from app.models.user import User
from app.core.logging import logger

router = APIRouter(prefix="/users", tags=["users"])
user_service = UserService()


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Criar um novo usuário (apenas administradores)."""
    try:
        user = await user_service.create_user(db, user_data)
        logger.info(f"Usuário criado: {user.email} por {current_user.email}")
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Obter informações do usuário atual."""
    return current_user


@router.get("/", response_model=UserListResponse)
async def list_users(
    papel: Optional[str] = Query(None, description="Filtrar por papel"),
    ativo: Optional[bool] = Query(None, description="Filtrar por status ativo"),
    busca: Optional[str] = Query(None, description="Buscar por nome, email ou departamento"),
    page: int = Query(1, ge=1, description="Número da página"),
    size: int = Query(20, ge=1, le=100, description="Itens por página"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar usuários com filtros e paginação."""
    filters = {}
    if papel:
        filters["papel"] = papel
    if ativo is not None:
        filters["ativo"] = ativo
    if busca:
        filters["busca"] = busca
    
    result = await user_service.list_users(
        db, filters=filters, page=page, size=size
    )
    
    return result


@router.get("/stats", response_model=UserStatsResponse)
async def get_user_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Obter estatísticas de usuários (apenas administradores)."""
    stats = await user_service.get_user_stats(db)
    return stats


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter usuário por ID."""
    # Usuários podem ver apenas suas próprias informações, exceto administradores
    if current_user.id != user_id and current_user.papel != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado"
        )
    
    user = await user_service.get_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    return user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualizar informações do usuário atual."""
    try:
        updated_user = await user_service.update_user(
            db, current_user.id, user_data, current_user
        )
        logger.info(f"Usuário atualizado: {current_user.email}")
        return updated_user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Atualizar usuário por ID (apenas administradores)."""
    try:
        updated_user = await user_service.update_user(
            db, user_id, user_data, current_user
        )
        logger.info(f"Usuário {user_id} atualizado por {current_user.email}")
        return updated_user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )


@router.put("/me/password", response_model=MessageResponse)
async def update_current_user_password(
    password_data: PasswordUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualizar senha do usuário atual."""
    try:
        await user_service.update_password(
            db, current_user.id, password_data, current_user
        )
        logger.info(f"Senha atualizada para usuário: {current_user.email}")
        return MessageResponse(message="Senha atualizada com sucesso")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )


@router.put("/{user_id}/password", response_model=MessageResponse)
async def update_user_password(
    user_id: int,
    password_data: PasswordUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Atualizar senha de usuário por ID (apenas administradores)."""
    try:
        await user_service.update_password(
            db, user_id, password_data, current_user
        )
        logger.info(f"Senha do usuário {user_id} atualizada por {current_user.email}")
        return MessageResponse(message="Senha atualizada com sucesso")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )


@router.post("/{user_id}/deactivate", response_model=MessageResponse)
async def deactivate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Desativar usuário (apenas administradores)."""
    try:
        await user_service.deactivate_user(db, user_id, current_user)
        logger.info(f"Usuário {user_id} desativado por {current_user.email}")
        return MessageResponse(message="Usuário desativado com sucesso")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )


@router.post("/{user_id}/activate", response_model=MessageResponse)
async def activate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Ativar usuário (apenas administradores)."""
    try:
        await user_service.activate_user(db, user_id, current_user)
        logger.info(f"Usuário {user_id} ativado por {current_user.email}")
        return MessageResponse(message="Usuário ativado com sucesso")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )