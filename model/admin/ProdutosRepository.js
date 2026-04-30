import { Produto } from "../produto/Produto.js";
import { adminRequest } from "./AdminRequest.js";

let produtosCache = null;

async function fetchProdutos() {
  const response = await adminRequest("/api/admin/produtos", {
    method: "GET"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || "Erro ao buscar produtos.";
    throw new Error(message);
  }

  produtosCache = (payload?.produtos || []).map((item) => Produto.fromApi(item));
  return produtosCache;
}

async function getProdutosCache() {
  if (produtosCache) {
    return produtosCache;
  }
  return fetchProdutos();
}

function ordenarProdutos(produtos, sortField, sortOrder) {
  if (!sortField || !sortOrder) {
    return produtos;
  }

  return [...produtos].sort((a, b) => a.compareWith(b, sortField, sortOrder));
}

export async function listarProdutos(params = {}) {
  const produtos = await getProdutosCache();

  const filtrados = produtos.filter(
    (produto) =>
      produto.matchesSearch(params.q) &&
      produto.matchesStatus(params.status) &&
      produto.matchesMarcaId(params.marcaId) &&
      produto.matchesCategoriaId(params.categoriaId)
  );

  return ordenarProdutos(filtrados, params.sortField || "", params.sortOrder || "");
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
  return payload?.produto ? Produto.fromApi(payload.produto) : null;
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

  produtosCache = null;
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

  produtosCache = null;
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

  produtosCache = null;
  return data;
}
