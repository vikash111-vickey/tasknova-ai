import { z } from 'zod';

export const HealthDataSchema = z.object({
  status: z.literal('ok'),
  mode: z.enum(['demo', 'live']),
  ai: z.enum(['gemini', 'template', 'openai']),
});

export type HealthData = z.infer<typeof HealthDataSchema>;

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    message: z.string(),
  });

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message: string;
}

export function formatSuccessResponse<T>(data: T, message: string = 'Operation successful'): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

export function formatErrorResponse<T = null>(message: string, data: T = null as unknown as T): ApiResponse<T> {
  return {
    success: false,
    data,
    message,
  };
}
