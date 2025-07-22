from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime


class AppConfigBase(BaseModel):
    """Schema base para configuração da aplicação."""
    chave: str = Field(..., min_length=1, max_length=100, description="Chave da configuração")
    valor: Dict[str, Any] = Field(..., description="Valor da configuração (JSON)")
    descricao: Optional[str] = Field(None, max_length=500, description="Descrição da configuração")
    categoria: str = Field(..., min_length=1, max_length=50, description="Categoria da configuração")
    publico: bool = Field(default=False, description="Se a configuração é pública")
    editavel: bool = Field(default=True, description="Se a configuração é editável")
    
    @validator('chave')
    def validate_chave(cls, v):
        """Valida a chave da configuração."""
        # Chave deve ser em formato snake_case
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Chave deve conter apenas letras, números, _ e -')
        return v.lower()
    
    @validator('categoria')
    def validate_categoria(cls, v):
        """Valida a categoria da configuração."""
        categorias_validas = {
            'sistema', 'ia', 'tipos', 'prompts', 'integracao', 
            'seguranca', 'notificacao', 'interface', 'relatorio'
        }
        if v.lower() not in categorias_validas:
            raise ValueError(f'Categoria deve ser uma das: {", ".join(categorias_validas)}')
        return v.lower()


class AppConfigCreate(AppConfigBase):
    """Schema para criação de configuração."""
    pass


class AppConfigUpdate(BaseModel):
    """Schema para atualização de configuração."""
    valor: Optional[Dict[str, Any]] = None
    descricao: Optional[str] = Field(None, max_length=500)
    categoria: Optional[str] = Field(None, min_length=1, max_length=50)
    publico: Optional[bool] = None
    editavel: Optional[bool] = None
    
    @validator('categoria')
    def validate_categoria(cls, v):
        """Valida a categoria da configuração."""
        if v is not None:
            categorias_validas = {
                'sistema', 'ia', 'tipos', 'prompts', 'integracao', 
                'seguranca', 'notificacao', 'interface', 'relatorio'
            }
            if v.lower() not in categorias_validas:
                raise ValueError(f'Categoria deve ser uma das: {", ".join(categorias_validas)}')
            return v.lower()
        return v


class AppConfigResponse(AppConfigBase):
    """Schema para resposta de configuração."""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AppConfigPublicResponse(BaseModel):
    """Schema para resposta de configuração pública (sem dados sensíveis)."""
    chave: str
    valor: Dict[str, Any]
    descricao: Optional[str]
    categoria: str
    
    class Config:
        from_attributes = True


