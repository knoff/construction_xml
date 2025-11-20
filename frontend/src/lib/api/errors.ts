import type { AxiosError } from "axios";

export interface HttpErrorParams {
  message: string;
  status?: number;
  detail?: unknown;
  cause?: unknown;
  raw: unknown;
}

export class HttpError extends Error {
  status?: number;
  detail?: unknown;
  cause?: unknown;
  raw: unknown;

  constructor({ message, status, detail, cause, raw }: HttpErrorParams) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.detail = detail;
    this.cause = cause;
    this.raw = raw;
  }
}

function extractAxiosPayload(error: AxiosError<unknown>) {
  const status = error.response?.status;
  const detail = error.response?.data;

  if (typeof detail === "string") {
    return { status, detail, message: detail };
  }

  if (detail && typeof detail === "object") {
    const detailMessage = (detail as { detail?: unknown }).detail;
    return {
      status,
      detail,
      message: String(detailMessage ?? error.message ?? "Ошибка запроса"),
    };
  }

  return { status, detail, message: error.message ?? "Ошибка запроса" };
}

export function toHttpError(error: unknown, fallbackMessage = "Ошибка при выполнении запроса") {
  if (error instanceof HttpError) {
    return error;
  }

  if (error instanceof Error) {
    return new HttpError({
      message: error.message || fallbackMessage,
      cause: error,
      raw: error,
    });
  }

  const axiosError = error as AxiosError<unknown>;

  if (axiosError?.isAxiosError) {
    const { message, status, detail } = extractAxiosPayload(axiosError);

    return new HttpError({
      message: message || fallbackMessage,
      status,
      detail,
      cause: axiosError,
      raw: error,
    });
  }

  const message = typeof error === "string" ? error : fallbackMessage;

  return new HttpError({
    message,
    raw: error,
  });
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}
