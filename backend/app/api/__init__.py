from fastapi import APIRouter
from app.api import auth, users, livros, atos, clientes, config, ia_proxy

# Criar o roteador principal da API
api_router = APIRouter(prefix="/api/v1")

# Incluir todos os roteadores
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(livros.router)
api_router.include_router(atos.router)
api_router.include_router(clientes.router)
api_router.include_router(config.router)
api_router.include_router(ia_proxy.router)

# Exportar o roteador principal
__all__ = ["api_router"]