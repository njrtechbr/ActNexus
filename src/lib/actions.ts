"use server";

import {
  automatedValidation as automatedValidationFlow,
  type AutomatedValidationInput,
  type AutomatedValidationOutput,
} from "@/ai/flows/automated-validation";

import {
  semanticSearch as semanticSearchFlow,
  type SemanticSearchInput,
  type SemanticSearchOutput,
} from "@/ai/flows/semantic-search";

export async function automatedValidation(
  input: AutomatedValidationInput
): Promise<AutomatedValidationOutput> {
  // In a real application, you might add extra validation, logging, or error handling here.
  return await automatedValidationFlow(input);
}

export async function semanticSearch(
  input: SemanticSearchInput
): Promise<SemanticSearchOutput> {
  // In a real application, you might add extra validation, logging, or error handling here.
  return await semanticSearchFlow(input);
}
