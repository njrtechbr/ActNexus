from pydantic_settings import BaseSettings
from pydantic import Field, validator
from typing import List, Optional
from datetime import datetime
import os


class Settings(BaseSettings):
    """Configurações da aplicação."""
    
    # Application
    APP_NAME: str = Field(default="ActNexus Backend", env="APP_NAME")
    APP_VERSION: str = Field(default="1.0.0", env="APP_VERSION")
    DEBUG: bool = Field(default=True, env="DEBUG")
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    
    # Database
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./actnexus.db",
        env="DATABASE_URL"
    )
    DATABASE_URL_TEST: str = Field(
        default="sqlite+aiosqlite:///./test.db",
        env="DATABASE_URL_TEST"
    )
    
    # Security
    SECRET_KEY: str = Field(
        default="your-super-secret-key-change-this-in-production",
        env="SECRET_KEY"
    )
    ALGORITHM: str = Field(default="HS256", env="ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, env="REFRESH_TOKEN_EXPIRE_DAYS")
    
    # AI Configuration
    GEMINI_API_KEY: Optional[str] = Field(default=None, env="GEMINI_API_KEY")
    GEMINI_MODEL: str = Field(default="gemini-pro", env="GEMINI_MODEL")
    
    # CORS
    ALLOWED_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        env="ALLOWED_ORIGINS"
    )
    
    # File Upload
    MAX_FILE_SIZE: int = Field(default=50000000, env="MAX_FILE_SIZE")  # 50MB
    UPLOAD_DIR: str = Field(default="./uploads", env="UPLOAD_DIR")
    
    # Logging
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    LOG_FILE: str = Field(default="./logs/app.log", env="LOG_FILE")
    
    @validator("ALLOWED_ORIGINS", pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @validator("DATABASE_URL", pre=True)
    def validate_database_url(cls, v):
        if not v:
            raise ValueError("DATABASE_URL é obrigatório")
        return v
    
    def get_current_timestamp(self) -> str:
        """Retorna timestamp atual em formato ISO."""
        return datetime.utcnow().isoformat()
    
    def is_production(self) -> bool:
        """Verifica se está em ambiente de produção."""
        return self.ENVIRONMENT.lower() == "production"
    
    def is_development(self) -> bool:
        """Verifica se está em ambiente de desenvolvimento."""
        return self.ENVIRONMENT.lower() == "development"
    
    def is_testing(self) -> bool:
        """Verifica se está em ambiente de teste."""
        return self.ENVIRONMENT.lower() == "testing"
    
    def get_database_url(self) -> str:
        """Retorna a URL do banco de dados baseada no ambiente."""
        if self.is_testing():
            return self.DATABASE_URL_TEST
        return self.DATABASE_URL
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Instância global das configurações
settings = Settings()

# Criar diretórios necessários
os.makedirs(os.path.dirname(settings.LOG_FILE), exist_ok=True)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)