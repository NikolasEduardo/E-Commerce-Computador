import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
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

export async function solicitarRedefinicaoSenha(email) {
  if (!email) {
    throw new Error(SYSTEM_MESSAGES.auth.password.emailRequired);
  }

  beginGlobalLoading();
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    if (error?.code === "auth/user-not-found") {
      throw new Error(SYSTEM_MESSAGES.auth.password.resetFailed);
    }
    throw systemError(error, SYSTEM_MESSAGES.auth.password.resetFailed);
  } finally {
    endGlobalLoading();
  }
}

export async function alterarSenhaUsuario(senhaAtual, novaSenha) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error(SYSTEM_MESSAGES.general.unauthenticated);
  }
  if (!user.email) {
    throw new Error(SYSTEM_MESSAGES.auth.password.emailMissing);
  }
  if (!senhaAtual || !novaSenha) {
    throw new Error(SYSTEM_MESSAGES.auth.password.changeRequired);
  }

  beginGlobalLoading();
  try {
    const credential = EmailAuthProvider.credential(user.email, senhaAtual);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, novaSenha);
  } catch (error) {
    if (error?.code === "auth/invalid-credential" || error?.code === "auth/wrong-password") {
      throw new Error(SYSTEM_MESSAGES.auth.password.currentPasswordInvalid);
    }
    throw systemError(error, SYSTEM_MESSAGES.auth.password.changeFailed);
  } finally {
    endGlobalLoading();
  }
}
