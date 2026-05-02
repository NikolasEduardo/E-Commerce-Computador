import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth } from "../model/firebaseApp.js";
import { SYSTEM_MESSAGES, getErrorMessage } from "../model/SystemMessages.js";
import {
  obterTrocas,
  obterPedidosElegiveisTroca,
  criarSolicitacaoTroca
} from "../model/usuario/TrocaRepository.js";

export function carregarTrocasUsuario(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null, SYSTEM_MESSAGES.general.unauthenticated);
      return;
    }

    try {
      const idToken = await user.getIdToken(true);
      const trocas = await obterTrocas(idToken);
      callback(trocas, null);
    } catch (error) {
      callback(null, getErrorMessage(error, SYSTEM_MESSAGES.perfil.errors.exchangesLoadFailed));
    }
  });
}

export async function carregarPedidosElegiveisTrocaUsuario() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error(SYSTEM_MESSAGES.general.unauthenticated);
  }
  const idToken = await user.getIdToken(true);
  return obterPedidosElegiveisTroca(idToken);
}

export async function solicitarTrocaUsuario(payload) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error(SYSTEM_MESSAGES.general.unauthenticated);
  }
  const idToken = await user.getIdToken(true);
  return criarSolicitacaoTroca(idToken, payload);
}
