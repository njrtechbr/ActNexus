
'use server';
/**
 * @fileOverview A Genkit flow for processing a notarial book PDF.
 *
 * This file defines a flow that takes the text content of a book, extracts its metadata
 * (number, year, type, dates) and all its individual acts, and transforms it into a structured
 * Markdown format for easy system ingestion.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getPrompt } from '@/services/promptService';

const ProcessLivroPdfInputSchema = z.object({
  pdfText: z.string().describe('The full text content extracted from the book PDF.'),
});
export type ProcessLivroPdfInput = z.infer<typeof ProcessLivroPdfInputSchema>;

const ProcessLivroPdfOutputSchema = z.object({
  markdownContent: z.string().describe('The structured Markdown content representing the entire book and its acts.'),
});
export type ProcessLivroPdfOutput = z.infer<typeof ProcessLivroPdfOutputSchema>;

export async function processLivroPdf(input: ProcessLivroPdfInput): Promise<ProcessLivroPdfOutput> {
  return processLivroPdfFlow(input);
}


const processLivroPdfFlow = ai.defineFlow(
  {
    name: 'processLivroPdfFlow',
    inputSchema: ProcessLivroPdfInputSchema,
    outputSchema: ProcessLivroPdfOutputSchema,
  },
  async (input) => {

    const promptTemplate = await getPrompt('processLivroPdfPrompt');
    
    const processLivroPdfPrompt = ai.definePrompt({
      name: 'processLivroPdfPrompt_dynamic',
      model: 'googleai/gemini-1.5-flash-latest',
      input: { schema: ProcessLivroPdfInputSchema },
      output: { schema: ProcessLivroPdfOutputSchema },
      prompt: promptTemplate,
    });

    const { output } = await processLivroPdfPrompt(input);
    return {
      markdownContent: output!.markdownContent,
    };
  }
);
