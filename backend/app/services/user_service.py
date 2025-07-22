from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserUpdate, UserPasswordUpdate
from app.core.security import get_password_hash, verify_password
from app.core.logging import logger
import uuid


class UserService:
    """Serviço para gerenciamento de usuários."""
    
    @staticmethod
    async def create_user(
        session: AsyncSession,
        user_data: UserCreate,
        created_by: Optional[User] = None
    ) -> User:
        """Cria um novo usuário."""
        try:
            # Verificar se email já existe
            existing_user = await UserService.get_user_by_email(session, user_data.email)
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email já está em uso"
                )
            
            # Criar novo usuário
            user = User(
                id=uuid.uuid4(),
                name=user_data.name,
                email=user_data.email.lower(),
                hashed_password=get_password_hash(user_data.password),
                role=user_data.role,
                phone=user_data.phone,
                department=user_data.department,
                is_active=user_data.is_active,
                is_verified=user_data.is_verified
            )
            
            session.add(user)
            await session.commit()
            await session.refresh(user)
            
            logger.info(
                f"Usuário criado: {user.email} por {created_by.email if created_by else 'sistema'}"
            )
            
            return user
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao criar usuário: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def get_user_by_id(session: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
        """Busca usuário por ID."""
        try:
            result = await session.execute(
                select(User).where(User.id == user_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Erro ao buscar usuário por ID {user_id}: {str(e)}")
            return None
    
    @staticmethod
    async def get_user_by_email(session: AsyncSession, email: str) -> Optional[User]:
        """Busca usuário por email."""
        try:
            result = await session.execute(
                select(User).where(User.email == email.lower())
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Erro ao buscar usuário por email {email}: {str(e)}")
            return None
    
    @staticmethod
    async def authenticate_user(
        session: AsyncSession, 
        email: str, 
        password: str
    ) -> Optional[User]:
        """Autentica usuário com email e senha."""
        try:
            user = await UserService.get_user_by_email(session, email)
            if not user:
                return None
            
            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Usuário inativo"
                )
            
            if not verify_password(password, user.hashed_password):
                return None
            
            logger.info(f"Usuário autenticado: {user.email}")
            return user
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro na autenticação do usuário {email}: {str(e)}")
            return None
    
    @staticmethod
    async def update_user(
        session: AsyncSession,
        user_id: uuid.UUID,
        user_data: UserUpdate,
        updated_by: User
    ) -> User:
        """Atualiza dados do usuário."""
        try:
            user = await UserService.get_user_by_id(session, user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuário não encontrado"
                )
            
            # Verificar permissões
            if not updated_by.is_admin() and updated_by.id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Sem permissão para atualizar este usuário"
                )
            
            # Verificar se email já existe (se está sendo alterado)
            if user_data.email and user_data.email.lower() != user.email:
                existing_user = await UserService.get_user_by_email(session, user_data.email)
                if existing_user:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email já está em uso"
                    )
            
            # Atualizar campos
            update_data = user_data.model_dump(exclude_unset=True)
            if 'email' in update_data:
                update_data['email'] = update_data['email'].lower()
            
            user.update_from_dict(update_data)
            
            await session.commit()
            await session.refresh(user)
            
            logger.info(
                f"Usuário {user.email} atualizado por {updated_by.email}"
            )
            
            return user
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao atualizar usuário {user_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def update_password(
        session: AsyncSession,
        user_id: uuid.UUID,
        password_data: UserPasswordUpdate,
        updated_by: User
    ) -> User:
        """Atualiza senha do usuário."""
        try:
            user = await UserService.get_user_by_id(session, user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuário não encontrado"
                )
            
            # Verificar permissões
            if not updated_by.is_admin() and updated_by.id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Sem permissão para alterar senha deste usuário"
                )
            
            # Se não é admin, verificar senha atual
            if not updated_by.is_admin() and not verify_password(
                password_data.current_password, user.hashed_password
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Senha atual incorreta"
                )
            
            # Atualizar senha
            user.hashed_password = get_password_hash(password_data.new_password)
            
            await session.commit()
            await session.refresh(user)
            
            logger.info(
                f"Senha do usuário {user.email} alterada por {updated_by.email}"
            )
            
            return user
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao alterar senha do usuário {user_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def deactivate_user(
        session: AsyncSession,
        user_id: uuid.UUID,
        deactivated_by: User
    ) -> User:
        """Desativa usuário."""
        try:
            user = await UserService.get_user_by_id(session, user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuário não encontrado"
                )
            
            # Verificar permissões
            if not deactivated_by.is_admin():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Sem permissão para desativar usuário"
                )
            
            # Não permitir desativar a si mesmo
            if user.id == deactivated_by.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Não é possível desativar sua própria conta"
                )
            
            user.is_active = False
            
            await session.commit()
            await session.refresh(user)
            
            logger.info(
                f"Usuário {user.email} desativado por {deactivated_by.email}"
            )
            
            return user
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao desativar usuário {user_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def activate_user(
        session: AsyncSession,
        user_id: uuid.UUID,
        activated_by: User
    ) -> User:
        """Ativa usuário."""
        try:
            user = await UserService.get_user_by_id(session, user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuário não encontrado"
                )
            
            # Verificar permissões
            if not activated_by.is_admin():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Sem permissão para ativar usuário"
                )
            
            user.is_active = True
            
            await session.commit()
            await session.refresh(user)
            
            logger.info(
                f"Usuário {user.email} ativado por {activated_by.email}"
            )
            
            return user
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao ativar usuário {user_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def list_users(
        session: AsyncSession,
        skip: int = 0,
        limit: int = 20,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None
    ) -> tuple[List[User], int]:
        """Lista usuários com filtros e paginação."""
        try:
            # Construir query base
            query = select(User)
            
            # Aplicar filtros
            conditions = []
            
            if role is not None:
                conditions.append(User.role == role)
            
            if is_active is not None:
                conditions.append(User.is_active == is_active)
            
            if search:
                search_term = f"%{search.lower()}%"
                conditions.append(
                    or_(
                        User.name.ilike(search_term),
                        User.email.ilike(search_term),
                        User.department.ilike(search_term)
                    )
                )
            
            if conditions:
                query = query.where(and_(*conditions))
            
            # Contar total
            count_query = select(User.id)
            if conditions:
                count_query = count_query.where(and_(*conditions))
            
            count_result = await session.execute(count_query)
            total = len(count_result.all())
            
            # Aplicar paginação e ordenação
            query = query.order_by(User.name).offset(skip).limit(limit)
            
            result = await session.execute(query)
            users = result.scalars().all()
            
            return list(users), total
            
        except Exception as e:
            logger.error(f"Erro ao listar usuários: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def get_user_stats(session: AsyncSession) -> dict:
        """Obtém estatísticas dos usuários."""
        try:
            # Total de usuários
            total_result = await session.execute(select(User.id))
            total_users = len(total_result.all())
            
            # Usuários ativos
            active_result = await session.execute(
                select(User.id).where(User.is_active == True)
            )
            active_users = len(active_result.all())
            
            # Usuários por role
            admin_result = await session.execute(
                select(User.id).where(User.role == UserRole.ADMIN)
            )
            admin_count = len(admin_result.all())
            
            employee_result = await session.execute(
                select(User.id).where(User.role == UserRole.EMPLOYEE)
            )
            employee_count = len(employee_result.all())
            
            return {
                "total_users": total_users,
                "active_users": active_users,
                "inactive_users": total_users - active_users,
                "admin_count": admin_count,
                "employee_count": employee_count,
                "activation_rate": round((active_users / total_users * 100) if total_users > 0 else 0, 2)
            }
            
        except Exception as e:
            logger.error(f"Erro ao obter estatísticas de usuários: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )