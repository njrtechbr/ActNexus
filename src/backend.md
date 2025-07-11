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

O `role` pode ser `"admin"` ou `"employee"`, controlando o acesso a certas funcionalidades no frontend.

## 2. Regras de Negócio e Autorização

O backend deve implementar as seguintes regras para garantir a integridade dos dados e o controle de acesso correto.

### 2.1. Autorização por Perfil (`role`)

-   **Perfil `admin`**:
    -   Pode adicionar averbações em atos (`PATCH /atos/:atoId`).
    -   Pode criar novos clientes (`POST /clientes`).
    -   Pode gerenciar os tipos de livro (`GET`, `POST`, `DELETE` em `/configuracoes/tipos-livro`).
    -   Pode acessar a tela de auditoria de IA (`GET /auditoria-ia`).

-   **Perfil `employee`**:
    -   Possui acesso de leitura à maioria dos dados (livros, atos, clientes).
    -   **Não pode** realizar as ações restritas ao perfil `admin`.

### 2.2. Regras de Negócio Específicas

-   **Averbações**: Uma averbação só pode ser adicionada a um `Ato` se o `Livro` ao qual ele pertence tiver o status `"Concluído"` ou `"Arquivado"`. O backend deve validar essa condição antes de aceitar um `PATCH` em `/atos/:atoId` que contenha uma averbação.
-   **Extração de Dados da IA**: Quando a IA extrai dados de qualificação de um ato (`dadosExtraidos`), o backend deve automaticamente procurar pelo cliente correspondente (usando o nome/CPF) e adicionar/atualizar os `dadosAdicionais` no perfil do cliente. A lógica deve evitar duplicatas de `label`.
-   **Tipos de Livro**: Ao adicionar um novo tipo de livro, o backend deve validar para não permitir a criação de tipos duplicados (a verificação deve ser case-insensitive).

## 3. Endpoints da API

A URL base para os endpoints pode ser `/api`.

---

### 3.1. Livros e Atos

#### **`GET /livros`**

-   **Descrição**: Retorna a lista de todos os livros cadastrados.
-   **Resposta (200 OK)**:
    ```json
    [
      {
        "id": "string",
        "numero": "number",
        "ano": "number",
        "tipo": "string",
        "status": "string (Concluído, Processando, Arquivado)",
        "totalAtos": "number",
        "dataAbertura": "string (YYYY-MM-DD)",
        "dataFechamento": "string (YYYY-MM-DD)",
        "urlPdfOriginal": "string"
      }
    ]
    ```

#### **`POST /livros/processar-pdf`**

-   **Descrição**: Endpoint para receber o conteúdo Markdown gerado pela IA no frontend e criar um novo livro e seus respectivos atos.
-   **Autorização**: `admin`, `employee`.
-   **Payload**:
    ```json
    {
      "livroData": {
        "numero": "number",
        "ano": "number",
        "tipo": "string",
        "status": "string",
        "dataAbertura": "string (YYYY-MM-DD)",
        "dataFechamento": "string (YYYY-MM-DD)",
        "urlPdfOriginal": "string"
      },
      "atosData": [
        {
          "numeroAto": "number",
          "tipoAto": "string",
          "dataAto": "string (YYYY-MM-DD)",
          "partes": ["string"],
          "conteudoMarkdown": "string"
        }
      ]
    }
    ```
-   **Resposta (201 Created)**: Retorna o objeto do livro criado.

#### **`GET /livros/:livroId`**

-   **Descrição**: Retorna os detalhes de um livro específico.
-   **Resposta (200 OK)**: O objeto `Livro`.

#### **`GET /livros/:livroId/atos`**

-   **Descrição**: Retorna todos os atos (folhas) de um livro específico.
-   **Resposta (200 OK)**: Um array de objetos `Ato`.
    ```json
    [
      {
        "id": "string",
        "livroId": "string",
        "numeroAto": "number",
        "tipoAto": "string",
        "dataAto": "string (YYYY-MM-DD)",
        "partes": ["string"],
        "escrevente": "string",
        "urlPdf": "string",
        "averbacoes": [
          {
            "texto": "string",
            "dataAverbacao": "string (YYYY-MM-DD)",
            "dataRegistro": "string (ISO 8601)"
          }
        ],
        "conteudoMarkdown": "string",
        "dadosExtraidos": {
          "detalhesGerais": [{ "label": "string", "value": "string" }],
          "partes": [
            {
              "nome": "string",
              "tipo": "string",
              "detalhes": [{ "label": "string", "value": "string" }]
            }
          ]
        }
      }
    ]
    ```

