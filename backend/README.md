# ActNexus Backend

API Backend para a plataforma ActNexus - Sistema de Gestão de Livros Notariais com IA.

## Stack Tecnológico

- **Framework**: FastAPI
- **Linguagem**: Python 3.10+
- **Banco de Dados**: PostgreSQL
- **ORM**: SQLAlchemy 2.0 (assíncrono)
- **Migrações**: Alembic
- **Armazenamento**: MinIO (S3-compatible)
- **IA**: LangFlow
- **Autenticação**: JWT
- **Validação**: Pydantic

## Funcionalidades

### Gestão de Livros Notariais
- Upload e processamento de PDFs
- Extração automática de metadados usando IA
- Gestão de atos e averbações
- Busca semântica com IA

### Gestão de Clientes
- Cadastro completo de pessoas físicas e jurídicas
- Validação de CPF/CNPJ
- Histórico de eventos
- Contatos e endereços

### Sistema de IA
- Integração com LangFlow
- Processamento de documentos
- Busca semântica
- Extração de detalhes
- Geração de resumos
- Classificação de documentos

### Administração
- Gestão de usuários
- Configurações do sistema
- Logs de uso da IA
- Monitoramento e estatísticas

## Configuração do Ambiente

### Pré-requisitos

- Python 3.10+
- PostgreSQL 13+
- MinIO Server
- LangFlow

### Instalação

1. **Clone o repositório**:
```bash
git clone <repository-url>
cd ActNexus-frontend/backend
```

2. **Crie um ambiente virtual**:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows
```

3. **Instale as dependências**:
```bash
pip install -r requirements.txt
```

4. **Configure as variáveis de ambiente**:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Aplicação
PROJECT_NAME="ActNexus Backend"
DEBUG=true
SECRET_KEY="your-secret-key-here"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Banco de Dados
DATABASE_URL="postgresql+asyncpg://user:password@localhost:5432/actnexus"

# MinIO
MINIO_ENDPOINT="localhost:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_SECURE=false
MINIO_BUCKET_NAME="actnexus-livros"

# LangFlow
LANGFLOW_HOST="http://localhost:7860"
LANGFLOW_API_KEY="your-langflow-api-key"

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:3000", "http://localhost:8080"]
ALLOWED_HOSTS=["localhost", "127.0.0.1"]

# Logging
LOG_LEVEL="INFO"
```

### Configuração do Banco de Dados

1. **Crie o banco de dados PostgreSQL**:
```sql
CREATE DATABASE actnexus;
CREATE USER actnexus_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE actnexus TO actnexus_user;
```

2. **Execute as migrações**:
```bash
alembic upgrade head
```

### Configuração do MinIO

1. **Instale e execute o MinIO**:
```bash
# Download MinIO
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio

# Execute o servidor
./minio server ./data --console-address ":9001"
```

2. **Acesse o console**: http://localhost:9001
   - Usuário: `minioadmin`
   - Senha: `minioadmin`

### Configuração do LangFlow

1. **Instale o LangFlow**:
```bash
pip install langflow
```

2. **Execute o LangFlow**:
```bash
langflow run --host 0.0.0.0 --port 7860
```

3. **Acesse a interface**: http://localhost:7860

## Execução

### Desenvolvimento

```bash
# Ativar ambiente virtual
source venv/bin/activate

# Executar servidor de desenvolvimento
python -m app.main
# ou
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Produção

```bash
# Usando Gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## Estrutura do Projeto

```
backend/
├── app/
│   ├── api/                 # Endpoints da API
│   │   ├── auth.py         # Autenticação
│   │   ├── users.py        # Usuários
│   │   ├── livros.py       # Livros notariais
│   │   ├── atos.py         # Atos e averbações
│   │   ├── clientes.py     # Clientes
│   │   ├── config.py       # Configurações
│   │   └── ia_proxy.py     # Proxy para IA
│   ├── core/               # Configurações centrais
│   │   ├── auth.py         # Autenticação JWT
│   │   ├── config.py       # Configurações
│   │   └── logging.py      # Logging
│   ├── db/                 # Banco de dados
│   │   ├── base.py         # Base do SQLAlchemy
│   │   └── session.py      # Sessões do banco
│   ├── models/             # Modelos SQLAlchemy
│   ├── schemas/            # Schemas Pydantic
│   ├── services/           # Lógica de negócio
│   └── main.py             # Aplicação principal
├── alembic/                # Migrações
├── langflow_exports/       # Fluxos do LangFlow
├── requirements.txt        # Dependências
├── .env.example           # Exemplo de variáveis
└── README.md              # Este arquivo
```

## API Endpoints

### Autenticação
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token

### Usuários
- `GET /api/v1/users/` - Listar usuários
- `POST /api/v1/users/` - Criar usuário
- `GET /api/v1/users/me` - Usuário atual
- `PUT /api/v1/users/{id}` - Atualizar usuário

### Livros
- `GET /api/v1/livros/` - Listar livros
- `POST /api/v1/livros/` - Criar livro
- `POST /api/v1/livros/{id}/upload` - Upload PDF
- `GET /api/v1/livros/{id}/status` - Status processamento

### Atos
- `GET /api/v1/atos/` - Listar atos
- `POST /api/v1/atos/search` - Busca semântica
- `POST /api/v1/atos/{id}/extract-details` - Extrair detalhes

### Clientes
- `GET /api/v1/clientes/` - Listar clientes
- `POST /api/v1/clientes/` - Criar cliente
- `GET /api/v1/clientes/{id}/details` - Detalhes completos

### IA
- `POST /api/v1/ai/process-pdf` - Processar PDF
- `POST /api/v1/ai/semantic-search` - Busca semântica
- `POST /api/v1/ai/generate-summary` - Gerar resumo

## Desenvolvimento

### Executar Testes

```bash
pytest
```

### Formatação de Código

```bash
# Black
black app/

# isort
isort app/

# Flake8
flake8 app/
```

### Criar Nova Migração

```bash
alembic revision --autogenerate -m "Descrição da migração"
alembic upgrade head
```

## Monitoramento

### Logs

Os logs são configurados usando Loguru e incluem:
- Logs de requisições HTTP
- Logs de operações de IA
- Logs de erros e exceções
- Logs de operações do banco de dados

### Métricas

A aplicação expõe métricas Prometheus em `/metrics` (se habilitado).

### Health Check

- `GET /health` - Verificação de saúde da aplicação

## Segurança

- Autenticação JWT
- Validação de entrada com Pydantic
- Sanitização de dados sensíveis nos logs
- CORS configurável
- Rate limiting (configurável)

## Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a licença MIT.

## Suporte

Para suporte, abra uma issue no repositório ou entre em contato com a equipe de desenvolvimento.