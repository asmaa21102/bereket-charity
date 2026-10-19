import axios, { AxiosError } from 'axios';

// Same-origin API with the Laravel session cookie (Sanctum SPA mode). Axios sends the
// XSRF-TOKEN cookie back as the X-XSRF-TOKEN header automatically.
export const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
    withXSRFToken: true,
    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
});

let csrfReady: Promise<unknown> | null = null;
export const ensureCsrf = () => (csrfReady ??= axios.get('/sanctum/csrf-cookie', { withCredentials: true }));

api.interceptors.request.use(async (config) => {
    config.headers['X-Locale'] = document.documentElement.lang || 'ar';
    if (config.method && config.method !== 'get') await ensureCsrf();
    return config;
});

export type FieldErrors = Record<string, string>;

/** Message + per-field errors from a Laravel JSON error. */
export function apiError(err: unknown): { message: string; fields: FieldErrors; status: number; code?: string } {
    const e = err as AxiosError<{ message?: string; errors?: Record<string, string[]>; code?: string }>;
    const data = e.response?.data;
    const fields: FieldErrors = {};
    for (const [k, v] of Object.entries(data?.errors ?? {})) fields[k] = v[0];
    return { message: data?.message || e.message || 'Error', fields, status: e.response?.status ?? 0, code: data?.code };
}
