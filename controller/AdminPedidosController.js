import {
  listarPedidos,
  obterPedidoDetalhe,
  atualizarStatusPedido
} from "../model/admin/PedidosRepository.js";

export function buscarPedidos(params) {
  return listarPedidos(params);
}

export function carregarPedidoDetalhe(pedidoId) {
  return obterPedidoDetalhe(pedidoId);
}

export function atualizarStatusPedidoAdmin(pedidoId, status) {
  return atualizarStatusPedido(pedidoId, status);
}
