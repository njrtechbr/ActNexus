# Documentação do Projeto: ActNexus

## 1. Visão Geral

O **ActNexus** é uma plataforma moderna projetada para otimizar o gerenciamento de atos notariais. A aplicação combina uma interface de usuário intuitiva com o poder da inteligência artificial para simplificar tarefas como upload, busca e validação de documentos, aumentando a eficiência e reduzindo erros manuais.

## 2. Funcionalidades Principais

- **Autenticação Segura**: Tela de login para acesso à plataforma (atualmente com lógica mockada).
- **Dashboard Intuitivo**: Apresenta métricas chave sobre os documentos e fornece acesso rápido aos módulos.
- **Upload de PDF**: Componente com funcionalidade de arrastar e soltar para o envio de documentos PDF.
- **Validação Automatizada com IA**: Um fluxo de IA que analisa o texto de um documento para validar informações como CPF e nome.
- **Pesquisa Semântica com IA**: Permite que os usuários encontrem documentos usando linguagem natural, em vez de palavras-chave exatas.
- **Tabela de Resultados Interativa**: Exibe os resultados da pesquisa em uma tabela que pode ser ordenada.

## 3. Arquitetura e Tecnologias

O projeto é construído sobre uma base de tecnologias modernas, focadas em performance e escalabilidade.

- **Framework**: **Next.js 15** (utilizando o App Router).
  - **Renderização no Servidor (SSR)**: A maior parte da lógica e renderização é feita no servidor para melhor performance e segurança.
  - **Server Actions**: As interações com o backend (como chamadas para a IA) são feitas através de Server Actions, eliminando a necessidade de criar endpoints de API manualmente.
- **Linguagem**: **TypeScript** para garantir a tipagem e a qualidade do código.
- **Estilização**:
  - **Tailwind CSS**: Framework CSS para estilização utilitária.
  - **ShadCN/UI**: Coleção de componentes de UI reusáveis e acessíveis.
  - **Cores e Tema**: O tema principal está definido em `src/app/globals.css` com variáveis CSS.
- **Inteligência Artificial**:
  - **Genkit**: É o framework utilizado para orquestrar as chamadas para os modelos de IA do Google.
  - **Fluxos de IA**:
    - `src/ai/flows/semantic-search.ts`: Define a lógica para a pesquisa em linguagem natural.
    - `src/ai/flows/automated-validation.ts`: Define a lógica para a validação automática de documentos.

## 4. Estrutura do Projeto

```
/src
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
3. Acesse a aplicação em `http://localhost:9002`.
