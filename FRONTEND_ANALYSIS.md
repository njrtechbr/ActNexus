# Análise Completa do Frontend ActNexus

## Visão Geral do Projeto

O ActNexus é uma plataforma web para cartórios que integra inteligência artificial para automatizar o processamento de documentos notariais. O frontend é desenvolvido em Next.js 14 com TypeScript e utiliza um sistema de mock local para simular a API backend.

## Estrutura do Projeto Frontend

### Tecnologias Utilizadas
- **Framework**: Next.js 14 com App Router
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS
- **Componentes**: Shadcn/ui
- **Estado**: localStorage (mock) + React hooks
- **IA**: Google Gemini (via Genkit)

### Arquitetura de Pastas

```
src/
├── app/                    # App Router do Next.js
│   ├── dashboard/         # Páginas do dashboard
│   │   ├── assistente-ia/ # Chat com IA
│   │   ├── auditoria-ia/  # Logs de uso da IA
│   │   ├── clientes/      # Gestão de clientes
│   │   ├── conferencia-minuta/ # Conferência de minutas
│   │   ├── configuracoes/ # Configurações do sistema
│   │   └── livros/        # Gestão de livros e atos
│   ├── globals.css        # Estilos globais
│   ├── layout.tsx         # Layout raiz
│   └── page.tsx           # Página inicial
├── components/            # Componentes reutilizáveis
│   ├── dashboard/         # Componentes específicos do dashboard
│   └── ui/               # Componentes base (shadcn/ui)
├── data/                 # Dados iniciais/mock
├── hooks/                # Custom hooks
├── lib/                  # Utilitários e configurações
├── services/             # Serviços de API e prompts
│   ├── apiClientLocal.ts # Mock da API (localStorage)
│   └── promptService.ts  # Gerenciamento de prompts IA
└── ai/                   # Configuração da IA (Genkit)
```

## Modelos de Dados

### Entidades Principais

#### 1. Livro
```typescript
interface Livro {
    id: string;
    numero: number;
    ano: number;
    tipo: string; // "Notas", "Procuração", "Escritura"
    status: 'Concluído' | 'Processando' | 'Arquivado';
    totalAtos: number;
    dataAbertura: string; // 'YYYY-MM-DD'
    dataFechamento?: string; // 'YYYY-MM-DD'
    urlPdfOriginal?: string;
}
```

#### 2. Ato
```typescript
interface Ato {
    id: string;
    livroId: string;
    numeroAto: number;
    tipoAto: string;
    dataAto: string; // 'YYYY-MM-DD'
    partes: string[];
    urlPdf: string;
    averbacoes: Averbacao[];
    escrevente?: string;
    conteudoMarkdown?: string; // Conteúdo processado pela IA
    dadosExtraidos?: ExtractedActData; // Dados estruturados pela IA
}
```

#### 3. Cliente
```typescript
interface Cliente {
    id: string;
    nome: string;
    cpfCnpj: string;
    tipo: 'PF' | 'PJ';
    contatos?: Contato[];
    enderecos?: Endereco[];
    documentos?: DocumentoCliente[];
    observacoes?: Observacao[];
    dadosAdicionais?: CampoAdicionalCliente[]; // Campos de qualificação
    eventos?: Evento[]; // Histórico de alterações
}
```

#### 4. Configuração do Sistema
```typescript
interface AppConfig {
    prompts: SystemPrompts; // Prompts personalizáveis da IA
    notaryData: NotaryData; // Dados do cartório
}
```

## Funcionalidades Implementadas

### 1. Gestão de Livros e Atos
- **Listagem de livros** com filtros por status e tipo
- **Visualização detalhada** de livros e seus atos
- **Processamento de PDF** via IA para extrair atos automaticamente
- **Averbações** em atos (apenas para admins)

### 2. Gestão de Clientes
- **CRUD completo** de clientes
- **Busca por nome** e filtros
- **Histórico de eventos** automático
- **Campos adicionais** dinâmicos para qualificação
- **Documentos anexos** com controle de validade

### 3. Inteligência Artificial
- **Processamento de PDF** de livros para extrair atos
- **Extração de detalhes** de atos (partes, qualificação)
- **Conferência de minutas** comparando com dados cadastrais
- **Geração de qualificação** automática de clientes
- **Assistente conversacional** com acesso aos dados
- **Auditoria completa** de uso da IA

### 4. Sistema de Configuração
- **Prompts personalizáveis** para cada fluxo de IA
- **Dados do cartório** (nome, endereço, tabelião)
- **Listas parametrizáveis** (tipos de livro, ato, documento)

### 5. Autenticação e Autorização
- **Dois perfis**: admin e employee
- **Controle de acesso** por funcionalidade
- **Simulação de login** (mock)

