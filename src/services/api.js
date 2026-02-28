const API_BASE = import.meta.env.VITE_BACKEND_URL;

async function parseJsonOrText(resp) {
  const text = await resp.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function authHeaders(token) {
  return token ? { Authorization: "Bearer " + token } : {};
}

function handleAuthExpired(resp, payload) {
  const msg = payload?.msg || payload?.message || "";

  if (resp.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    throw new Error("TOKEN_EXPIRED");
  }

  throw new Error(msg || "Request failed");
}

// --------------------
// AUTH
// --------------------
export const login = async ({ email, password }) => {
  const resp = await fetch(API_BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const payload = await parseJsonOrText(resp);

  if (!resp.ok) {
    throw new Error(payload?.msg || "Login failed");
  }

  const token = payload?.access_token || payload?.token;
  if (!token) throw new Error("Login succeeded but token was missing in response");

  return { ...payload, token };
};

export const register = async ({ email, password, role = "client", full_name, phone }) => {
  const resp = await fetch(API_BASE + "/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role, full_name, phone }),
  });

  const payload = await parseJsonOrText(resp);

  if (!resp.ok) {
    throw new Error(payload?.msg || "Register failed");
  }

  return payload;
};

export const forgotPassword = async (email) => {
  const resp = await fetch(API_BASE + "/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const payload = await parseJsonOrText(resp);

  if (!resp.ok) {
    throw new Error(payload?.msg || "Forgot password failed");
  }

  return payload;
};

export const resetPassword = async ({ token, new_password }) => {
  const resp = await fetch(API_BASE + "/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password }),
  });

  const payload = await parseJsonOrText(resp);

  if (!resp.ok) {
    throw new Error(payload?.msg || "Reset password failed");
  }

  return payload;
};

// --------------------
// BOOKINGS
// --------------------
export const getMyBookings = async (token) => {
  const resp = await fetch(API_BASE + "/api/bookings/me", {
    headers: { ...authHeaders(token) },
  });

  const payload = await parseJsonOrText(resp);

  if (!resp.ok) handleAuthExpired(resp, payload);

  return payload;
};

export const createBooking = async (data, token) => {
  const resp = await fetch(API_BASE + "/api/bookings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(data),
  });

  const payload = await parseJsonOrText(resp);

  if (!resp.ok) handleAuthExpired(resp, payload);

  return payload;
};

export const cancelBooking = async (bookingId, token) => {
  const resp = await fetch(API_BASE + `/api/bookings/${bookingId}/cancel`, {
    method: "PATCH",
    headers: { ...authHeaders(token) },
  });

  const payload = await parseJsonOrText(resp);

  if (!resp.ok) handleAuthExpired(resp, payload);

  return payload;
};

// --------------------
// PAYMENT METHODS
// --------------------
export const getPaymentMethods = async (token) => {
  const resp = await fetch(API_BASE + "/api/payment-methods", {
    headers: { ...authHeaders(token) },
  });

  const payload = await parseJsonOrText(resp);

  if (!resp.ok) handleAuthExpired(resp, payload);

  return payload;
};

export const addPaymentMethod = async (data, token) => {
  const resp = await fetch(API_BASE + "/api/payment-methods", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(data),
  });

  const payload = await parseJsonOrText(resp);

  if (!resp.ok) handleAuthExpired(resp, payload);

  return payload;
};

export const setDefaultPaymentMethod = async (pmId, token) => {
  const resp = await fetch(API_BASE + `/api/payment-methods/${pmId}/default`, {
    method: "PATCH",
    headers: { ...authHeaders(token) },
  });

  const payload = await parseJsonOrText(resp);

  if (!resp.ok) handleAuthExpired(resp, payload);

  return payload;
};

export const deletePaymentMethod = async (pmId, token) => {
  const resp = await fetch(API_BASE + `/api/payment-methods/${pmId}`, {
    method: "DELETE",
    headers: { ...authHeaders(token) },
  });

  const payload = await parseJsonOrText(resp);

  if (!resp.ok) handleAuthExpired(resp, payload);

  return payload;
};

export const getNearbyBarbers = async ({ lat, lng, radius = 2000 }) => {
  const resp = await fetch(
    API_BASE +
      `/api/places/nearby?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(
        lng
      )}&radius=${encodeURIComponent(radius)}`
  );

  const payload = await parseJsonOrText(resp);
  if (!resp.ok) throw new Error(payload?.msg || "Failed to load nearby barbers");
  return payload; // { results: [...] }
};