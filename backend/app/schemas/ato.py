from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime


class AtoBase(BaseModel):
    """Schema base para ato."""
    numero_ato: str = Field(..., min_length=1, max_length=50, description="Número do ato")
    tipo_ato: str = Field(..., min_length=1, max_length=100, description="Tipo do ato")
    data_ato: Optional[datetime] = Field(None, description="Data do ato")
    data_registro: Optional[datetime] = Field(None, description="Data de registro")
    conteudo_original: Optional[str] = Field(None, description="Conteúdo original")
    conteudo_markdown: Optional[str] = Field(None, description="Conteúdo em Markdown")
    partes: Optional[List[Dict[str, Any]]] = Field(None, description="Partes envolvidas")
    observacoes: Optional[str] = Field(None, max_length=2000, description="Observações")


class AtoCreate(AtoBase):
    """Schema para criação de ato."""
    livro_id: int = Field(..., gt=0, description="ID do livro")


class AtoUpdate(BaseModel):
    """Schema para atualização de ato."""
    numero_ato: Optional[str] = Field(None, min_length=1, max_length=50)
    tipo_ato: Optional[str] = Field(None, min_length=1, max_length=100)
    data_ato: Optional[datetime] = None
    data_registro: Optional[datetime] = None
    conteudo_original: Optional[str] = None
    conteudo_markdown: Optional[str] = None
    partes: Optional[List[Dict[str, Any]]] = None
    dados_extraidos: Optional[Dict[str, Any]] = None
    observacoes: Optional[str] = Field(None, max_length=2000)


class AtoResponse(AtoBase):
    """Schema para resposta de ato."""
    id: int
    livro_id: int
    dados_extraidos: Optional[Dict[str, Any]]
    processado_ia: bool
    data_processamento_ia: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    # Propriedades calculadas
    identificacao: str
    total_averbacoes: int
    partes_nomes: List[str]
    
    class Config:
        from_attributes = True


class AtoWithAverbacoes(AtoResponse):
    """Schema para ato com suas averbações."""
    averbacoes: List['AverbacaoResponse'] = []


class AtoListResponse(BaseModel):
    """Schema para lista de atos."""
    atos: List[AtoResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# Schemas para averbação
class AverbacaoBase(BaseModel):
    """Schema base para averbação."""
    numero_averbacao: Optional[str] = Field(None, max_length=50, description="Número da averbação")
    tipo_averbacao: str = Field(..., min_length=1, max_length=100, description="Tipo da averbação")
    texto: str = Field(..., min_length=1, description="Texto da averbação")
    data_averbacao: Optional[datetime] = Field(None, description="Data da averbação")
    observacoes: Optional[str] = Field(None, max_length=2000, description="Observações")


class AverbacaoCreate(AverbacaoBase):
    """Schema para criação de averbação."""
    ato_id: int = Field(..., gt=0, description="ID do ato")


class AverbacaoUpdate(BaseModel):
    """Schema para atualização de averbação."""
    numero_averbacao: Optional[str] = Field(None, max_length=50)
    tipo_averbacao: Optional[str] = Field(None, min_length=1, max_length=100)
    texto: Optional[str] = Field(None, min_length=1)
    data_averbacao: Optional[datetime] = None
    observacoes: Optional[str] = Field(None, max_length=2000)


class AverbacaoResponse(AverbacaoBase):
    """Schema para resposta de averbação."""
    id: int
    ato_id: int
    data_registro: datetime
    created_at: datetime
    updated_at: datetime
    
    # Propriedades calculadas
    identificacao: str
    
    class Config:
        from_attributes = True


# Schemas para operações específicas
class ExtractActDetailsRequest(BaseModel):
    """Schema para solicitação de extração de detalhes do ato."""
    ato_id: int = Field(..., gt=0, description="ID do ato")
    force_reprocess: bool = Field(default=False, description="Forçar reprocessamento")


class ExtractActDetailsResponse(BaseModel):
    """Schema para resposta de extração de detalhes."""
    ato_id: int
    dados_extraidos: Dict[str, Any]
    message: str
    processado_em: datetime


class AtoSearchRequest(BaseModel):
    """Schema para busca de atos."""
    query: Optional[str] = Field(None, description="Termo de busca")
    tipo_ato: Optional[str] = Field(None, description="Filtro por tipo de ato")
    livro_id: Optional[int] = Field(None, description="Filtro por livro")
    data_inicio: Optional[datetime] = Field(None, description="Data inicial")
    data_fim: Optional[datetime] = Field(None, description="Data final")
    cliente_nome: Optional[str] = Field(None, description="Nome do cliente envolvido")
    page: int = Field(default=1, ge=1, description="Página")
    per_page: int = Field(default=20, ge=1, le=100, description="Itens por página")


class AtoComLivro(AtoResponse):
    """Schema para ato com informações do livro."""
    livro: 'LivroResponse'


# Schemas para adição de averbações a um ato
class AdicionarAverbacaoRequest(BaseModel):
    """Schema para adicionar averbação a um ato."""
    averbacoes: List[AverbacaoCreate]


class AdicionarAverbacaoResponse(BaseModel):
    """Schema para resposta de adição de averbações."""
    ato_id: int
    averbacoes_adicionadas: int
    averbacoes: List[AverbacaoResponse]
    message: str


# Forward reference para evitar import circular
from app.schemas.livro import LivroResponse
AtoComLivro.model_rebuild()
AtoWithAverbacoes.model_rebuild()