## API Mock (apiClientLocal.ts)

O frontend utiliza um sistema completo de mock que simula uma API REST usando localStorage. Principais funções:

### Livros e Atos
- `getLivros()` - Lista todos os livros
- `getLivroById(id)` - Busca livro específico
- `createLivroComAtos(livro, atos)` - Cria livro com atos processados
- `getAtosByLivroId(livroId)` - Lista atos de um livro
- `getAtoById(id)` - Busca ato específico
- `updateAto(id, payload)` - Atualiza ato (averbações, dados extraídos)

### Clientes
- `getClientes()` - Lista todos os clientes
- `getClienteById(id)` - Busca cliente específico
- `getClientesByNomes(nomes)` - Busca por lista de nomes
- `createCliente(data)` - Cria novo cliente
- `updateCliente(id, payload, autor)` - Atualiza cliente com histórico

### Configurações
- `getFullConfig()` / `saveFullConfig(config)` - Configuração completa
- `getPrompts()` / `updatePrompt(key, text)` - Prompts da IA
- Gerenciadores para listas parametrizáveis (tipos de livro, ato, etc.)

### Auditoria
- `getAiUsageLogs()` - Lista logs de uso da IA
- `logAiUsage(data)` - Registra uso da IA

## Fluxos de IA Implementados

### 1. Processamento de Livro PDF
**Endpoint**: `POST /ai/process-livro-pdf`
- **Input**: Texto extraído do PDF
- **Output**: Markdown estruturado com livro e atos
- **Uso**: Automatizar digitalização de livros físicos

### 2. Extração de Detalhes de Ato
**Endpoint**: `POST /ai/extract-act-details`
- **Input**: Conteúdo markdown do ato
- **Output**: Dados estruturados (partes, qualificação, detalhes gerais)
- **Uso**: Estruturar informações para busca e relatórios

### 3. Conferência de Minuta
**Endpoint**: `POST /ai/check-minute-data`
- **Input**: Texto da minuta + dados dos clientes
- **Output**: Relatório de divergências e dados novos
- **Uso**: Validar minutas antes da lavratura

### 4. Geração de Qualificação
**Endpoint**: `POST /ai/generate-qualification`
- **Input**: Nome do cliente + campos de dados
- **Output**: Parágrafo de qualificação formatado
- **Uso**: Automatizar redação de qualificações

### 5. Resumo de Histórico
**Endpoint**: `POST /ai/summarize-client-history`
- **Input**: Dados completos do cliente + histórico de atos
- **Output**: Resumo em linguagem natural
- **Uso**: Visão rápida do perfil do cliente

### 6. Assistente Conversacional
**Endpoint**: `POST /ai/conversational-agent`
- **Input**: Pergunta do usuário + arquivo opcional
- **Output**: Resposta contextualizada
- **Uso**: Chat inteligente com acesso aos dados

## Especificação da API Backend

Baseado na análise do frontend, o backend deve implementar:

### Estrutura Base
- **Framework**: FastAPI
- **ORM**: SQLAlchemy 2.0 (async)
- **Validação**: Pydantic
- **Migrações**: Alembic
- **Processamento PDF**: PyMuPDF (fitz)
- **Autenticação**: JWT

### Endpoints Necessários

#### Autenticação
- `POST /auth/login` - Login com email/senha
- `GET /auth/me` - Dados do usuário atual

#### Livros e Atos
- `GET /livros` - Lista livros
- `POST /livros/create-with-atos` - Cria livro com atos
- `GET /livros/{id}` - Detalhes do livro
- `GET /livros/{id}/atos` - Atos do livro
- `GET /atos/{id}` - Detalhes do ato
- `PATCH /atos/{id}` - Atualiza ato
- `POST /livros/{id}/processar` - **NOVO**: Processa PDF em background

#### Clientes
- `GET /clientes` - Lista clientes
- `POST /clientes` - Cria cliente
- `GET /clientes/{id}` - Detalhes do cliente
- `GET /clientes/by-names` - Busca por nomes
- `PATCH /clientes/{id}` - Atualiza cliente

#### IA
- `POST /ai/process-livro-pdf` - Processa PDF
- `POST /ai/extract-act-details` - Extrai detalhes
- `POST /ai/check-minute-data` - Confere minuta
- `POST /ai/generate-qualification` - Gera qualificação
- `POST /ai/summarize-client-history` - Resume histórico
- `POST /ai/conversational-agent` - Chat IA
- `POST /ai/generate-convo-title` - Título da conversa

#### Configurações
- `GET /config` - Configuração completa
- `POST /config` - Salva configuração
- `GET /config/prompts` - Lista prompts
- `PATCH /config/prompts/{key}` - Atualiza prompt
- `GET /config/parametrization/{key}` - Lista parâmetros
- `POST /config/parametrization/{key}` - Adiciona parâmetro
- `DELETE /config/parametrization/{key}` - Remove parâmetro

