import {
  carregarCatalogoGamzu,
  clearGamzuConversation,
  enviarMensagemGamzu,
  getGamzuMessages,
  isGamzuBlocked,
  waitGamzuAuthenticatedUser
} from "../model/ia/GamzuRepository.js";

export function aguardarUsuarioGamzu() {
  return waitGamzuAuthenticatedUser();
}

export function carregarConversaGamzu() {
  return getGamzuMessages();
}

export function conversaGamzuBloqueada() {
  return isGamzuBlocked();
}

export function iniciarNovaConversaGamzu() {
  clearGamzuConversation();
}

export function carregarCatalogoProdutosGamzu() {
  return carregarCatalogoGamzu();
}

export function enviarTextoParaGamzu(texto) {
  return enviarMensagemGamzu(texto);
}
