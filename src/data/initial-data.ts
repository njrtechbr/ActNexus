
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
    "urlPdfOriginal": "livro_notas_001_2025.pdf",
  },
  {
    "id": "livro-002",
    "numero": 2,
    "ano": 2025,
    "tipo": "Procuração",
    "status": "Concluído",
    "totalAtos": 1,
    "dataAbertura": "2025-02-01",
    "dataFechamento": "2025-02-28",
    "urlPdfOriginal": "livro_procuracao_002_2025.pdf",
  },
  {
    "id": "livro-003",
    "numero": 3,
    "ano": 2024,
    "tipo": "Escritura",
    "status": "Arquivado",
    "totalAtos": 0,
    "dataAbertura": "2024-12-01",
    "dataFechamento": "2024-12-28",
    "urlPdfOriginal": "livro_escritura_003_2024.pdf",
  }
];

const initialAtos = [
  {
    "id": "ato-001-001",
    "livroId": "livro-001",
    "numeroAto": 1,
    "tipoAto": "Procuração para Veículo",
    "dataAto": "2025-01-15",
    "partes": ["Maria Silva (Outorgante)", "João Santos (Outorgado)"],
    "escrevente": "Ana Costa",
    "urlPdf": "/path/to/dummy.pdf",
    "averbacoes": [
      { 
        "texto": "Em 20/01/2025, foi adicionado um novo endereço para o outorgante.",
        "dataAverbacao": "2025-01-20",
        "dataRegistro": "2025-01-20T10:00:00.000Z"
      }
    ],
    "conteudoMarkdown": "OUTORGANTE: MARIA SILVA, nacionalidade brasileira, estado civil solteira, profissão administradora, portadora da carteira de identidade (RG) nº 11.222.333-4 SSP/SP e inscrita no CPF/MF sob o nº 111.222.333-44, residente e domiciliada na Rua das Flores, nº 123, Bairro Centro, na cidade de São Paulo, Estado de São Paulo, CEP 01000-000.\n\nOUTORGADO: JOÃO SANTOS, nacionalidade brasileira, estado civil casado, profissão autônomo, portador da carteira de identidade (RG) nº 55.666.777-8 SSP/SP e inscrito no CPF/MF sob o nº 555.666.777-88, residente e domiciliado na Avenida Principal, nº 456, Bairro Sul, na cidade de Campinas, Estado de São Paulo, CEP 13000-000.\n\nOBJETO E PODERES: Pelo presente instrumento, a OUTORGANTE nomeia e constitui seu bastante procurador o OUTORGADO, a quem confere amplos, gerais e ilimitados poderes para o fim específico de promover a transferência de propriedade do veículo de sua posse e propriedade, com as seguintes características: VEÍCULO: Automóvel, MARCA: Fiat, MODELO: Cronos Drive 1.3, ANO DE FABRICAÇÃO/MODELO: 2022/2023, COR: Prata, PLACA: BRA2E19, CHASSI: 9BD19712P0G123456, RENAVAM: 01234567890. Para tanto, poderá o OUTORGADO representar a OUTORGANTE perante o Departamento de Trânsito (DETRAN) de qualquer estado da federação, e suas respectivas repartições (CIRETRAN), bem como junto a qualquer outro órgão ou entidade pública ou privada, podendo para tanto assinar o Certificado de Registro de Veículo (CRV/ATPV-e), requerer a emissão de segunda via de documentos, pagar taxas, impostos, multas e demais débitos que incidam sobre o referido veículo, receber o valor da venda, dar e receber quitação, assinar recibos, requerer e assinar todos os documentos necessários, preencher formulários, substabelecer esta a outrem, com ou sem reserva de iguais poderes, e praticar todos os demais atos necessários ao fiel e cabal cumprimento do presente mandato.\n\nPRAZO DE VALIDADE: A presente procuração terá validade de 90 (noventa) dias a contar da data de sua assinatura.\n\nLOCAL E DATA: São Paulo, 15 de janeiro de 2025.\n\n\n\n\n_________________________________________\nMARIA SILVA\n(Outorgante)\n\nObservação: Este é um documento fictício gerado como exemplo para teste de sistema. As informações aqui contidas, como nomes, documentos e dados do veículo, são simuladas e não possuem validade jurídica.",
    "dadosExtraidos": {
      "detalhesGerais": [
        { "label": "Objeto", "value": "Transferência de propriedade do veículo Fiat Cronos Drive 1.3, Placa BRA2E19" },
        { "label": "Prazo de Validade", "value": "90 dias" },
        { "label": "Local e Data", "value": "São Paulo, 15 de janeiro de 2025" }
      ],
      "partes": [
        {
          "nome": "Maria Silva",
          "tipo": "Outorgante",
          "detalhes": [
            { "label": "Nacionalidade", "value": "brasileira" },
            { "label": "Estado Civil", "value": "solteira" },
            { "label": "Profissão", "value": "administradora" },
            { "label": "RG", "value": "11.222.333-4 SSP/SP" },
            { "label": "CPF", "value": "111.222.333-44" },
            { "label": "Endereço", "value": "Rua das Flores, nº 123, Bairro Centro, São Paulo-SP, CEP 01000-000" }
          ]
        },
        {
          "nome": "João Santos",
          "tipo": "Outorgado",
          "detalhes": [
            { "label": "Nacionalidade", "value": "brasileira" },
            { "label": "Estado Civil", "value": "casado" },
            { "label": "Profissão", "value": "autônomo" },
            { "label": "RG", "value": "55.666.777-8 SSP/SP" },
            { "label": "CPF", "value": "555.666.777-88" },
            { "label": "Endereço", "value": "Avenida Principal, nº 456, Bairro Sul, Campinas-SP, CEP 13000-000" }
          ]
        }
      ]
    }
  },
  {
    "id": "ato-001-002",
    "livroId": "livro-001",
    "numeroAto": 2,
    "tipoAto": "Escritura de Compra e Venda",
    "dataAto": "2025-01-20",
    "partes": ["Pedro Costa", "Ana Pereira"],
    "escrevente": "Roberto Lima",
    "urlPdf": "/path/to/dummy.pdf",
    "averbacoes": [],
    "conteudoMarkdown": "Corpo do texto da escritura de compra e venda. Conteúdo de exemplo."
  },
  {
    "id": "ato-002-001",
    "livroId": "livro-002",
    "numeroAto": 1,
    "tipoAto": "Testamento",
    "dataAto": "2025-02-10",
    "partes": ["Carlos Nobrega"],
    "escrevente": "Ana Costa",
    "urlPdf": "/path/to/dummy.pdf",
    "averbacoes": [],
    "conteudoMarkdown": "Corpo do texto do testamento. Conteúdo de exemplo."
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
    const isPopulated = localStorage.getItem('actnexus_populated_v11');

    if (!isPopulated) {
        localStorage.setItem('actnexus_livros', JSON.stringify(initialLivros));
        localStorage.setItem('actnexus_atos', JSON.stringify(initialAtos));
        localStorage.setItem('actnexus_clientes', JSON.stringify(initialClientes));
        localStorage.setItem('actnexus_tipos_livro', JSON.stringify(initialTiposLivro));
        localStorage.setItem('actnexus_populated_v11', 'true');
    }
}
