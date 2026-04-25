import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth } from "../model/firebaseApp.js";
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
    throw new Error("Voce precisa estar autenticado e com permissoes administrativas para acessar esta pagina.");
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
      mensagem:
        "Voce precisa estar autenticado e com permissoes administrativas para acessar esta pagina."
    };
  }

  const idToken = await user.getIdToken(true);
  const status = await getUsuarioStatusByAuthId(user.uid, idToken);

  if (status !== "ADMIN") {
    return {
      autenticado: true,
      autorizado: false,
      status,
      mensagem: "Voce nao deveria acessar esta pagina."
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
