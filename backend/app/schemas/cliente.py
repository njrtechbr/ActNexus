from pydantic import BaseModel, Field, validator, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.cliente import (
    TipoCliente, TipoContato, TipoEndereco, TipoEvento
)


# Schemas para Cliente
class ClienteBase(BaseModel):
    """Schema base para cliente."""
    nome: str = Field(..., min_length=2, max_length=255, description="Nome do cliente")
    cpf_cnpj: Optional[str] = Field(None, max_length=20, description="CPF ou CNPJ")
    tipo: TipoCliente = Field(default=TipoCliente.PESSOA_FISICA, description="Tipo de cliente")
    
    # Dados para pessoa física
    rg: Optional[str] = Field(None, max_length=20, description="RG")
    data_nascimento: Optional[datetime] = Field(None, description="Data de nascimento")
    estado_civil: Optional[str] = Field(None, max_length=50, description="Estado civil")
    profissao: Optional[str] = Field(None, max_length=100, description="Profissão")
    nacionalidade: Optional[str] = Field(None, max_length=50, description="Nacionalidade")
    
    # Dados para pessoa jurídica
    razao_social: Optional[str] = Field(None, max_length=255, description="Razão social")
    nome_fantasia: Optional[str] = Field(None, max_length=255, description="Nome fantasia")
    inscricao_estadual: Optional[str] = Field(None, max_length=20, description="Inscrição estadual")
    inscricao_municipal: Optional[str] = Field(None, max_length=20, description="Inscrição municipal")
    
    ativo: bool = Field(default=True, description="Se o cliente está ativo")
    
    @validator('cpf_cnpj')
    def validate_cpf_cnpj(cls, v, values):
        """Valida CPF/CNPJ baseado no tipo de cliente."""
        if not v:
            return v
        
        # Remove caracteres não numéricos
        v = ''.join(filter(str.isdigit, v))
        
        tipo = values.get('tipo')
        if tipo == TipoCliente.PESSOA_FISICA:
            if len(v) != 11:
                raise ValueError('CPF deve ter 11 dígitos')
        elif tipo == TipoCliente.PESSOA_JURIDICA:
            if len(v) != 14:
                raise ValueError('CNPJ deve ter 14 dígitos')
        
        return v


class ClienteCreate(ClienteBase):
    """Schema para criação de cliente."""
    contatos: Optional[List['ContatoCreate']] = Field(default=[], description="Contatos iniciais")
    enderecos: Optional[List['EnderecoCreate']] = Field(default=[], description="Endereços iniciais")
    documentos: Optional[List['DocumentoClienteCreate']] = Field(default=[], description="Documentos iniciais")
    observacoes: Optional[List['ObservacaoCreate']] = Field(default=[], description="Observações iniciais")
    campos_adicionais: Optional[List['CampoAdicionalClienteCreate']] = Field(default=[], description="Campos adicionais")


class ClienteUpdate(BaseModel):
    """Schema para atualização de cliente."""
    nome: Optional[str] = Field(None, min_length=2, max_length=255)
    cpf_cnpj: Optional[str] = Field(None, max_length=20)
    tipo: Optional[TipoCliente] = None
    rg: Optional[str] = Field(None, max_length=20)
    data_nascimento: Optional[datetime] = None
    estado_civil: Optional[str] = Field(None, max_length=50)
    profissao: Optional[str] = Field(None, max_length=100)
    nacionalidade: Optional[str] = Field(None, max_length=50)
    razao_social: Optional[str] = Field(None, max_length=255)
    nome_fantasia: Optional[str] = Field(None, max_length=255)
    inscricao_estadual: Optional[str] = Field(None, max_length=20)
    inscricao_municipal: Optional[str] = Field(None, max_length=20)
    ativo: Optional[bool] = None
    
    # Dados relacionados
    contatos: Optional[List['ContatoCreate']] = None
    enderecos: Optional[List['EnderecoCreate']] = None
    documentos: Optional[List['DocumentoClienteCreate']] = None
    observacoes: Optional[List['ObservacaoCreate']] = None
    campos_adicionais: Optional[List['CampoAdicionalClienteCreate']] = None


class ClienteResponse(ClienteBase):
    """Schema para resposta de cliente."""
    id: int
    created_at: datetime
    updated_at: datetime
    
    # Propriedades calculadas
    documento_principal: Optional[str]
    nome_completo: str
    
    class Config:
        from_attributes = True


