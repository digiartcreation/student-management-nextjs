import { OperatorFunction, map } from 'rxjs';

/** Every backend route answers with this envelope; `data` is absent on failures. */
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
}

/** Unwraps `{ success, message, data }` down to `data`. */
export function pluckData<T>(): OperatorFunction<ApiEnvelope<T>, T> {
  return map((res) => res?.data as T);
}

/**
 * Turns a failed HttpErrorResponse into one sentence worth showing a user.
 *
 * Validation failures come back as a flattened Zod error
 * (`errors.fieldErrors = { mobile: ["Invalid"] }`), and "Validation failed"
 * alone tells nobody which field to fix — so the first field message is
 * appended when present.
 */
export function apiErrorMessage(error: unknown, fallback = 'Request failed'): string {
  const body = (error as { error?: { message?: string; errors?: unknown } })?.error;
  const message = body?.message ?? fallback;

  const fieldErrors = (body?.errors as { fieldErrors?: Record<string, string[]> })?.fieldErrors;
  if (fieldErrors) {
    for (const [field, messages] of Object.entries(fieldErrors)) {
      if (messages?.length) return `${field}: ${messages[0]}`;
    }
  }

  const formErrors = (body?.errors as { formErrors?: string[] })?.formErrors;
  if (formErrors?.length) return formErrors[0];

  return message;
}
