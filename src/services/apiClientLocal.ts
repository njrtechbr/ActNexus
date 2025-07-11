
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

export interface Livro {
    id: string;
    numero: number;
    ano: number;
    tipo: string;
    status: string;
    totalAtos: number;
    dataAbertura: string; // YYYY-MM-DD
    dataFechamento?: string; // YYYY-MM-DD, optional
    conteudoMarkdown?: string;
    urlPdfOriginal?: string;
}

export interface Ato {
    id: string;
    livroId: string;
    numeroAto: number;
    tipoAto: string;
    dataAto: string; // Formato YYYY-MM-DD
    partes: string[];
    urlPdf: string;
    averbacoes: string[];
}

export interface DocumentoCliente {
    nome: string;
    url: string;
}

export interface Cliente {
    id: string;
    nome: string;
    cpfCnpj: string;
    tipo: 'PF' | 'PJ';
    documentos: DocumentoCliente[];
}

// -- FUNÇÕES EXPORTADAS --

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

export const createLivroComAtos = async (livroData: Omit<Livro, 'id'>, atosData: Omit<Ato, 'id' | 'livroId' | 'urlPdf' | 'averbacoes'>[]): Promise<Livro> => {
    await delay(1200);
    console.log("MOCK API: Criando novo livro com atos via processamento de PDF...");
    const livros: Livro[] = getFromStorage('actnexus_livros');
    const todosAtos: Ato[] = getFromStorage('actnexus_atos');

    const novoLivro: Livro = { ...livroData, id: `livro-${livroData.numero}-${livroData.ano}-${Date.now()}` };
    
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

export const updateAto = async (atoId: string, data: { averbacao: string }): Promise<Ato | null> => {
    await delay(600);
    console.log(`MOCK API: Adicionando averbação ao ato ${atoId}...`);
    const todosAtos: Ato[] = getFromStorage('actnexus_atos');
    const atoIndex = todosAtos.findIndex(a => a.id === atoId);

    if (atoIndex === -1) {
        console.error("Ato não encontrado para atualização.");
        return null;
    }

    const atoAtual = todosAtos[atoIndex];
    if (!atoAtual.averbacoes) {
        atoAtual.averbacoes = [];
    }
    atoAtual.averbacoes.push(data.averbacao);
    
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
    return todosAtos.filter((ato: any) => ato.partes.includes(cliente.nome));
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

export const createCliente = async (clienteData: Omit<Cliente, 'id'>): Promise<Cliente> => {
    await delay(800);
    console.log("MOCK API: Criando novo cliente...");
    const clientes: Cliente[] = getFromStorage('actnexus_clientes');
    const novoCliente: Cliente = { ...clienteData, id: `cliente-${clienteData.cpfCnpj.replace(/\D/g, '')}` };
    clientes.push(novoCliente);
    saveToStorage('actnexus_clientes', clientes);
    return novoCliente;
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

    