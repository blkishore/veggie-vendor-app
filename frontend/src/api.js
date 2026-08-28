const BASE = import.meta.env.VITE_API_BASE || "/api";
let authToken = localStorage.getItem("authToken") || null;

function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem("authToken", token);
  } else {
    localStorage.removeItem("authToken");
  }
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };

  const res = await fetch(`${BASE}${path}`, {
    headers,
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  setAuthToken,
  login: (credentials) => request("/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
  register: (data) => request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  me: () => request("/auth/me"),

  listVendors: () => request("/vendors"),
  listNearbyVendors: (lat, lng, radius_km = 5) => request(`/vendors/nearby?lat=${lat}&lng=${lng}&radius_km=${radius_km}`),
  listBuyers: () => request("/buyers"),
  getProducts: () => request("/products"),
  getVendor: (vendorId) => request(`/vendors/${vendorId}`),

  addStockEntry: (payload) =>
    request("/stock", { method: "POST", body: JSON.stringify(payload) }),
  getStock: (vendorId, date) =>
    request(`/vendors/${vendorId}/stock?date=${date}`),
  getSummary: (vendorId, date) =>
    request(`/vendors/${vendorId}/summary?date=${date}`),

  submitDemand: (payload) =>
    request("/demand", { method: "POST", body: JSON.stringify(payload) }),
  createOrder: (payload) =>
    request("/orders", { method: "POST", body: JSON.stringify(payload) }),
  getVendorCatalog: (vendorId) => request(`/vendors/${vendorId}/catalog`),
  upsertVendorProduct: (vendorId, payload) =>
    request(`/vendors/${vendorId}/catalog`, { method: "POST", body: JSON.stringify(payload) }),
  getVendorOrders: (vendorId) => request(`/vendors/${vendorId}/orders`),
  updateOrderStatus: (orderId, status) =>
    request(`/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  getVendorDemand: (vendorId, date) =>
    request(`/vendors/${vendorId}/demand?date=${date}`),
  getProcurementList: (vendorId, date) =>
    request(`/vendors/${vendorId}/procurement-list?date=${date}`),
  confirmDemand: (requestId, tokenPaid) =>
    request(`/demand/${requestId}/confirm`, {
      method: "PATCH",
      body: JSON.stringify({ token_paid: tokenPaid }),
    }),
};

export function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}
