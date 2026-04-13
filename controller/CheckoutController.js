import { auth } from "../model/firebaseApp.js";
import { finalizarCompra } from "../model/usuario/CheckoutRepository.js";

export async function concluirCompra(payload) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuario nao autenticado.");
  }
  const idToken = await user.getIdToken(true);
  return finalizarCompra(idToken, payload);
}
