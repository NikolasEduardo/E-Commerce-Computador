import {
  listarProdutos,
  obterMetadataProdutos,
  obterProduto,
  criarProduto,
  editarProduto,
  atualizarStatusProduto
} from "../model/admin/ProdutosRepository.js";

export function buscarProdutos(params) {
  return listarProdutos(params);
}

export function carregarMetadataProdutos() {
  return obterMetadataProdutos();
}

export function carregarProduto(id) {
  return obterProduto(id);
}

export function salvarProduto(payload) {
  if (payload?.produto?.id) {
    return editarProduto(payload);
  }
  return criarProduto(payload);
}

export function atualizarStatusProdutoAdmin(payload) {
  return atualizarStatusProduto(payload);
}
