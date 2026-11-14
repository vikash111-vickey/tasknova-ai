import { z } from 'zod';

export interface GenerateResult<T> {
  data: T;
  provider: 'gemini' | 'openai' | 'template';
  fallbackUsed: boolean;
  rawPrompt?: string;
  warnings?: string[];
}

export interface AIProvider {
  name: 'gemini' | 'openai' | 'template';
  generateStructured<T extends z.ZodTypeAny>(
    prompt: string,
    schema: T,
    systemPrompt?: string
  ): Promise<GenerateResult<z.output<T>>>;
}