class ClienteWithDetails(ClienteResponse):
    """Schema para cliente com todos os detalhes."""
    contatos: List['ContatoResponse'] = []
    enderecos: List['EnderecoResponse'] = []
    documentos: List['DocumentoClienteResponse'] = []
    observacoes: List['ObservacaoResponse'] = []
    eventos: List['EventoResponse'] = []
    campos_adicionais: List['CampoAdicionalClienteResponse'] = []


# Schemas para Contato
class ContatoBase(BaseModel):
    """Schema base para contato."""
    tipo: TipoContato = Field(..., description="Tipo de contato")
    valor: str = Field(..., min_length=1, max_length=255, description="Valor do contato")
    descricao: Optional[str] = Field(None, max_length=255, description="Descrição")
    principal: bool = Field(default=False, description="Se é o contato principal")
    
    @validator('valor')
    def validate_valor(cls, v, values):
        """Valida o valor baseado no tipo de contato."""
        tipo = values.get('tipo')
        
        if tipo == TipoContato.EMAIL:
            # Validação básica de email
            if '@' not in v or '.' not in v.split('@')[-1]:
                raise ValueError('Email inválido')
        elif tipo in [TipoContato.TELEFONE, TipoContato.CELULAR, TipoContato.WHATSAPP]:
            # Remove caracteres não numéricos para validação
            digits = ''.join(filter(str.isdigit, v))
            if len(digits) < 10 or len(digits) > 11:
                raise ValueError('Telefone deve ter 10 ou 11 dígitos')
        
        return v


class ContatoCreate(ContatoBase):
    """Schema para criação de contato."""
    pass


class ContatoUpdate(BaseModel):
    """Schema para atualização de contato."""
    tipo: Optional[TipoContato] = None
    valor: Optional[str] = Field(None, min_length=1, max_length=255)
    descricao: Optional[str] = Field(None, max_length=255)
    principal: Optional[bool] = None


class ContatoResponse(ContatoBase):
    """Schema para resposta de contato."""
    id: int
    cliente_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Schemas para Endereço
class EnderecoBase(BaseModel):
    """Schema base para endereço."""
    tipo: TipoEndereco = Field(default=TipoEndereco.RESIDENCIAL, description="Tipo de endereço")
    logradouro: str = Field(..., min_length=1, max_length=255, description="Logradouro")
    numero: Optional[str] = Field(None, max_length=20, description="Número")
    complemento: Optional[str] = Field(None, max_length=100, description="Complemento")
    bairro: str = Field(..., min_length=1, max_length=100, description="Bairro")
    cidade: str = Field(..., min_length=1, max_length=100, description="Cidade")
    estado: str = Field(..., min_length=2, max_length=2, description="Estado (UF)")
    cep: Optional[str] = Field(None, max_length=10, description="CEP")
    pais: str = Field(default="Brasil", max_length=50, description="País")
    
    @validator('estado')
    def validate_estado(cls, v):
        """Valida o estado (UF)."""
        if v:
            v = v.upper()
            ufs_validas = {
                'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
                'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
                'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
            }
            if v not in ufs_validas:
                raise ValueError('Estado inválido')
        return v
    
    @validator('cep')
    def validate_cep(cls, v):
        """Valida o CEP."""
        if v:
            # Remove caracteres não numéricos
            digits = ''.join(filter(str.isdigit, v))
            if len(digits) != 8:
                raise ValueError('CEP deve ter 8 dígitos')
            # Formatar CEP
            return f"{digits[:5]}-{digits[5:]}"
        return v


class EnderecoCreate(EnderecoBase):
    """Schema para criação de endereço."""
    pass


class EnderecoUpdate(BaseModel):
    """Schema para atualização de endereço."""
    tipo: Optional[TipoEndereco] = None
    logradouro: Optional[str] = Field(None, min_length=1, max_length=255)
    numero: Optional[str] = Field(None, max_length=20)
    complemento: Optional[str] = Field(None, max_length=100)
    bairro: Optional[str] = Field(None, min_length=1, max_length=100)
    cidade: Optional[str] = Field(None, min_length=1, max_length=100)
    estado: Optional[str] = Field(None, min_length=2, max_length=2)
    cep: Optional[str] = Field(None, max_length=10)
    pais: Optional[str] = Field(None, max_length=50)


class EnderecoResponse(EnderecoBase):
    """Schema para resposta de endereço."""
    id: int
    cliente_id: int
    created_at: datetime
    updated_at: datetime
    endereco_completo: str
    
    class Config:
        from_attributes = True


