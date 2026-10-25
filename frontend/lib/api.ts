export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
export const TOKEN_KEY = "yardpulse.accessToken";

type ApiPayload<T> = {
  data?: T;
  body?: { data?: T; detail?: string; title?: string };
  detail?: string;
  title?: string;
  message?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiPayload<T>> {
  const token =
    typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      "Could not reach the YardPulse API. Check that the backend is running.",
      0,
    );
  }

  const payload = (await response
    .json()
    .catch(() => null)) as ApiPayload<T> | null;
  if (!response.ok) {
    const nested = payload?.body;
    const message =
      payload?.title ??
      payload?.detail ??
      nested?.title ??
      nested?.detail ??
      payload?.message ??
      `Request failed (${response.status}).`;
    throw new ApiError(message, response.status);
  }
  if (!payload)
    throw new ApiError("The API returned an empty response.", response.status);
  return payload;
}

export function getPayloadData<T>(payload: ApiPayload<T>): T | undefined {
  return payload.data ?? payload.body?.data;
}
