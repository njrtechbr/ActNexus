
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

const processLivroPdfPrompt = ai.definePrompt({
  name: 'processLivroPdfPrompt',
  input: { schema: ProcessLivroPdfInputSchema },
  output: { schema: ProcessLivroPdfOutputSchema },
  prompt: `
Você é um assistente de cartório especialista em digitalização e estruturação de documentos.
Sua tarefa é receber o texto completo de um livro de atos notariais e transformá-lo em um arquivo Markdown estruturado.

O formato de saída DEVE seguir estritamente a seguinte estrutura:

---
numero: [Número do Livro]
ano: [Ano do Livro]
tipo: [Tipo do Livro, ex: Notas, Procuração, Escritura]
status: Processando
dataAbertura: [Data de Abertura no formato AAAA-MM-DD]
dataFechamento: [Data de Fechamento no formato AAAA-MM-DD, se houver]
---

# Livro [Número do Livro]/[Ano do Livro]

## Atos Registrados

### Ato [Número do Ato 1]
- **Tipo:** [Tipo do Ato 1]
- **Data:** [Data do Ato 1 no formato AAAA-MM-DD]
- **Partes:**
  - [Nome da Parte 1]
  - [Nome da Parte 2]

### Ato [Número do Ato 2]
- **Tipo:** [Tipo do Ato 2]
- **Data:** [Data do Ato 2 no formato AAAA-MM-DD]
- **Partes:**
  - [Nome da Parte 1]
  - [Nome da Parte 2]

... (repita para todos os atos encontrados no texto)

Analise o texto de entrada para extrair todas as informações necessárias, incluindo as datas de abertura e fechamento do livro. O status do livro deve ser sempre "Processando". Se a data de fechamento não for encontrada, omita o campo 'dataFechamento'.

Texto de Entrada:
{{{pdfText}}}
`
});

const processLivroPdfFlow = ai.defineFlow(
  {
    name: 'processLivroPdfFlow',
    inputSchema: ProcessLivroPdfInputSchema,
    outputSchema: ProcessLivroPdfOutputSchema,
  },
  async (input) => {
    const { output } = await processLivroPdfPrompt(input);
    return {
      markdownContent: output!.markdownContent,
    };
  }
);
