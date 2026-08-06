export interface WorkerErrorDetails {
  name: string;
  message?: string;
}

export function describeWorkerError(error: unknown): WorkerErrorDetails {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { name: typeof error };
}

export function logWorkerError(
  event: string,
  fields: Record<string, unknown>,
  error: unknown,
): void {
  console.error({ event, ...fields, error: describeWorkerError(error) });
}

export function logWorkerWarning(
  event: string,
  fields: Record<string, unknown>,
  error?: unknown,
): void {
  console.warn({
    event,
    ...fields,
    ...(error === undefined ? {} : { error: describeWorkerError(error) }),
  });
}
