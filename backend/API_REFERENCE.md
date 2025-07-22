# ActNexus Backend - API Reference

## Visão Geral

A API do ActNexus Backend fornece endpoints para gerenciamento de livros notariais, atos, clientes e integração com serviços de IA.

**Base URL**: `http://localhost:8000`
**Documentação Interativa**: `http://localhost:8000/docs`
**OpenAPI Schema**: `http://localhost:8000/openapi.json`

## Autenticação

A API usa autenticação JWT Bearer Token.

### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

**Resposta:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### Uso do Token
```http
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

## Endpoints Principais

### 1. Usuários

#### Listar Usuários
```http
GET /api/v1/users/
```

#### Criar Usuário (Admin)
```http
POST /api/v1/users/
{
  "email": "novo@example.com",
  "nome": "Novo Usuário",
  "password": "senha123",
  "is_admin": false
}
```

#### Perfil do Usuário Atual
```http
GET /api/v1/users/me
```

### 2. Livros Notariais

#### Listar Livros
```http
GET /api/v1/livros/?page=1&size=20&tipo=Registro&ano=2024
```

#### Criar Livro
```http
POST /api/v1/livros/
{
  "numero": 1,
  "ano": 2024,
  "tipo": "Registro",
  "data_abertura": "2024-01-01"
}
```

#### Upload de PDF
```http
POST /api/v1/livros/{livro_id}/upload
Content-Type: multipart/form-data

file: [arquivo.pdf]
```

#### Status do Processamento
```http
GET /api/v1/livros/{livro_id}/status
```

#### Download do PDF
```http
GET /api/v1/livros/{livro_id}/download
```

### 3. Atos

#### Listar Atos
```http
GET /api/v1/atos/?livro_id=1&page=1&size=20
```

#### Busca Semântica
```http
POST /api/v1/atos/search
{
  "query": "compra e venda de imóvel",
  "limit": 10,
  "similarity_threshold": 0.7
}
```

#### Extrair Detalhes com IA
```http
POST /api/v1/atos/{ato_id}/extract-details
{
  "fields": ["partes", "objeto", "valor"],
  "update_ato": true
}
```

### 4. Clientes

#### Listar Clientes
```http
GET /api/v1/clientes/?tipo=PF&page=1&size=20
```

#### Criar Cliente
```http
POST /api/v1/clientes/
{
  "nome": "João Silva",
  "tipo": "PF",
  "cpf_cnpj": "123.456.789-00",
  "email": "joao@example.com"
}
```

#### Buscar por CPF/CNPJ
```http
GET /api/v1/clientes/cpf-cnpj/{documento}
```

### 5. Serviços de IA

#### Processar PDF
```http
POST /api/v1/ai/process-pdf
{
  "pdf_url": "https://example.com/document.pdf",
  "livro_id": 1
}
```

#### Busca Semântica
```http
POST /api/v1/ai/semantic-search
{
  "query": "contrato de compra e venda",
  "limit": 10
}
```

#### Gerar Resumo
```http
POST /api/v1/ai/generate-summary
{
  "content": "Texto longo para resumir...",
  "max_length": 200
}
```

### 6. Configurações

#### Listar Configurações
```http
GET /api/v1/config/
```

#### Obter Configuração por Chave
```http
GET /api/v1/config/key/{chave}
```

#### Atualizar Configuração
```http
PUT /api/v1/config/{config_id}
{
  "valor": "novo_valor"
}
```

## Códigos de Status HTTP

- `200 OK` - Sucesso
- `201 Created` - Recurso criado
- `400 Bad Request` - Dados inválidos
- `401 Unauthorized` - Não autenticado
- `403 Forbidden` - Sem permissão
- `404 Not Found` - Recurso não encontrado
- `422 Unprocessable Entity` - Erro de validação
- `500 Internal Server Error` - Erro interno

## Estrutura de Resposta de Erro

```json
{
  "detail": "Mensagem de erro",
  "error_code": "VALIDATION_ERROR",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Paginação

Todos os endpoints de listagem suportam paginação:

```http
GET /api/v1/resource/?page=1&size=20
```

**Resposta:**
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "size": 20,
  "pages": 5
}
```

## Filtros

### Livros
- `numero`: Número do livro
- `ano`: Ano do livro
- `tipo`: Tipo do livro
- `status`: Status do processamento

### Atos
- `livro_id`: ID do livro
- `numero`: Número do ato
- `tipo`: Tipo do ato
- `data_inicio`: Data de início (YYYY-MM-DD)
- `data_fim`: Data de fim (YYYY-MM-DD)

### Clientes
- `tipo`: PF ou PJ
- `nome`: Nome (busca parcial)
- `cpf_cnpj`: CPF ou CNPJ
- `ativo`: true/false

## Rate Limiting

- **Geral**: 60 requisições por minuto
- **Upload**: 2 requisições por minuto
- **IA**: 10 requisições por minuto

## Webhooks (Opcional)

Se habilitado, a API pode enviar webhooks para:

- Processamento de PDF concluído
- Erro no processamento
- Novo ato criado

```json
{
  "event": "pdf.processed",
  "data": {
    "livro_id": 1,
    "status": "completed",
    "atos_count": 5
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Monitoramento

### Health Check
```http
GET /health
```

### Métricas (Prometheus)
```http
GET /metrics
```

## Exemplos de Uso

### Fluxo Completo: Upload e Processamento de PDF

1. **Criar livro**
```bash
curl -X POST "http://localhost:8000/api/v1/livros/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "numero": 1,
    "ano": 2024,
    "tipo": "Registro"
  }'
```

2. **Upload do PDF**
```bash
curl -X POST "http://localhost:8000/api/v1/livros/1/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@documento.pdf"
```

3. **Verificar status**
```bash
curl "http://localhost:8000/api/v1/livros/1/status" \
  -H "Authorization: Bearer $TOKEN"
```

4. **Listar atos extraídos**
```bash
curl "http://localhost:8000/api/v1/atos/?livro_id=1" \
  -H "Authorization: Bearer $TOKEN"
```

### Busca Semântica

```bash
curl -X POST "http://localhost:8000/api/v1/atos/search" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "compra e venda de apartamento",
    "limit": 5
  }'
```

## SDKs e Bibliotecas

### Python
```python
import httpx

class ActNexusClient:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.headers = {"Authorization": f"Bearer {token}"}
    
    async def upload_pdf(self, livro_id: int, file_path: str):
        async with httpx.AsyncClient() as client:
            with open(file_path, "rb") as f:
                files = {"file": f}
                response = await client.post(
                    f"{self.base_url}/api/v1/livros/{livro_id}/upload",
                    headers=self.headers,
                    files=files
                )
            return response.json()
```

### JavaScript
```javascript
class ActNexusClient {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async searchAtos(query, limit = 10) {
    const response = await fetch(`${this.baseUrl}/api/v1/atos/search`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query, limit })
    });
    return response.json();
  }
}
```

## Troubleshooting

### Problemas Comuns

1. **401 Unauthorized**
   - Verificar se o token está válido
   - Verificar se o header Authorization está correto

2. **422 Validation Error**
   - Verificar os dados enviados
   - Consultar a documentação dos schemas

3. **500 Internal Server Error**
   - Verificar logs da aplicação
   - Verificar conectividade com serviços externos

### Logs

Os logs estão disponíveis em:
- Arquivo: `logs/actnexus.log`
- Docker: `docker-compose logs backend`

### Suporte

Para suporte técnico:
- Documentação: `/docs`
- Issues: GitHub repository
- Email: suporte@actnexus.com