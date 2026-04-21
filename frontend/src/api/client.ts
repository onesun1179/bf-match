import axios from "axios";

const ACCESS_TOKEN_KEY = "bf-match.access-token";
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

type RefreshResponse = { accessToken: string };

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}

async function refreshAccessToken(): Promise<string> {
  const res = await axios.post<RefreshResponse>(
    `${API_BASE_URL}/api/v1/auth/refresh`,
    {},
    { withCredentials: true },
  );
  const token = res.data.accessToken;
  setAccessToken(token);
  return token;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !String(original.url ?? "").includes("/api/v1/auth/refresh")
    ) {
      original._retry = true;
      try {
        const token = await refreshAccessToken();
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        clearAccessToken();
      }
    }
    return Promise.reject(error);
  },
);

