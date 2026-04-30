import { backendConfig } from "../firebaseApp.js";
import { SYSTEM_MESSAGES } from "../SystemMessages.js";

const baseUrl = backendConfig.baseUrl;

export async function finalizarCompra(idToken, payload) {
  const response = await fetch(`${baseUrl}/api/checkout/finalizar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || SYSTEM_MESSAGES.checkout.errors.finishFailed;
    throw new Error(message);
  }
  return data;
}
