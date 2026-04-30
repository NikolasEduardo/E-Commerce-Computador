import { EntradaEstoque } from "../estoque/EntradaEstoque.js";
import { Fornecedor } from "../estoque/Fornecedor.js";
import { Produto } from "../produto/Produto.js";
import { adminRequest } from "./AdminRequest.js";

let fornecedoresCache = null;
let entradasCache = null;
let produtosEstoqueCache = null;

async function handleResponse(response, defaultMessage) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || defaultMessage;
    throw new Error(message);
  }
  return payload;
}

export async function listarFornecedores() {
  if (fornecedoresCache) {
    return fornecedoresCache;
  }

  const response = await adminRequest("/api/admin/estoque/fornecedores", {
    method: "GET"
  });
  const data = await handleResponse(response, "Erro ao carregar fornecedores.");
  fornecedoresCache = (data?.fornecedores || []).map((item) => Fornecedor.fromApi(item));
  return fornecedoresCache;
}

export async function criarFornecedor(payload) {
  const response = await adminRequest("/api/admin/estoque/fornecedores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await handleResponse(response, "Erro ao cadastrar fornecedor.");
  fornecedoresCache = null;
  return data;
}

export async function listarEntradasEstoque() {
  if (entradasCache) {
    return entradasCache;
  }

  const response = await adminRequest("/api/admin/estoque/entradas", {
    method: "GET"
  });
  const data = await handleResponse(response, "Erro ao carregar entradas.");
  entradasCache = (data?.entradas || []).map((item) => EntradaEstoque.fromApi(item));
  return entradasCache;
}

export async function criarEntradaEstoque(payload) {
  const response = await adminRequest("/api/admin/estoque/entradas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await handleResponse(response, "Erro ao registrar entrada.");
  entradasCache = null;
  produtosEstoqueCache = null;
  return data;
}

export async function listarProdutosEstoque() {
  if (produtosEstoqueCache) {
    return produtosEstoqueCache;
  }

  const response = await adminRequest("/api/admin/estoque/produtos", {
    method: "GET"
  });
  const data = await handleResponse(response, "Erro ao carregar produtos.");
  produtosEstoqueCache = (data?.produtos || []).map((item) => Produto.fromApi(item));
  return produtosEstoqueCache;
}