class AppConfigListResponse(BaseModel):
    """Schema para lista de configurações."""
    configs: List[AppConfigResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class AppConfigSearchRequest(BaseModel):
    """Schema para busca de configurações."""
    categoria: Optional[str] = Field(None, description="Filtro por categoria")
    publico: Optional[bool] = Field(None, description="Filtro por configurações públicas")
    editavel: Optional[bool] = Field(None, description="Filtro por configurações editáveis")
    query: Optional[str] = Field(None, description="Termo de busca na chave ou descrição")
    page: int = Field(default=1, ge=1, description="Página")
    per_page: int = Field(default=20, ge=1, le=100, description="Itens por página")


# Schemas específicos para tipos de configuração
class SistemaConfigValue(BaseModel):
    """Schema para valores de configuração do sistema."""
    nome_sistema: Optional[str] = None
    versao: Optional[str] = None
    ambiente: Optional[str] = None
    manutencao: Optional[bool] = None
    debug: Optional[bool] = None


class IAConfigValue(BaseModel):
    """Schema para valores de configuração de IA."""
    max_tokens: Optional[int] = Field(None, ge=1, le=8192)
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    modelo_padrao: Optional[str] = None
    timeout: Optional[int] = Field(None, ge=1, le=300)
    max_tentativas: Optional[int] = Field(None, ge=1, le=5)


class TiposConfigValue(BaseModel):
    """Schema para valores de configuração de tipos."""
    tipos_livro: Optional[List[str]] = None
    tipos_ato: Optional[List[str]] = None
    tipos_documento: Optional[List[str]] = None
    tipos_contato: Optional[List[str]] = None


class PromptsConfigValue(BaseModel):
    """Schema para valores de configuração de prompts."""
    processamento_pdf: Optional[str] = None
    extracao_detalhes: Optional[str] = None
    conferencia_minutas: Optional[str] = None
    geracao_qualificacao: Optional[str] = None
    resumo_historico: Optional[str] = None
    agente_conversacional: Optional[str] = None


class IntegracaoConfigValue(BaseModel):
    """Schema para valores de configuração de integração."""
    api_externa_url: Optional[str] = None
    api_externa_token: Optional[str] = None
    webhook_url: Optional[str] = None
    timeout: Optional[int] = Field(None, ge=1, le=300)


class SegurancaConfigValue(BaseModel):
    """Schema para valores de configuração de segurança."""
    token_expiration: Optional[int] = Field(None, ge=300, le=86400)  # 5 min a 24h
    max_login_attempts: Optional[int] = Field(None, ge=3, le=10)
    password_min_length: Optional[int] = Field(None, ge=6, le=50)
    require_special_chars: Optional[bool] = None
    session_timeout: Optional[int] = Field(None, ge=900, le=28800)  # 15 min a 8h


class NotificacaoConfigValue(BaseModel):
    """Schema para valores de configuração de notificação."""
    email_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    webhook_enabled: Optional[bool] = None
    email_template: Optional[str] = None
    sms_template: Optional[str] = None


class InterfaceConfigValue(BaseModel):
    """Schema para valores de configuração de interface."""
    tema_padrao: Optional[str] = None
    idioma_padrao: Optional[str] = None
    items_per_page: Optional[int] = Field(None, ge=10, le=100)
    show_help_tips: Optional[bool] = None
    auto_save: Optional[bool] = None


class RelatorioConfigValue(BaseModel):
    """Schema para valores de configuração de relatório."""
    formato_padrao: Optional[str] = None
    incluir_graficos: Optional[bool] = None
    incluir_detalhes: Optional[bool] = None
    max_registros: Optional[int] = Field(None, ge=100, le=10000)


# Schemas para operações em lote
class AppConfigBulkUpdateRequest(BaseModel):
    """Schema para atualização em lote de configurações."""
    configs: List[Dict[str, Any]] = Field(..., min_items=1, description="Lista de configurações para atualizar")
    
    @validator('configs')
    def validate_configs(cls, v):
        """Valida a lista de configurações."""
        for config in v:
            if 'chave' not in config:
                raise ValueError('Cada configuração deve ter uma chave')
            if 'valor' not in config:
                raise ValueError('Cada configuração deve ter um valor')
        return v


class AppConfigBulkUpdateResponse(BaseModel):
    """Schema para resposta de atualização em lote."""
    configs_atualizadas: List[str]
    configs_criadas: List[str]
    configs_com_erro: List[Dict[str, str]]
    total_processadas: int


class AppConfigExportRequest(BaseModel):
    """Schema para exportação de configurações."""
    categoria: Optional[str] = None
    publico: Optional[bool] = None
    formato: str = Field(default="json", description="Formato de exportação (json, yaml)")
    
    @validator('formato')
    def validate_formato(cls, v):
        """Valida o formato de exportação."""
        formatos_validos = {'json', 'yaml'}
        if v.lower() not in formatos_validos:
            raise ValueError(f'Formato deve ser um dos: {", ".join(formatos_validos)}')
        return v.lower()


class AppConfigImportRequest(BaseModel):
    """Schema para importação de configurações."""
    configs: Dict[str, Any] = Field(..., description="Configurações para importar")
    sobrescrever: bool = Field(default=False, description="Se deve sobrescrever configurações existentes")
    validar_apenas: bool = Field(default=False, description="Se deve apenas validar sem salvar")


class AppConfigImportResponse(BaseModel):
    """Schema para resposta de importação."""
    configs_importadas: List[str]
    configs_ignoradas: List[str]
    configs_com_erro: List[Dict[str, str]]
    total_processadas: int
    validacao_apenas: bool


# Schema para backup e restore
class AppConfigBackupResponse(BaseModel):
    """Schema para resposta de backup de configurações."""
    backup_id: str
    data_backup: datetime
    total_configs: int
    tamanho_arquivo: int
    caminho_arquivo: str


class AppConfigRestoreRequest(BaseModel):
    """Schema para restauração de configurações."""
    backup_id: str = Field(..., description="ID do backup para restaurar")
    sobrescrever_existentes: bool = Field(default=False, description="Se deve sobrescrever configurações existentes")
    categorias: Optional[List[str]] = Field(None, description="Categorias específicas para restaurar")


class AppConfigRestoreResponse(BaseModel):
    """Schema para resposta de restauração."""
    configs_restauradas: List[str]
    configs_ignoradas: List[str]
    configs_com_erro: List[Dict[str, str]]
    total_processadas: int