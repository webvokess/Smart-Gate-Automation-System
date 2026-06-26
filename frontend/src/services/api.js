import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1",
  timeout: 15000,
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sgas_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("sgas_token");
      localStorage.removeItem("sgas_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────
export const authAPI = {
  login:    (data) => api.post("/auth/login", data),
  register: (data) => api.post("/auth/register", data),
  me:       ()     => api.get("/auth/me"),
  users:    ()     => api.get("/auth/users"),
};

// ── Vehicles ─────────────────────────────────────────────
export const vehicleAPI = {
  list:      (params) => api.get("/vehicles", { params }),
  create:    (data)   => api.post("/vehicles", data),
  update:    (id, d)  => api.put(`/vehicles/${id}`, d),
  remove:    (id)     => api.delete(`/vehicles/${id}`),
  vahanCheck:(id)     => api.post(`/vehicles/${id}/vahan`),
  bulk:      (rows)   => api.post("/vehicles/bulk", { rows }),
};

// ── Drivers ──────────────────────────────────────────────
export const driverAPI = {
  list:    (params) => api.get("/drivers", { params }),
  create:  (data)   => api.post("/drivers", data),
  update:  (id, d)  => api.put(`/drivers/${id}`, d),
  remove:  (id)     => api.delete(`/drivers/${id}`),
  approve: (id)     => api.put(`/drivers/${id}/approve`),
  bulk:    (rows)   => api.post("/drivers/bulk", { rows }),
};

// ── Permits ──────────────────────────────────────────────
export const permitAPI = {
  list:       (params) => api.get("/permits", { params }),
  get:        (id)     => api.get(`/permits/${id}`),
  create:     (data)   => api.post("/permits", data),
  transition: (id)     => api.post(`/permits/${id}/transition`),
  addAlert:   (id, msg)=> api.post(`/permits/${id}/alert`, { message: msg }),
  bulk:       (rows)   => api.post("/permits/bulk", { rows }),
};

// ── Gate ─────────────────────────────────────────────────
export const gateAPI = {
  queue: (mode) => api.get("/gate/queue", { params: { mode } }),
  entry: (id)   => api.post(`/gate/${id}/entry`),
  exit:  (id)   => api.post(`/gate/${id}/exit`),
};

// ── Weighbridge ──────────────────────────────────────────
export const weighAPI = {
  queue:     ()           => api.get("/weighbridge/queue"),
  tare:      (id, weight) => api.post(`/weighbridge/${id}/tare`, { weight }),
  gross:     (id, weight) => api.post(`/weighbridge/${id}/gross`, { weight }),
};

// ── Dashboard ────────────────────────────────────────────
export const dashAPI = {
  stats: () => api.get("/dashboard/stats"),
};

// ── Reports ──────────────────────────────────────────────
export const reportAPI = {
  daily: (date) => api.get("/reports/daily", { params: { date } }),
};

export default api;
