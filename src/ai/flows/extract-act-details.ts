
'use server';

/**
 * @fileOverview A Genkit flow to extract key details from a notarial act's content.
 *
 * This flow takes the Markdown content of the act and uses AI to extract
 * a structured list of key-value pairs representing the most important
 * information within the document, grouped by the involved parties.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Input Schema: The markdown content of the act
const ExtractActDetailsInputSchema = z.object({
  actContent: z.string().describe("The full Markdown content of the notarial act."),
});
export type ExtractActDetailsInput = z.infer<typeof ExtractActDetailsInputSchema>;

// Output Schema
const ExtractedDetailSchema = z.object({
    label: z.string().describe("The label for the extracted detail (e.g., 'CPF', 'Endereço', 'Nacionalidade')."),
    value: z.string().describe("The value of the extracted detail."),
});

const InvolvedPartySchema = z.object({
    nome: z.string().describe("The full name of the involved party."),
    tipo: z.string().describe("The role of the party in the act (e.g., 'Outorgante', 'Vendedor')."),
    detalhes: z.array(ExtractedDetailSchema).describe("A list of key details specific to this party, including their full qualification.")
});

const ExtractActDetailsOutputSchema = z.object({
  detalhesGerais: z.array(ExtractedDetailSchema).describe("An array of general details about the act itself (e.g., 'Objeto', 'Prazo de Validade')."),
  partes: z.array(InvolvedPartySchema).describe("An array of the parties involved in the act and their specific details."),
});
export type ExtractActDetailsOutput = z.infer<typeof ExtractActDetailsOutputSchema>;


// The main exported function that clients will call.
export async function extractActDetails(input: ExtractActDetailsInput): Promise<ExtractActDetailsOutput> {
  return extractActDetailsFlow(input);
}

// Genkit Prompt: Instructs the AI on how to perform the extraction
const extractActDetailsPrompt = ai.definePrompt({
  name: 'extractActDetailsPrompt',
  input: { schema: ExtractActDetailsInputSchema },
  output: { schema: ExtractActDetailsOutputSchema },
  prompt: `
Você é um assistente de cartório especialista em analisar documentos legais.
Sua tarefa é ler o conteúdo de um ato notarial e extrair as informações mais importantes de forma estruturada.

Divida as informações em duas categorias:
1.  **detalhesGerais**: Informações que pertencem ao ato como um todo (Ex: Objeto do ato, Prazos, Valores, Local e Data).
2.  **partes**: Informações específicas de cada pessoa ou empresa envolvida. Para cada parte, identifique:
    - O **nome** completo.
    - O **tipo** (Outorgante, Outorgado, Vendedor, etc.).
    - A **qualificação completa** nos mínimos detalhes, extraindo cada informação como um par de label/value (Ex: 'Nacionalidade', 'Estado Civil', 'Profissão', 'RG', 'CPF', 'Endereço Completo').

Seja exaustivo e preciso na extração da qualificação. Evite texto introdutório na resposta.

Conteúdo do Ato:
{{{actContent}}}
`,
});

// Genkit Flow: Orchestrates the call to the AI prompt
const extractActDetailsFlow = ai.defineFlow(
  {
    name: 'extractActDetailsFlow',
    inputSchema: ExtractActDetailsInputSchema,
    outputSchema: ExtractActDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await extractActDetailsPrompt(input);
    return output!;
  }
);
