// Simula a latência da rede
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Funções para simular a API usando localStorage
const getFromStorage = (key: string) => {
  if (typeof window === 'undefined') {
    return [];
  }
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : [];
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
    status: string;
    totalAtos: number;
}

export interface Ato {
    id: string;
    livroId: string;
    numeroAto: number;
    tipoAto: string;
    dataAto: string; // Formato YYYY-MM-DD
    partes: string[];
    urlPdf: string;
    dadosExtraidos: Record<string, any> | null;
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

export const getLivros = async (): Promise<Livro[]> => {
  await delay(500);
  console.log("MOCK API: Buscando livros...");
  return getFromStorage('actnexus_livros');
};

export const getLivroById = async (livroId: string): Promise<Livro | null> => {
    await delay(200);
    console.log(`MOCK API: Buscando livro pelo ID ${livroId}...`);
    const livros: Livro[] = getFromStorage('actnexus_livros');
    return livros.find(livro => livro.id === livroId) || null;
}

export const getAtosByLivroId = async (livroId: string): Promise<Ato[]> => {
  await delay(300);
  console.log(`MOCK API: Buscando atos para o livro ${livroId}...`);
  const todosAtos: Ato[] = getFromStorage('actnexus_atos');
  return todosAtos.filter((ato: any) => ato.livroId === livroId);
};

export const getAtosByClienteId = async (clienteId: string): Promise<Ato[]> => {
    await delay(300);
    console.log(`MOCK API: Buscando atos para o cliente ${clienteId}...`);
    const cliente = await getClienteById(clienteId);
    if (!cliente) return [];
    
    const todosAtos: Ato[] = getFromStorage('actnexus_atos');
    // Filtra atos onde o nome do cliente aparece na lista de partes
    return todosAtos.filter((ato: any) => ato.partes.includes(cliente.nome));
}

export const getClientes = async (): Promise<Cliente[]> => {
    await delay(400);
    console.log("MOCK API: Buscando clientes...");
    return getFromStorage('actnexus_clientes');
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
    const novoCliente: Cliente = { ...clienteData, id: `cliente-${clienteData.cpfCnpj}` };
    clientes.push(novoCliente);
    saveToStorage('actnexus_clientes', clientes);
    return novoCliente;
}
