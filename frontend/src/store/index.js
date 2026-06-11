import { create } from "zustand";
import { authAPI } from "../services/api";

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem("sgas_user") || "null"),
  token: localStorage.getItem("sgas_token") || null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await authAPI.login({ email, password });
      localStorage.setItem("sgas_token", data.token);
      localStorage.setItem("sgas_user", JSON.stringify(data.data));
      set({ user: data.data, token: data.token, loading: false });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed";
      set({ error: msg, loading: false });
      return { success: false, message: msg };
    }
  },

  logout: () => {
    localStorage.removeItem("sgas_token");
    localStorage.removeItem("sgas_user");
    set({ user: null, token: null });
  },

  isRole: (...roles) => roles.includes(get().user?.role),
}));

export const useThemeStore = create((set) => ({
  dark: localStorage.getItem("sgas_theme") === "dark",
  toggle: () => set((s) => {
    const next = !s.dark;
    localStorage.setItem("sgas_theme", next ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    return { dark: next };
  }),
  init: () => {
    const dark = localStorage.getItem("sgas_theme") === "dark";
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  },
}));
