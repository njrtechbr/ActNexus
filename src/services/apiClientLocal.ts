// Simula a latência da rede
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Funções para simular a API usando localStorage
const getFromStorage = (key: string) => {
  if (typeof window === 'undefined') {
    return [];
  }
  return JSON.parse(localStorage.getItem(key) || '[]');
};

const saveToStorage = (key: string, data: any) => {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(key, JSON.stringify(data));
};

// -- FUNÇÕES EXPORTADAS --

export interface Livro {
    id: string;
    numero: number;
    ano: number;
    status: string;
    totalAtos: number;
}

export const getLivros = async (): Promise<Livro[]> => {
  await delay(500); // Simula o tempo de uma requisição de rede
  console.log("MOCK API: Buscando livros...");
  return getFromStorage('actnexus_livros');
};

export const getAtosByLivroId = async (livroId: string) => {
  await delay(300);
  console.log(`MOCK API: Buscando atos para o livro ${livroId}...`);
  const todosAtos = getFromStorage('actnexus_atos');
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
