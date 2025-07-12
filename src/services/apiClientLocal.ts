
import type { SystemPrompts } from './promptService';

// Simula a latência da rede
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Funções para simular a API usando localStorage
const getFromStorage = (key: string, defaultValue: any | null = null) => {
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
export interface NotaryData {
    nome: string;
    endereco: string;
    cidade: string;
    estado: string;
    cep: string;
    telefone: string;
    email: string;
    tabeliao: string;
}

export interface AppConfig {
    prompts: SystemPrompts;
    notaryData: NotaryData;
}

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

export interface Contato {
    id: string;
    tipo: 'email' | 'telefone' | 'whatsapp' | string; // Permite tipos customizados
    valor: string;
    label?: string; // e.g., 'Pessoal', 'Comercial'
}

export interface Endereco {
    id: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
    label?: string; // e.g., 'Residencial', 'Comercial'
}

export interface Observacao {
    texto: string;
    autor: string;
    data: string; // ISO String
    tipo: 'ia' | 'manual';
}

export interface Evento {
    data: string; // ISO String
    autor: string;
    descricao: string;
}

export interface Cliente {
    id: string;
    nome: string;
    cpfCnpj: string;
    tipo: 'PF' | 'PJ';
    documentos?: DocumentoCliente[];
    dadosAdicionais?: CampoAdicionalCliente[];
    contatos?: Contato[];
    enderecos?: Endereco[];
    observacoes?: Observacao[];
    eventos?: Evento[];
}

// -- FUNÇÕES EXPORTADAS --

// System Config
export const getFullConfig = async (): Promise<AppConfig | null> => {
    await delay(100);
    return getFromStorage('actnexus_config');
}

export const saveFullConfig = async (config: AppConfig): Promise<void> => {
    await delay(100);
    saveToStorage('actnexus_config', config);
}


// Prompts
export const getPrompts = async (): Promise<SystemPrompts> => {
    const config = await getFullConfig();
    return config?.prompts || {};
}

export const updatePrompt = async (key: keyof SystemPrompts, text: string): Promise<void> => {
    const config = await getFullConfig();
    if (config) {
        config.prompts[key] = text;
        await saveFullConfig(config);
    }
}


// AI Usage
export const getAiUsageLogs = async (): Promise<AiUsageLog[]> => {
    await delay(300);
    console.log("MOCK API: Buscando logs de uso de IA...");
    const logs: AiUsageLog[] = getFromStorage('actnexus_ai_usage_logs', []);
    return logs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const logAiUsage = async (logData: Omit<AiUsageLog, 'id'>): Promise<void> => {
    // Nao simular delay para não atrasar a resposta da IA
    console.log("MOCK API: Registrando uso de IA...");
    const logs: AiUsageLog[] = getFromStorage('actnexus_ai_usage_logs', []);
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
  const livros: Livro[] = getFromStorage('actnexus_livros', []);
  return livros.sort((a,b) => b.ano - a.ano || b.numero - a.numero);
};

export const getLivroById = async (livroId: string): Promise<Livro | null> => {
    await delay(200);
    console.log(`MOCK API: Buscando livro pelo ID ${livroId}...`);
    const livros: Livro[] = getFromStorage('actnexus_livros', []);
    return livros.find(livro => livro.id === livroId) || null;
}

export const createLivroComAtos = async (livroData: Omit<Livro, 'id' | 'totalAtos'>, atosData: Omit<Ato, 'id' | 'livroId' | 'urlPdf' | 'averbacoes'>[]): Promise<Livro> => {
    await delay(1200);
    console.log("MOCK API: Criando novo livro com atos via processamento de PDF...");
    const livros: Livro[] = getFromStorage('actnexus_livros', []);
    const todosAtos: Ato[] = getFromStorage('actnexus_atos', []);

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
  const todosAtos: Ato[] = getFromStorage('actnexus_atos', []);
  const atosDoLivro = todosAtos.filter((ato: any) => ato.livroId === livroId);
  return atosDoLivro.sort((a, b) => a.numeroAto - b.numeroAto);
};

export const getAtoById = async (atoId: string): Promise<Ato | null> => {
    await delay(200);
    console.log(`MOCK API: Buscando ato pelo ID ${atoId}...`);
    const atos: Ato[] = getFromStorage('actnexus_atos', []);
    return atos.find(ato => ato.id === atoId) || null;
}

type UpdateAtoPayload = {
    averbacao?: Averbacao;
    dadosExtraidos?: ExtractedActData;
};

export const updateAto = async (atoId: string, payload: UpdateAtoPayload): Promise<Ato | null> => {
    await delay(600);
    console.log(`MOCK API: Atualizando ato ${atoId}...`);
    const todosAtos: Ato[] = getFromStorage('actnexus_atos', []);
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
    
    const todosAtos: Ato[] = getFromStorage('actnexus_atos', []);
    // Filtra atos onde o nome do cliente aparece na lista de partes
    return todosAtos.filter((ato: any) => ato.partes.some((p: string) => p.toLowerCase().includes(cliente.nome.toLowerCase())));
}

// Clientes
export const getClientes = async (): Promise<Cliente[]> => {
    await delay(400);
    console.log("MOCK API: Buscando clientes...");
    const clientes: Cliente[] = getFromStorage('actnexus_clientes', []);
    return clientes.sort((a, b) => a.nome.localeCompare(b.nome));
};

export const getClienteById = async (clienteId: string): Promise<Cliente | null> => {
    await delay(200);
    console.log(`MOCK API: Buscando cliente pelo ID ${clienteId}...`);
    const clientes: Cliente[] = getFromStorage('actnexus_clientes', []);
    return clientes.find(c => c.id === clienteId) || null;
}

export const getClientesByNomes = async (nomes: string[]): Promise<Cliente[]> => {
    await delay(200);
    console.log(`MOCK API: Buscando clientes pelos nomes: ${nomes.join(', ')}...`);
    const clientes: Cliente[] = getFromStorage('actnexus_clientes', []);
    const lowerCaseNomes = nomes.map(n => n.toLowerCase());
    return clientes.filter(c => lowerCaseNomes.includes(c.nome.toLowerCase()));
};


export const createCliente = async (clienteData: Omit<Cliente, 'id'>): Promise<Cliente> => {
    await delay(800);
    console.log("MOCK API: Criando novo cliente...");
    const clientes: Cliente[] = getFromStorage('actnexus_clientes', []);
    const novoCliente: Cliente = { 
        ...clienteData, 
        id: `cliente-${clienteData.cpfCnpj.replace(/\D/g, '')}`, 
        dadosAdicionais: [],
        contatos: [],
        enderecos: [],
        observacoes: [],
        documentos: clienteData.documentos || [],
        eventos: [
            {
                data: new Date().toISOString(),
                autor: "Sistema",
                descricao: "Cliente cadastrado no sistema."
            }
        ],
    };
    clientes.push(novoCliente);
    saveToStorage('actnexus_clientes', clientes);
    return novoCliente;
}

type UpdateClientePayload = Partial<Omit<Cliente, 'id'>> & {
    campos?: CampoAdicionalCliente[]; // Legacy name for merging additional data
};

const generateEvents = (oldData: Cliente, newData: Cliente, autor: string): Evento[] => {
    const eventos: Evento[] = [];
    const now = new Date().toISOString();

    const oldContatos = oldData.contatos?.map(c => c.valor) || [];
    const newContatos = newData.contatos?.map(c => c.valor) || [];
    if (JSON.stringify(oldContatos) !== JSON.stringify(newContatos)) eventos.push({ data: now, autor, descricao: "Informações de contato foram atualizadas." });

    const oldEnderecos = oldData.enderecos?.map(e => `${e.logradouro}, ${e.numero}`) || [];
    const newEnderecos = newData.enderecos?.map(e => `${e.logradouro}, ${e.numero}`) || [];
    if (JSON.stringify(oldEnderecos) !== JSON.stringify(newEnderecos)) eventos.push({ data: now, autor, descricao: "Endereços foram atualizados." });

    const oldDocumentos = oldData.documentos?.map(d => d.nome) || [];
    const newDocumentos = newData.documentos?.map(d => d.nome) || [];
    if (JSON.stringify(oldDocumentos) !== JSON.stringify(newDocumentos)) eventos.push({ data: now, autor, descricao: "Documentos foram atualizados." });

    const oldObservacoes = oldData.observacoes?.map(o => o.texto) || [];
    const newObservacoes = newData.observacoes?.map(o => o.texto) || [];
    if (newObservacoes.length > oldObservacoes.length) {
        const addedObs = newObservacoes.filter(obs => !oldObservacoes.includes(obs));
        addedObs.forEach(obsText => {
             const obs = newData.observacoes?.find(o => o.texto === obsText);
             const eventDesc = obs?.tipo === 'ia' ? "Observação foi adicionada pela IA." : "Uma nova observação foi adicionada.";
             eventos.push({ data: now, autor: obs?.autor || autor, descricao: eventDesc });
        });
    }

    if (JSON.stringify(oldData.dadosAdicionais) !== JSON.stringify(newData.dadosAdicionais)) eventos.push({ data: now, autor: "Sistema", descricao: "Dados de qualificação foram sincronizados." });

    return eventos;
};

export const updateCliente = async (clienteId: string, payload: UpdateClientePayload, autor: string): Promise<Cliente | null> => {
    await delay(400);
    console.log(`MOCK API: Atualizando cliente ${clienteId}...`);
    const clientes: Cliente[] = getFromStorage('actnexus_clientes', []);
    const clienteIndex = clientes.findIndex(c => c.id === clienteId);

    if (clienteIndex === -1) {
        console.error("Cliente não encontrado para atualização.");
        return null;
    }

    const clienteAnterior = { ...clientes[clienteIndex] };
    let clienteAtual = { ...clienteAnterior };

    // Merge payload fields into the current client data, ensuring arrays are replaced not merged
    clienteAtual = {
        ...clienteAtual,
        ...payload,
    };
    
    // Special handling for merging 'campos' into 'dadosAdicionais'
    if (payload.campos) {
        if (!clienteAtual.dadosAdicionais) {
            clienteAtual.dadosAdicionais = [];
        }

        payload.campos.forEach(campo => {
            const campoExistenteIndex = clienteAtual.dadosAdicionais!.findIndex(c => c.label.toLowerCase() === campo.label.toLowerCase());
            if (campoExistenteIndex > -1) {
                clienteAtual.dadosAdicionais![campoExistenteIndex] = campo; 
            } else {
                clienteAtual.dadosAdicionais!.push(campo); 
            }
        });
        delete (clienteAtual as any).campos;
    }
    
    // Gerar e adicionar eventos
    const novosEventos = generateEvents(clienteAnterior, clienteAtual, autor);
    if (!clienteAtual.eventos) {
        clienteAtual.eventos = [];
    }
    clienteAtual.eventos.push(...novosEventos);
    
    clientes[clienteIndex] = clienteAtual;
    saveToStorage('actnexus_clientes', clientes);
    return clienteAtual;
}


// Configurações Parametrizaveis
const createConfigManager = (storageKey: string, defaultValues: string[]) => ({
  getAll: async (): Promise<string[]> => {
    await delay(100);
    return getFromStorage(storageKey, defaultValues);
  },
  add: async (newItem: string): Promise<void> => {
    await delay(200);
    const items = await getFromStorage(storageKey, defaultValues);
    if (items.some((i: string) => i.toLowerCase() === newItem.toLowerCase())) {
      throw new Error("Este item já existe.");
    }
    items.push(newItem);
    saveToStorage(storageKey, items);
  },
  remove: async (itemToRemove: string): Promise<void> => {
    await delay(200);
    let items = await getFromStorage(storageKey, defaultValues);
    items = items.filter((i: string) => i.toLowerCase() !== itemToRemove.toLowerCase());
    saveToStorage(storageKey, items);
  },
});

const tiposLivroManager = createConfigManager('actnexus_tipos_livro', []);
export const getTiposDeLivro = tiposLivroManager.getAll;
export const addTipoDeLivro = tiposLivroManager.add;
export const removeTipoDeLivro = tiposLivroManager.remove;

const tiposAtoManager = createConfigManager('actnexus_tipos_ato', []);
export const getTiposDeAto = tiposAtoManager.getAll;
export const addTipoDeAto = tiposAtoManager.add;
export const removeTipoDeAto = tiposAtoManager.remove;

const nomesDocumentoManager = createConfigManager('actnexus_nomes_documento', []);
export const getNomesDeDocumento = nomesDocumentoManager.getAll;
export const addNomeDeDocumento = nomesDocumentoManager.add;
export const removeNomeDeDocumento = nomesDocumentoManager.remove;

const tiposContatoManager = createConfigManager('actnexus_tipos_contato', []);
export const getTiposDeContato = tiposContatoManager.getAll;
export const addTipoDeContato = tiposContatoManager.add;
export const removeTipoDeContato = tiposContatoManager.remove;
