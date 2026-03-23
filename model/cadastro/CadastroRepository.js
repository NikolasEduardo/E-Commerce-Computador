import { backendConfig } from "../firebaseApp.js";

const baseUrl = backendConfig.baseUrl;

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || "Erro na requisicao.";
    throw new Error(message);
  }
  return payload;
}

export function carregarMetadata() {
  return requestJson(`${baseUrl}/api/cadastro/metadata`, { method: "GET" });
}

export function validarUnicidade(email, cpf) {
  return requestJson(`${baseUrl}/api/cadastro/validar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, cpf })
  });
}

export function registrarCadastro(idToken, payload) {
  return requestJson(`${baseUrl}/api/cadastro/registrar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(payload)
  });
}
