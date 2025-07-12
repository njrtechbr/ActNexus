
'use server';
/**
 * @fileOverview A conversational AI agent for the ActNexus system.
 * This agent uses tools to query internal data about books, acts, and clients,
 * and can analyze user-uploaded files.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getLivros, getClientes, getAtosByLivroId, type Livro, type Cliente, type Ato } from '@/services/apiClientLocal';

// Schemas for Input and Output
const ConversationalAgentInputSchema = z.object({
  query: z.string().describe("The user's question or command in natural language."),
  fileDataUri: z.string().optional().describe("An optional file (image or PDF) provided by the user as a data URI."),
});
export type ConversationalAgentInput = z.infer<typeof ConversationalAgentInputSchema>;

const ConversationalAgentOutputSchema = z.object({
  response: z.string().describe("The agent's response to the user's query."),
});
export type ConversationalAgentOutput = z.infer<typeof ConversationalAgentOutputSchema>;


// Tool Definitions
const searchBooksTool = ai.defineTool(
    {
        name: 'searchBooks',
        description: 'Searches for notarial books based on criteria like year, type, or status.',
        inputSchema: z.object({
            ano: z.number().optional().describe('The year of the book.'),
            tipo: z.string().optional().describe('The type of the book (e.g., "Notas", "Procuração").'),
            status: z.string().optional().describe('The status of the book (e.g., "Concluído", "Arquivado").'),
        }),
        outputSchema: z.array(z.custom<Livro>()),
    },
    async (input) => {
        console.log(`[Tool] searchBooks called with:`, input);
        const allBooks = await getLivros();
        return allBooks.filter(book => {
            return (!input.ano || book.ano === input.ano) &&
                   (!input.tipo || book.tipo.toLowerCase().includes(input.tipo.toLowerCase())) &&
                   (!input.status || book.status.toLowerCase() === input.status.toLowerCase());
        });
    }
);

const searchClientsTool = ai.defineTool(
    {
        name: 'searchClients',
        description: 'Searches for clients by name or CPF/CNPJ.',
        inputSchema: z.object({
            nome: z.string().optional().describe('The name of the client.'),
            cpfCnpj: z.string().optional().describe('The CPF or CNPJ of the client.'),
        }),
        outputSchema: z.array(z.custom<Cliente>()),
    },
    async (input) => {
        console.log(`[Tool] searchClients called with:`, input);
        const allClients = await getClientes();
        return allClients.filter(client => {
             return (!input.nome || client.nome.toLowerCase().includes(input.nome.toLowerCase())) &&
                   (!input.cpfCnpj || client.cpfCnpj.includes(input.cpfCnpj));
        });
    }
);

const searchActsTool = ai.defineTool(
    {
        name: 'searchActs',
        description: 'Searches for specific notarial acts within a given book.',
        inputSchema: z.object({
            livroId: z.string().describe('The ID of the book to search within.'),
            termo: z.string().optional().describe('A search term to find in the act type or involved parties.'),
        }),
        outputSchema: z.array(z.custom<Ato>()),
    },
    async(input) => {
        console.log(`[Tool] searchActs called with:`, input);
        const allActs = await getAtosByLivroId(input.livroId);
        if (!input.termo) return allActs;
        
        const lowerCaseTermo = input.termo.toLowerCase();
        return allActs.filter(act => 
            act.tipoAto.toLowerCase().includes(lowerCaseTermo) ||
            act.partes.some(parte => parte.toLowerCase().includes(lowerCaseTermo))
        );
    }
);

const systemPrompt = `Você é o "ActNexus Agent", um assistente de IA especialista para um sistema de cartório.
Seu trabalho é responder às perguntas dos usuários sobre livros, atos e clientes.
- Use as ferramentas disponíveis para buscar informações no sistema sempre que necessário.
- Se o usuário enviar um arquivo, analise seu conteúdo para responder à pergunta.
- Seja conciso e direto em suas respostas.
- Se não encontrar a informação, informe o usuário claramente.
- Responda em português do Brasil.`;

// Main Flow
const conversationalAgentFlow = ai.defineFlow(
    {
        name: 'conversationalAgentFlow',
        inputSchema: ConversationalAgentInputSchema,
        outputSchema: ConversationalAgentOutputSchema,
    },
    async ({ query, fileDataUri }) => {
        const promptParts: any[] = [{ text: query }];
        if (fileDataUri) {
            promptParts.push({ media: { url: fileDataUri } });
        }

        const result = await ai.generate({
            model: 'googleai/gemini-1.5-flash-latest',
            tools: [searchBooksTool, searchClientsTool, searchActsTool],
            prompt: promptParts,
            system: systemPrompt,
        });

        return { response: result.text };
    }
);


// Exported wrapper function
export async function conversationalAgent(input: ConversationalAgentInput): Promise<ConversationalAgentOutput> {
  return conversationalAgentFlow(input);
}
