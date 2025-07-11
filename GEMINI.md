# Documentação do Projeto: ActNexus

## 1. Visão Geral

O **ActNexus** é uma plataforma moderna projetada para otimizar o gerenciamento de atos notariais. A aplicação combina uma interface de usuário intuitiva com o poder da inteligência artificial para simplificar tarefas como upload, busca e validação de documentos, aumentando a eficiência e reduzindo erros manuais.

## 2. Funcionalidades Principais

- **Autenticação Segura por Perfil**: Tela de login que simula acesso para `admin` e `employee`, com restrições de funcionalidade baseadas no perfil.
- **Dashboard Intuitivo**: Apresenta métricas chave (dinâmicas, baseadas nos dados) e fornece acesso rápido aos módulos.
- **Gestão de Livros e Atos**: Funcionalidades completas de CRUD (Criar, Ler, Atualizar) para livros e atos notariais, com formulários em diálogos.
- **Gestão de Clientes**: CRUD para clientes, incluindo upload (simulado) de documentos e uma visão 360° com histórico de atos.
- **Validação Automatizada com IA**: Um fluxo de IA que analisa o texto de um documento (com base no nome do arquivo) para validar informações como CPF e nome.
- **Pesquisa Semântica com IA**: Permite que os usuários encontrem documentos usando linguagem natural.
- **Resumo de Cliente com IA**: Gera um resumo textual do histórico de atividades de um cliente.
- **Tabelas Interativas**: Exibem os resultados com busca e ordenação.

## 3. Arquitetura e Tecnologias

O projeto é construído sobre uma base de tecnologias modernas, focadas em performance e escalabilidade.

- **Framework**: **Next.js 15** (utilizando o App Router).
  - **Componentes de Cliente e Servidor**: Uso misto para otimizar a interatividade e o acesso a APIs de navegador como `localStorage`.
- **Linguagem**: **TypeScript** para garantir a tipagem e a qualidade do código.
- **Estilização**:
  - **Tailwind CSS**: Framework CSS para estilização utilitária.
  - **ShadCN/UI**: Coleção de componentes de UI reusáveis e acessíveis.
  - **Cores e Tema**: O tema principal está definido em `src/app/globals.css` com variáveis CSS.
- **Mock de API**:
  - **`localStorage`**: Utilizado para persistir os dados da aplicação no navegador.
  - **`src/services/apiClientLocal.ts`**: Centraliza toda a lógica de acesso e manipulação do `localStorage`, simulando uma API real com latência.
- **Inteligência Artificial**:
  - **Genkit**: É o framework utilizado para orquestrar as chamadas para os modelos de IA do Google.
  - **Fluxos de IA**:
    - `src/ai/flows/semantic-search.ts`: Lógica para a pesquisa em linguagem natural.
    - `src/ai/flows/automated-validation.ts`: Lógica para a validação automática de documentos.
    - `src/ai/flows/summarize-client-history.ts`: Lógica para gerar resumos de históricos de clientes.
- **Gerenciamento de Formulários**:
  - **React Hook Form** e **Zod**: Para gerenciamento e validação de formulários.

## 4. Estrutura do Projeto

```
/src
├── data/              # Dados iniciais para popular o localStorage
├── services/          # Serviços de comunicação (mock ou real)
├── ai/                # Lógica de Inteligência Artificial com Genkit
│   ├── flows/         # Fluxos de IA (pesquisa, validação, resumo)
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
3. Acesse a aplicação em `http://localhost:9002`.
   - **Login Admin**: `admin@actnexus.com` / `password`
   - **Login Funcionário**: `employee@actnexus.com` / `password`
