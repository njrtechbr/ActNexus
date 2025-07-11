export const initialLivros = [
  {
    "id": "livro-001",
    "numero": 1,
    "ano": 2025,
    "status": "Concluído",
    "totalAtos": 150
  },
  {
    "id": "livro-002",
    "numero": 2,
    "ano": 2025,
    "status": "Processando",
    "totalAtos": 200
  },
  {
    "id": "livro-003",
    "numero": 3,
    "ano": 2024,
    "status": "Arquivado",
    "totalAtos": 300
  }
];

export const initialAtos = [
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
    }
  },
  {
    "id": "ato-001-002",
    "livroId": "livro-001",
    "numeroAto": 2,
    "tipoAto": "Escritura de Compra e Venda",
    "dataAto": "2025-01-20",
    "partes": ["Pedro Costa", "Ana Pereira"],
    "urlPdf": "/path/to/dummy.pdf",
    "dadosExtraidos": null
  },
  {
    "id": "ato-002-001",
    "livroId": "livro-002",
    "numeroAto": 1,
    "tipoAto": "Testamento",
    "dataAto": "2025-02-10",
    "partes": ["Carlos Nobrega"],
    "urlPdf": "/path/to/dummy.pdf",
    "dadosExtraidos": null
  }
];

export const initialClientes = [
  {
    "id": "cliente-11122233344",
    "nome": "Maria Silva",
    "cpfCnpj": "111.222.333-44",
    "tipo": "PF",
    "documentos": [
      { "nome": "RG", "url": "/docs/rg_maria.pdf" },
      { "nome": "Comprovante de Endereço", "url": "/docs/comp_end_maria.pdf" }
    ]
  }
];

export function populateInitialData() {
    if (!localStorage.getItem('actnexus_livros')) {
        localStorage.setItem('actnexus_livros', JSON.stringify(initialLivros));
    }
    if (!localStorage.getItem('actnexus_atos')) {
        localStorage.setItem('actnexus_atos', JSON.stringify(initialAtos));
    }
    if (!localStorage.getItem('actnexus_clientes')) {
        localStorage.setItem('actnexus_clientes', JSON.stringify(initialClientes));
    }
}
