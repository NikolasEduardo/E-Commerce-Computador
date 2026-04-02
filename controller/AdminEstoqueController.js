import {
  listarFornecedores,
  criarFornecedor,
  listarEntradasEstoque,
  criarEntradaEstoque,
  listarProdutosEstoque
} from "../model/admin/EstoqueRepository.js";

export function carregarFornecedores() {
  return listarFornecedores();
}

export function salvarFornecedor(payload) {
  return criarFornecedor(payload);
}

export function carregarEntradasEstoque() {
  return listarEntradasEstoque();
}

export function salvarEntradaEstoque(payload) {
  return criarEntradaEstoque(payload);
}

export function carregarProdutosEstoque() {
  return listarProdutosEstoque();
}
