
'use server';

/**
 * @fileOverview A Genkit flow to check an act's minute against client data.
 *
 * This flow compares a given minute text against a pre-fetched list of
 * client profiles to find inconsistencies or new information.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getPrompt } from '@/services/promptService';


const VerificationInputSchema = z.object({
  minuteText: z.string().describe("The full text content of the act's minute/draft."),
  clientProfiles: z.array(z.object({
    nome: z.string(),
    dadosAdicionais: z.array(z.object({
      label: z.string(),
      value: z.string(),
    })),
  })).describe("An array of profiles for the clients involved in the act."),
});


const VerificationResultSchema = z.object({
  label: z.string().describe("The data field that was checked (e.g., 'CPF', 'Endereço')."),
  expectedValue: z.string().optional().describe("The correct value from the client's profile, if it exists."),
  foundValue: z.string().optional().describe("The value found in the minute text, if any."),
  status: z.enum(['OK', 'Divergente', 'Não Encontrado', 'Novo']).describe("The status of the verification for this field."),
  reasoning: z.string().describe("A brief explanation for the status, especially for divergences or new data."),
});
export type VerificationResult = z.infer<typeof VerificationResultSchema>;


const ClientVerificationSchema = z.object({
  clientName: z.string().describe("The name of the client being checked."),
  verifications: z.array(VerificationResultSchema).describe("A list of verification results for this client's data."),
});
export type ClientVerification = z.infer<typeof ClientVerificationSchema>;

export type CheckMinuteDataInput = z.infer<typeof VerificationInputSchema>;

const CheckMinuteDataOutputSchema = z.object({
  geral: z.array(z.string()).describe("General observations about the minute that are not tied to a specific client field."),
  clientChecks: z.array(ClientVerificationSchema).describe("The verification results for each client."),
});
export type CheckMinuteDataOutput = z.infer<typeof CheckMinuteDataOutputSchema>;


export async function checkMinuteData(input: CheckMinuteDataInput): Promise<CheckMinuteDataOutput> {
  return checkMinuteDataFlow(input);
}


const checkMinuteDataFlow = ai.defineFlow(
  {
    name: 'checkMinuteDataFlow',
    inputSchema: VerificationInputSchema,
    outputSchema: CheckMinuteDataOutputSchema,
  },
  async (input) => {
    if (!input.minuteText) {
      return { geral: ["Texto da minuta não fornecido."], clientChecks: [] };
    }
     if (!input.clientProfiles || input.clientProfiles.length === 0) {
      return { geral: ["Perfis de cliente não fornecidos para verificação."], clientChecks: [] };
    }
    
    const promptTemplate = await getPrompt('checkMinuteDataPrompt');

    const verifyDataPrompt = ai.definePrompt({
      name: 'verifyDataPrompt_dynamic', // Use a unique name to avoid conflicts if this flow runs concurrently
      model: 'googleai/gemini-1.5-flash-latest',
      input: { schema: VerificationInputSchema },
      output: { schema: CheckMinuteDataOutputSchema },
      prompt: promptTemplate,
    });


    const { output: verificationOutput } = await verifyDataPrompt({
        minuteText: input.minuteText,
        clientProfiles: input.clientProfiles
    });
    
    return verificationOutput!;
  }
);
    
