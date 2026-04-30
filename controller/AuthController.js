import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth } from "../model/firebaseApp.js";
import { beginGlobalLoading, endGlobalLoading } from "../model/loadingOverlay.js";
import { SYSTEM_MESSAGES, systemError } from "../model/SystemMessages.js";
import { getUsuarioStatusByAuthId } from "../model/usuario/UsuarioRepository.js";

export async function autenticarEVerificarStatus(email, senha) {
  if (!email || !senha) {
    throw new Error(SYSTEM_MESSAGES.auth.errors.missingCredentialsShort);
  }

  beginGlobalLoading();
  try {
    const credential = await signInWithEmailAndPassword(auth, email, senha);
    const idToken = await credential.user.getIdToken(true);
    if (!idToken) {
      throw new Error(SYSTEM_MESSAGES.auth.errors.tokenFailed);
    }
    const status = await getUsuarioStatusByAuthId(credential.user.uid, idToken);

    if (!status) {
      throw new Error(SYSTEM_MESSAGES.auth.errors.usuarioNaoEncontrado);
    }

    return status;
  } catch (error) {
    throw systemError(error, SYSTEM_MESSAGES.auth.errors.loginFailed);
  } finally {
    endGlobalLoading();
  }
}
