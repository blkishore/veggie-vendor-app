const BASE = import.meta.env.VITE_API_BASE || "/api";
let authToken = localStorage.getItem("authToken") || null;

const errorMessages = {
  invalid_credentials: "That phone number and password don't match. Please try again.",
  authorization_required: "Please sign in to continue.",
  invalid_token: "Your session has expired. Please sign in again.",
  user_not_found: "We couldn't find your account. Please sign in again.",
  forbidden: "You don't have permission to do that.",
  product_unavailable: "One of the products in this order is no longer available. Review your order and try again.",
  product_not_found: "That product is no longer in the catalog. Refresh the list and try again.",
  vendor_not_found: "That vendor is no longer available. Choose another vendor and try again.",
  order_not_found: "We couldn't find that order. Refresh the page and try again.",
  "phone already registered": "That phone number is already registered. Try signing in instead.",
  "phone and password are required": "Enter your phone number and password to continue.",
  "name, phone, password and role are required": "Complete all required fields to create your account.",
  "product_id and price are required": "Choose a product and enter its price.",
  "Product does not exist": "That product is no longer in the catalog. Refresh the list and try again.",
};

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem("authToken", token);
  } else {
    localStorage.removeItem("authToken");
  }
}

function getErrorMessage(body, status) {
  const code = body?.error;
  if (code && errorMessages[code]) return errorMessages[code];
  if (status >= 500) return "Something went wrong on our end. Please try again in a moment.";
  if (status === 403) return "You don't have permission to do that.";
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 404) return "We couldn't find what you asked for. Refresh the page and try again.";
  if (body?.message) return body.message;
  if (typeof code === "string" && code.includes(" ")) return code;
  return "We couldn't complete that request. Check the details and try again.";
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers,
      ...options,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError("We couldn't connect to the service. Check your connection and try again.");
    }
    throw error;
  }

  const responseText = await res.text();
  let body = null;
  if (responseText) {
    try {
      body = JSON.parse(responseText);
    } catch {
      if (res.ok) {
        throw new ApiError("The service returned an unreadable response.", res.status);
      }
    }
  }
  if (!res.ok) {
    throw new ApiError(getErrorMessage(body, res.status), res.status, body?.error);
  }
  return body;
}

export const api = {
  setAuthToken,
  hasAuthToken: () => Boolean(authToken),
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

export function formatINR(amount) {
    const value = Number(amount);
    if (!Number.isFinite(value)) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(value);
}

export function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}
