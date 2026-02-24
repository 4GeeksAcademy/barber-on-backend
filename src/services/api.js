const API_BASE = import.meta.env.VITE_BACKEND_URL;

// Small helper: parse JSON safely + throw readable errors
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

// ✅ Centralized handler: if token expired => clean storage
function handleAuthExpired(resp, payload) {
  // Flask-JWT-Extended suele responder 401 con msg: "Token has expired"
  const msg = payload?.msg || payload?.message || "";

  if (resp.status === 401) {
    // Si es un 401 por token (o cualquier 401), limpiamos sesión
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Lanzamos un error específico para que el frontend lo pueda detectar
    throw new Error("TOKEN_EXPIRED");
  }

  // otros status (403, 400, 409, etc)
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
    // si el backend devuelve 401 acá, es credenciales inválidas, NO token expirado
    throw new Error(payload?.msg || "Login failed");
  }

  // ✅ backend can return {access_token:"..."} OR {token:"..."}
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

// --------------------
// BOOKINGS
// --------------------
export const getMyBookings = async (token) => {
  const resp = await fetch(API_BASE + "/api/bookings/me", {
    headers: { ...authHeaders(token) },
  });

  const payload = await parseJsonOrText(resp);

  if (!resp.ok) {
    handleAuthExpired(resp, payload);
  }

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

  if (!resp.ok) {
    handleAuthExpired(resp, payload);
  }

  return payload;
};