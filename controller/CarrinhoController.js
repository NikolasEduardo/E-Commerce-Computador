import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth } from "../model/firebaseApp.js";
import { SYSTEM_MESSAGES } from "../model/SystemMessages.js";
import {
  obterCarrinho,
  obterStatusCarrinho,
  adicionarItemCarrinho,
  atualizarQuantidadeCarrinho,
  removerItemCarrinho,
  estenderCarrinho,
  cancelarCarrinho
} from "../model/usuario/CarrinhoRepository.js";

async function getToken() {
  const current = auth.currentUser;
  if (current) {
    return current.getIdToken(true);
  }

  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        reject(new Error(SYSTEM_MESSAGES.general.unauthenticated));
        return;
      }
      try {
        const token = await user.getIdToken(true);
        resolve(token);
      } catch (error) {
        reject(error);
      }
    });
  });
}

export async function carregarCarrinho() {
  const idToken = await getToken();
  return obterCarrinho(idToken);
}

export async function carregarStatusCarrinho() {
  const idToken = await getToken();
  return obterStatusCarrinho(idToken);
}

export async function adicionarAoCarrinho(codigoProduto) {
  const idToken = await getToken();
  return adicionarItemCarrinho(idToken, { codigoProduto });
}

export async function atualizarQuantidadeItem(codigoProduto, quantidade) {
  const idToken = await getToken();
  return atualizarQuantidadeCarrinho(idToken, { codigoProduto, quantidade });
}

export async function removerItem(codigoProduto) {
  const idToken = await getToken();
  return removerItemCarrinho(idToken, { codigoProduto });
}

export async function estenderCarrinhoTempo() {
  const idToken = await getToken();
  return estenderCarrinho(idToken);
}

export async function cancelarCarrinhoCompra() {
  const idToken = await getToken();
  return cancelarCarrinho(idToken);
}
