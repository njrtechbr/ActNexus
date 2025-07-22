# Guia de Implementação do Backend ActNexus

## Visão Geral

Este documento detalha a implementação completa do backend para a plataforma ActNexus, incluindo a nova funcionalidade de processamento de PDFs. O backend será desenvolvido em Python usando FastAPI, SQLAlchemy 2.0, e PyMuPDF.

## Estrutura do Projeto

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # Aplicação FastAPI principal
│   ├── api/                    # Endpoints da API
│   │   ├── __init__.py
│   │   ├── auth.py            # Autenticação
│   │   ├── livros.py          # Livros e processamento PDF
│   │   ├── atos.py            # Atos
│   │   ├── clientes.py        # Clientes
│   │   ├── ai.py              # Endpoints de IA
│   │   ├── config.py          # Configurações
│   │   └── auditoria.py       # Auditoria de IA
│   ├── core/                   # Configurações centrais
│   │   ├── __init__.py
│   │   ├── config.py          # Configurações da aplicação
│   │   ├── security.py        # JWT e autenticação
│   │   └── deps.py            # Dependências
│   ├── db/                     # Configuração do banco
│   │   ├── __init__.py
│   │   ├── base.py            # Base para modelos
│   │   ├── session.py         # Sessão do banco
│   │   └── init_db.py         # Inicialização
│   ├── models/                 # Modelos SQLAlchemy
│   │   ├── __init__.py
│   │   ├── user.py            # Usuários
│   │   ├── livro.py           # Livros
│   │   ├── ato.py             # Atos
│   │   ├── cliente.py         # Clientes
│   │   ├── config.py          # Configurações
│   │   └── auditoria.py       # Logs de IA
│   ├── schemas/                # Schemas Pydantic
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── livro.py
│   │   ├── ato.py
│   │   ├── cliente.py
│   │   ├── config.py
│   │   └── ai.py
│   └── services/               # Lógica de negócio
│       ├── __init__.py
│       ├── auth.py            # Serviços de autenticação
│       ├── livro.py           # Serviços de livros
│       ├── ato.py             # Serviços de atos
│       ├── cliente.py         # Serviços de clientes
│       ├── config.py          # Serviços de configuração
│       ├── auditoria.py       # Serviços de auditoria
│       └── pdf_processor.py   # **NOVO**: Processamento PDF
├── alembic/                    # Migrações do banco
│   ├── versions/
│   ├── env.py
│   ├── script.py.mako
│   └── alembic.ini
├── tests/                      # Testes
├── requirements.txt            # Dependências
├── .env.example               # Exemplo de variáveis de ambiente
└── README.md
```

## Dependências (requirements.txt)

```txt
# Framework principal
fastapi>=0.104.0
uvicorn[standard]>=0.24.0

# Banco de dados
sqlalchemy>=2.0.0
alembic>=1.12.0
psycopg2-binary>=2.9.0
aiosqlite>=0.19.0  # Para desenvolvimento/testes

# Validação e serialização
pydantic>=2.0.0
pydantic-settings>=2.0.0

# Autenticação e segurança
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
python-multipart>=0.0.6

# Processamento de PDF
PyMuPDF>=1.23.0

# Utilitários
python-dotenv>=1.0.0
typing-extensions>=4.8.0

# Desenvolvimento
pytest>=7.4.0
pytest-asyncio>=0.21.0
httpx>=0.25.0
```

## Configuração Principal (app/main.py)

```python
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer

from app.api import auth, livros, atos, clientes, ai, config, auditoria
from app.core.config import settings
from app.db.session import engine
from app.db.init_db import init_db

