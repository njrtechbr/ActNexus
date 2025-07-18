# Especificação da API Backend para ActNexus

Este documento descreve os endpoints da API RESTful que o backend precisa implementar para substituir o mock (`apiClientLocal.ts`) e suportar completamente o frontend do ActNexus.

## 1. Autenticação e Autorização

O backend deve implementar um sistema de autenticação (ex: JWT) que retorne um objeto de usuário no login. Este objeto deve conter, no mínimo, `name`, `email` e `role` (`admin` ou `employee`).

### Regras de Autorização por Perfil (`role`)

-   **`admin`**: Acesso total a todas as funcionalidades, incluindo CRUD em todas as entidades e acesso às configurações e auditoria.
-   **`employee`**: Acesso de leitura à maioria dos dados. Pode cadastrar novos livros (via PDF) e conferir minutas. Não pode gerenciar configurações ou adicionar averbações em atos.

---

## 2. Endpoints da API

A URL base para os endpoints pode ser `/api`.

### 2.1. Fluxos de Inteligência Artificial

Estes endpoints encapsulam as chamadas para os modelos GenAI (Gemini).

-   **`POST /ai/process-livro-pdf`**
    -   **Descrição**: Processa o texto de um PDF de livro e retorna o conteúdo estruturado em Markdown.
    -   **Payload**: `{ pdfText: string }`
    -   **Resposta (200 OK)**: `{ markdownContent: string }`

-   **`POST /ai/extract-act-details`**
    -   **Descrição**: Extrai a qualificação completa das partes e detalhes gerais do conteúdo de um ato.
    -   **Payload**: `{ actContent: string }`
    -   **Resposta (200 OK)**: `ExtractActDetailsOutput` (ver modelo de dados)

-   **`POST /ai/check-minute-data`**
    -   **Descrição**: Compara o texto de uma minuta com os dados cadastrais dos clientes.
    -   **Payload**: `{ minuteText: string, clientProfiles: Array<{...}> }`
    -   **Resposta (200 OK)**: `CheckMinuteDataOutput` (ver modelo de dados)

-   **`POST /ai/generate-qualification`**
    -   **Descrição**: Gera um parágrafo de qualificação a partir dos dados de um cliente.
    -   **Payload**: `{ clientName: string, fields: Array<{label, value}> }`
    -   **Resposta (200 OK)**: `{ qualificationText: string }`

-   **`POST /ai/summarize-client-history`**
    -   **Descrição**: Gera um resumo do histórico de um cliente.
    -   **Payload**: `Cliente & { atos: Array<{type, date}> }`
    -   **Resposta (200 OK)**: `{ summary: string }`

-   **`POST /ai/conversational-agent`**
    -   **Descrição**: Processa uma consulta do usuário no chat do assistente de IA, utilizando ferramentas para buscar dados internos.
    -   **Payload**: `{ query: string, fileDataUri?: string }`
    -   **Resposta (200 OK)**: `{ response: string }`

-   **`POST /ai/generate-convo-title`**
    -   **Descrição**: Gera um título curto para uma conversa.
    -   **Payload**: `{ conversationHistory: string }`
    -   **Resposta (200 OK)**: `{ title: string }`


### 2.2. Livros e Atos

-   **`GET /livros`**: Retorna a lista de todos os livros.
-   **`POST /livros/create-with-atos`**: Recebe o Markdown gerado pela IA e cria um novo livro e seus atos.
    -   **Payload**: `{ livroData: Livro, atosData: Array<Ato> }`
-   **`GET /livros/:livroId`**: Retorna os detalhes de um livro específico.
-   **`GET /livros/:livroId/atos`**: Retorna todos os atos de um livro.
-   **`GET /atos/:atoId`**: Retorna os detalhes de um ato específico.
-   **`PATCH /atos/:atoId`**: Atualiza um ato, principalmente para adicionar uma `averbacao`.
    -   **Regra**: Permitido apenas para `admin` e se o livro estiver "Concluído" ou "Arquivado".
    -   **Payload**: `{ averbacao: Averbacao }`

