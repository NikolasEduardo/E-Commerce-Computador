import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth } from "../model/firebaseApp.js";
import { getUsuarioStatusByAuthId } from "../model/usuario/UsuarioRepository.js";

export async function autenticarEVerificarStatus(email, senha) {
  if (!email || !senha) {
    throw new Error("Informe email e senha.");
  }

  const credential = await signInWithEmailAndPassword(auth, email, senha);
  const idToken = await credential.user.getIdToken(true);
  if (!idToken) {
    throw new Error("Falha ao obter token do Firebase Auth.");
  }
  const status = await getUsuarioStatusByAuthId(credential.user.uid, idToken);

  if (!status) {
    throw new Error("Usuario nao encontrado no Data Connect.");
  }

  return status;
}
