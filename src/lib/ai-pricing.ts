
// Preços em USD por 1 milhão de tokens
const GEMINI_1_5_FLASH_PRICING = {
  // Contexto de até 128K
  INPUT_UNDER_128K: 0.35 / 1_000_000,
  OUTPUT_UNDER_128K: 0.70 / 1_000_000,
  // Contexto maior que 128K
  INPUT_OVER_128K: 0.70 / 1_000_000,
  OUTPUT_OVER_128K: 1.40 / 1_000_000,
};

// Outros modelos podem ser adicionados aqui
const PRICING_TABLE: Record<string, typeof GEMINI_1_5_FLASH_PRICING> = {
  'googleai/gemini-1.5-flash-latest': GEMINI_1_5_FLASH_PRICING,
  'gemini-1.5-flash-latest': GEMINI_1_5_FLASH_PRICING
};

const CONTEXT_WINDOW_LIMIT = 128_000;

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  modelName: string
) {
  const normalizedModelName = modelName.startsWith('googleai/') ? modelName : `googleai/${modelName}`;
  const pricing = PRICING_TABLE[normalizedModelName] || GEMINI_1_5_FLASH_PRICING; // Default to flash
  const totalTokens = inputTokens + outputTokens;

  const inputPrice = totalTokens <= CONTEXT_WINDOW_LIMIT
    ? pricing.INPUT_UNDER_128K
    : pricing.INPUT_OVER_128K;
    
  const outputPrice = totalTokens <= CONTEXT_WINDOW_LIMIT
    ? pricing.OUTPUT_UNDER_128K
    : pricing.OUTPUT_OVER_128K;

  const inputCost = inputTokens * inputPrice;
  const outputCost = outputTokens * outputPrice;
  const totalCost = inputCost + outputCost;

  return { inputCost, outputCost, totalCost };
}
