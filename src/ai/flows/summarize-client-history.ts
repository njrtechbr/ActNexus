
'use server';

/**
 * @fileOverview A Genkit flow to summarize a client's complete profile.
 *
 * This flow takes a comprehensive client object and generates a concise summary of their
 * entire profile, including personal data, contacts, addresses, documents, and notarial history.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

// Define schemas that mirror the structure in apiClientLocal.ts
const ContatoSchema = z.object({
  tipo: z.enum(['email', 'telefone', 'whatsapp']),
  valor: z.string(),
  label: z.string().optional(),
});

const EnderecoSchema = z.object({
  logradouro: z.string(),
  numero: z.string(),
  bairro: z.string(),
  cidade: z.string(),
  estado: z.string(),
  cep: z.string(),
  label: z.string().optional(),
});

const DocumentoClienteSchema = z.object({
  nome: z.string(),
  dataValidade: z.string().optional(),
});

const CampoAdicionalClienteSchema = z.object({
    label: z.string(),
    value: z.string(),
});

const AtoHistorySchema = z.object({
    type: z.string().describe("The type of the notarial act (e.g., 'Procuração', 'Escritura')."),
    date: z.string().describe("The date of the act in YYYY-MM-DD format."),
});

const SummarizeClientHistoryInputSchema = z.object({
  nome: z.string(),
  cpfCnpj: z.string(),
  tipo: z.enum(['PF', 'PJ']),
  contatos: z.array(ContatoSchema).optional(),
  enderecos: z.array(EnderecoSchema).optional(),
  documentos: z.array(DocumentoClienteSchema).optional(),
  dadosAdicionais: z.array(CampoAdicionalClienteSchema).optional(),
  observacoes: z.array(z.string()).optional(),
  atos: z.array(AtoHistorySchema).describe("A list of notarial acts associated with the client."),
});
export type SummarizeClientHistoryInput = z.infer<typeof SummarizeClientHistoryInputSchema>;

const SummarizeClientHistoryOutputSchema = z.object({
  summary: z.string().describe("A concise, natural-language summary of the client's history, in Brazilian Portuguese."),
});
export type SummarizeClientHistoryOutput = z.infer<typeof SummarizeClientHistoryOutputSchema>;

export async function summarizeClientHistory(input: SummarizeClientHistoryInput): Promise<SummarizeClientHistoryOutput> {
  return summarizeClientHistoryFlow(input);
}

const summarizeClientHistoryPrompt = ai.definePrompt({
  name: 'summarizeClientHistoryPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: {schema: SummarizeClientHistoryInputSchema},
  output: {schema: SummarizeClientHistoryOutputSchema},
  prompt: `
Você é um assistente de cartório especialista em analisar perfis de clientes.
Sua tarefa é gerar um resumo em **português do Brasil**, conciso e em linguagem natural, sobre o perfil completo de um cliente, com base em todos os dados fornecidos.
O resumo deve ser um único parágrafo, profissional e direto.

Analise todos os dados a seguir para criar um resumo coeso. Destaque os pontos mais importantes, como a natureza do cliente (PF/PJ), o histórico de atividades, a completude do cadastro e quaisquer pontos de atenção (como documentos perto de expirar).

**Dados do Cliente:**
- Nome: {{{nome}}}
- CPF/CNPJ: {{{cpfCnpj}}}
- Tipo: {{{tipo}}}

{{#if contatos.length}}
**Contatos:**
{{#each contatos}}
- {{this.tipo}}: {{this.valor}} ({{this.label}})
{{/each}}
{{/if}}

{{#if enderecos.length}}
**Endereços:**
{{#each enderecos}}
- {{this.logradouro}}, {{this.numero}} - {{this.bairro}}, {{this.cidade}}/{{this.estado}}
{{/each}}
{{/if}}

{{#if documentos.length}}
**Documentos:**
{{#each documentos}}
- {{this.nome}} {{#if this.dataValidade}}(Validade: {{this.dataValidade}}){{/if}}
{{/each}}
{{/if}}

{{#if dadosAdicionais.length}}
**Dados de Qualificação:**
{{#each dadosAdicionais}}
- {{this.label}}: {{this.value}}
{{/each}}
{{/if}}

{{#if observacoes.length}}
**Observações Existentes:**
{{#each observacoes}}
- {{this}}
{{/each}}
{{/if}}

{{#if atos.length}}
**Histórico de Atos:**
{{#each atos}}
- Tipo: {{{this.type}}}, Data: {{{this.date}}}
{{/each}}
{{/if}}

Gere o resumo em um parágrafo.
`
});

const summarizeClientHistoryFlow = ai.defineFlow(
  {
    name: 'summarizeClientHistoryFlow',
    inputSchema: SummarizeClientHistoryInputSchema,
    outputSchema: SummarizeClientHistoryOutputSchema,
  },
  async input => {
    if (input.atos.length === 0 && input.contatos?.length === 0 && input.enderecos?.length === 0) {
        return { summary: `${input.nome} possui um cadastro básico, sem histórico de atos ou informações de contato detalhadas.`};
    }
    const {output} = await summarizeClientHistoryPrompt(input);
    return output!;
  }
);
