import { listarProdutosPopulares, obterProdutoPublico } from "../model/HomeRepository.js";

export function carregarProdutosPopulares() {
  return listarProdutosPopulares();
}

export function carregarProdutoPublico(codigo) {
  return obterProdutoPublico(codigo);
}
