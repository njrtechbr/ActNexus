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
  prompt: `You are an expert legal document validator.
  Your task is to validate the information extracted from a document.
  Specifically, you need to determine if the document is valid based on the CPF and name provided in the document text.
  If the document contains both CPF and Name, extract them.

  Document Text: {{{documentText}}}

  Respond in JSON format with the following structure:
  {
    "isValid": boolean, // true if the document is valid, false otherwise
    "validationDetails": string, // Details about the validation, including any errors found
    "extractedName": string, // The extracted name from the document, if available.
    "extractedCPF": string, // The extracted CPF from the document, if available.
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
    const {output} = await automatedValidationPrompt(input);
    return output!;
  }
);
