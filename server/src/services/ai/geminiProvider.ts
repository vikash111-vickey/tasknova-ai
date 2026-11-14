import { z } from 'zod';
import { AIProvider, GenerateResult } from './types';

export class GeminiProvider implements AIProvider {
  name: 'gemini' = 'gemini';
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model = 'gemini-1.5-pro') {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    this.model = model;
  }

  async generateStructured<T extends z.ZodTypeAny>(
    prompt: string,
    schema: T,
    systemPrompt?: string
  ): Promise<GenerateResult<z.output<T>>> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in server environment.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      systemInstruction: systemPrompt
        ? {
            parts: [{ text: systemPrompt }],
          }
        : undefined,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const jsonResponse = (await response.json()) as any;
    const candidateText =
      jsonResponse?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error('Gemini API returned an empty response.');
    }

    const rawData = JSON.parse(candidateText);
    const parsed = schema.safeParse(rawData);

    if (!parsed.success) {
      throw new Error(
        `Gemini response schema mismatch: ${parsed.error.errors.map((e) => e.message).join(', ')}`
      );
    }

    return {
      data: parsed.data,
      provider: 'gemini',
      fallbackUsed: false,
      rawPrompt: prompt,
    };
  }
}
