"""Schemas Pydantic para validação de dados da API."""

from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

# User schemas
from .user import (
    UserBase,
    UserCreate,
    UserUpdate,
    UserPasswordUpdate,
    UserResponse,
    UserLogin,
    UserTokenResponse,
    TokenRefresh,
    PasswordResetRequest,
    PasswordReset,
    UserListResponse,
)

# Livro schemas
from .livro import (
    LivroBase,
    LivroCreate,
    LivroUpdate,
    LivroResponse,
    LivroWithAtos,
    LivroListResponse,
    LivroProcessRequest,
    LivroProcessResponse,
    LivroUploadResponse,
    AtoProcessado,
    LivroComAtosCreate,
    LivroComAtosResponse,
)

# Ato schemas
from .ato import (
    AtoBase,
    AtoCreate,
    AtoUpdate,
    AtoResponse,
    AtoWithAverbacoes,
    AtoListResponse,
    AverbacaoBase,
    AverbacaoCreate,
    AverbacaoUpdate,
    AverbacaoResponse,
    ExtractActDetailsRequest,
    ExtractActDetailsResponse,
    AtoSearchRequest,
    AtoComLivro,
    AdicionarAverbacaoRequest,
    AdicionarAverbacaoResponse,
)

# Cliente schemas
from .cliente import (
    ClienteBase,
    ClienteCreate,
    ClienteUpdate,
    ClienteResponse,
    ClienteWithDetails,
    ClienteListResponse,
    ClienteSearchRequest,
    ClientesByNamesRequest,
    ClientesByNamesResponse,
    ContatoBase,
    ContatoCreate,
    ContatoUpdate,
    ContatoResponse,
    EnderecoBase,
    EnderecoCreate,
    EnderecoUpdate,
    EnderecoResponse,
    DocumentoClienteBase,
    DocumentoClienteCreate,
    DocumentoClienteUpdate,
    DocumentoClienteResponse,
    ObservacaoBase,
    ObservacaoCreate,
    ObservacaoUpdate,
    ObservacaoResponse,
    EventoResponse,
    CampoAdicionalClienteBase,
    CampoAdicionalClienteCreate,
    CampoAdicionalClienteUpdate,
    CampoAdicionalClienteResponse,
)

# Config schemas
from .config import (
    AppConfigBase,
    AppConfigCreate,
    AppConfigUpdate,
    AppConfigResponse,
    AppConfigPublicResponse,
    AppConfigListResponse,
    AppConfigSearchRequest,
    SistemaConfigValue,
    IAConfigValue,
    TiposConfigValue,
    PromptsConfigValue,
    IntegracaoConfigValue,
    SegurancaConfigValue,
    NotificacaoConfigValue,
    InterfaceConfigValue,
    RelatorioConfigValue,
    AppConfigBulkUpdateRequest,
    AppConfigBulkUpdateResponse,
    AppConfigExportRequest,
    AppConfigImportRequest,
    AppConfigImportResponse,
    AppConfigBackupResponse,
    AppConfigRestoreRequest,
    AppConfigRestoreResponse,
)

# AI Usage schemas
from .ai_usage import (
    AiUsageLogBase,
    AiUsageLogCreate,
    AiUsageLogUpdate,
    AiUsageLogResponse,
    AiUsageLogListResponse,
    AiUsageLogSearchRequest,
    AiUsageStatsRequest,
    AiUsageStatsResponse,
    AiUsageSummaryResponse,
    AiUsageExportRequest,
    AiUsageExportResponse,
    AiUsageAlertRequest,
    AiUsageAlertResponse,
    AiUsageHealthCheckResponse,
)

