
'use server';

/**
 * @fileOverview Semantic search flow for notarial acts.
 *
 * - semanticSearch - A function that handles the semantic search process.
 * - SemanticSearchInput - The input type for the semanticSearch function.
 * - SemanticSearchOutput - The return type for the semanticSearch function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SemanticSearchInputSchema = z.object({
  query: z.string().describe('The natural language query to search for notarial acts.'),
});
export type SemanticSearchInput = z.infer<typeof SemanticSearchInputSchema>;

const SemanticSearchOutputSchema = z.object({
  results: z.array(
    z.object({
      documentName: z.string().describe('The name of the document.'),
      documentDescription: z.string().describe('A short description of the document content.'),
      relevanceScore: z.number().describe('A score indicating the relevance of the document to the query.'),
    })
  ).describe('A list of search results, sorted by relevance score.'),
});
export type SemanticSearchOutput = z.infer<typeof SemanticSearchOutputSchema>;

export async function semanticSearch(input: SemanticSearchInput): Promise<SemanticSearchOutput> {
  return semanticSearchFlow(input);
}

const prompt = ai.definePrompt({
  name: 'semanticSearchPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: {schema: SemanticSearchInputSchema},
  output: {schema: SemanticSearchOutputSchema},
  prompt: `Você é um assistente de busca para atos notariais. Um usuário fornecerá uma consulta em linguagem natural, e você deve retornar uma lista de documentos relevantes, classificados por relevância. Inclua uma breve descrição do conteúdo do documento na resposta.

Consulta do Usuário: {{{query}}}

Retorne os resultados no seguinte formato JSON:
{{$response}}`,
});

const semanticSearchFlow = ai.defineFlow(
  {
    name: 'semanticSearchFlow',
    inputSchema: SemanticSearchInputSchema,
    outputSchema: SemanticSearchOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
