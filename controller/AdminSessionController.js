import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth } from "../model/firebaseApp.js";
import { SYSTEM_MESSAGES } from "../model/SystemMessages.js";
import { getUsuarioStatusByAuthId } from "../model/usuario/UsuarioRepository.js";

function waitForAuthResolution() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user || null);
    });
  });
}

export async function getAuthenticatedUser() {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  return waitForAuthResolution();
}

export async function getAuthenticatedIdToken() {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new Error(SYSTEM_MESSAGES.auth.errors.adminRequired);
  }

  return user.getIdToken(true);
}

export async function verificarAcessoAdministrador() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      autenticado: false,
      autorizado: false,
      status: null,
      mensagem: SYSTEM_MESSAGES.auth.errors.adminRequired
    };
  }

  const idToken = await user.getIdToken(true);
  const status = await getUsuarioStatusByAuthId(user.uid, idToken);

  if (status !== "ADMIN") {
    return {
      autenticado: true,
      autorizado: false,
      status,
      mensagem: SYSTEM_MESSAGES.auth.errors.adminDenied
    };
  }

  return {
    autenticado: true,
    autorizado: true,
    status,
    idToken,
    mensagem: ""
  };
}
