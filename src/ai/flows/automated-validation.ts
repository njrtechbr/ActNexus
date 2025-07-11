
'use server';

/**
 * @fileOverview Automated document validation flow.
 *
 * This file defines a Genkit flow for automatically validating document information (CPF/name) upon upload.
 * It includes the function automatedValidation, the input type AutomatedValidationInput, and the output type AutomatedValidationOutput.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AutomatedValidationInputSchema = z.object({
  documentText: z
    .string()
    .describe('The text extracted from the document to be validated.'),
});
export type AutomatedValidationInput = z.infer<typeof AutomatedValidationInputSchema>;

const AutomatedValidationOutputSchema = z.object({
  isValid: z.boolean().describe('Whether the document information is valid.'),
  validationDetails: z
    .string()
    .describe('Details about the validation, including any errors found.'),
  extractedName: z.string().optional().describe('The extracted name from the document, if available.'),
  extractedCPF: z.string().optional().describe('The extracted CPF from the document, if available.'),
});
export type AutomatedValidationOutput = z.infer<typeof AutomatedValidationOutputSchema>;

export async function automatedValidation(input: AutomatedValidationInput): Promise<AutomatedValidationOutput> {
  return automatedValidationFlow(input);
}

const automatedValidationPrompt = ai.definePrompt({
  name: 'automatedValidationPrompt',
  input: {schema: AutomatedValidationInputSchema},
  output: {schema: AutomatedValidationOutputSchema},
  prompt: `Você é um especialista em validação de documentos legais.
  Sua tarefa é validar as informações extraídas de um documento.
  Especificamente, você precisa determinar se o documento é válido com base no CPF e no nome fornecidos no texto do documento.
  Se o documento contiver tanto CPF quanto Nome, extraia-os.

  Texto do Documento: {{{documentText}}}

  Responda em formato JSON com a seguinte estrutura:
  {
    "isValid": boolean, // true se o documento for válido, false caso contrário
    "validationDetails": string, // Detalhes sobre a validação, incluindo quaisquer erros encontrados
    "extractedName": string, // O nome extraído do documento, se disponível.
    "extractedCPF": string, // O CPF extraído do documento, se disponível.
  }
  `,
});

const automatedValidationFlow = ai.defineFlow(
  {
    name: 'automatedValidationFlow',
    inputSchema: AutomatedValidationInputSchema,
    outputSchema: AutomatedValidationOutputSchema,
  },
  async input => {
    const {output} = await ai.generate({
        model: 'googleai/gemini-1.5-flash-latest',
        prompt: automatedValidationPrompt.prompt,
        input: input,
        output: {
            schema: AutomatedValidationOutputSchema,
        }
    });
    return output!;
  }
);
