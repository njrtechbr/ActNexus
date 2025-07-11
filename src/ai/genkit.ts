import {genkit, GenerationUsage} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {logAiUsage} from '@/services/apiClientLocal';
import {calculateCost} from '@/lib/ai-pricing';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
  enableTracing: true,
  middleware: [
    async (call, next) => {
      const startTime = Date.now();
      let attempt = 0;

      while (attempt < MAX_RETRIES) {
        try {
          const result = await next(call);

          if (call.type === 'generate' && result.usage) {
            const endTime = Date.now();
            const usage = result.usage as GenerationUsage;
            const prompt = call.input;
            const response = result.output;

            const model =
              (call.options?.model as any)?.name ||
              'googleai/gemini-1.5-flash-latest';

            const {inputCost, outputCost, totalCost} = calculateCost(
              usage.inputTokens,
              usage.outputTokens,
              model
            );

            await logAiUsage({
              timestamp: new Date().toISOString(),
              flowName: call.name,
              model: model,
              latencyMs: endTime - startTime,
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              totalTokens: usage.inputTokens + usage.outputTokens,
              inputCost,
              outputCost,
              totalCost,
              prompt: JSON.stringify(prompt, null, 2),
              response: JSON.stringify(response, null, 2),
            });
          }
          return result; // Success, exit the loop
        } catch (error) {
            attempt++;
            const errorMessage = (error as Error).message || '';
            const isOverloaded = errorMessage.includes('503') || errorMessage.toLowerCase().includes('overloaded');

            if (isOverloaded && attempt < MAX_RETRIES) {
                const backoffTime = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
                console.warn(`AI service overloaded. Retrying in ${backoffTime}ms... (Attempt ${attempt}/${MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
            } else {
                console.error(`AI middleware error after ${attempt} attempts:`, error);
                throw error; // Re-throw error if it's not a 503 or if retries are exhausted
            }
        }
      }
      // This line should not be reached, but as a fallback, throw an error.
      throw new Error(`AI call failed after ${MAX_RETRIES} attempts.`);
    },
  ],
});
