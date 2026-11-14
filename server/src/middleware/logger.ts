import { Request, Response, NextFunction } from 'express';

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /cookie/i,
  /api[_-]?key/i,
  /credential/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

export function sanitizeSecrets(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeSecrets(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeSecrets(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, originalUrl } = req;

  // Mask query string secrets if present
  let sanitizedUrl = originalUrl;
  try {
    const urlObj = new URL(originalUrl, 'http://localhost');
    let modified = false;
    urlObj.searchParams.forEach((value, paramKey) => {
      if (isSensitiveKey(paramKey)) {
        urlObj.searchParams.set(paramKey, '[REDACTED]');
        modified = true;
      }
    });
    if (modified) {
      sanitizedUrl = urlObj.pathname + urlObj.search;
    }
  } catch {
    // If URL parsing fails, fallback to originalUrl without throwing
  }

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    // Log structured message with secrets redacted
    console.log(`[HTTP] ${method} ${sanitizedUrl} ${statusCode} - ${duration}ms`);
  });

  next();
}
