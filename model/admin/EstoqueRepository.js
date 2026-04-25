import { adminRequest } from "./AdminRequest.js";

async function handleResponse(response, defaultMessage) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || defaultMessage;
    throw new Error(message);
  }
  return payload;
}

export async function listarFornecedores() {
  const response = await adminRequest("/api/admin/estoque/fornecedores", {
    method: "GET"
  });
  const data = await handleResponse(response, "Erro ao carregar fornecedores.");
  return data?.fornecedores || [];
}

export async function criarFornecedor(payload) {
  const response = await adminRequest("/api/admin/estoque/fornecedores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return handleResponse(response, "Erro ao cadastrar fornecedor.");
}

export async function listarEntradasEstoque() {
  const response = await adminRequest("/api/admin/estoque/entradas", {
    method: "GET"
  });
  const data = await handleResponse(response, "Erro ao carregar entradas.");
  return data?.entradas || [];
}

export async function criarEntradaEstoque(payload) {
  const response = await adminRequest("/api/admin/estoque/entradas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return handleResponse(response, "Erro ao registrar entrada.");
}

export async function listarProdutosEstoque() {
  const response = await adminRequest("/api/admin/estoque/produtos", {
    method: "GET"
  });
  const data = await handleResponse(response, "Erro ao carregar produtos.");
  return data?.produtos || [];
}
