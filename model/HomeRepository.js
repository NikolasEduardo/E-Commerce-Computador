import { backendConfig } from "./firebaseApp.js";
import { Produto } from "./produto/Produto.js";
import { SYSTEM_MESSAGES } from "./SystemMessages.js";

const baseUrl = backendConfig.baseUrl;

export async function listarProdutosPopulares() {
  const response = await fetch(`${baseUrl}/api/home/produtos-populares`, {
    method: "GET"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || SYSTEM_MESSAGES.produto.errors.loadListFailed;
    throw new Error(message);
  }
  return (payload?.produtos || []).map((produto) => Produto.fromApi(produto));
}

export async function buscarProdutosPublicos(filtros = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filtros)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    params.set(key, value);
  }

  const query = params.toString();
  const response = await fetch(`${baseUrl}/api/home/produtos${query ? `?${query}` : ""}`, {
    method: "GET"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || SYSTEM_MESSAGES.produto.errors.loadListFailed;
    throw new Error(message);
  }

  return {
    produtos: (payload?.produtos || []).map((produto) => Produto.fromApi(produto)),
    categoriasPrincipais: payload?.categoriasPrincipais || [],
    categorias: payload?.categorias || [],
    marcas: payload?.marcas || []
  };
}

export async function obterProdutoPublico(codigo) {
  const response = await fetch(
    `${baseUrl}/api/home/produto?codigo=${encodeURIComponent(codigo)}`,
    { method: "GET" }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || SYSTEM_MESSAGES.produto.errors.loadFailed;
    throw new Error(message);
  }
  return payload?.produto ? Produto.fromApi(payload.produto) : null;
}
