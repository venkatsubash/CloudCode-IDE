
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const API_URL = (path) => `${API_BASE_URL}${path}`;

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
