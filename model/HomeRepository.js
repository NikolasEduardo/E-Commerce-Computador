import { backendConfig } from "./firebaseApp.js";

const baseUrl = backendConfig.baseUrl;

export async function listarProdutosPopulares() {
  const response = await fetch(`${baseUrl}/api/home/produtos-populares`, {
    method: "GET"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || "Erro ao carregar produtos.";
    throw new Error(message);
  }
  return payload?.produtos || [];
}

export async function obterProdutoPublico(codigo) {
  const response = await fetch(
    `${baseUrl}/api/home/produto?codigo=${encodeURIComponent(codigo)}`,
    { method: "GET" }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || "Erro ao carregar produto.";
    throw new Error(message);
  }
  return payload?.produto || null;
}
