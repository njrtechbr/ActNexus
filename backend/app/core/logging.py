import sys
import logging
from loguru import logger
from app.core.config import settings


class InterceptHandler(logging.Handler):
    """Handler para interceptar logs do Python padrão e redirecionar para loguru."""
    
    def emit(self, record):
        # Get corresponding Loguru level if it exists
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # Find caller from where originated the logged message
        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )


def setup_logging():
    """Configura o sistema de logging da aplicação."""
    
    # Remove handlers padrão do loguru
    logger.remove()
    
    # Configurar formato de log
    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
        "<level>{message}</level>"
    )
    
    # Handler para console (stdout)
    logger.add(
        sys.stdout,
        format=log_format,
        level=settings.LOG_LEVEL,
        colorize=True,
        backtrace=True,
        diagnose=True
    )
    
    # Handler para arquivo (apenas em produção ou se especificado)
    if not settings.is_development() or settings.LOG_FILE:
        logger.add(
            settings.LOG_FILE,
            format=log_format,
            level=settings.LOG_LEVEL,
            rotation="10 MB",
            retention="30 days",
            compression="zip",
            backtrace=True,
            diagnose=True
        )
    
    # Interceptar logs do Python padrão
    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)
    
    # Configurar loggers específicos
    for logger_name in ["uvicorn", "uvicorn.access", "fastapi", "sqlalchemy"]:
        logging_logger = logging.getLogger(logger_name)
        logging_logger.handlers = [InterceptHandler()]
        logging_logger.setLevel(logging.INFO)
    
    # Reduzir verbosidade de alguns loggers em produção
    if settings.is_production():
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
        logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    
    logger.info(f"Logging configurado - Nível: {settings.LOG_LEVEL}")


def get_logger(name: str):
    """Retorna um logger configurado para o módulo especificado."""
    return logger.bind(module=name)