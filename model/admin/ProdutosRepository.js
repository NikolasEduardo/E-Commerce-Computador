import { adminRequest } from "./AdminRequest.js";

export async function listarProdutos(params) {
  const query = new URLSearchParams(params);
  const response = await adminRequest(`/api/admin/produtos?${query.toString()}`, {
    method: "GET"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || "Erro ao buscar produtos.";
    throw new Error(message);
  }
  return payload?.produtos || [];
}

export async function obterMetadataProdutos() {
  const response = await adminRequest("/api/admin/produtos/metadata", {
    method: "GET"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || "Erro ao buscar metadata.";
    throw new Error(message);
  }
  return payload;
}

export async function obterProduto(id) {
  const response = await adminRequest(`/api/admin/produto?id=${encodeURIComponent(id)}`, {
    method: "GET"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || "Erro ao buscar produto.";
    throw new Error(message);
  }
  return payload?.produto || null;
}

export async function criarProduto(payload) {
  const response = await adminRequest("/api/admin/produtos/criar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || "Erro ao criar produto.";
    throw new Error(message);
  }
  return data;
}

export async function editarProduto(payload) {
  const response = await adminRequest("/api/admin/produtos/editar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || "Erro ao editar produto.";
    throw new Error(message);
  }
  return data;
}

export async function atualizarStatusProduto(payload) {
  const response = await adminRequest("/api/admin/produtos/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || "Erro ao atualizar status.";
    throw new Error(message);
  }
  return data;
}