app = FastAPI(
    title="ActNexus API",
    description="API para gestão de cartório com IA",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_HOSTS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(livros.router, prefix="/api/livros", tags=["livros"])
app.include_router(atos.router, prefix="/api/atos", tags=["atos"])
app.include_router(clientes.router, prefix="/api/clientes", tags=["clientes"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(config.router, prefix="/api/config", tags=["config"])
app.include_router(auditoria.router, prefix="/api/auditoria-ia", tags=["auditoria"])

@app.on_event("startup")
async def startup_event():
    await init_db()

@app.get("/")
async def root():
    return {"message": "ActNexus API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

## Modelos SQLAlchemy

### app/models/ato.py (Atualizado com campo Markdown)

```python
from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.db.base import Base

class Ato(Base):
    __tablename__ = "atos"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    livro_id = Column(UUID(as_uuid=True), ForeignKey("livros.id"), nullable=False)
    numero_ato = Column(Integer, nullable=False)
    tipo_ato = Column(String(100), nullable=False)
    data_ato = Column(Date, nullable=False)
    partes = Column(JSON, nullable=False)  # Lista de strings
    url_pdf = Column(String(500), nullable=True)
    escrevente = Column(String(100), nullable=True)
    
    # NOVO: Campo para conteúdo em Markdown
    conteudo_markdown = Column(Text, nullable=True)
    
    # Dados extraídos pela IA
    dados_extraidos = Column(JSON, nullable=True)
    
    # Relacionamentos
    livro = relationship("Livro", back_populates="atos")
    averbacoes = relationship("Averbacao", back_populates="ato", cascade="all, delete-orphan")

class Averbacao(Base):
    __tablename__ = "averbacoes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ato_id = Column(UUID(as_uuid=True), ForeignKey("atos.id"), nullable=False)
    texto = Column(Text, nullable=False)
    data_averbacao = Column(Date, nullable=False)
    data_registro = Column(String(50), nullable=False)  # ISO String
    
    # Relacionamento
    ato = relationship("Ato", back_populates="averbacoes")
```

### app/models/livro.py

```python
from sqlalchemy import Column, Integer, String, Date, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum

from app.db.base import Base

class StatusLivro(str, enum.Enum):
    CONCLUIDO = "Concluído"
    PROCESSANDO = "Processando"
    ARQUIVADO = "Arquivado"

class Livro(Base):
    __tablename__ = "livros"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    numero = Column(Integer, nullable=False)
    ano = Column(Integer, nullable=False)
    tipo = Column(String(50), nullable=False)
    status = Column(Enum(StatusLivro), nullable=False, default=StatusLivro.PROCESSANDO)
    total_atos = Column(Integer, nullable=False, default=0)
    data_abertura = Column(Date, nullable=False)
    data_fechamento = Column(Date, nullable=True)
    url_pdf_original = Column(String(500), nullable=True)
    
    # NOVO: Campo para armazenar caminho do arquivo PDF
    caminho_pdf = Column(String(500), nullable=True)
    
    # Relacionamentos
    atos = relationship("Ato", back_populates="livro", cascade="all, delete-orphan")
    
    # Índices únicos
    __table_args__ = (
        {'schema': None},
    )
```

## Novo Serviço: Processamento de PDF

### app/services/pdf_processor.py

```python
import fitz  # PyMuPDF
import re
from typing import List, Dict, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class PDFProcessor:
    """Serviço para processar PDFs de livros e extrair atos"""
    
    def __init__(self):
        # Padrões regex para identificar início de atos
        self.padroes_inicio_ato = [
            r"ATO\s+N[ºº°]?\s*(\d+)",
            r"TERMO\s+DE\s+\w+",
            r"PROTOCOLO\s+N[ºº°]?\s*(\d+)",
            r"ESCRITURA\s+DE\s+\w+",
            r"PROCURAÇÃO\s+N[ºº°]?\s*(\d+)"
        ]
    
    def processar_livro_pdf(self, caminho_pdf: str) -> List[Dict]:
        """Processa um PDF de livro e retorna lista de atos estruturados"""
        try:
            # Abre o documento PDF
            doc = fitz.open(caminho_pdf)
            texto_completo = self._extrair_texto_completo(doc)
            doc.close()
            
            # Identifica os atos no texto
            atos_brutos = self._identificar_atos(texto_completo)
            
            # Converte cada ato para formato estruturado
            atos_processados = []
            for i, ato_texto in enumerate(atos_brutos, 1):
                ato_estruturado = self._processar_ato_individual(ato_texto, i)
                if ato_estruturado:
                    atos_processados.append(ato_estruturado)
            
            logger.info(f"Processados {len(atos_processados)} atos do PDF {caminho_pdf}")
            return atos_processados
            
        except Exception as e:
            logger.error(f"Erro ao processar PDF {caminho_pdf}: {str(e)}")
            raise
    
    def _extrair_texto_completo(self, doc: fitz.Document) -> str:
        """Extrai todo o texto do documento PDF"""
        texto_completo = ""
        for pagina_num in range(len(doc)):
            pagina = doc.load_page(pagina_num)
            texto_pagina = pagina.get_text()
            texto_completo += f"\n--- PÁGINA {pagina_num + 1} ---\n{texto_pagina}"
        return texto_completo
    
    def _identificar_atos(self, texto: str) -> List[str]:
        """Identifica e separa os atos no texto completo"""
        atos = []
        linhas = texto.split('\n')
        ato_atual = []
        dentro_de_ato = False
        
        for linha in linhas:
            linha_limpa = linha.strip()
            
            # Verifica se é início de um novo ato
            if self._e_inicio_de_ato(linha_limpa):
                # Se já estava processando um ato, salva o anterior
                if dentro_de_ato and ato_atual:
                    atos.append('\n'.join(ato_atual))
                
                # Inicia novo ato
                ato_atual = [linha_limpa]
                dentro_de_ato = True
            elif dentro_de_ato:
                # Continua adicionando linhas ao ato atual
                ato_atual.append(linha_limpa)
        
        # Adiciona o último ato se existir
        if dentro_de_ato and ato_atual:
            atos.append('\n'.join(ato_atual))
        
        return atos
    
    def _e_inicio_de_ato(self, linha: str) -> bool:
        """Verifica se uma linha indica o início de um ato"""
        for padrao in self.padroes_inicio_ato:
            if re.search(padrao, linha, re.IGNORECASE):
                return True
        return False
    
    def _processar_ato_individual(self, texto_ato: str, numero_sequencial: int) -> Optional[Dict]:
        """Processa um ato individual e extrai informações estruturadas"""
        try:
            # Extrai número do ato
            numero_ato = self._extrair_numero_ato(texto_ato) or numero_sequencial
            
            # Extrai tipo do ato
            tipo_ato = self._extrair_tipo_ato(texto_ato)
            
            # Extrai data do ato
            data_ato = self._extrair_data_ato(texto_ato)
            
            # Extrai partes envolvidas
            partes = self._extrair_partes(texto_ato)
            
            # Converte para Markdown
            conteudo_markdown = self._converter_para_markdown(texto_ato)
            
            return {
                'numero_ato': numero_ato,
                'tipo_ato': tipo_ato,
                'data_ato': data_ato,
                'partes': partes,
                'conteudo_markdown': conteudo_markdown
            }
            
        except Exception as e:
            logger.error(f"Erro ao processar ato individual: {str(e)}")
            return None
    
    def _extrair_numero_ato(self, texto: str) -> Optional[int]:
        """Extrai o número do ato do texto"""
        for padrao in [r"ATO\s+N[ºº°]?\s*(\d+)", r"PROTOCOLO\s+N[ºº°]?\s*(\d+)"]:
            match = re.search(padrao, texto, re.IGNORECASE)
            if match:
                return int(match.group(1))
        return None
    
    def _extrair_tipo_ato(self, texto: str) -> str:
        """Extrai o tipo do ato do texto"""
        # Padrões comuns de tipos de ato
        tipos_conhecidos = {
            r"PROCURAÇÃO": "Procuração",
            r"ESCRITURA\s+DE\s+COMPRA\s+E\s+VENDA": "Escritura de Compra e Venda",
            r"ESCRITURA\s+DE\s+DOAÇÃO": "Escritura de Doação",
            r"TESTAMENTO": "Testamento",
            r"TERMO\s+DE\s+ABERTURA": "Termo de Abertura",
            r"TERMO\s+DE\s+ENCERRAMENTO": "Termo de Encerramento"
        }
        
        for padrao, tipo in tipos_conhecidos.items():
            if re.search(padrao, texto, re.IGNORECASE):
                return tipo
        
        return "Ato Notarial"  # Tipo genérico
    
    def _extrair_data_ato(self, texto: str) -> Optional[str]:
        """Extrai a data do ato do texto"""
        # Padrões de data comuns
        padroes_data = [
            r"(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})",
            r"(\d{1,2})/(\d{1,2})/(\d{4})",
            r"(\d{4})-(\d{1,2})-(\d{1,2})"
        ]
        
        meses = {
            'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
            'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
            'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
        }
        
        for padrao in padroes_data:
            match = re.search(padrao, texto, re.IGNORECASE)
            if match:
                if "de" in padrao:  # Formato "15 de janeiro de 2025"
                    dia, mes_nome, ano = match.groups()
                    mes = meses.get(mes_nome.lower(), '01')
                    return f"{ano}-{mes.zfill(2)}-{dia.zfill(2)}"
                else:  # Outros formatos
                    return match.group(0)
        
        return None
    
    def _extrair_partes(self, texto: str) -> List[str]:
        """Extrai as partes envolvidas no ato"""
        partes = []
        
        # Padrões para identificar partes
        padroes_partes = [
            r"OUTORGANTE[S]?:\s*([^\n]+)",
            r"OUTORGADO[S]?:\s*([^\n]+)",
            r"VENDEDOR[ES]?:\s*([^\n]+)",
            r"COMPRADOR[ES]?:\s*([^\n]+)",
            r"DOADOR[ES]?:\s*([^\n]+)",
            r"DONATÁRIO[S]?:\s*([^\n]+)",
            r"TESTADOR:\s*([^\n]+)"
        ]
        
        for padrao in padroes_partes:
            matches = re.findall(padrao, texto, re.IGNORECASE)
            for match in matches:
                nome_limpo = re.sub(r'[,;].*$', '', match.strip())
                if nome_limpo and nome_limpo not in partes:
                    partes.append(nome_limpo)
        
        return partes
    
    def _converter_para_markdown(self, texto: str) -> str:
        """Converte o texto do ato para formato Markdown"""
        linhas = texto.split('\n')
        markdown_lines = []
        
        for linha in linhas:
            linha_limpa = linha.strip()
            
            if not linha_limpa:
                markdown_lines.append('')
                continue
            
            # Títulos principais (ATO, TERMO, etc.)
            if re.match(r'^(ATO|TERMO|ESCRITURA|PROCURAÇÃO)', linha_limpa, re.IGNORECASE):
                markdown_lines.append(f'## {linha_limpa}')
            
            # Seções (OUTORGANTE, OUTORGADO, etc.)
            elif re.match(r'^(OUTORGANTE|OUTORGADO|VENDEDOR|COMPRADOR|OBJETO)', linha_limpa, re.IGNORECASE):
                markdown_lines.append(f'### {linha_limpa}')
            
            # Texto normal
            else:
                markdown_lines.append(linha_limpa)
        
        return '\n'.join(markdown_lines)

# Instância global do processador
pdf_processor = PDFProcessor()
```

## Endpoint para Processamento de PDF

### app/api/livros.py (Atualizado)

```python
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.deps import get_current_user, get_current_admin_user, get_db
from app.models.user import User
from app.schemas.livro import LivroCreate, LivroResponse, LivroUpdate
from app.services import livro as livro_service
from app.services import ato as ato_service
from app.services.pdf_processor import pdf_processor
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# ... outros endpoints existentes ...

@router.post("/{livro_id}/processar", status_code=status.HTTP_202_ACCEPTED)
async def processar_livro_pdf(
    livro_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Inicia o processamento em background de um livro em PDF para extrair os atos.
    Apenas administradores podem executar esta operação.
    """
    # Verifica se o livro existe
    livro = await livro_service.get_by_id(db, livro_id)
    if not livro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Livro não encontrado"
        )
    
    # Verifica se o livro tem um arquivo PDF
    if not livro.caminho_pdf:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Livro não possui arquivo PDF para processamento"
        )
    
    # Adiciona a tarefa em background
    background_tasks.add_task(
        processar_pdf_background,
        livro_id=livro_id,
        caminho_pdf=livro.caminho_pdf,
        user_id=current_user.id
    )
    
    logger.info(f"Processamento de PDF iniciado para livro {livro_id} por usuário {current_user.id}")
    
    return {
        "message": "O processamento do livro foi iniciado em segundo plano.",
        "livro_id": livro_id,
        "status": "processing"
    }

async def processar_pdf_background(livro_id: str, caminho_pdf: str, user_id: str):
    """
    Função executada em background para processar o PDF.
    """
    from app.db.session import async_session
    
    try:
        logger.info(f"Iniciando processamento do PDF: {caminho_pdf}")
        
        # Processa o PDF e extrai os atos
        atos_data = pdf_processor.processar_livro_pdf(caminho_pdf)
        
        # Salva os atos no banco de dados
        async with async_session() as db:
            await ato_service.criar_atos_processados(
                db=db,
                livro_id=livro_id,
                atos_data=atos_data,
                user_id=user_id
            )
            
            # Atualiza o status do livro
            await livro_service.update(
                db=db,
                livro_id=livro_id,
                update_data={"status": "Concluído", "total_atos": len(atos_data)}
            )
        
        logger.info(f"Processamento concluído para livro {livro_id}. {len(atos_data)} atos criados.")
        
    except Exception as e:
        logger.error(f"Erro no processamento do PDF {caminho_pdf}: {str(e)}")
        
        # Atualiza o status do livro para erro
        async with async_session() as db:
            await livro_service.update(
                db=db,
                livro_id=livro_id,
                update_data={"status": "Erro"}
            )
```

## Serviço de Atos Atualizado

### app/services/ato.py (Método adicional)

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict
from datetime import datetime

from app.models.ato import Ato, Averbacao
from app.schemas.ato import AtoCreate
import logging

logger = logging.getLogger(__name__)

class AtoService:
    # ... métodos existentes ...
    
    async def criar_atos_processados(
        self,
        db: AsyncSession,
        livro_id: str,
        atos_data: List[Dict],
        user_id: str
    ) -> List[Ato]:
        """
        Cria múltiplos atos a partir dos dados processados do PDF.
        """
        atos_criados = []
        
        try:
            for ato_data in atos_data:
                # Cria o objeto Ato
                novo_ato = Ato(
                    livro_id=livro_id,
                    numero_ato=ato_data['numero_ato'],
                    tipo_ato=ato_data['tipo_ato'],
                    data_ato=datetime.strptime(ato_data['data_ato'], '%Y-%m-%d').date() if ato_data['data_ato'] else datetime.now().date(),
                    partes=ato_data['partes'],
                    conteudo_markdown=ato_data['conteudo_markdown'],
                    url_pdf=f"/atos/{livro_id}/{ato_data['numero_ato']}.pdf"  # URL fictícia
                )
                
                db.add(novo_ato)
                atos_criados.append(novo_ato)
            
            await db.commit()
            
            # Refresh dos objetos para obter os IDs
            for ato in atos_criados:
                await db.refresh(ato)
            
            logger.info(f"Criados {len(atos_criados)} atos para livro {livro_id}")
            return atos_criados
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Erro ao criar atos processados: {str(e)}")
            raise

# Instância do serviço
ato_service = AtoService()
```

## Migração do Banco de Dados

### Criar nova migração para o campo conteudo_markdown

```bash
# No diretório backend/
alembic revision --autogenerate -m "Add conteudo_markdown to atos table"
```

### Exemplo de migração gerada (alembic/versions/xxx_add_conteudo_markdown.py)

```python
"""Add conteudo_markdown to atos table

Revision ID: 001
Revises: 
Create Date: 2025-01-XX XX:XX:XX.XXXXXX

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Adiciona a coluna conteudo_markdown
    op.add_column('atos', sa.Column('conteudo_markdown', sa.Text(), nullable=True))
    
    # Adiciona a coluna caminho_pdf na tabela livros
    op.add_column('livros', sa.Column('caminho_pdf', sa.String(500), nullable=True))

def downgrade() -> None:
    # Remove as colunas adicionadas
    op.drop_column('atos', 'conteudo_markdown')
    op.drop_column('livros', 'caminho_pdf')
```

## Configuração de Ambiente

### .env.example

```env
# Banco de dados
DATABASE_URL=postgresql+asyncpg://user:password@localhost/actnexus

# Segurança
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
ALLOWED_HOSTS=["http://localhost:3000", "http://127.0.0.1:3000"]

# Arquivos
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=50000000  # 50MB

# Logs
LOG_LEVEL=INFO
```

## Testes

### tests/test_pdf_processor.py

```python
import pytest
from app.services.pdf_processor import pdf_processor

class TestPDFProcessor:
    
    def test_extrair_numero_ato(self):
        texto = "ATO Nº 123 - PROCURAÇÃO"
        numero = pdf_processor._extrair_numero_ato(texto)
        assert numero == 123
    
    def test_extrair_tipo_ato(self):
        texto = "ESCRITURA DE COMPRA E VENDA"
        tipo = pdf_processor._extrair_tipo_ato(texto)
        assert tipo == "Escritura de Compra e Venda"
    
    def test_extrair_partes(self):
        texto = "OUTORGANTE: João Silva\nOUTORGADO: Maria Santos"
        partes = pdf_processor._extrair_partes(texto)
        assert "João Silva" in partes
        assert "Maria Santos" in partes
    
    @pytest.mark.asyncio
    async def test_processar_ato_individual(self):
        texto_ato = """
        ATO Nº 1 - PROCURAÇÃO
        OUTORGANTE: João Silva
        OUTORGADO: Maria Santos
        Data: 15 de janeiro de 2025
        """
        
        resultado = pdf_processor._processar_ato_individual(texto_ato, 1)
        
        assert resultado is not None
        assert resultado['numero_ato'] == 1
        assert resultado['tipo_ato'] == "Procuração"
        assert "João Silva" in resultado['partes']
        assert resultado['conteudo_markdown'] is not None
```

## Comandos de Desenvolvimento

### Inicialização do projeto

```bash
# Criar ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

# Instalar dependências
pip install -r requirements.txt

# Configurar banco de dados
alembic upgrade head

# Executar servidor de desenvolvimento
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Comandos úteis

```bash
# Criar nova migração
alembic revision --autogenerate -m "Descrição da migração"

# Aplicar migrações
alembic upgrade head

# Executar testes
pytest

# Executar testes com cobertura
pytest --cov=app

# Formatar código
black app/
isort app/
```

## Considerações de Segurança

1. **Validação de arquivos PDF**: Verificar se o arquivo é realmente um PDF válido
2. **Limite de tamanho**: Configurar limite máximo para upload de PDFs
3. **Sanitização**: Limpar texto extraído para evitar injeção de código
4. **Permissões**: Apenas admins podem processar PDFs
5. **Rate limiting**: Limitar número de processamentos por usuário/período
6. **Logs de auditoria**: Registrar todas as operações de processamento

## Monitoramento e Logs

1. **Logs estruturados**: Usar logging com formato JSON para facilitar análise
2. **Métricas**: Tempo de processamento, taxa de sucesso/erro
3. **Alertas**: Notificar sobre falhas no processamento
4. **Health checks**: Endpoint para verificar saúde da aplicação

Este guia fornece uma base sólida para implementar o backend completo do ActNexus, incluindo a nova funcionalidade de processamento de PDFs com extração automática de atos.