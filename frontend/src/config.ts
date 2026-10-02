export const API_BASE_URL =
  import.meta.env.VITE_MEDEN_API_BASE_URL ?? "http://localhost:8080";

export function apiHostLabel() {
  if (API_BASE_URL.length === 0) {
    return "same origin";
  }

  try {
    return new URL(API_BASE_URL).host;
  } catch {
    return API_BASE_URL;
  }
}
