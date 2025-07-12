
'use server';

/**
 * @fileOverview A Genkit flow to check an act's minute against client data.
 *
 * This flow compares a given minute text against a pre-fetched list of
 * client profiles to find inconsistencies. It does not identify clients itself.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Input schema for the verification prompt
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


// Schemas for the final output of the flow
const VerificationResultSchema = z.object({
  label: z.string().describe("The data field that was checked (e.g., 'CPF', 'Endereço')."),
  expectedValue: z.string().describe("The correct value from the client's profile."),
  foundValue: z.string().optional().describe("The value found in the minute text, if any."),
  status: z.enum(['OK', 'Divergente', 'Não Encontrado']).describe("The status of the verification for this field."),
  reasoning: z.string().describe("A brief explanation for the status, especially for divergences."),
});

const ClientVerificationSchema = z.object({
  clientName: z.string().describe("The name of the client being checked."),
  verifications: z.array(VerificationResultSchema).describe("A list of verification results for this client's data."),
});

const CheckMinuteDataInputSchema = z.object({
  minuteText: z.string().describe("The full text content of the act's minute/draft."),
  clientProfiles: z.array(z.object({
      nome: z.string(),
      dadosAdicionais: z.array(z.object({
          label: z.string(),
          value: z.string(),
      }))
  })).describe("An array of client profiles to check against the minute text."),
});
export type CheckMinuteDataInput = z.infer<typeof CheckMinuteDataInputSchema>;

const CheckMinuteDataOutputSchema = z.object({
  geral: z.array(z.string()).describe("General observations about the minute that are not tied to a specific client field."),
  clientChecks: z.array(ClientVerificationSchema).describe("The verification results for each client."),
});
export type CheckMinuteDataOutput = z.infer<typeof CheckMinuteDataOutputSchema>;


export async function checkMinuteData(input: CheckMinuteDataInput): Promise<CheckMinuteDataOutput> {
  return checkMinuteDataFlow(input);
}

// Main prompt for data verification
const verifyDataPrompt = ai.definePrompt({
  name: 'verifyDataPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: { schema: VerificationInputSchema },
  output: { schema: CheckMinuteDataOutputSchema },
  prompt: `
Você é um assistente de cartório extremamente meticuloso, especializado em conferir minutas de atos antes da lavratura final.
Sua tarefa é comparar o texto da minuta de um ato com os dados cadastrais dos clientes envolvidos para identificar qualquer inconsistência.

Para cada campo de cada cliente, você deve:
1. Localizar a informação correspondente no texto da minuta.
2. Comparar o valor encontrado com o "valor esperado" do cadastro.
3. Definir o status da verificação:
   - 'OK': Se o valor na minuta for idêntico ou semanticamente equivalente ao do cadastro.
   - 'Divergente': Se o valor for encontrado, mas diferente do cadastro. Informe o valor encontrado.
   - 'Não Encontrado': Se o campo do cadastro não for encontrado no texto da minuta.

Forneça um raciocínio claro e conciso para cada divergência.
Adicione observações gerais em 'geral' se notar algo estranho no documento como um todo que não se encaixe em um campo específico.

**Texto da Minuta para Conferência:**
---
{{{minuteText}}}
---

**Dados Cadastrais dos Clientes (Fonte da Verdade):**
---
{{#each clientProfiles}}
- **Cliente: {{this.nome}}**
  {{#each this.dadosAdicionais}}
  - {{this.label}}: {{this.value}}
  {{/each}}
{{/each}}
---

Realize a análise e retorne o resultado no formato JSON especificado.
`
});


// The main flow that orchestrates the verification
const checkMinuteDataFlow = ai.defineFlow(
  {
    name: 'checkMinuteDataFlow',
    inputSchema: CheckMinuteDataInputSchema,
    outputSchema: CheckMinuteDataOutputSchema,
  },
  async (input) => {
    if (!input.minuteText) {
      return { geral: ["Texto da minuta não fornecido."], clientChecks: [] };
    }
     if (!input.clientProfiles || input.clientProfiles.length === 0) {
      return { geral: ["Perfis de cliente não fornecidos para verificação."], clientChecks: [] };
    }
    
    // Run the verification against the provided profiles
    const { output: verificationOutput } = await verifyDataPrompt({
        minuteText: input.minuteText,
        clientProfiles: input.clientProfiles
    });
    
    return verificationOutput!;
  }
);
    
