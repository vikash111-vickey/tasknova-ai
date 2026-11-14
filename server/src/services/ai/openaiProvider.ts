import { z } from 'zod';
import { AIProvider, GenerateResult } from './types';

export class OpenAICompatibleProvider implements AIProvider {
  name: 'openai' = 'openai';
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor(apiKey?: string, baseURL = 'https://api.openai.com/v1', model = 'gpt-4o-mini') {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.baseURL = process.env.OPENAI_BASE_URL || baseURL;
    this.model = process.env.OPENAI_MODEL || model;
  }

  async generateStructured<T extends z.ZodTypeAny>(
    prompt: string,
    schema: T,
    systemPrompt?: string
  ): Promise<GenerateResult<z.output<T>>> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured in server environment.');
    }

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errText}`);
    }

    const json = (await response.json()) as any;
    const content = json?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI API returned an empty message.');
    }

    const rawData = JSON.parse(content);
    const parsed = schema.safeParse(rawData);
    if (!parsed.success) {
      throw new Error(
        `OpenAI response schema mismatch: ${parsed.error.errors.map((e) => e.message).join(', ')}`
      );
    }

    return {
      data: parsed.data,
      provider: 'openai',
      fallbackUsed: false,
      rawPrompt: prompt,
    };
  }
}
