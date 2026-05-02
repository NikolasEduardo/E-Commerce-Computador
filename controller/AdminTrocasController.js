import {
  listarTrocasAdmin,
  obterTrocaAdmin,
  avaliarTrocaAdmin,
  finalizarTrocaAdmin
} from "../model/admin/TrocasRepository.js";

export function buscarTrocasAdmin() {
  return listarTrocasAdmin();
}

export function carregarTrocaAdmin(descricaoId) {
  return obterTrocaAdmin(descricaoId);
}

export function avaliarTroca(payload) {
  return avaliarTrocaAdmin(payload);
}

export function finalizarTroca(descricaoId) {
  return finalizarTrocaAdmin(descricaoId);
}
