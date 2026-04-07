import { backendConfig } from "../firebaseApp.js";

const baseUrl = backendConfig.baseUrl;

export async function obterCupons(idToken) {
  const response = await fetch(`${baseUrl}/api/usuario/cupons`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || "Erro ao carregar cupons.";
    throw new Error(message);
  }
  return data;
}
