import { backendConfig } from "../firebaseApp.js";
import { DescricaoTroca } from "../cupom/DescricaoTroca.js";
import { Pedido } from "../pedido/Pedido.js";
import { SYSTEM_MESSAGES } from "../SystemMessages.js";

const baseUrl = backendConfig.baseUrl;

export async function obterTrocas(idToken) {
  const response = await fetch(`${baseUrl}/api/usuario/trocas`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || SYSTEM_MESSAGES.perfil.errors.exchangesLoadFailed;
    throw new Error(message);
  }
  return {
    ...data,
    trocas: (data?.trocas || []).map((troca) => DescricaoTroca.fromApi(troca))
  };
}

export async function obterPedidosElegiveisTroca(idToken) {
  const response = await fetch(`${baseUrl}/api/usuario/trocas/pedidos`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || SYSTEM_MESSAGES.perfil.errors.exchangeOrdersLoadFailed;
    throw new Error(message);
  }
  return {
    ...data,
    pedidos: (data?.pedidos || []).map((pedido) => Pedido.fromApi(pedido))
  };
}

export async function criarSolicitacaoTroca(idToken, payload) {
  const response = await fetch(`${baseUrl}/api/usuario/trocas/solicitar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || SYSTEM_MESSAGES.perfil.errors.exchangeCreateFailed;
    throw new Error(message);
  }
  return data;
}
