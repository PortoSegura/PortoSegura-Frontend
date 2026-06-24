import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function readErrorMessage(response: Response | unknown): Promise<string> {
  if (!response) return "Erro desconhecido";

  if (typeof response === "object" && response !== null) {
    const candidate = response as {
      response?: { data?: unknown; status?: number; statusText?: string };
      data?: unknown;
      message?: unknown;
      mensagem?: unknown;
      error?: unknown;
      errorMessage?: unknown;
      detail?: unknown;
      details?: unknown;
      title?: unknown;
      status?: number;
      statusCode?: number;
      statusText?: string;
    };

    const nestedData = candidate.response?.data ?? candidate.data;
    if (nestedData !== undefined) {
      const nestedMessage = await readErrorMessage(nestedData as Response | unknown);
      if (nestedMessage && nestedMessage !== "Erro desconhecido") {
        return nestedMessage;
      }
    }

    if (typeof candidate.message === "string" && candidate.message.trim()) return candidate.message;
    if (typeof candidate.mensagem === "string" && candidate.mensagem.trim()) return candidate.mensagem;
    if (typeof candidate.error === "string" && candidate.error.trim()) return candidate.error;
    if (typeof candidate.errorMessage === "string" && candidate.errorMessage.trim()) return candidate.errorMessage;
    if (typeof candidate.detail === "string" && candidate.detail.trim()) return candidate.detail;
    if (typeof candidate.details === "string" && candidate.details.trim()) return candidate.details;
    if (typeof candidate.title === "string" && candidate.title.trim()) return candidate.title;
  }

  // If it's a Fetch Response (has text method)
  if (typeof (response as Response).text === "function") {
    try {
      const res = response as Response;
      const text = await res.text();
      if (!text) return `Erro ${res.status}`;

      try {
        const payload = JSON.parse(text) as { message?: string; error?: string };
        return payload.message || payload.error || `Erro ${res.status}`;
      } catch {
        return text;
      }
    } catch {
      const maybe = response as { status?: number } | undefined;
      return `Erro ${maybe?.status ?? "desconhecido"}`;
    }
  }

  // Axios-like response or error
  type AxiosLike = { data?: unknown; status?: number; statusCode?: number };
  const axiosRes = response as AxiosLike;
  const data = axiosRes.data ?? response;

  if (!data) return `Erro ${axiosRes.status ?? axiosRes.statusCode ?? "desconhecido"}`;

  if (typeof data === "string") return data;

  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj.mensagem === "string") return String(obj.mensagem);
    if (typeof obj.error === "string") return obj.error;

    if (obj.errors) {
      try {
        const errs = obj.errors as unknown;
        if (typeof errs === "string") return errs;
        if (Array.isArray(errs) && errs.length) return String(errs[0]);
        if (typeof errs === "object" && errs !== null) {
          const first = Object.values(errs)[0];
          if (Array.isArray(first) && first.length) return String(first[0]);
          if (typeof first === "string") return String(first);
        }
      } catch {
        /* fallthrough */
      }
    }

    try {
      return JSON.stringify(obj);
    } catch {
      return "Erro desconhecido";
    }
  }

  return String(data);
}