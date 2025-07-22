from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.ai_usage import OperationType, OperationStatus


class AiUsageLogBase(BaseModel):
    """Schema base para log de uso da IA."""
    operation_type: OperationType = Field(..., description="Tipo de operação")
    operation_id: Optional[str] = Field(None, max_length=100, description="ID da operação")
    prompt: str = Field(..., description="Prompt enviado para a IA")
    input_data: Optional[Dict[str, Any]] = Field(None, description="Dados de entrada (sanitizados)")
    response_data: Optional[Dict[str, Any]] = Field(None, description="Dados de resposta (sanitizados)")
    model_used: Optional[str] = Field(None, max_length=100, description="Modelo de IA utilizado")
    
    # Métricas
    tokens_input: Optional[int] = Field(None, ge=0, description="Tokens de entrada")
    tokens_output: Optional[int] = Field(None, ge=0, description="Tokens de saída")
    tokens_total: Optional[int] = Field(None, ge=0, description="Total de tokens")
    cost_estimate: Optional[float] = Field(None, ge=0, description="Custo estimado")
    response_time_ms: Optional[int] = Field(None, ge=0, description="Tempo de resposta em ms")
    
    status: OperationStatus = Field(default=OperationStatus.PENDING, description="Status da operação")
    error_message: Optional[str] = Field(None, description="Mensagem de erro")
    
    @validator('tokens_total')
    def validate_tokens_total(cls, v, values):
        """Valida se o total de tokens é consistente."""
        if v is not None:
            tokens_input = values.get('tokens_input', 0) or 0
            tokens_output = values.get('tokens_output', 0) or 0
            expected_total = tokens_input + tokens_output
            
            if expected_total > 0 and abs(v - expected_total) > 10:  # Tolerância de 10 tokens
                raise ValueError('Total de tokens inconsistente com entrada + saída')
        
        return v
    
    @validator('prompt')
    def validate_prompt(cls, v):
        """Valida o prompt."""
        if len(v.strip()) == 0:
            raise ValueError('Prompt não pode estar vazio')
        
        # Limita o tamanho do prompt para evitar logs muito grandes
        if len(v) > 10000:
            return v[:10000] + "... [truncado]"
        
        return v


class AiUsageLogCreate(AiUsageLogBase):
    """Schema para criação de log de uso da IA."""
    pass


class AiUsageLogUpdate(BaseModel):
    """Schema para atualização de log de uso da IA."""
    response_data: Optional[Dict[str, Any]] = None
    tokens_input: Optional[int] = Field(None, ge=0)
    tokens_output: Optional[int] = Field(None, ge=0)
    tokens_total: Optional[int] = Field(None, ge=0)
    cost_estimate: Optional[float] = Field(None, ge=0)
    response_time_ms: Optional[int] = Field(None, ge=0)
    status: Optional[OperationStatus] = None
    error_message: Optional[str] = None


class AiUsageLogResponse(AiUsageLogBase):
    """Schema para resposta de log de uso da IA."""
    id: int
    created_at: datetime
    updated_at: datetime
    
    # Propriedades calculadas
    duration_seconds: Optional[float]
    cost_per_token: Optional[float]
    efficiency_score: Optional[float]
    
    class Config:
        from_attributes = True