# Schemas para Documento
class DocumentoClienteBase(BaseModel):
    """Schema base para documento de cliente."""
    tipo: str = Field(..., min_length=1, max_length=100, description="Tipo do documento")
    numero: str = Field(..., min_length=1, max_length=100, description="Número do documento")
    orgao_emissor: Optional[str] = Field(None, max_length=100, description="Órgão emissor")
    data_emissao: Optional[datetime] = Field(None, description="Data de emissão")
    data_validade: Optional[datetime] = Field(None, description="Data de validade")
    observacoes: Optional[str] = Field(None, max_length=500, description="Observações")


class DocumentoClienteCreate(DocumentoClienteBase):
    """Schema para criação de documento."""
    pass


class DocumentoClienteUpdate(BaseModel):
    """Schema para atualização de documento."""
    tipo: Optional[str] = Field(None, min_length=1, max_length=100)
    numero: Optional[str] = Field(None, min_length=1, max_length=100)
    orgao_emissor: Optional[str] = Field(None, max_length=100)
    data_emissao: Optional[datetime] = None
    data_validade: Optional[datetime] = None
    observacoes: Optional[str] = Field(None, max_length=500)


class DocumentoClienteResponse(DocumentoClienteBase):
    """Schema para resposta de documento."""
    id: int
    cliente_id: int
    created_at: datetime
    updated_at: datetime
    esta_vencido: bool
    
    class Config:
        from_attributes = True


# Schemas para Observação
class ObservacaoBase(BaseModel):
    """Schema base para observação."""
    titulo: Optional[str] = Field(None, max_length=255, description="Título da observação")
    texto: str = Field(..., min_length=1, description="Texto da observação")
    importante: bool = Field(default=False, description="Se é uma observação importante")


class ObservacaoCreate(ObservacaoBase):
    """Schema para criação de observação."""
    pass


class ObservacaoUpdate(BaseModel):
    """Schema para atualização de observação."""
    titulo: Optional[str] = Field(None, max_length=255)
    texto: Optional[str] = Field(None, min_length=1)
    importante: Optional[bool] = None


class ObservacaoResponse(ObservacaoBase):
    """Schema para resposta de observação."""
    id: int
    cliente_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Schemas para Evento
class EventoResponse(BaseModel):
    """Schema para resposta de evento."""
    id: int
    cliente_id: int
    tipo: TipoEvento
    descricao: str
    detalhes: Optional[Dict[str, Any]]
    data_evento: datetime
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Schemas para Campo Adicional
class CampoAdicionalClienteBase(BaseModel):
    """Schema base para campo adicional."""
    chave: str = Field(..., min_length=1, max_length=100, description="Chave do campo")
    valor: Optional[str] = Field(None, description="Valor do campo")
    tipo_valor: str = Field(default="string", description="Tipo do valor")


class CampoAdicionalClienteCreate(CampoAdicionalClienteBase):
    """Schema para criação de campo adicional."""
    pass


class CampoAdicionalClienteUpdate(BaseModel):
    """Schema para atualização de campo adicional."""
    chave: Optional[str] = Field(None, min_length=1, max_length=100)
    valor: Optional[str] = None
    tipo_valor: Optional[str] = None


class CampoAdicionalClienteResponse(CampoAdicionalClienteBase):
    """Schema para resposta de campo adicional."""
    id: int
    cliente_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Schemas para operações específicas
class ClienteListResponse(BaseModel):
    """Schema para lista de clientes."""
    clientes: List[ClienteResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class ClienteSearchRequest(BaseModel):
    """Schema para busca de clientes."""
    query: Optional[str] = Field(None, description="Termo de busca")
    tipo: Optional[TipoCliente] = Field(None, description="Filtro por tipo")
    ativo: Optional[bool] = Field(None, description="Filtro por status ativo")
    page: int = Field(default=1, ge=1, description="Página")
    per_page: int = Field(default=20, ge=1, le=100, description="Itens por página")


class ClientesByNamesRequest(BaseModel):
    """Schema para busca de clientes por nomes."""
    nomes: List[str] = Field(..., min_items=1, description="Lista de nomes para buscar")


class ClientesByNamesResponse(BaseModel):
    """Schema para resposta de busca por nomes."""
    clientes_encontrados: List[ClienteResponse]
    nomes_nao_encontrados: List[str]
    total_encontrados: int


# Rebuild models para resolver forward references
ClienteCreate.model_rebuild()
ClienteUpdate.model_rebuild()
ClienteWithDetails.model_rebuild()