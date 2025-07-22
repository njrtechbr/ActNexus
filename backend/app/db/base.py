from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, DateTime, func
from sqlalchemy.ext.asyncio import AsyncAttrs
from typing import Any


class Base(AsyncAttrs, declarative_base()):
    """Classe base para todos os modelos SQLAlchemy."""
    
    # Campos comuns para auditoria
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def to_dict(self) -> dict[str, Any]:
        """Converte o modelo para dicionário."""
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
        }
    
    def update_from_dict(self, data: dict[str, Any]) -> None:
        """Atualiza o modelo a partir de um dicionário."""
        for key, value in data.items():
            if hasattr(self, key) and key not in ['id', 'created_at', 'updated_at']:
                setattr(self, key, value)
    
    def __repr__(self) -> str:
        """Representação string do modelo."""
        return f"<{self.__class__.__name__}(id={self.id})>"


# Importar todos os modelos aqui para que sejam registrados
# Isso é necessário para que o Alembic detecte os modelos
from app.models.user import User  # noqa
from app.models.livro import Livro  # noqa
from app.models.ato import Ato, Averbacao  # noqa
from app.models.cliente import Cliente, Contato, Endereco, DocumentoCliente, Observacao, Evento, CampoAdicionalCliente  # noqa
from app.models.config import AppConfig  # noqa
from app.models.ai_usage import AiUsageLog  # noqa