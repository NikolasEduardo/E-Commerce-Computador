import { auth } from "../model/firebaseApp.js";
import { SYSTEM_MESSAGES } from "../model/SystemMessages.js";
import { finalizarCompra } from "../model/usuario/CheckoutRepository.js";

export async function concluirCompra(payload) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error(SYSTEM_MESSAGES.general.unauthenticated);
  }
  const idToken = await user.getIdToken(true);
  return finalizarCompra(idToken, payload);
}
