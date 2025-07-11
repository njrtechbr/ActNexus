
const initialLivros = [
  {
    "id": "livro-001",
    "numero": 1,
    "ano": 2025,
    "tipo": "Notas",
    "status": "Concluído",
    "totalAtos": 2,
    "dataAbertura": "2025-01-02",
    "dataFechamento": "2025-01-30",
    "urlPdfOriginal": "livro_notas_001_2025.pdf"
  },
  {
    "id": "livro-002",
    "numero": 2,
    "ano": 2025,
    "tipo": "Procuração",
    "status": "Processando",
    "totalAtos": 1,
    "dataAbertura": "2025-02-01",
    "urlPdfOriginal": "livro_procuracao_002_2025.pdf"
  },
  {
    "id": "livro-003",
    "numero": 3,
    "ano": 2024,
    "tipo": "Escritura",
    "status": "Arquivado",
    "totalAtos": 0,
    "dataAbertura": "2024-12-01",
    "dataFechamento": "2024-12-28"
  }
];

const initialAtos = [
  {
    "id": "ato-001-001",
    "livroId": "livro-001",
    "numeroAto": 1,
    "tipoAto": "Procuração",
    "dataAto": "2025-01-15",
    "partes": ["Maria Silva", "João Santos"],
    "urlPdf": "/path/to/dummy.pdf",
    "dadosExtraidos": {
      "outorgante": { "nome": "Maria Silva", "cpf": "111.222.333-44" },
      "outorgado": { "nome": "João Santos", "cpf": "555.666.777-88" }
    },
    "observacoes": "Averbação: Em 20/01/2025, foi adicionado um novo endereço para o outorgante."
  },
  {
    "id": "ato-001-002",
    "livroId": "livro-001",
    "numeroAto": 2,
    "tipoAto": "Escritura de Compra e Venda",
    "dataAto": "2025-01-20",
    "partes": ["Pedro Costa", "Ana Pereira"],
    "urlPdf": "/path/to/dummy.pdf",
    "dadosExtraidos": null,
    "observacoes": ""
  },
  {
    "id": "ato-002-001",
    "livroId": "livro-002",
    "numeroAto": 1,
    "tipoAto": "Testamento",
    "dataAto": "2025-02-10",
    "partes": ["Carlos Nobrega"],
    "urlPdf": "/path/to/dummy.pdf",
    "dadosExtraidos": null,
    "observacoes": ""
  }
];

const initialClientes = [
  {
    "id": "cliente-11122233344",
    "nome": "Maria Silva",
    "cpfCnpj": "111.222.333-44",
    "tipo": "PF",
    "documentos": [
      { "nome": "RG", "url": "/docs/rg_maria.pdf" },
      { "nome": "Comprovante de Endereço", "url": "/docs/comp_end_maria.pdf" }
    ]
  },
   {
    "id": "cliente-55566677788",
    "nome": "João Santos",
    "cpfCnpj": "555.666.777-88",
    "tipo": "PF",
    "documentos": []
  },
  {
    "id": "cliente-99988877766",
    "nome": "Pedro Costa",
    "cpfCnpj": "999.888.777-66",
    "tipo": "PF",
    "documentos": []
  },
  {
    "id": "cliente-12312312312",
    "nome": "Ana Pereira",
    "cpfCnpj": "123.123.123-12",
    "tipo": "PF",
    "documentos": []
  },
  {
    "id": "cliente-45645645645",
    "nome": "Carlos Nobrega",
    "cpfCnpj": "456.456.456-45",
    "tipo": "PF",
    "documentos": []
  }
];

const initialTiposLivro = [
    "Livro de Notas",
    "Livro de Procurações",
    "Livro de Testamentos",
    "Livro de Protocolo",
    "Livro de Controle de Depósito Prévio",
    "Livro Diário Auxiliar da Receita e da Despesa"
];

export function populateInitialData() {
    const isPopulated = localStorage.getItem('actnexus_populated_v2');

    if (!isPopulated) {
        localStorage.setItem('actnexus_livros', JSON.stringify(initialLivros));
        localStorage.setItem('actnexus_atos', JSON.stringify(initialAtos));
        localStorage.setItem('actnexus_clientes', JSON.stringify(initialClientes));
        localStorage.setItem('actnexus_tipos_livro', JSON.stringify(initialTiposLivro));
        localStorage.setItem('actnexus_populated_v2', 'true');
    }
}

    