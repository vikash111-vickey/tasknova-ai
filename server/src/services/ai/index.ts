import { AIProvider } from './types';
import { GeminiProvider } from './geminiProvider';
import { OpenAICompatibleProvider } from './openaiProvider';
import { TemplatePlanner } from './templatePlanner';

let providerOverride: AIProvider | null = null;

export function setAIProviderOverride(provider: AIProvider | null): void {
  providerOverride = provider;
}

export function getAIProvider(): AIProvider {
  if (providerOverride) {
    return providerOverride;
  }

  if (process.env.GEMINI_API_KEY) {
    return new GeminiProvider();
  }

  if (process.env.OPENAI_API_KEY) {
    return new OpenAICompatibleProvider();
  }

  return new TemplatePlanner();
}

export function getActiveProviderName(): 'gemini' | 'openai' | 'template' {
  if (providerOverride) {
    return providerOverride.name;
  }
  if (process.env.GEMINI_API_KEY) {
    return 'gemini';
  }
  if (process.env.OPENAI_API_KEY) {
    return 'openai';
  }
  return 'template';
}

export * from './types';
export * from './templatePlanner';
export * from './geminiProvider';
export * from './openaiProvider';
