import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("skillmap_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function formatApiError(err) {
  const detail = err?.response?.data?.detail;
  if (detail == null) return err?.message || "Something went wrong";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e?.msg ? e.msg : JSON.stringify(e))).join(", ");
  if (detail?.msg) return detail.msg;
  return String(detail);
}

/** Resolve an avatar value to a fully-qualified URL.
 *  Accepts: "" | "https://..." | "data:..." | "/api/avatar/{id}?v=..." */
export function resolveAvatar(avatar) {
  if (!avatar) return "";
  if (avatar.startsWith("http") || avatar.startsWith("data:")) return avatar;
  if (avatar.startsWith("/api/")) return `${BACKEND_URL}${avatar}`;
  return avatar;
}
