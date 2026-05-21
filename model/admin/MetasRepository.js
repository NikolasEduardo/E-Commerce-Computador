import { Categoria } from "../produto/Categoria.js";
import { SYSTEM_MESSAGES } from "../SystemMessages.js";
import { adminRequest } from "./AdminRequest.js";

let metasCache = null;

async function handleResponse(response, defaultMessage) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || defaultMessage;
    throw new Error(message);
  }
  return payload;
}

export async function listarMetasCategorias() {
  if (metasCache) {
    return metasCache;
  }

  const response = await adminRequest("/api/admin/metas", {
    method: "GET"
  });
  const data = await handleResponse(response, SYSTEM_MESSAGES.admin.errors.loadMetasFailed);
  metasCache = (data?.categorias || []).map((item) => Categoria.fromApi(item));
  return metasCache;
}

export async function salvarMetasCategorias(metas) {
  const response = await adminRequest("/api/admin/metas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metas })
  });
  const data = await handleResponse(response, SYSTEM_MESSAGES.admin.errors.saveMetasFailed);
  metasCache = (data?.categorias || []).map((item) => Categoria.fromApi(item));
  return metasCache;
}
