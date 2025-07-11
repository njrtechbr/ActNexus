
// Preços em USD por 1 milhão de tokens
const GEMINI_1_5_FLASH_PRICING = {
  // Contexto de até 128K
  INPUT_UNDER_128K: 0.075 / 1_000_000,
  OUTPUT_UNDER_128K: 0.30 / 1_000_000,
  // Contexto maior que 128K
  INPUT_OVER_128K: 0.15 / 1_000_000,
  OUTPUT_OVER_128K: 0.60 / 1_000_000,
};

// Outros modelos podem ser adicionados aqui
const PRICING_TABLE: Record<string, typeof GEMINI_1_5_FLASH_PRICING> = {
  'googleai/gemini-2.0-flash': GEMINI_1_5_FLASH_PRICING,
  'googleai/gemini-1.5-flash-preview': GEMINI_1_5_FLASH_PRICING, // Exemplo de alias
};

const CONTEXT_WINDOW_LIMIT = 128_000;

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  modelName: string
) {
  const pricing = PRICING_TABLE[modelName] || PRICING_TABLE['googleai/gemini-2.0-flash']; // Default to flash
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
