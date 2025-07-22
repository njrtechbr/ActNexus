from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time
import logging
from loguru import logger

from app.core.config import settings
from app.core.logging import setup_logging
from app.db.session import engine, create_tables
from app.api import api_router
from app.services.minio_service import MinIOService
from app.services.config_service import ConfigService


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerenciar o ciclo de vida da aplicação."""
    logger.info("Iniciando aplicação ActNexus Backend...")
    
    try:
        # Configurar logging
        setup_logging()
        
        # Criar tabelas do banco de dados
        logger.info("Criando tabelas do banco de dados...")
        await create_tables()
        logger.info("Tabelas criadas com sucesso")
        
        # Inicializar MinIO
        logger.info("Inicializando MinIO...")
        minio_service = MinIOService()
        await minio_service.ensure_buckets_exist()
        logger.info("MinIO inicializado com sucesso")
        
        # Inicializar cache de configurações
        logger.info("Inicializando cache de configurações...")
        config_service = ConfigService()
        await config_service.enable_cache()
        logger.info("Cache de configurações inicializado")
        
        logger.info("Aplicação iniciada com sucesso!")
        
        yield
        
    except Exception as e:
        logger.error(f"Erro durante a inicialização: {str(e)}")
        raise
    finally:
        # Cleanup
        logger.info("Finalizando aplicação...")
        await engine.dispose()
        logger.info("Aplicação finalizada")


# Criar a aplicação FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API Backend para a plataforma ActNexus - Sistema de Gestão de Livros Notariais",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan
)

# Configurar CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Middleware de hosts confiáveis
if settings.ALLOWED_HOSTS:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS
    )


# Middleware para logging de requisições
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Middleware para logging de requisições HTTP."""
    start_time = time.time()
    
    # Log da requisição
    logger.info(
        f"Requisição: {request.method} {request.url.path} "
        f"- IP: {request.client.host if request.client else 'unknown'}"
    )
    
    try:
        response = await call_next(request)
        
        # Calcular tempo de processamento
        process_time = time.time() - start_time
        
        # Log da resposta
        logger.info(
            f"Resposta: {request.method} {request.url.path} "
            f"- Status: {response.status_code} "
            f"- Tempo: {process_time:.3f}s"
        )
        
        # Adicionar header com tempo de processamento
        response.headers["X-Process-Time"] = str(process_time)
        
        return response
        
    except Exception as e:
        # Log de erro
        process_time = time.time() - start_time
        logger.error(
            f"Erro na requisição: {request.method} {request.url.path} "
            f"- Erro: {str(e)} "
            f"- Tempo: {process_time:.3f}s"
        )
        raise


# Handler global para exceções
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handler global para exceções não tratadas."""
    logger.error(
        f"Exceção não tratada: {type(exc).__name__}: {str(exc)} "
        f"- URL: {request.url} "
        f"- Método: {request.method}"
    )
    
    # Em produção, não expor detalhes do erro
    if settings.DEBUG:
        detail = str(exc)
    else:
        detail = "Erro interno do servidor"
    
    return JSONResponse(
        status_code=500,
        content={"detail": detail}
    )


# Handler para HTTPException
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handler para HTTPException."""
    logger.warning(
        f"HTTPException: {exc.status_code} - {exc.detail} "
        f"- URL: {request.url} "
        f"- Método: {request.method}"
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )


# Incluir roteadores da API
app.include_router(api_router)


# Endpoint de health check
@app.get("/health")
async def health_check():
    """Endpoint para verificação de saúde da aplicação."""
    return {
        "status": "healthy",
        "service": "ActNexus Backend",
        "version": "1.0.0",
        "timestamp": time.time()
    }


# Endpoint raiz
@app.get("/")
async def root():
    """Endpoint raiz da API."""
    return {
        "message": "ActNexus Backend API",
        "version": "1.0.0",
        "docs": "/docs" if settings.DEBUG else "Documentação disponível apenas em modo debug",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    
    logger.info("Iniciando servidor de desenvolvimento...")
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info" if settings.DEBUG else "warning"
    )