### 2.3. Clientes

-   **`GET /clientes`**: Retorna a lista de todos os clientes.
-   **`POST /clientes`**: Cria um novo cliente.
-   **`GET /clientes/:id`**: Retorna os detalhes de um cliente.
-   **`GET /clientes/by-names`**: Busca clientes por uma lista de nomes.
    -   **Query**: `?nomes=Nome1,Nome2`
-   **`PATCH /clientes/:id`**: Atualiza um cliente. Deve mesclar `dadosAdicionais` (campos) sem duplicatas e gerar um `Evento` no histórico.
    -   **Payload**: `Partial<Cliente> & { campos?: CampoAdicionalCliente[] }`

### 2.4. Auditoria de IA

-   **`GET /auditoria-ia`**: Retorna os logs de uso da IA.
    -   **Autorização**: `admin`.
-   **`POST /auditoria-ia`** (Endpoint Interno): Registra um log de uso da IA.
    -   **Autorização**: Acesso interno do sistema.

### 2.5. Configurações do Sistema

-   **`GET /config`**: Retorna o objeto de configuração completo (`AppConfig`).
-   **`POST /config`**: Salva o objeto de configuração completo.
-   **`GET /config/prompts`**: Retorna todos os prompts do sistema.
-   **`PATCH /config/prompts/:key`**: Atualiza um prompt específico.
-   **`GET /config/parametrization/:key`**: Retorna uma lista de parâmetros (ex: `tipos-livro`, `tipos-ato`).
-   **`POST /config/parametrization/:key`**: Adiciona um item a uma lista de parâmetros.
-   **`DELETE /config/parametrization/:key`**: Remove um item de uma lista de parâmetros.

---
## 3. Modelos de Dados Principais

```typescript
// Configuração Geral
interface AppConfig {
    prompts: Record<string, string>;
    notaryData: {
        nome: string;
        tabeliao: string;
        endereco: string;
        cidade: string;
        estado: string;
        cep: string;
        telefone: string;
        email: string;
    };
}

// Livros e Atos
interface Livro {
    id: string;
    numero: number;
    ano: number;
    tipo: string;
    status: 'Concluído' | 'Processando' | 'Arquivado';
    totalAtos: number;
    dataAbertura: string; // 'YYYY-MM-DD'
    dataFechamento?: string;
    urlPdfOriginal?: string;
}

interface Ato {
    id: string;
    livroId: string;
    numeroAto: number;
    tipoAto: string;
    dataAto: string; // 'YYYY-MM-DD'
    partes: string[];
    averbacoes: Averbacao[];
    conteudoMarkdown?: string;
    dadosExtraidos?: ExtractedActData; // Estrutura da IA
}

interface Averbacao {
    texto: string;
    dataAverbacao: string; // 'YYYY-MM-DD'
    dataRegistro: string; // ISO String
}

// Clientes
interface Cliente {
    id: string;
    nome: string;
    cpfCnpj: string;
    tipo: 'PF' | 'PJ';
    contatos?: Contato[];
    enderecos?: Endereco[];
    documentos?: DocumentoCliente[];
    observacoes?: Observacao[];
    dadosAdicionais?: CampoAdicionalCliente[];
    eventos?: Evento[];
}

interface Contato {
    id: string;
    tipo: string; // 'email', 'telefone', etc.
    valor: string;
    label?: string;
}

interface Endereco {
    id: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
    label?: string;
}

interface DocumentoCliente {
    nome: string;
    url: string;
    dataValidade?: string; // 'YYYY-MM-DD'
}

interface Observacao {
    texto: string;
    autor: string;
    data: string; // ISO String
    tipo: 'ia' | 'manual';
}

interface Evento {
    data: string; // ISO String
    autor: string;
    descricao: string;
}

interface CampoAdicionalCliente {
    label: string;
    value: string;
}

// Auditoria
interface AiUsageLog {
    id: string;
    timestamp: string;
    flowName: string;
    model: string;
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    totalCost: number;
    prompt: string;
    response: string;
}
```
