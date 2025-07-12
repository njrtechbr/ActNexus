# Documentação do Projeto: ActNexus

## 1. Visão Geral

O **ActNexus** é uma plataforma moderna projetada para otimizar o gerenciamento de atos notariais. A aplicação combina uma interface de usuário intuitiva com o poder da inteligência artificial para simplificar tarefas como upload, busca e validação de documentos, aumentando a eficiência e reduzindo erros manuais.

**Estratégia de Desenvolvimento**: O frontend foi desenvolvido de forma desacoplada do backend, utilizando `localStorage` e um serviço de mock (`src/services/apiClientLocal.ts`) para simular a comunicação com a API. Isso permitiu o desenvolvimento ágil da interface do usuário enquanto o backend poderia ser construído em paralelo. A especificação completa para o backend real está documentada em `src/backend.md`.

## 2. Funcionalidades Principais

-   **Autenticação Segura por Perfil**: Simulação de login para `admin` e `employee`, com restrições de funcionalidade baseadas no perfil.
-   **Dashboard Intuitivo com Métricas e Gráficos**: Apresenta métricas chave (dinâmicas, baseadas nos dados do `localStorage`) e um gráfico de "Atos por Mês" para visualização de tendências.
-   **Gestão de Livros e Atos**:
    -   **Cadastro de Livro via PDF com IA**: O usuário faz o upload de um PDF. A IA processa o documento, extrai o número do livro, ano e todos os atos contidos nele, e os cadastra no sistema de uma só vez.
    -   **Extração Detalhada da Qualificação com IA**: Após o cadastro, a IA analisa o conteúdo de cada ato e extrai a qualificação completa de todas as partes envolvidas, sincronizando automaticamente os dados com os perfis dos clientes.
    -   **Averbações**: Admins podem adicionar averbações (modificações/observações) a atos existentes, mas apenas em livros com status "Concluído" ou "Arquivado".
-   **Gestão de Clientes**:
    -   **Visão 360° e Edição Inline**: Uma página de detalhes do cliente completa, com abas para dados, histórico, documentos e eventos. Admins podem editar todas as informações do cliente diretamente na página.
    -   **Gerenciamento de Contatos, Endereços e Documentos**: Suporte para cadastrar múltiplos contatos, endereços e documentos para cada cliente, com indicadores visuais para validade de documentos.
    -   **Geração de Qualificação com IA**: Permite gerar um parágrafo de qualificação formatado, no estilo legal, a partir dos dados salvos no perfil do cliente.
-   **Conferência de Minuta com IA (Página Dedicada)**:
    -   O usuário acessa uma página específica e faz o upload de um **PDF de uma minuta** (rascunho de ato).
    -   A IA processa o texto, identifica as partes envolvidas e busca seus perfis cadastrados no sistema.
    -   O sistema compara o texto da minuta com os dados dos clientes, gerando um relatório que destaca:
        -   **Dados Conformes (OK)**: Informações que batem com o cadastro.
        -   **Dados Divergentes**: Informações que existem nos dois lugares, mas são diferentes.
        -   **Dados Novos**: Informações que existem na minuta, mas não no cadastro do cliente.
    -   O usuário pode então **selecionar com checkboxes quais dados novos ou divergentes deseja salvar**, sincronizando-os com os perfis dos clientes correspondentes.
-   **Auditoria de IA**: Uma tela dedicada, acessível apenas por administradores, que registra cada chamada feita aos modelos de IA, detalhando o fluxo, custo, latência e os tokens de entrada/saída.
-   **Tabelas Interativas**: Exibem os resultados de listagens com busca e ordenação.

## 3. Arquitetura e Tecnologias

-   **Framework**: **Next.js 15** (utilizando o App Router).
-   **Linguagem**: **TypeScript**.
-   **Estilização**: **Tailwind CSS** e **ShadCN/UI**.
-   **Mock de API**: `localStorage` e `src/services/apiClientLocal.ts`.
-   **Inteligência Artificial**:
    -   **Genkit**: Framework para orquestrar chamadas para os modelos de IA do Google (o padrão é `googleai/gemini-1.5-flash-latest`).
    -   **Fluxos de IA**:
        -   `processLivroPdf`: Processa o PDF de um livro e extrai seus dados e atos.
        -   `extractActDetails`: Analisa o conteúdo de um ato e extrai a qualificação das partes.
        -   `checkMinuteData`: Compara o texto de uma minuta com dados cadastrais de clientes.
        -   `generateQualification`: Gera um parágrafo de qualificação formatado.
        -   `summarizeClientHistory`: Gera um resumo do histórico de atos de um cliente.
-   **Gerenciamento de Formulários**: **React Hook Form** e **Zod**.

## 4. Estrutura do Projeto

```
/src
├── data/              # Dados iniciais para popular o localStorage
├── services/          # Serviços de comunicação (mock)
├── ai/                # Lógica de Inteligência Artificial com Genkit
│   ├── flows/         # Fluxos de IA
│   └── genkit.ts      # Configuração do Genkit
├── app/               # Rotas e páginas do Next.js
│   ├── dashboard/     # Layout e páginas da área logada
│   └── page.tsx       # Página de bypass de login
├── components/        # Componentes React reutilizáveis
├── hooks/             # Hooks customizados
├── lib/               # Funções utilitárias e Server Actions
└── backend.md         # Especificação da API para o backend real
```

## 5. Como Executar

1. Instale as dependências: `npm install`
2. Inicie o servidor de desenvolvimento: `npm run dev`
3. Acesse a aplicação em `http://localhost:9002`. Os dados iniciais serão populados no `localStorage` automaticamente e você será logado como um usuário `admin` por padrão.
