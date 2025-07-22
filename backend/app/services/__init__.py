"""Módulo de serviços da aplicação ActNexus.

Este módulo contém todos os serviços de negócio da aplicação,
incluindo integração com banco de dados, armazenamento de arquivos,
IA e processamento de documentos.
"""

from .user_service import UserService
from .livro_service import LivroService
from .ato_service import AtoService, AverbacaoService
from .cliente_service import ClienteService, ContatoService, EnderecoService
from .config_service import ConfigService
from .ai_usage_service import AiUsageService
from .minio_service import MinIOService, minio_service
from .langflow_service import LangFlowService, langflow_service
from .pdf_processor import PDFProcessorService, pdf_processor

__all__ = [
    # Serviços de entidades principais
    "UserService",
    "LivroService",
    "AtoService",
    "AverbacaoService",
    "ClienteService",
    "ContatoService",
    "EnderecoService",
    "ConfigService",
    "AiUsageService",
    
    # Serviços de infraestrutura
    "MinIOService",
    "minio_service",
    "LangFlowService",
    "langflow_service",
    
    # Serviços de processamento
    "PDFProcessorService",
    "pdf_processor"
]