#### Auditoria
- `GET /auditoria-ia` - Lista logs (admin only)
- `POST /auditoria-ia` - Registra log (interno)

## Nova Funcionalidade: Processamento de PDF

### Objetivo
Implementar um pipeline assíncrono que:
1. Recebe um arquivo PDF de um "Livro"
2. Extrai o texto usando PyMuPDF
3. Identifica cada "Ato" no documento
4. Converte cada ato para Markdown
5. Salva no banco de dados

### Implementação Sugerida

#### 1. Modelo Atualizado
```python
# app/models/ato.py
from sqlalchemy import Text

class Ato(Base):
    # ... campos existentes
    conteudo_markdown = Column(Text, nullable=True)
```

#### 2. Serviço de Processamento
```python
# app/services/pdf_processor.py
import fitz  # PyMuPDF

def processar_livro_pdf(caminho_pdf: str) -> List[Dict]:
    """Extrai atos de um PDF e converte para Markdown"""
    doc = fitz.open(caminho_pdf)
    texto_completo = ""
    
    # Extrai texto de todas as páginas
    for pagina in doc:
        texto_completo += pagina.get_text()
    
    # Identifica atos (implementar lógica de regex/padrões)
    atos = identificar_atos(texto_completo)
    
    # Converte cada ato para Markdown
    atos_markdown = []
    for ato in atos:
        markdown = converter_para_markdown(ato)
        atos_markdown.append({
            'numero_ato': ato['numero'],
            'tipo_ato': ato['tipo'],
            'data_ato': ato['data'],
            'partes': ato['partes'],
            'conteudo_markdown': markdown
        })
    
    return atos_markdown
```

#### 3. Endpoint com Background Task
```python
# app/api/livros.py
from fastapi import BackgroundTasks

@router.post("/{livro_id}/processar", status_code=202)
async def processar_livro(
    livro_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_admin_user)
):
    livro = await services.livro.get(db, id=livro_id)
    if not livro:
        raise HTTPException(404, "Livro não encontrado")
    
    background_tasks.add_task(run_pdf_processing, livro_id, db)
    return {"message": "Processamento iniciado em segundo plano"}

async def run_pdf_processing(livro_id: int, db: AsyncSession):
    """Executa o processamento em background"""
    livro = await services.livro.get(db, id=livro_id)
    atos_data = services.pdf_processor.processar_livro_pdf(livro.caminho_pdf)
    await services.ato.criar_atos_processados(db, livro_id, atos_data)
```

## Considerações para Desenvolvimento

### 1. Estrutura do Projeto Backend
```
backend/
├── app/
│   ├── api/           # Endpoints da API
│   ├── core/          # Configurações e segurança
│   ├── db/            # Configuração do banco
│   ├── models/        # Modelos SQLAlchemy
│   ├── schemas/       # Schemas Pydantic
│   ├── services/      # Lógica de negócio
│   └── main.py        # Aplicação FastAPI
├── alembic/           # Migrações
├── requirements.txt   # Dependências
└── README.md
```

### 2. Dependências Principais
```txt
fastapi>=0.104.0
sqlalchemy>=2.0.0
alembic>=1.12.0
pydantic>=2.0.0
psycopg2-binary>=2.9.0  # PostgreSQL
PyMuPDF>=1.23.0         # Processamento PDF
python-jose[cryptography]>=3.3.0  # JWT
passlib[bcrypt]>=1.7.4  # Hash de senhas
python-multipart>=0.0.6 # Upload de arquivos
```

### 3. Padrões de Código
- **Async/await** em todas as operações de banco
- **Dependency Injection** para sessões e autenticação
- **Schemas Pydantic** para validação de entrada/saída
- **Services** para lógica de negócio
- **Background Tasks** para operações longas
- **Logging** estruturado para auditoria

### 4. Segurança
- **JWT** para autenticação
- **RBAC** (admin/employee) para autorização
- **Validação** rigorosa de entrada
- **Rate limiting** para endpoints de IA
- **CORS** configurado para o frontend

## Próximos Passos

1. **Configurar ambiente** Python com FastAPI
2. **Implementar modelos** SQLAlchemy baseados nas interfaces
3. **Criar schemas** Pydantic para validação
4. **Desenvolver endpoints** seguindo a especificação
5. **Implementar autenticação** JWT
6. **Criar serviço de processamento** PDF
7. **Configurar migrações** Alembic
8. **Testes** unitários e de integração
9. **Deploy** e configuração de produção

Este documento serve como guia completo para entender o frontend e desenvolver o backend correspondente, mantendo compatibilidade total com a interface existente.