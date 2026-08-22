export class LLMExecutionError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryable: boolean
  ) {
    super(message);
    this.name = 'LLMExecutionError';
  }
}

export function parseLlmError(error: unknown): LLMExecutionError {
  if (error instanceof LLMExecutionError) {
    return error;
  }
  
  let code = 'LLM_ERROR';
  const message = error instanceof Error ? error.message : String(error);
  let retryable = false;

  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    if (err.statusCode === 429 || message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || message.includes('quota')) {
      code = 'LLM_QUOTA_EXCEEDED';
      retryable = true;
    } else if (err.name === 'APICallError') {
      code = 'LLM_API_ERROR';
    }
  }

  return new LLMExecutionError(code, message, retryable);
}