# Common schemas
class MessageResponse(BaseModel):
    """Schema para respostas simples com mensagem."""
    message: str
    success: bool = True
    data: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Schema para respostas de erro."""
    message: str
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    success: bool = False


class HealthCheckResponse(BaseModel):
    """Schema para verificação de saúde da API."""
    status: str
    timestamp: datetime
    version: str
    environment: str
    database: Dict[str, Any]
    services: Dict[str, Any]


__all__ = [
    # User
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserPasswordUpdate",
    "UserResponse",
    "UserLogin",
    "UserTokenResponse",
    "TokenRefresh",
    "PasswordResetRequest",
    "PasswordReset",
    "UserListResponse",
    
    # Livro
    "LivroBase",
    "LivroCreate",
    "LivroUpdate",
    "LivroResponse",
    "LivroWithAtos",
    "LivroListResponse",
    "LivroProcessRequest",
    "LivroProcessResponse",
    "LivroUploadResponse",
    "AtoProcessado",
    "LivroComAtosCreate",
    "LivroComAtosResponse",
    
    # Ato
    "AtoBase",
    "AtoCreate",
    "AtoUpdate",
    "AtoResponse",
    "AtoWithAverbacoes",
    "AtoListResponse",
    "AverbacaoBase",
    "AverbacaoCreate",
    "AverbacaoUpdate",
    "AverbacaoResponse",
    "ExtractActDetailsRequest",
    "ExtractActDetailsResponse",
    "AtoSearchRequest",
    "AtoComLivro",
    "AdicionarAverbacaoRequest",
    "AdicionarAverbacaoResponse",
    
    # Cliente
    "ClienteBase",
    "ClienteCreate",
    "ClienteUpdate",
    "ClienteResponse",
    "ClienteWithDetails",
    "ClienteListResponse",
    "ClienteSearchRequest",
    "ClientesByNamesRequest",
    "ClientesByNamesResponse",
    "ContatoBase",
    "ContatoCreate",
    "ContatoUpdate",
    "ContatoResponse",
    "EnderecoBase",
    "EnderecoCreate",
    "EnderecoUpdate",
    "EnderecoResponse",
    "DocumentoClienteBase",
    "DocumentoClienteCreate",
    "DocumentoClienteUpdate",
    "DocumentoClienteResponse",
    "ObservacaoBase",
    "ObservacaoCreate",
    "ObservacaoUpdate",
    "ObservacaoResponse",
    "EventoResponse",
    "CampoAdicionalClienteBase",
    "CampoAdicionalClienteCreate",
    "CampoAdicionalClienteUpdate",
    "CampoAdicionalClienteResponse",
    
    # Config
    "AppConfigBase",
    "AppConfigCreate",
    "AppConfigUpdate",
    "AppConfigResponse",
    "AppConfigPublicResponse",
    "AppConfigListResponse",
    "AppConfigSearchRequest",
    "SistemaConfigValue",
    "IAConfigValue",
    "TiposConfigValue",
    "PromptsConfigValue",
    "IntegracaoConfigValue",
    "SegurancaConfigValue",
    "NotificacaoConfigValue",
    "InterfaceConfigValue",
    "RelatorioConfigValue",
    "AppConfigBulkUpdateRequest",
    "AppConfigBulkUpdateResponse",
    "AppConfigExportRequest",
    "AppConfigImportRequest",
    "AppConfigImportResponse",
    "AppConfigBackupResponse",
    "AppConfigRestoreRequest",
    "AppConfigRestoreResponse",
    
    # AI Usage
    "AiUsageLogBase",
    "AiUsageLogCreate",
    "AiUsageLogUpdate",
    "AiUsageLogResponse",
    "AiUsageLogListResponse",
    "AiUsageLogSearchRequest",
    "AiUsageStatsRequest",
    "AiUsageStatsResponse",
    "AiUsageSummaryResponse",
    "AiUsageExportRequest",
    "AiUsageExportResponse",
    "AiUsageAlertRequest",
    "AiUsageAlertResponse",
    "AiUsageHealthCheckResponse",
    
    # Common
    "MessageResponse",
    "ErrorResponse",
    "HealthCheckResponse",
]