# Documentação do Projeto: ActNexus

## 1. Visão Geral

O **ActNexus** é uma plataforma moderna projetada para otimizar o gerenciamento de atos notariais. A aplicação combina uma interface de usuário intuitiva com o poder da inteligência artificial para simplificar tarefas como upload, busca e validação de documentos, aumentando a eficiência e reduzindo erros manuais.

**Estratégia de Desenvolvimento**: O frontend está sendo desenvolvido de forma desacoplada do backend, utilizando `localStorage` e um serviço de mock (`src/services/apiClientLocal.ts`) para simular a comunicação com a API. Isso permite o desenvolvimento ágil da interface do usuário enquanto o backend pode ser construído em paralelo.

## 2. Estrutura de Dados (Contrato da API Local)

Os dados são armazenados no `localStorage` como strings JSON. As chaves e estruturas são as seguintes:

### Chave: `actnexus_livros`
Armazena a lista de livros notariais.

```json
[
  {
    "id": "livro-001",
    "numero": 1,
    "ano": 2025,
    "status": "Concluído",
    "totalAtos": 150
  }
]
```

### Chave: `actnexus_atos`
Armazena os atos notariais, vinculados a um livro pelo `livroId`.

```json
[
  {
    "id": "ato-001-001",
    "livroId": "livro-001",
    "numeroAto": 1,
    "tipoAto": "Procuração",
    "dataAto": "2025-01-15",
    "partes": ["Maria Silva", "João Santos"],
    "urlPdf": "/path/to/dummy.pdf",
    "dadosExtraidos": {
      "outorgante": { "nome": "Maria Silva", "cpf": "111.222.333-44" },
      "outorgado": { "nome": "João Santos", "cpf": "555.666.777-88" }
    }
  }
]
```

### Chave: `actnexus_clientes`
Armazena informações sobre os clientes.

```json
[
  {
    "id": "cliente-11122233344",
    "nome": "Maria Silva",
    "cpfCnpj": "111.222.333-44",
    "tipo": "PF",
    "documentos": [
      { "nome": "RG", "url": "/docs/rg_maria.pdf" },
      { "nome": "Comprovante de Endereço", "url": "/docs/comp_end_maria.pdf" }
    ]
  }
]
```

## 3. Arquitetura e Tecnologias

O projeto é construído sobre uma base de tecnologias modernas, focadas em performance e escalabilidade.

- **Framework**: **Next.js 15** (utilizando o App Router).
- **Linguagem**: **TypeScript** para garantir a tipagem e a qualidade do código.
- **Estilização**:
  - **Tailwind CSS**: Framework CSS para estilização utilitária.
  - **ShadCN/UI**: Coleção de componentes de UI reusáveis e acessíveis.
  - **Cores e Tema**: O tema principal está definido em `src/app/globals.css` com variáveis CSS.
- **Mock de API**:
  - **`localStorage`**: Utilizado para persistir os dados da aplicação no navegador.
  - **`src/services/apiClientLocal.ts`**: Centraliza toda a lógica de acesso e manipulação do `localStorage`, simulando uma API real com latência.
- **Inteligência Artificial (Simulação Inicial)**:
  - **Genkit**: Será o framework utilizado para orquestrar as chamadas para os modelos de IA do Google. Inicialmente, as respostas da IA serão simuladas.

## 4. Estrutura do Projeto

```
/src
├── data/              # Dados iniciais para popular o localStorage
│   └── initial-data.ts
├── services/          # Serviços de comunicação (mock ou real)
│   └── apiClientLocal.ts
├── ai/                # Lógica de Inteligência Artificial com Genkit
│   ├── flows/         # Fluxos de IA (pesquisa, validação)
│   └── genkit.ts      # Configuração do Genkit
├── app/               # Rotas e páginas do Next.js (App Router)
│   ├── dashboard/     # Layout e páginas da área logada
│   └── page.tsx       # Página de login
├── components/        # Componentes React reutilizáveis
│   ├── dashboard/     # Componentes específicos do dashboard
│   └── ui/            # Componentes base do ShadCN
├── hooks/             # Hooks customizados (ex: useToast)
└── lib/               # Funções utilitárias e actions
    └── actions.ts     # Server Actions que invocam os fluxos de IA
```

## 5. Como Executar

1. Instale as dependências: `npm install`
2. Inicie o servidor de desenvolvimento: `npm run dev`
3. Acesse a aplicação em `http://localhost:9002`. Os dados iniciais serão populados no `localStorage` automaticamente.
