
'use server';
/**
 * @fileOverview A Genkit flow to generate a short title for a conversation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateConvoTitleInputSchema = z.object({
  conversationHistory: z.string().describe('The first few messages of a conversation (user and assistant).'),
});
export type GenerateConvoTitleInput = z.infer<typeof GenerateConvoTitleInputSchema>;

const GenerateConvoTitleOutputSchema = z.object({
  title: z.string().describe('A short, concise title for the conversation in Brazilian Portuguese (max 5 words, no quotes).'),
});
export type GenerateConvoTitleOutput = z.infer<typeof GenerateConvoTitleOutputSchema>;


export async function generateConvoTitle(input: GenerateConvoTitleInput): Promise<GenerateConvoTitleOutput> {
  return generateConvoTitleFlow(input);
}


const generateTitlePrompt = ai.definePrompt({
    name: 'generateConvoTitlePrompt',
    model: 'googleai/gemini-1.5-flash-latest',
    input: { schema: GenerateConvoTitleInputSchema },
    output: { schema: GenerateConvoTitleOutputSchema },
    prompt: `Based on the following conversation excerpt, create a very short, descriptive title in Brazilian Portuguese. The title should be a maximum of 5 words and summarize the main topic. Do not use quotation marks.

Conversation:
{{{conversationHistory}}}
`,
});


const generateConvoTitleFlow = ai.defineFlow(
  {
    name: 'generateConvoTitleFlow',
    inputSchema: GenerateConvoTitleInputSchema,
    outputSchema: GenerateConvoTitleOutputSchema,
  },
  async (input) => {
    const { output } = await generateTitlePrompt(input);
    return output!;
  }
);
