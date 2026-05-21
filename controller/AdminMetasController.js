import {
  listarMetasCategorias,
  salvarMetasCategorias
} from "../model/admin/MetasRepository.js";

export function carregarMetasCategorias() {
  return listarMetasCategorias();
}

export function atualizarMetasCategorias(metas) {
  return salvarMetasCategorias(metas);
}
