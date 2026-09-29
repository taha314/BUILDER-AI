import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "/api",
    withCredentials: true,
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const authRoute = /\/auth\/(login|register|me)(\?|$)/.test(error.config?.url || "");

        if (status === 401 && !authRoute && typeof window !== "undefined") {
            window.dispatchEvent(new Event("builderai:unauthorized"));
        }

        return Promise.reject(error);
    },
);

export function getApiErrorMessage(error, fallback = "Request failed. Please try again.") {
    const status = error?.response?.status;

    if (status === 400 || status === 422 || status === 409) {
        return error.response.data?.error || fallback;
    }
    if (status === 401) return "Your session has expired. Please sign in again.";
    if (status === 403) return "You do not have permission to do that.";
    if (status === 404) return "The requested item could not be found.";
    if (status >= 500) return "Something went wrong on the server. Please try again.";
    if (!error?.response) return "Unable to reach the server. Check your connection and try again.";

    return error.response.data?.error || fallback;
}

export default api;
