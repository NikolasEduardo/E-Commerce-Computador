import { backendConfig } from "../firebaseApp.js";
import { Pedido } from "../pedido/Pedido.js";

const baseUrl = backendConfig.baseUrl;

async function handleResponse(response, defaultMessage) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || defaultMessage;
    throw new Error(message);
  }
  return payload;
}

export async function obterCarrinho(idToken) {
  const response = await fetch(`${baseUrl}/api/carrinho`, {
    method: "GET",
    headers: { Authorization: `Bearer ${idToken}` }
  });
  const payload = await handleResponse(response, "Erro ao carregar carrinho.");
  return Pedido.fromCarrinhoApi(payload);
}

export async function obterStatusCarrinho(idToken) {
  const response = await fetch(`${baseUrl}/api/carrinho/status`, {
    method: "GET",
    headers: { Authorization: `Bearer ${idToken}` }
  });
  return handleResponse(response, "Erro ao carregar status.");
}

export async function adicionarItemCarrinho(idToken, payload) {
  const response = await fetch(`${baseUrl}/api/carrinho/adicionar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(payload)
  });
  return handleResponse(response, "Erro ao adicionar item.");
}

export async function atualizarQuantidadeCarrinho(idToken, payload) {
  const response = await fetch(`${baseUrl}/api/carrinho/quantidade`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(payload)
  });
  return handleResponse(response, "Erro ao atualizar quantidade.");
}

export async function removerItemCarrinho(idToken, payload) {
  const response = await fetch(`${baseUrl}/api/carrinho/remover`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(payload)
  });
  return handleResponse(response, "Erro ao remover item.");
}

export async function estenderCarrinho(idToken) {
  const response = await fetch(`${baseUrl}/api/carrinho/estender`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    }
  });
  return handleResponse(response, "Erro ao estender carrinho.");
}

export async function cancelarCarrinho(idToken) {
  const response = await fetch(`${baseUrl}/api/carrinho/cancelar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    }
  });
  return handleResponse(response, "Erro ao cancelar carrinho.");
}
