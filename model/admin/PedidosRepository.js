import { Pedido } from "../pedido/Pedido.js";
import { SYSTEM_MESSAGES } from "../SystemMessages.js";
import { adminRequest } from "./AdminRequest.js";

let pedidosCache = null;

async function fetchPedidos() {
  const response = await adminRequest("/api/admin/pedidos", {
    method: "GET"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || SYSTEM_MESSAGES.admin.errors.loadPedidosFailed;
    throw new Error(message);
  }

  pedidosCache = (payload?.pedidos || []).map((item) => Pedido.fromApi(item));
  return pedidosCache;
}

async function getPedidosCache() {
  if (pedidosCache) {
    return pedidosCache;
  }
  return fetchPedidos();
}

function ordenarPedidos(pedidos, sortField, sortOrder) {
  if (!sortField || !sortOrder) {
    return pedidos;
  }

  return [...pedidos].sort((a, b) => a.compareWith(b, sortField, sortOrder));
}

export async function listarPedidos(params = {}) {
  const pedidos = await getPedidosCache();
  const status = `${params.status || ""}`
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

  const filtrados = pedidos.filter(
    (pedido) => pedido.matchesSearch(params.q) && pedido.matchesStatus(status)
  );

  return ordenarPedidos(filtrados, params.sortField || "", params.sortOrder || "");
}

export async function obterPedidoDetalhe(pedidoId) {
  const response = await adminRequest(`/api/admin/pedidos/detalhe?id=${pedidoId}`, {
    method: "GET"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || SYSTEM_MESSAGES.admin.errors.loadPedidoFailed;
    throw new Error(message);
  }
  return payload?.pedido ? Pedido.fromApi(payload.pedido) : null;
}

export async function atualizarStatusPedido(pedidoId, status) {
  const response = await adminRequest("/api/admin/pedidos/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pedidoId, status })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || SYSTEM_MESSAGES.admin.errors.updateStatusFailed;
    throw new Error(message);
  }

  pedidosCache = null;
  return true;
}
