from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from typing import AsyncGenerator
from app.core.config import settings
from loguru import logger


# Configurar engine do banco de dados
if "sqlite" in settings.get_database_url():
    # Configuração específica para SQLite
    engine = create_async_engine(
        settings.get_database_url(),
        echo=settings.DEBUG,
        poolclass=StaticPool,
        connect_args={
            "check_same_thread": False,
        },
    )
else:
    # Configuração para PostgreSQL
    engine = create_async_engine(
        settings.get_database_url(),
        echo=settings.DEBUG,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )

# Criar session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency para obter uma sessão do banco de dados."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            logger.error(f"Erro na sessão do banco de dados: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Inicializa o banco de dados criando as tabelas."""
    from app.db.base import Base
    
    async with engine.begin() as conn:
        # Criar todas as tabelas
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Tabelas do banco de dados criadas com sucesso")


async def drop_db() -> None:
    """Remove todas as tabelas do banco de dados."""
    from app.db.base import Base
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        logger.warning("Todas as tabelas do banco de dados foram removidas")


async def reset_db() -> None:
    """Reseta o banco de dados (remove e recria todas as tabelas)."""
    await drop_db()
    await init_db()
    logger.info("Banco de dados resetado com sucesso")


class DatabaseManager:
    """Gerenciador de operações do banco de dados."""
    
    def __init__(self):
        self.engine = engine
        self.session_factory = AsyncSessionLocal
    
    async def create_session(self) -> AsyncSession:
        """Cria uma nova sessão do banco de dados."""
        return self.session_factory()
    
    async def health_check(self) -> bool:
        """Verifica se o banco de dados está acessível."""
        try:
            async with self.session_factory() as session:
                await session.execute("SELECT 1")
                return True
        except Exception as e:
            logger.error(f"Health check do banco falhou: {e}")
            return False
    
    async def close(self):
        """Fecha as conexões do banco de dados."""
        await self.engine.dispose()
        logger.info("Conexões do banco de dados fechadas")


# Instância global do gerenciador
db_manager = DatabaseManager()