class AiUsageLogListResponse(BaseModel):
    """Schema para lista de logs de uso da IA."""
    logs: List[AiUsageLogResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class AiUsageLogSearchRequest(BaseModel):
    """Schema para busca de logs de uso da IA."""
    operation_type: Optional[OperationType] = Field(None, description="Filtro por tipo de operação")
    status: Optional[OperationStatus] = Field(None, description="Filtro por status")
    model_used: Optional[str] = Field(None, description="Filtro por modelo utilizado")
    operation_id: Optional[str] = Field(None, description="Filtro por ID da operação")
    
    # Filtros de data
    data_inicio: Optional[datetime] = Field(None, description="Data de início")
    data_fim: Optional[datetime] = Field(None, description="Data de fim")
    
    # Filtros de métricas
    min_tokens: Optional[int] = Field(None, ge=0, description="Mínimo de tokens")
    max_tokens: Optional[int] = Field(None, ge=0, description="Máximo de tokens")
    min_cost: Optional[float] = Field(None, ge=0, description="Custo mínimo")
    max_cost: Optional[float] = Field(None, ge=0, description="Custo máximo")
    min_response_time: Optional[int] = Field(None, ge=0, description="Tempo mínimo de resposta (ms)")
    max_response_time: Optional[int] = Field(None, ge=0, description="Tempo máximo de resposta (ms)")
    
    # Paginação
    page: int = Field(default=1, ge=1, description="Página")
    per_page: int = Field(default=20, ge=1, le=100, description="Itens por página")
    
    # Ordenação
    order_by: str = Field(default="created_at", description="Campo para ordenação")
    order_direction: str = Field(default="desc", description="Direção da ordenação")
    
    @validator('order_by')
    def validate_order_by(cls, v):
        """Valida o campo de ordenação."""
        campos_validos = {
            'created_at', 'updated_at', 'operation_type', 'status',
            'tokens_total', 'cost_estimate', 'response_time_ms'
        }
        if v not in campos_validos:
            raise ValueError(f'Campo de ordenação deve ser um dos: {", ".join(campos_validos)}')
        return v
    
    @validator('order_direction')
    def validate_order_direction(cls, v):
        """Valida a direção da ordenação."""
        if v.lower() not in ['asc', 'desc']:
            raise ValueError('Direção deve ser "asc" ou "desc"')
        return v.lower()


# Schemas para estatísticas e relatórios
class AiUsageStatsRequest(BaseModel):
    """Schema para solicitação de estatísticas de uso da IA."""
    data_inicio: Optional[datetime] = Field(None, description="Data de início")
    data_fim: Optional[datetime] = Field(None, description="Data de fim")
    operation_type: Optional[OperationType] = Field(None, description="Filtro por tipo de operação")
    model_used: Optional[str] = Field(None, description="Filtro por modelo")
    group_by: str = Field(default="day", description="Agrupamento (day, week, month)")
    
    @validator('group_by')
    def validate_group_by(cls, v):
        """Valida o agrupamento."""
        if v.lower() not in ['day', 'week', 'month']:
            raise ValueError('Agrupamento deve ser "day", "week" ou "month"')
        return v.lower()


class AiUsageStatsResponse(BaseModel):
    """Schema para resposta de estatísticas de uso da IA."""
    periodo: str
    total_operacoes: int
    operacoes_sucesso: int
    operacoes_erro: int
    taxa_sucesso: float
    
    total_tokens: int
    tokens_input: int
    tokens_output: int
    
    custo_total: float
    custo_medio: float
    
    tempo_resposta_medio: float
    tempo_resposta_min: float
    tempo_resposta_max: float
    
    operacoes_por_tipo: Dict[str, int]
    modelos_utilizados: Dict[str, int]


class AiUsageSummaryResponse(BaseModel):
    """Schema para resumo geral de uso da IA."""
    # Totais gerais
    total_operacoes: int
    total_tokens: int
    custo_total: float
    
    # Últimos 30 dias
    operacoes_ultimo_mes: int
    tokens_ultimo_mes: int
    custo_ultimo_mes: float
    
    # Médias
    tokens_por_operacao: float
    custo_por_operacao: float
    tempo_resposta_medio: float
    
    # Top operações
    top_tipos_operacao: List[Dict[str, Any]]
    top_modelos: List[Dict[str, Any]]
    
    # Tendências
    tendencia_operacoes: str  # "crescendo", "estavel", "decrescendo"
    tendencia_custo: str
    
    # Eficiência
    taxa_sucesso_geral: float
    operacoes_com_erro_recente: int


class AiUsageExportRequest(BaseModel):
    """Schema para exportação de logs de uso da IA."""
    data_inicio: Optional[datetime] = Field(None, description="Data de início")
    data_fim: Optional[datetime] = Field(None, description="Data de fim")
    operation_type: Optional[OperationType] = Field(None, description="Filtro por tipo de operação")
    status: Optional[OperationStatus] = Field(None, description="Filtro por status")
    formato: str = Field(default="csv", description="Formato de exportação")
    incluir_dados_completos: bool = Field(default=False, description="Se deve incluir dados completos")
    
    @validator('formato')
    def validate_formato(cls, v):
        """Valida o formato de exportação."""
        formatos_validos = {'csv', 'excel', 'json'}
        if v.lower() not in formatos_validos:
            raise ValueError(f'Formato deve ser um dos: {", ".join(formatos_validos)}')
        return v.lower()


class AiUsageExportResponse(BaseModel):
    """Schema para resposta de exportação."""
    arquivo_id: str
    nome_arquivo: str
    tamanho_arquivo: int
    total_registros: int
    data_geracao: datetime
    url_download: str
    expira_em: datetime


# Schemas para alertas e monitoramento
class AiUsageAlertRequest(BaseModel):
    """Schema para configuração de alertas de uso da IA."""
    nome: str = Field(..., min_length=1, max_length=100, description="Nome do alerta")
    tipo_metrica: str = Field(..., description="Tipo de métrica a monitorar")
    valor_limite: float = Field(..., ge=0, description="Valor limite para o alerta")
    periodo_minutos: int = Field(default=60, ge=5, le=1440, description="Período de monitoramento em minutos")
    ativo: bool = Field(default=True, description="Se o alerta está ativo")
    
    @validator('tipo_metrica')
    def validate_tipo_metrica(cls, v):
        """Valida o tipo de métrica."""
        metricas_validas = {
            'custo_total', 'custo_por_hora', 'tokens_total', 'tokens_por_hora',
            'operacoes_total', 'operacoes_por_hora', 'taxa_erro', 'tempo_resposta_medio'
        }
        if v not in metricas_validas:
            raise ValueError(f'Métrica deve ser uma das: {", ".join(metricas_validas)}')
        return v


class AiUsageAlertResponse(BaseModel):
    """Schema para resposta de alerta."""
    id: int
    nome: str
    tipo_metrica: str
    valor_limite: float
    valor_atual: Optional[float]
    periodo_minutos: int
    ativo: bool
    ultima_verificacao: Optional[datetime]
    ultimo_disparo: Optional[datetime]
    total_disparos: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AiUsageHealthCheckResponse(BaseModel):
    """Schema para verificação de saúde do uso da IA."""
    status: str  # "healthy", "warning", "critical"
    ultima_operacao: Optional[datetime]
    operacoes_ultima_hora: int
    taxa_erro_ultima_hora: float
    custo_ultima_hora: float
    tempo_resposta_medio_ultima_hora: float
    alertas_ativos: int
    alertas_disparados_hoje: int
    
    # Detalhes por tipo de operação
    status_por_tipo: Dict[str, Dict[str, Any]]
    
    # Recomendações
    recomendacoes: List[str]
    
    # Timestamp da verificação
    verificado_em: datetime