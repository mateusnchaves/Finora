import type { ZodError } from "zod";

/** State returned by form Server Actions and read with useActionState. */
export type FormState = {
  /** Form-level message (shown in an alert box). */
  error?: string;
  /** Field name -> message. */
  fieldErrors?: Record<string, string>;
  /** What the user submitted, to refill the form after an error. */
  values?: Record<string, string>;
  /** Changes on every failed submit; used as a key to reset the form with `values`. */
  attempt?: number;
};

export const initialFormState: FormState = {};

/** Plain string values of a FormData (files are ignored). */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}

/** First message per field from a Zod error. */
export function fieldErrorsFrom(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

export function failed(state: FormState, values: Record<string, string>, update: Omit<FormState, "values" | "attempt">) {
  return { ...update, values, attempt: (state.attempt ?? 0) + 1 };
}

/** Empty form strings become undefined so optional fields validate as missing. */
export function emptyToUndefined(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}
