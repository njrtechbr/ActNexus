
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
import { getPrompt } from '@/services/promptService';

const ExtractActDetailsInputSchema = z.object({
  actContent: z.string().describe("The full Markdown content of the notarial act."),
});
export type ExtractActDetailsInput = z.infer<typeof ExtractActDetailsInputSchema>;

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


export async function extractActDetails(input: ExtractActDetailsInput): Promise<ExtractActDetailsOutput> {
  return extractActDetailsFlow(input);
}

const extractActDetailsFlow = ai.defineFlow(
  {
    name: 'extractActDetailsFlow',
    inputSchema: ExtractActDetailsInputSchema,
    outputSchema: ExtractActDetailsOutputSchema,
  },
  async (input) => {
    const promptTemplate = await getPrompt('extractActDetailsPrompt');

    const extractActDetailsPrompt = ai.definePrompt({
      name: 'extractActDetailsPrompt_dynamic',
      model: 'googleai/gemini-1.5-flash-latest',
      input: { schema: ExtractActDetailsInputSchema },
      output: { schema: ExtractActDetailsOutputSchema },
      prompt: promptTemplate
    });

    const { output } = await extractActDetailsPrompt(input);
    return output!;
  }
);
