
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
  const livros: Livro[] = getFromStorage('actnexus_livros');
  return livros.sort((a,b) => b.ano - a.ano || b.numero - a.numero);
};

export const getLivroById = async (livroId: string): Promise<Livro | null> => {
    await delay(200);
    console.log(`MOCK API: Buscando livro pelo ID ${livroId}...`);
    const livros: Livro[] = getFromStorage('actnexus_livros');
    return livros.find(livro => livro.id === livroId) || null;
}

export const createLivro = async (livroData: Omit<Livro, 'id'>): Promise<Livro> => {
    await delay(800);
    console.log("MOCK API: Criando novo livro...");
    const livros: Livro[] = getFromStorage('actnexus_livros');
    const novoLivro: Livro = { ...livroData, id: `livro-${livroData.numero}-${livroData.ano}-${Date.now()}` };
    livros.push(novoLivro);
    saveToStorage('actnexus_livros', livros);
    return novoLivro;
}

export const getAtosByLivroId = async (livroId: string): Promise<Ato[]> => {
  await delay(300);
  console.log(`MOCK API: Buscando atos para o livro ${livroId}...`);
  const todosAtos: Ato[] = getFromStorage('actnexus_atos');
  const atosDoLivro = todosAtos.filter((ato: any) => ato.livroId === livroId);
  return atosDoLivro.sort((a, b) => a.numeroAto - b.numeroAto);
};

export const createAto = async (atoData: Omit<Ato, 'id' | 'urlPdf' | 'dadosExtraidos'>): Promise<Ato> => {
    await delay(800);
    console.log("MOCK API: Criando novo ato...");
    const todosAtos: Ato[] = getFromStorage('actnexus_atos');
    const novoAto: Ato = { 
        ...atoData, 
        id: `ato-${atoData.livroId}-${atoData.numeroAto}-${Date.now()}`,
        urlPdf: "/path/to/dummy.pdf",
        dadosExtraidos: null
    };
    todosAtos.push(novoAto);
    saveToStorage('actnexus_atos', todosAtos);

    // Atualiza o total de atos no livro
    const livros: Livro[] = getFromStorage('actnexus_livros');
    const livroIndex = livros.findIndex(l => l.id === atoData.livroId);
    if(livroIndex !== -1) {
        livros[livroIndex].totalAtos += 1;
        saveToStorage('actnexus_livros', livros);
    }
    return novoAto;
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
