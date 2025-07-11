
'use server';

/**
 * @fileOverview A Genkit flow to generate a formatted legal qualification paragraph.
 *
 * This flow takes a client's name and a list of key-value details
 * and uses AI to generate a cohesive, legally-styled qualification string.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const QualificationFieldSchema = z.object({
  label: z.string(),
  value: z.string(),
});

const GenerateQualificationInputSchema = z.object({
  clientName: z.string().describe("The client's full name."),
  fields: z.array(QualificationFieldSchema).describe("An array of key-value pairs representing the client's details."),
});
export type GenerateQualificationInput = z.infer<typeof GenerateQualificationInputSchema>;

const GenerateQualificationOutputSchema = z.object({
  qualificationText: z.string().describe("The formatted, legally-styled qualification paragraph."),
});
export type GenerateQualificationOutput = z.infer<typeof GenerateQualificationOutputSchema>;


export async function generateQualification(input: GenerateQualificationInput): Promise<GenerateQualificationOutput> {
  return generateQualificationFlow(input);
}

const generateQualificationPrompt = ai.definePrompt({
  name: 'generateQualificationPrompt',
  input: { schema: GenerateQualificationInputSchema },
  output: { schema: GenerateQualificationOutputSchema },
  prompt: `
Você é um assistente de cartório especialista em redigir textos legais.
Sua tarefa é criar um parágrafo de "qualificação" para um cliente, usando o nome e os detalhes fornecidos.
O texto deve ser um parágrafo único, contínuo, e seguir o estilo formal de documentos notariais.

Exemplo de formato esperado:
"[NOME COMPLETO], [nacionalidade], [estado civil], [profissão], portador(a) da carteira de identidade (RG) nº [número do RG], inscrito(a) no CPF/MF sob o nº [número do CPF], residente e domiciliado(a) na [endereço completo]."

Use os seguintes dados para construir o parágrafo:

Nome do Cliente: {{{clientName}}}

Detalhes:
{{#each fields}}
- {{{this.label}}}: {{{this.value}}}
{{/each}}

Construa o parágrafo de qualificação de forma fluida e natural, incorporando os detalhes fornecidos.
`
});

const generateQualificationFlow = ai.defineFlow(
  {
    name: 'generateQualificationFlow',
    inputSchema: GenerateQualificationInputSchema,
    outputSchema: GenerateQualificationOutputSchema,
  },
  async (input) => {
    if (input.fields.length === 0) {
      return { qualificationText: "Nenhum campo selecionado para gerar a qualificação." };
    }
    const { output } = await generateQualificationPrompt(input);
    return output!;
  }
);
