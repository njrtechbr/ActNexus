from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.livro import StatusLivro


class LivroBase(BaseModel):
    """Schema base para livro."""
    numero: int = Field(..., gt=0, description="Número do livro")
    ano: int = Field(..., ge=1900, le=2100, description="Ano do livro")
    tipo: str = Field(..., min_length=1, max_length=100, description="Tipo do livro")
    descricao: Optional[str] = Field(None, max_length=1000, description="Descrição do livro")
    observacoes: Optional[str] = Field(None, max_length=2000, description="Observações")


class LivroCreate(LivroBase):
    """Schema para criação de livro."""
    pass


class LivroUpdate(BaseModel):
    """Schema para atualização de livro."""
    numero: Optional[int] = Field(None, gt=0)
    ano: Optional[int] = Field(None, ge=1900, le=2100)
    tipo: Optional[str] = Field(None, min_length=1, max_length=100)
    descricao: Optional[str] = Field(None, max_length=1000)
    observacoes: Optional[str] = Field(None, max_length=2000)
    status: Optional[StatusLivro] = None


class LivroResponse(LivroBase):
    """Schema para resposta de livro."""
    id: int
    status: StatusLivro
    caminho_pdf: Optional[str]
    nome_arquivo_original: Optional[str]
    tamanho_arquivo: Optional[int]
    processado: bool
    data_processamento: Optional[datetime]
    erro_processamento: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    # Propriedades calculadas
    identificacao: str
    total_atos: int
    
    class Config:
        from_attributes = True


class LivroWithAtos(LivroResponse):
    """Schema para livro com seus atos."""
    atos: List['AtoResponse'] = []


class LivroListResponse(BaseModel):
    """Schema para lista de livros."""
    livros: List[LivroResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class LivroProcessRequest(BaseModel):
    """Schema para solicitação de processamento de livro."""
    livro_id: int = Field(..., gt=0, description="ID do livro a ser processado")


class LivroProcessResponse(BaseModel):
    """Schema para resposta de processamento de livro."""
    message: str
    livro_id: int
    status: str


class LivroUploadResponse(BaseModel):
    """Schema para resposta de upload de PDF."""
    message: str
    livro_id: int
    filename: str
    file_size: int
    upload_path: str


# Schemas para criação de livro com atos (resultado do processamento de PDF)
class AtoProcessado(BaseModel):
    """Schema para ato processado a partir de PDF."""
    numero_ato: str = Field(..., description="Número do ato")
    tipo_ato: str = Field(..., description="Tipo do ato")
    data_ato: Optional[datetime] = Field(None, description="Data do ato")
    conteudo_markdown: str = Field(..., description="Conteúdo em Markdown")
    partes: Optional[List[Dict[str, Any]]] = Field(None, description="Partes envolvidas")
    observacoes: Optional[str] = Field(None, description="Observações")


class LivroComAtosCreate(BaseModel):
    """Schema para criação de livro com atos (resultado do processamento)."""
    livro: LivroCreate
    atos: List[AtoProcessado]


class LivroComAtosResponse(BaseModel):
    """Schema para resposta de criação de livro com atos."""
    livro: LivroResponse
    atos_criados: int
    message: str


# Forward reference para evitar import circular
from app.schemas.ato import AtoResponse
LivroWithAtos.model_rebuild()