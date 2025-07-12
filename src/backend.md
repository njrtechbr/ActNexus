# Especificação da API Backend para ActNexus

Este documento descreve os endpoints da API RESTful que o backend precisa implementar para substituir o mock (`apiClientLocal.ts`) e suportar completamente o frontend do ActNexus.

## 1. Autenticação

O frontend atualmente simula o login salvando um objeto de usuário no `localStorage`. Um backend real deve implementar um sistema de autenticação (ex: JWT) que retorne um objeto de usuário com, no mínimo, os seguintes campos:

```json
{
  "name": "Nome do Usuário",
  "email": "usuario@exemplo.com",
  "role": "admin"
}
```

## 2. Regras de Negócio e Autorização

### 2.1. Autorização por Perfil (`role`)

-   **Perfil `admin`**:
    -   Pode realizar todas as ações CRUD em livros, atos, clientes e configurações.
    -   Pode acessar a tela de auditoria de IA (`GET /auditoria-ia`).
-   **Perfil `employee`**:
    -   Possui acesso de leitura à maioria dos dados (livros, atos, clientes).
    -   Pode cadastrar novos livros (`POST /livros/processar-pdf`).
    -   Pode realizar conferência de minutas (`POST /minutas/conferir`).
    -   **Não pode** gerenciar configurações ou adicionar averbações.

### 2.2. Regras de Negócio Específicas

-   **Averbações**: Uma averbação só pode ser adicionada a um `Ato` se o `Livro` ao qual ele pertence tiver o status `"Concluído"` ou `"Arquivado"`.
-   **Extração de Dados da IA**: Quando a IA extrai dados de qualificação de um ato (`dadosExtraidos`), o backend deve automaticamente procurar pelo cliente correspondente (usando o nome/CPF) e adicionar/atualizar os `dadosAdicionais` no perfil do cliente.
-   **Sincronização de Dados da Minuta**: Ao salvar dados da conferência de minuta, o backend deve mesclar os novos campos no perfil do cliente, evitando duplicatas de `label`.

## 3. Endpoints da API

A URL base para os endpoints pode ser `/api`.

---

### 3.1. Livros e Atos

#### **`GET /livros`**
-   **Descrição**: Retorna a lista de todos os livros.
-   **Resposta (200 OK)**: `Array<Livro>`

#### **`POST /livros/processar-pdf`**
-   **Descrição**: Recebe o conteúdo Markdown gerado pela IA e cria um novo livro e seus atos.
-   **Payload**: `{ livroData: Livro, atosData: Array<Ato> }`
-   **Resposta (201 Created)**: `Livro`

#### **`GET /livros/:livroId`**
-   **Descrição**: Retorna os detalhes de um livro específico.
-   **Resposta (200 OK)**: `Livro`

#### **`GET /livros/:livroId/atos`**
-   **Descrição**: Retorna todos os atos de um livro.
-   **Resposta (200 OK)**: `Array<Ato>`

#### **`GET /atos/:atoId`**
-   **Descrição**: Retorna os detalhes de um ato específico.
-   **Resposta (200 OK)**: `Ato`

#### **`PATCH /atos/:atoId`**
-   **Descrição**: Atualiza um ato, para adicionar averbações ou dados da IA.
-   **Regra**: A adição de `averbacao` só é permitida para `admin` e se o livro estiver "Concluído" ou "Arquivado".
-   **Payload**: `{ averbacao?: Averbacao, dadosExtraidos?: ExtractedActData }`
-   **Resposta (200 OK)**: `Ato`

---

### 3.2. Clientes

#### **`GET /clientes`**
-   **Descrição**: Retorna a lista de todos os clientes.
-   **Resposta (200 OK)**: `Array<Cliente>`

#### **`POST /clientes`**
-   **Descrição**: Cria um novo cliente.
-   **Autorização**: `admin`.
-   **Payload**: `Omit<Cliente, 'id'>`.
-   **Resposta (201 Created)**: `Cliente`

#### **`GET /clientes/:id`**
-   **Descrição**: Retorna os detalhes de um cliente.
-   **Resposta (200 OK)**: `Cliente`

#### **`GET /clientes/por-nomes`**
-   **Descrição**: Busca clientes por uma lista de nomes. Usado na conferência de minuta.
-   **Query Params**: `nomes=Nome1,Nome2`
-   **Resposta (200 OK)**: `Array<Cliente>`

#### **`PATCH /clientes/:id`**
-   **Descrição**: Atualiza um cliente.
-   **Regra**: Deve mesclar `dadosAdicionais` (campos) sem duplicatas. Gera um `Evento` no histórico do cliente para auditoria.
-   **Autorização**: `admin` ou processo de sistema (IA).
-   **Payload**: `Partial<Cliente> & { campos?: CampoAdicionalCliente[] }`
-   **Resposta (200 OK)**: `Cliente`

---

### 3.3. Conferência de Minuta

#### **`POST /minutas/conferir`**
-   **Descrição**: Recebe o texto de uma minuta e os clientes envolvidos para conferência.
-   **Payload**: `{ minuteText: string, clientProfiles: Array<{ nome: string, dadosAdicionais: any[] }> }`
-   **Resposta (200 OK)**: `CheckMinuteDataOutput` (resultado da análise da IA).

---

### 3.4. Configurações

#### **`GET /configuracoes/tipos-livro`**
-   **Descrição**: Retorna os tipos de livro.
-   **Autorização**: `admin`.
-   **Resposta (200 OK)**: `string[]`

#### **`POST /configuracoes/tipos-livro`**
-   **Descrição**: Adiciona um novo tipo de livro.
-   **Autorização**: `admin`.
-   **Payload**: `{ "novoTipo": "string" }`
-   **Resposta (201 Created)**.

#### **`DELETE /configuracoes/tipos-livro`**
-   **Descrição**: Remove um tipo de livro.
-   **Autorização**: `admin`.
-   **Payload**: `{ "tipoParaRemover": "string" }`
-   **Resposta (24 No Content)**.

---

### 3.5. Auditoria de IA

#### **`GET /auditoria-ia`**
-   **Descrição**: Retorna os logs de uso da IA.
-   **Autorização**: `admin`.
-   **Resposta (200 OK)**: `Array<AiUsageLog>`

#### **`POST /auditoria-ia`**
-   **Descrição**: Endpoint interno para registrar um log.
-   **Autorização**: Acesso interno do sistema.
-   **Payload**: `Omit<AiUsageLog, 'id'>`.
-   **Resposta (201 Created)**.

---
### **Modelos de Dados Principais**

```typescript
interface Livro {
    id: string;
    numero: number;
    ano: number;
    tipo: string;
    status: string; // 'Concluído', 'Processando', 'Arquivado'
    totalAtos: number;
    dataAbertura: string; // 'YYYY-MM-DD'
    dataFechamento?: string; // 'YYYY-MM-DD'
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
    dadosExtraidos?: ExtractedActData;
}

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
```
