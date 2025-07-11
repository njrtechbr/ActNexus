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

export const createCliente = async (clienteData: any) => {
    await delay(800);
    console.log("MOCK API: Criando novo cliente...");
    const clientes = getFromStorage('actnexus_clientes');
    const novoCliente = { ...clienteData, id: `cliente-${clienteData.cpfCnpj}` };
    clientes.push(novoCliente);
    saveToStorage('actnexus_clientes', clientes);
    return novoCliente;
}

// ... criar outras funções como: getClienteById, uploadDeAto, etc.
