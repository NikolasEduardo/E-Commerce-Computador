import { backendConfig } from "../firebaseApp.js";

const baseUrl = backendConfig.baseUrl;

export async function listarClientes(params) {
  const query = new URLSearchParams(params);
  const response = await fetch(`${baseUrl}/api/admin/clientes?${query.toString()}`, {
    method: "GET"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || "Erro ao buscar clientes.";
    throw new Error(message);
  }
  return payload?.clientes || [];
}

export async function atualizarStatusCliente(usuarioId, status) {
  const response = await fetch(`${baseUrl}/api/admin/clientes/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuarioId, status })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || "Erro ao atualizar status.";
    throw new Error(message);
  }
  return true;
}
