
'use server';

/**
 * @fileOverview A Genkit flow to extract key details from a notarial act's content.
 *
 * This flow takes the Markdown content of an act and uses AI to extract
 * a structured list of key-value pairs representing the most important
 * information within the document.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Input Schema: The markdown content of the act
const ExtractActDetailsInputSchema = z.object({
  actContent: z.string().describe("The full Markdown content of the notarial act."),
});
export type ExtractActDetailsInput = z.infer<typeof ExtractActDetailsInputSchema>;

// Output Schema: A list of extracted key-value pairs
const ExtractedDetailSchema = z.object({
    label: z.string().describe("The label for the extracted detail (e.g., 'Outorgante', 'CPF', 'Objeto')."),
    value: z.string().describe("The value of the extracted detail."),
});

const ExtractActDetailsOutputSchema = z.object({
  details: z.array(ExtractedDetailSchema).describe("An array of key details extracted from the act."),
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
Sua tarefa é ler o conteúdo de um ato notarial e extrair as informações mais importantes em uma lista de pares de "rótulo" e "valor".

Identifique os detalhes cruciais como:
- As partes envolvidas (Outorgante, Outorgado, Vendedor, Comprador, etc.) e seus documentos (CPF/CNPJ).
- O objeto principal do ato (ex: 'Transferência do veículo X', 'Compra e venda do imóvel Y').
- Prazos, valores ou condições importantes.
- O local e a data do documento.

Seja conciso e direto nos valores. Evite texto introdutório.

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
