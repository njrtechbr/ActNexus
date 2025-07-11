
'use server';

/**
 * @fileOverview A Genkit flow to summarize a client's history based on their notarial acts.
 *
 * This file defines a flow that takes a client's name and a list of their acts (type and date)
 * and generates a concise summary of their activity.
 * It includes the function summarizeClientHistory, the input type SummarizeClientHistoryInput,
 * and the output type SummarizeClientHistoryOutput.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeClientHistoryInputSchema = z.object({
  clientName: z.string().describe("The client's full name."),
  acts: z.array(z.object({
      type: z.string().describe("The type of the notarial act (e.g., 'Procuração', 'Escritura')."),
      date: z.string().describe("The date of the act in YYYY-MM-DD format."),
    })
  ).describe("A list of notarial acts associated with the client."),
});
export type SummarizeClientHistoryInput = z.infer<typeof SummarizeClientHistoryInputSchema>;

const SummarizeClientHistoryOutputSchema = z.object({
  summary: z.string().describe("A concise, natural-language summary of the client's history."),
});
export type SummarizeClientHistoryOutput = z.infer<typeof SummarizeClientHistoryOutputSchema>;

export async function summarizeClientHistory(input: SummarizeClientHistoryInput): Promise<SummarizeClientHistoryOutput> {
  return summarizeClientHistoryFlow(input);
}

const summarizeClientHistoryPrompt = ai.definePrompt({
  name: 'summarizeClientHistoryPrompt',
  input: {schema: SummarizeClientHistoryInputSchema},
  output: {schema: SummarizeClientHistoryOutputSchema},
  model: 'googleai/gemini-1.5-flash-latest',
  prompt: `Você é um assistente de cartório especialista em analisar o histórico de clientes.
Sua tarefa é gerar um resumo em linguagem natural sobre as atividades de um cliente com base em uma lista de atos notariais.
O resumo deve ser um único parágrafo, profissional e conciso.

Cliente: {{{clientName}}}

Atos Realizados:
{{#each acts}}
- Tipo: {{{this.type}}}, Data: {{{this.date}}}
{{/each}}

Analise os atos e datas para criar um resumo coeso. Por exemplo, mencione quando o cliente começou o relacionamento com o cartório, a frequência ou a variedade de atos realizados.
`
});

const summarizeClientHistoryFlow = ai.defineFlow(
  {
    name: 'summarizeClientHistoryFlow',
    inputSchema: SummarizeClientHistoryInputSchema,
    outputSchema: SummarizeClientHistoryOutputSchema,
  },
  async input => {
    if (input.acts.length === 0) {
        return { summary: `${input.clientName} ainda não possui atos registrados no cartório.`};
    }
    const {output} = await summarizeClientHistoryPrompt(input);
    return output!;
  }
);
