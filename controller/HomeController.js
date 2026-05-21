import {
  buscarProdutosPublicos,
  listarProdutosPopulares,
  obterProdutoPublico
} from "../model/HomeRepository.js";

export function carregarProdutosPopulares() {
  return listarProdutosPopulares();
}

export function carregarProdutosBusca(filtros) {
  return buscarProdutosPublicos(filtros);
}

export function carregarProdutoPublico(codigo) {
  return obterProdutoPublico(codigo);
}
