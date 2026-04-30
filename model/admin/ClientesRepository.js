import { Usuario } from "../usuario/Usuario.js";
import { SYSTEM_MESSAGES } from "../SystemMessages.js";
import { adminRequest } from "./AdminRequest.js";

let clientesCache = null;

async function fetchClientes() {
  const response = await adminRequest("/api/admin/clientes", {
    method: "GET"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || SYSTEM_MESSAGES.admin.errors.loadClientesFailed;
    throw new Error(message);
  }

  clientesCache = (payload?.clientes || []).map((item) => Usuario.fromApi(item));
  return clientesCache;
}

async function getClientesCache() {
  if (clientesCache) {
    return clientesCache;
  }
  return fetchClientes();
}

function ordenarClientes(clientes, sortField, sortOrder) {
  if (!sortField || !sortOrder) {
    return clientes;
  }

  return [...clientes].sort((a, b) => a.compareWith(b, sortField, sortOrder));
}

export async function listarClientes(params = {}) {
  const clientes = await getClientesCache();
  const status = `${params.status || ""}`
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  const genero = `${params.genero || ""}`
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

  const filtrados = clientes.filter(
    (cliente) =>
      cliente.matchesSearch(params.q) &&
      cliente.matchesStatus(status) &&
      cliente.matchesGenero(genero)
  );

  return ordenarClientes(filtrados, params.sortField || "", params.sortOrder || "");
}

export async function atualizarStatusCliente(usuarioId, status) {
  const response = await adminRequest("/api/admin/clientes/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuarioId, status })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || SYSTEM_MESSAGES.admin.errors.updateStatusFailed;
    throw new Error(message);
  }

  clientesCache = null;
  return true;
}
