
'use server';

/**
 * @fileOverview A Genkit flow to generate a formatted legal qualification paragraph.
 *
 * This flow takes a client's name and a list of key-value details
 * and uses AI to generate a cohesive, legally-styled qualification string.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getPrompt } from '@/services/promptService';

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

    const promptTemplate = await getPrompt('generateQualificationPrompt');

    const generateQualificationPrompt = ai.definePrompt({
      name: 'generateQualificationPrompt_dynamic',
      model: 'googleai/gemini-1.5-flash-latest',
      input: { schema: GenerateQualificationInputSchema },
      output: { schema: GenerateQualificationOutputSchema },
      prompt: promptTemplate,
    });

    const { output } = await generateQualificationPrompt(input);
    return output!;
  }
);
