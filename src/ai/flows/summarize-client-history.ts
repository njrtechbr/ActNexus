
'use server';

/**
 * @fileOverview A Genkit flow to summarize a client's complete profile.
 *
 * This flow takes a comprehensive client object and generates a concise summary of their
 * entire profile, including personal data, contacts, addresses, documents, and notarial history.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { getPrompt } from '@/services/promptService';

// Define schemas that mirror the structure in apiClientLocal.ts
const ContatoSchema = z.object({
  id: z.string(),
  tipo: z.enum(['email', 'telefone', 'whatsapp']),
  valor: z.string(),
  label: z.string().optional(),
});

const EnderecoSchema = z.object({
  id: z.string(),
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
  url: z.string(),
  dataValidade: z.string().optional(),
});

const CampoAdicionalClienteSchema = z.object({
    label: z.string(),
    value: z.string(),
});

const ObservacaoSchema = z.object({
    texto: z.string(),
    autor: z.string(),
    data: z.string(),
    tipo: z.enum(['ia', 'manual']),
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
  observacoes: z.array(ObservacaoSchema).optional(),
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
    
    const promptTemplate = await getPrompt('summarizeClientHistoryPrompt');
    
    const summarizeClientHistoryPrompt = ai.definePrompt({
      name: 'summarizeClientHistoryPrompt_dynamic',
      model: 'googleai/gemini-1.5-flash-latest',
      input: {schema: SummarizeClientHistoryInputSchema},
      output: {schema: SummarizeClientHistoryOutputSchema},
      prompt: promptTemplate,
    });
    
    const {output} = await summarizeClientHistoryPrompt(input);
    return output!;
  }
);
