import { DescricaoTroca } from "../cupom/DescricaoTroca.js";
import { SYSTEM_MESSAGES } from "../SystemMessages.js";
import { adminRequest } from "./AdminRequest.js";

let trocasCache = null;

async function parseResponse(response, fallback) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || fallback;
    throw new Error(message);
  }
  return payload;
}

export async function listarTrocasAdmin() {
  const response = await adminRequest("/api/admin/trocas", {
    method: "GET"
  });
  const payload = await parseResponse(response, SYSTEM_MESSAGES.admin.errors.loadTrocasFailed);
  trocasCache = (payload?.trocas || []).map((item) => DescricaoTroca.fromApi(item));
  return trocasCache;
}

export async function obterTrocaAdmin(descricaoId) {
  const response = await adminRequest(`/api/admin/trocas/detalhe?id=${encodeURIComponent(descricaoId)}`, {
    method: "GET"
  });
  const payload = await parseResponse(response, SYSTEM_MESSAGES.admin.errors.loadTrocaFailed);
  return payload?.troca ? DescricaoTroca.fromApi(payload.troca) : null;
}

export async function avaliarTrocaAdmin(payload) {
  const response = await adminRequest("/api/admin/trocas/avaliar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  await parseResponse(response, SYSTEM_MESSAGES.admin.errors.exchangeEvaluateFailed);
  trocasCache = null;
  return true;
}

export async function finalizarTrocaAdmin(descricaoId) {
  const response = await adminRequest("/api/admin/trocas/finalizar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ descricaoId })
  });
  const payload = await parseResponse(response, SYSTEM_MESSAGES.admin.errors.exchangeFinishFailed);
  trocasCache = null;
  return payload;
}
