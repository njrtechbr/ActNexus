# Documentação do Projeto: ActNexus

## 1. Visão Geral

O **ActNexus** é uma plataforma moderna projetada para otimizar o gerenciamento de atos notariais. A aplicação combina uma interface de usuário intuitiva com o poder da inteligência artificial para simplificar tarefas como upload de livros, conferência de minutas e validação de documentos, aumentando a eficiência e reduzindo erros manuais.

## 2. Funcionalidades Principais

- **Autenticação Segura por Perfil**: Simulação de login para perfis de `admin` e `employee`, com restrições de funcionalidade baseadas no perfil.
- **Dashboard Intuitivo**: Apresenta métricas chave dinâmicas e acesso rápido aos módulos, incluindo um gráfico de atividade.
- **Gestão de Livros e Atos**:
  - **Cadastro de Livro via PDF com IA**: O usuário faz o upload de um PDF de um livro, e a IA extrai e cadastra automaticamente os metadados do livro e todos os seus atos.
  - **Extração de Detalhes do Ato com IA**: A IA analisa o conteúdo de cada ato e extrai a qualificação completa das partes, sincronizando automaticamente esses dados com os perfis dos clientes.
- **Gestão de Clientes**: CRUD completo para clientes, com uma visão 360° que inclui histórico de atos, documentos com validade e um gerador de texto de qualificação com IA.
- **Conferência de Minuta com IA (Página Dedicada)**:
  - O usuário faz o upload do PDF de uma minuta (rascunho de ato).
  - A IA identifica as partes envolvidas no texto e busca seus perfis no sistema.
  - A IA compara o texto da minuta com os dados cadastrais, destacando divergências, conformidades e **novas informações** que existem na minuta mas não no cadastro.
  - O usuário pode **selecionar quais novas informações deseja salvar**, sincronizando-as com o perfil do cliente correspondente.
- **Auditoria de IA**: Uma tela dedicada para administradores, que registra detalhadamente cada chamada feita aos modelos de IA (custo, latência, tokens, etc.).

## 3. Arquitetura e Tecnologias

O projeto é construído sobre uma base de tecnologias modernas, focadas em performance e escalabilidade.

- **Framework**: **Next.js 15** (utilizando o App Router).
- **Linguagem**: **TypeScript**.
- **Estilização**: **Tailwind CSS** e **ShadCN/UI**.
- **Mock de API**: **`localStorage`** é utilizado para persistir os dados da aplicação no navegador, simulando uma API real.
- **Inteligência Artificial**: **Genkit** é o framework utilizado para orquestrar as chamadas para os modelos de IA do Google (Gemini).

## 4. Estrutura do Projeto

```
/src
├── data/              # Dados iniciais para popular o localStorage
├── services/          # Mock de API (apiClientLocal.ts)
├── ai/                # Lógica de IA com Genkit
│   ├── flows/         # Fluxos de IA (processamento de livro, conferência de minuta, etc.)
│   └── genkit.ts      # Configuração do Genkit com middleware de logging
├── app/               # Rotas e páginas do Next.js
│   ├── dashboard/     # Layout e páginas da área logada
│   └── page.tsx       # Página de bypass de login
├── components/        # Componentes React reutilizáveis
└── lib/               # Funções utilitárias e Server Actions
```

## 5. Como Executar

1. Instale as dependências: `npm install`
2. Inicie o servidor de desenvolvimento: `npm run dev`
3. Acesse a aplicação em `http://localhost:9002`. Você será redirecionado e logado automaticamente como um usuário `admin`.
