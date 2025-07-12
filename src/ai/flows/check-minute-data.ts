
'use server';

/**
 * @fileOverview A Genkit flow to check an act's minute against client data.
 *
 * This flow first identifies the clients mentioned in the minute's text,
 * then fetches their data from the system, and finally compares the minute
 * against the structured client profiles to find inconsistencies.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getClientesByNomes } from '@/services/apiClientLocal';

// Section 1: Schemas for Client Identification
const IdentifyClientsInputSchema = z.object({
  minuteText: z.string().describe("The full text content of the act's minute/draft."),
});

const IdentifiedClientSchema = z.object({
  nome: z.string().describe("The full name of the client identified in the text."),
});

const IdentifyClientsOutputSchema = z.object({
  clients: z.array(IdentifiedClientSchema).describe("An array of clients identified in the minute."),
});


// Section 2: Schemas for Data Verification (similar to the original)
const CampoAdicionalClienteSchema = z.object({
    label: z.string(),
    value: z.string(),
});

const ClientProfileSchema = z.object({
  nome: z.string().describe("The client's full name."),
  dadosAdicionais: z.array(CampoAdicionalClienteSchema).describe("The structured data fields for the client."),
});

const VerificationInputSchema = z.object({
  minuteText: z.string().describe("The full text content of the act's minute/draft."),
  clientProfiles: z.array(ClientProfileSchema).describe("An array of profiles for the clients involved in the act."),
});


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

export const CheckMinuteDataInputSchema = z.object({
  minuteText: z.string().describe("The full text content of the act's minute/draft."),
});
export type CheckMinuteDataInput = z.infer<typeof CheckMinuteDataInputSchema>;

export const CheckMinuteDataOutputSchema = z.object({
  geral: z.array(z.string()).describe("General observations about the minute that are not tied to a specific client field."),
  clientChecks: z.array(ClientVerificationSchema).describe("The verification results for each client."),
});
export type CheckMinuteDataOutput = z.infer<typeof CheckMinuteDataOutputSchema>;


export async function checkMinuteData(input: CheckMinuteDataInput): Promise<CheckMinuteDataOutput> {
  return checkMinuteDataFlow(input);
}


// Prompt 1: Identify Clients from text
const identifyClientsPrompt = ai.definePrompt({
    name: 'identifyClientsPrompt',
    model: 'googleai/gemini-1.5-flash-latest',
    input: { schema: IdentifyClientsInputSchema },
    output: { schema: IdentifyClientsOutputSchema },
    prompt: `
    Você é um especialista em análise de documentos legais.
    Sua tarefa é ler o texto de uma minuta de ato notarial e identificar os nomes completos de todas as partes (pessoas físicas ou jurídicas) mencionadas.
    Retorne apenas os nomes.

    Texto da Minuta:
    ---
    {{{minuteText}}}
    ---

    Responda no formato JSON especificado.
    `
});

// Prompt 2: Verify data once clients are known
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


// The main flow that orchestrates the two steps
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

    // Step 1: Identify clients from the minute text
    const { output: identifiedClientsOutput } = await identifyClientsPrompt({ minuteText: input.minuteText });
    const identifiedNames = identifiedClientsOutput?.clients.map(c => c.nome) || [];
    
    if (identifiedNames.length === 0) {
        throw new Error("Nenhum cliente identificado no texto da minuta.");
    }

    // Step 2: Fetch full client profiles from the database (mock)
    const clientProfilesFromDB = await getClientesByNomes(identifiedNames);

    if (clientProfilesFromDB.length === 0) {
        throw new Error("Os clientes identificados no texto não foram encontrados no sistema.");
    }
    
    const clientProfilesForVerification = clientProfilesFromDB.map(c => ({
        nome: c.nome,
        dadosAdicionais: c.dadosAdicionais || []
    }));

    // Step 3: Run the verification against the found profiles
    const { output: verificationOutput } = await verifyDataPrompt({
        minuteText: input.minuteText,
        clientProfiles: clientProfilesForVerification
    });
    
    return verificationOutput!;
  }
);

    