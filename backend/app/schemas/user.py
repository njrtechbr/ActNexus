from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime
from app.models.user import UserRole


class UserBase(BaseModel):
    """Schema base para usuário."""
    name: str = Field(..., min_length=2, max_length=255, description="Nome do usuário")
    email: EmailStr = Field(..., description="Email do usuário")
    role: UserRole = Field(default=UserRole.EMPLOYEE, description="Papel do usuário")
    phone: Optional[str] = Field(None, max_length=20, description="Telefone")
    department: Optional[str] = Field(None, max_length=100, description="Departamento")
    is_active: bool = Field(default=True, description="Se o usuário está ativo")


class UserCreate(UserBase):
    """Schema para criação de usuário."""
    password: str = Field(..., min_length=8, max_length=100, description="Senha do usuário")
    
    @validator('password')
    def validate_password(cls, v):
        """Valida a força da senha."""
        if len(v) < 8:
            raise ValueError('Senha deve ter pelo menos 8 caracteres')
        
        # Verificar se tem pelo menos uma letra e um número
        has_letter = any(c.isalpha() for c in v)
        has_number = any(c.isdigit() for c in v)
        
        if not (has_letter and has_number):
            raise ValueError('Senha deve conter pelo menos uma letra e um número')
        
        return v


class UserUpdate(BaseModel):
    """Schema para atualização de usuário."""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    phone: Optional[str] = Field(None, max_length=20)
    department: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None


class UserPasswordUpdate(BaseModel):
    """Schema para atualização de senha."""
    current_password: str = Field(..., description="Senha atual")
    new_password: str = Field(..., min_length=8, max_length=100, description="Nova senha")
    
    @validator('new_password')
    def validate_new_password(cls, v):
        """Valida a nova senha."""
        if len(v) < 8:
            raise ValueError('Nova senha deve ter pelo menos 8 caracteres')
        
        has_letter = any(c.isalpha() for c in v)
        has_number = any(c.isdigit() for c in v)
        
        if not (has_letter and has_number):
            raise ValueError('Nova senha deve conter pelo menos uma letra e um número')
        
        return v


class UserResponse(UserBase):
    """Schema para resposta de usuário."""
    id: str
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    """Schema para login de usuário."""
    email: EmailStr = Field(..., description="Email do usuário")
    password: str = Field(..., description="Senha do usuário")


class UserTokenResponse(BaseModel):
    """Schema para resposta de token."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # em segundos
    user: UserResponse


class TokenRefresh(BaseModel):
    """Schema para refresh de token."""
    refresh_token: str = Field(..., description="Token de refresh")


class PasswordResetRequest(BaseModel):
    """Schema para solicitação de reset de senha."""
    email: EmailStr = Field(..., description="Email do usuário")


class PasswordReset(BaseModel):
    """Schema para reset de senha."""
    token: str = Field(..., description="Token de reset")
    new_password: str = Field(..., min_length=8, max_length=100, description="Nova senha")
    
    @validator('new_password')
    def validate_new_password(cls, v):
        """Valida a nova senha."""
        if len(v) < 8:
            raise ValueError('Nova senha deve ter pelo menos 8 caracteres')
        
        has_letter = any(c.isalpha() for c in v)
        has_number = any(c.isdigit() for c in v)
        
        if not (has_letter and has_number):
            raise ValueError('Nova senha deve conter pelo menos uma letra e um número')
        
        return v


class UserListResponse(BaseModel):
    """Schema para lista de usuários."""
    users: list[UserResponse]
    total: int
    page: int
    per_page: int
    total_pages: int