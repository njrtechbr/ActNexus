

// Simula a latência da rede
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Funções para simular a API usando localStorage
const getFromStorage = (key: string, defaultValue: any[] = []) => {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  const item = localStorage.getItem(key);
  try {
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const saveToStorage = (key: string, data: any) => {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(key, JSON.stringify(data));
};

// -- INTERFACES DE DADOS --

export interface AiUsageLog {
    id: string;
    timestamp: string;
    flowName: string;
    model: string;
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
    prompt: string;
    response: string;
}

export interface Livro {
    id: string;
    numero: number;
    ano: number;
    tipo: string;
    status: string;
    totalAtos: number;
    dataAbertura: string; // YYYY-MM-DD
    dataFechamento?: string; // YYYY-MM-DD, optional
    urlPdfOriginal?: string;
}

export interface Averbacao {
    texto: string;
    dataAverbacao: string; // YYYY-MM-DD - Data do fato, informada pelo usuário
    dataRegistro: string; // ISO String - Data em que foi salva no sistema, gerada automaticamente
}

interface ExtractedDetail {
    label: string;
    value: string;
}

interface InvolvedParty {
    nome: string;
    tipo: string;
    detalhes: ExtractedDetail[];
}

export interface ExtractedActData {
    detalhesGerais: ExtractedDetail[];
    partes: InvolvedParty[];
}


export interface Ato {
    id: string;
    livroId: string;
    numeroAto: number;
    tipoAto: string;
    dataAto: string; // Formato YYYY-MM-DD
    partes: string[];
    urlPdf: string;
    averbacoes: Averbacao[];
    escrevente?: string;
    conteudoMarkdown?: string;
    dadosExtraidos?: ExtractedActData;
}

export interface DocumentoCliente {
    nome: string;
    url: string;
    dataValidade?: string; // YYYY-MM-DD
}

export interface CampoAdicionalCliente {
    label: string;
    value: string;
}

export interface Cliente {
    id: string;
    nome: string;
    cpfCnpj: string;
    tipo: 'PF' | 'PJ';
    documentos: DocumentoCliente[];
    dadosAdicionais?: CampoAdicionalCliente[];
}

// -- FUNÇÕES EXPORTADAS --

// AI Usage
export const getAiUsageLogs = async (): Promise<AiUsageLog[]> => {
    await delay(300);
    console.log("MOCK API: Buscando logs de uso de IA...");
    const logs: AiUsageLog[] = getFromStorage('actnexus_ai_usage_logs');
    return logs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const logAiUsage = async (logData: Omit<AiUsageLog, 'id'>): Promise<void> => {
    // Nao simular delay para não atrasar a resposta da IA
    console.log("MOCK API: Registrando uso de IA...");
    const logs: AiUsageLog[] = getFromStorage('actnexus_ai_usage_logs');
    const newLog: AiUsageLog = {
        ...logData,
        id: `log-${Date.now()}-${Math.random()}`,
    };
    logs.push(newLog);
    saveToStorage('actnexus_ai_usage_logs', logs);
};


// Livros
export const getLivros = async (): Promise<Livro[]> => {
  await delay(500);
  console.log("MOCK API: Buscando livros...");
  const livros: Livro[] = getFromStorage('actnexus_livros');
  return livros.sort((a,b) => b.ano - a.ano || b.numero - a.numero);
};

export const getLivroById = async (livroId: string): Promise<Livro | null> => {
    await delay(200);
    console.log(`MOCK API: Buscando livro pelo ID ${livroId}...`);
    const livros: Livro[] = getFromStorage('actnexus_livros');
    return livros.find(livro => livro.id === livroId) || null;
}

export const createLivroComAtos = async (livroData: Omit<Livro, 'id' | 'totalAtos'>, atosData: Omit<Ato, 'id' | 'livroId' | 'urlPdf' | 'averbacoes'>[]): Promise<Livro> => {
    await delay(1200);
    console.log("MOCK API: Criando novo livro com atos via processamento de PDF...");
    const livros: Livro[] = getFromStorage('actnexus_livros');
    const todosAtos: Ato[] = getFromStorage('actnexus_atos');

    const novoLivro: Livro = { 
        ...livroData, 
        id: `livro-${livroData.numero}-${livroData.ano}-${Date.now()}`,
        totalAtos: atosData.length
    };
    
    const novosAtos: Ato[] = atosData.map(ato => ({
        ...ato,
        id: `ato-${novoLivro.id}-${ato.numeroAto}-${Date.now()}`,
        livroId: novoLivro.id,
        urlPdf: "/path/to/dummy.pdf",
        averbacoes: [],
    }));

    livros.push(novoLivro);
    todosAtos.push(...novosAtos);

    saveToStorage('actnexus_livros', livros);
    saveToStorage('actnexus_atos', todosAtos);
    
    return novoLivro;
}

// Atos
export const getAtosByLivroId = async (livroId: string): Promise<Ato[]> => {
  await delay(300);
  console.log(`MOCK API: Buscando atos para o livro ${livroId}...`);
  const todosAtos: Ato[] = getFromStorage('actnexus_atos');
  const atosDoLivro = todosAtos.filter((ato: any) => ato.livroId === livroId);
  return atosDoLivro.sort((a, b) => a.numeroAto - b.numeroAto);
};

export const getAtoById = async (atoId: string): Promise<Ato | null> => {
    await delay(200);
    console.log(`MOCK API: Buscando ato pelo ID ${atoId}...`);
    const atos: Ato[] = getFromStorage('actnexus_atos');
    return atos.find(ato => ato.id === atoId) || null;
}

type UpdateAtoPayload = {
    averbacao?: Averbacao;
    dadosExtraidos?: ExtractedActData;
};

export const updateAto = async (atoId: string, payload: UpdateAtoPayload): Promise<Ato | null> => {
    await delay(600);
    console.log(`MOCK API: Atualizando ato ${atoId}...`);
    const todosAtos: Ato[] = getFromStorage('actnexus_atos');
    const atoIndex = todosAtos.findIndex(a => a.id === atoId);

    if (atoIndex === -1) {
        console.error("Ato não encontrado para atualização.");
        return null;
    }

    const atoAtual = todosAtos[atoIndex];

    if (payload.averbacao) {
        if (!atoAtual.averbacoes) {
            atoAtual.averbacoes = [];
        }
        atoAtual.averbacoes.push(payload.averbacao);
    }

    if (payload.dadosExtraidos) {
        atoAtual.dadosExtraidos = payload.dadosExtraidos;
    }
    
    todosAtos[atoIndex] = atoAtual;

    saveToStorage('actnexus_atos', todosAtos);
    return atoAtual;
}

export const getAtosByClienteId = async (clienteId: string): Promise<Ato[]> => {
    await delay(300);
    console.log(`MOCK API: Buscando atos para o cliente ${clienteId}...`);
    const cliente = await getClienteById(clienteId);
    if (!cliente) return [];
    
    const todosAtos: Ato[] = getFromStorage('actnexus_atos');
    // Filtra atos onde o nome do cliente aparece na lista de partes
    return todosAtos.filter((ato: any) => ato.partes.some((p: string) => p.toLowerCase().includes(cliente.nome.toLowerCase())));
}

// Clientes
export const getClientes = async (): Promise<Cliente[]> => {
    await delay(400);
    console.log("MOCK API: Buscando clientes...");
    const clientes: Cliente[] = getFromStorage('actnexus_clientes');
    return clientes.sort((a, b) => a.nome.localeCompare(b.nome));
};

export const getClienteById = async (clienteId: string): Promise<Cliente | null> => {
    await delay(200);
    console.log(`MOCK API: Buscando cliente pelo ID ${clienteId}...`);
    const clientes: Cliente[] = getFromStorage('actnexus_clientes');
    return clientes.find(c => c.id === clienteId) || null;
}

export const getClienteByNome = async (nome: string): Promise<Cliente | null> => {
    await delay(100);
    console.log(`MOCK API: Buscando cliente pelo Nome "${nome}"...`);
    const clientes: Cliente[] = getFromStorage('actnexus_clientes');
    // Busca exata pelo nome para evitar ambiguidades.
    return clientes.find(c => c.nome.toLowerCase() === nome.toLowerCase()) || null;
}

export const createCliente = async (clienteData: Omit<Cliente, 'id'>): Promise<Cliente> => {
    await delay(800);
    console.log("MOCK API: Criando novo cliente...");
    const clientes: Cliente[] = getFromStorage('actnexus_clientes');
    const novoCliente: Cliente = { ...clienteData, id: `cliente-${clienteData.cpfCnpj.replace(/\D/g, '')}`, dadosAdicionais: [] };
    clientes.push(novoCliente);
    saveToStorage('actnexus_clientes', clientes);
    return novoCliente;
}

type UpdateClientePayload = {
    nome?: string;
    cpfCnpj?: string;
    tipo?: 'PF' | 'PJ';
    documentos?: DocumentoCliente[];
    campos?: CampoAdicionalCliente[];
};

export const updateCliente = async (clienteId: string, payload: UpdateClientePayload): Promise<Cliente | null> => {
    await delay(400);
    console.log(`MOCK API: Atualizando cliente ${clienteId}...`);
    const clientes: Cliente[] = getFromStorage('actnexus_clientes');
    const clienteIndex = clientes.findIndex(c => c.id === clienteId);

    if (clienteIndex === -1) {
        console.error("Cliente não encontrado para atualização.");
        return null;
    }

    const clienteAtual = clientes[clienteIndex];

    // Atualiza campos básicos
    if (payload.nome) clienteAtual.nome = payload.nome;
    if (payload.cpfCnpj) clienteAtual.cpfCnpj = payload.cpfCnpj;
    if (payload.tipo) clienteAtual.tipo = payload.tipo;
    
    // Substitui a lista de documentos completamente se fornecida
    if (payload.documentos) {
        clienteAtual.documentos = payload.documentos;
    }

    // Mescla dados adicionais
    if (payload.campos) {
        if (!clienteAtual.dadosAdicionais) {
            clienteAtual.dadosAdicionais = [];
        }

        payload.campos.forEach(campo => {
            const campoExistenteIndex = clienteAtual.dadosAdicionais!.findIndex(c => c.label.toLowerCase() === campo.label.toLowerCase());
            if (campoExistenteIndex > -1) {
                // Atualiza o valor se o campo já existir
                clienteAtual.dadosAdicionais![campoExistenteIndex] = campo; 
            } else {
                // Adiciona novo campo
                clienteAtual.dadosAdicionais!.push(campo); 
            }
        });
    }
    
    clientes[clienteIndex] = clienteAtual;
    saveToStorage('actnexus_clientes', clientes);
    return clienteAtual;
}


// Configurações
const defaultTiposDeLivro = [
    "Livro de Notas",
    "Livro de Procurações",
    "Livro de Testamentos",
    "Livro de Protocolo",
    "Livro de Controle de Depósito Prévio",
    "Livro Diário Auxiliar da Receita e da Despesa"
];

export const getTiposDeLivro = async (): Promise<string[]> => {
    await delay(200);
    console.log("MOCK API: Buscando tipos de livro...");
    return getFromStorage('actnexus_tipos_livro', defaultTiposDeLivro);
};

export const addTipoDeLivro = async (novoTipo: string): Promise<void> => {
    await delay(300);
    console.log(`MOCK API: Adicionando tipo de livro "${novoTipo}"...`);
    const tipos = await getTiposDeLivro();
    if (tipos.some(t => t.toLowerCase() === novoTipo.toLowerCase())) {
        throw new Error("Este tipo de livro já existe.");
    }
    tipos.push(novoTipo);
    saveToStorage('actnexus_tipos_livro', tipos);
};

export const removeTipoDeLivro = async (tipoParaRemover: string): Promise<void> => {
    await delay(300);
    console.log(`MOCK API: Removendo tipo de livro "${tipoParaRemover}"...`);
    let tipos = await getTiposDeLivro();
    tipos = tipos.filter(t => t.toLowerCase() !== tipoParaRemover.toLowerCase());
    saveToStorage('actnexus_tipos_livro', tipos);
};