#### **`GET /atos/:atoId`**

-   **Descrição**: Retorna os detalhes de um ato (folha) específico.
-   **Resposta (200 OK)**: O objeto `Ato`.

#### **`PATCH /atos/:atoId`**

-   **Descrição**: Atualiza um ato, principalmente para adicionar averbações ou dados extraídos pela IA.
-   **Autorização**: A adição de `averbacao` é restrita a `admin`. A atualização de `dadosExtraidos` pode ser feita por qualquer processo do sistema.
-   **Payload**:
    ```json
    {
      "averbacao": { // Opcional
        "texto": "string",
        "dataAverbacao": "string (YYYY-MM-DD)",
        "dataRegistro": "string (ISO 8601)"
      },
      "dadosExtraidos": { // Opcional
        "detalhesGerais": [...],
        "partes": [...]
      }
    }
    ```
-   **Resposta (200 OK)**: O objeto `Ato` atualizado.

---

### 3.2. Clientes

#### **`GET /clientes`**

-   **Descrição**: Retorna a lista de todos os clientes.
-   **Resposta (200 OK)**: Um array de objetos `Cliente`.
    ```json
    [
      {
        "id": "string",
        "nome": "string",
        "cpfCnpj": "string",
        "tipo": "string (PF ou PJ)",
        "documentos": [
          { "nome": "string", "url": "string" }
        ],
        "dadosAdicionais": [
          { "label": "string", "value": "string" }
        ]
      }
    ]
    ```

#### **`POST /clientes`**

-   **Descrição**: Cria um novo cliente.
-   **Autorização**: `admin`.
-   **Payload**: `Omit<Cliente, 'id'>`.
-   **Resposta (201 Created)**: O objeto `Cliente` criado.

#### **`GET /clientes/:id`**

-   **Descrição**: Retorna os detalhes de um cliente específico.
-   **Resposta (200 OK)**: O objeto `Cliente`.

#### **`GET /clientes/:id/atos`**

-   **Descrição**: Retorna os atos associados a um cliente (o backend deve buscar atos onde o nome do cliente aparece nas partes).
-   **Resposta (200 OK)**: Um array de objetos `Ato`.

#### **`PATCH /clientes/:id`**

-   **Descrição**: Atualiza um cliente, principalmente para adicionar/sincronizar `dadosAdicionais` extraídos pela IA.
-   **Autorização**: Pode ser chamado por um processo interno do sistema (após extração da IA) ou por um `admin`.
-   **Payload**:
    ```json
    {
      "campos": [
        { "label": "string", "value": "string" }
      ]
    }
    ```
-   **Resposta (200 OK)**: O objeto `Cliente` atualizado.

---

### 3.3. Configurações

#### **`GET /configuracoes/tipos-livro`**

-   **Descrição**: Retorna a lista de tipos de livro permitidos.
-   **Autorização**: `admin`.
-   **Resposta (200 OK)**: `["string"]`

#### **`POST /configuracoes/tipos-livro`**

-   **Descrição**: Adiciona um novo tipo de livro.
-   **Autorização**: `admin`.
-   **Payload**: `{ "novoTipo": "string" }`
-   **Resposta (201 Created)**.

#### **`DELETE /configuracoes/tipos-livro`**

-   **Descrição**: Remove um tipo de livro.
-   **Autorização**: `admin`.
-   **Payload**: `{ "tipoParaRemover": "string" }`
-   **Resposta (204 No Content)**.

---

### 3.4. Auditoria de IA

#### **`GET /auditoria-ia`**

-   **Descrição**: Retorna todos os logs de uso da IA, ordenados por data decrescente.
-   **Autorização**: `admin`.
-   **Resposta (200 OK)**: Um array de objetos `AiUsageLog`.
    ```json
    [
      {
        "id": "string",
        "timestamp": "string (ISO 8601)",
        "flowName": "string",
        "model": "string",
        "latencyMs": "number",
        "inputTokens": "number",
        "outputTokens": "number",
        "totalTokens": "number",
        "inputCost": "number",
        "outputCost": "number",
        "totalCost": "number",
        "prompt": "string (JSON stringified)",
        "response": "string (JSON stringified)"
      }
    ]
    ```

#### **`POST /auditoria-ia`**

-   **Descrição**: Este endpoint seria chamado pelo próprio backend (ou por um webhook do Genkit) para registrar um novo log de uso.
-   **Autorização**: Acesso interno do sistema/backend.
-   **Payload**: `Omit<AiUsageLog, 'id'>`.
-   **Resposta (201 Created)**.
