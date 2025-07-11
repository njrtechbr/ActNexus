# Documentação do Projeto: ActNexus

## 1. Visão Geral

O **ActNexus** é uma plataforma moderna projetada para otimizar o gerenciamento de atos notariais. A aplicação combina uma interface de usuário intuitiva com o poder da inteligência artificial para simplificar tarefas como upload, busca e validação de documentos, aumentando a eficiência e reduzindo erros manuais.

**Estratégia de Desenvolvimento**: O frontend foi desenvolvido de forma desacoplada do backend, utilizando `localStorage` e um serviço de mock (`src/services/apiClientLocal.ts`) para simular a comunicação com a API. Isso permitiu o desenvolvimento ágil da interface do usuário enquanto o backend poderia ser construído em paralelo.

## 2. Funcionalidades Principais

- **Autenticação Segura por Perfil**: Tela de login que simula acesso para `admin` e `employee`, com restrições de funcionalidade baseadas no perfil (ex: apenas admins podem criar/editar).
- **Dashboard Intuitivo com Métricas e Gráficos**: Apresenta métricas chave (dinâmicas, baseadas nos dados do `localStorage`) e um gráfico de "Atos por Mês" para visualização de tendências.
- **Gestão de Livros e Atos**:
  - **Cadastro de Livro via PDF com IA**: Em vez de um formulário manual, o usuário faz o upload de um PDF. A IA processa o documento, extrai o número do livro, ano e todos os atos contidos nele, e os cadastra no sistema de uma só vez.
  - **Extração Detalhada da Qualificação com IA**: Após o cadastro, a IA analisa o conteúdo de cada ato e extrai a qualificação completa de todas as partes envolvidas (CPF, endereço, profissão, etc.).
  - **CRUD para Atos**: Funcionalidades de Criar, Ler e Atualizar para atos notariais, com formulários em diálogos e controle de acesso por perfil.
- **Gestão de Clientes**:
  - **CRUD para Clientes**: Funcionalidades para gerenciar os clientes do cartório.
  - **Sincronização Automática com IA**: Os dados de qualificação extraídos dos atos são automaticamente salvos nos perfis dos clientes correspondentes, enriquecendo a base de dados.
  - **Geração de Qualificação com IA**: Permite gerar um parágrafo de qualificação formatado, no estilo legal, a partir dos dados salvos no perfil do cliente.
- **Validação Automatizada com IA**: Um fluxo de IA que analisa o texto de um documento (com base no nome do arquivo) para validar informações como CPF e nome.
- **Auditoria de IA**: Uma tela dedicada que registra cada chamada feita aos modelos de IA, detalhando o fluxo, custo, latência e os tokens de entrada/saída.
- **Tabelas Interativas**: Exibem os resultados de listagens com busca e ordenação.

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
- **Inteligência Artificial**:
  - **Genkit**: É o framework utilizado para orquestrar as chamadas para os modelos de IA do Google.
  - **Fluxos de IA**:
    - `processLivroPdf`: Processa o texto de um PDF de livro e extrai seus dados e atos.
    - `extractActDetails`: Analisa o conteúdo de um ato e extrai a qualificação completa das partes.
    - `generateQualification`: Gera um parágrafo de qualificação formatado a partir de dados estruturados.
    - `automatedValidation`: Valida dados em um texto simulado de documento.
    - `summarizeClientHistory`: Gera um resumo do histórico de atos de um cliente.
- **Gerenciamento de Formulários**:
  - **React Hook Form**: Para gerenciamento de estado de formulários.
  - **Zod**: Para validação de esquemas de dados.

## 4. Estrutura do Projeto

```
/src
├── data/              # Dados iniciais para popular o localStorage
├── services/          # Serviços de comunicação (mock ou real)
├── ai/                # Lógica de Inteligência Artificial com Genkit
│   ├── flows/         # Fluxos de IA (processamento, extração, geração, validação, resumo)
│   └── genkit.ts      # Configuração do Genkit com middleware de logging
├── app/               # Rotas e páginas do Next.js (App Router)
│   ├── dashboard/     # Layout e páginas da área logada
│   └── page.tsx       # Página de login
├── components/        # Componentes React reutilizáveis
│   ├── dashboard/     # Componentes específicos do dashboard (ex: LivroUpload, QualificationGeneratorDialog, AtosPorMesChart)
│   └── ui/            # Componentes base do ShadCN
├── hooks/             # Hooks customizados (ex: useToast, use-mobile)
└── lib/               # Funções utilitárias e actions
    ├── actions.ts     # Server Actions que invocam os fluxos de IA
    └── ai-pricing.ts  # Lógica para cálculo de custo de uso da IA
```

## 5. Como Executar

1. Instale as dependências: `npm install`
2. Inicie o servidor de desenvolvimento: `npm run dev`
3. Acesse a aplicação em `http://localhost:9002`. Os dados iniciais serão populados no `localStorage` automaticamente.
   - **Login Admin**: `admin@actnexus.com` / `password`
   - **Login Funcionário**: `employee@actnexus.com` / `password`
