import axios from "axios";

const defaultBaseUrl = import.meta.env.DEV
  ? "/api"
  : (import.meta.env.VITE_API_BASE_URL || "https://hourlogix-backend.onrender.com");

export const api = axios.create({
  baseURL: defaultBaseUrl,
});


api.interceptors.request.use((config) => {
  const raw = localStorage.getItem("attendance_auth");
  if (raw) {
    const auth = JSON.parse(raw);
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("attendance_auth");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
