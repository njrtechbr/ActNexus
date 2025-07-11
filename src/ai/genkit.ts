import {genkit, GenerationUsage} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {logAiUsage} from '@/services/apiClientLocal';
import {calculateCost} from '@/lib/ai-pricing';

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
      try {
        const result = await next(call);

        if (call.type === 'generate' && result.usage) {
          const endTime = Date.now();
          const usage = result.usage as GenerationUsage;
          const prompt = call.input;
          const response = result.output;

          const model =
            (call.options?.model as any)?.name || 'googleai/gemini-1.5-flash-latest';

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
        return result;
      } catch (error) {
        console.error('AI middleware error:', error);
        throw error;
      }
    },
  ],
  defaultModel: 'googleai/gemini-1.5-flash-latest',
});
