import { adminRequest } from "./AdminRequest.js";

export async function listarPedidos(params) {
  const query = new URLSearchParams(params);
  const response = await adminRequest(`/api/admin/pedidos?${query.toString()}`, {
    method: "GET"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || "Erro ao buscar pedidos.";
    throw new Error(message);
  }
  return payload?.pedidos || [];
}

export async function obterPedidoDetalhe(pedidoId) {
  const response = await adminRequest(`/api/admin/pedidos/detalhe?id=${pedidoId}`, {
    method: "GET"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || "Erro ao buscar pedido.";
    throw new Error(message);
  }
  return payload?.pedido || null;
}

export async function atualizarStatusPedido(pedidoId, status) {
  const response = await adminRequest("/api/admin/pedidos/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pedidoId, status })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || "Erro ao atualizar status.";
    throw new Error(message);
  }
  return true;
}
