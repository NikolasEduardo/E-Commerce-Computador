import { backendConfig } from "../firebaseApp.js";

export async function getUsuarioStatusByAuthId(authId, idToken) {
  const endpoint = `${backendConfig.baseUrl}/api/usuario-status`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({
      authId
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || "Erro ao consultar o Data Connect.";
    throw new Error(message);
  }

  return payload?.status || null;
}
