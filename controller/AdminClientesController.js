import { listarClientes, atualizarStatusCliente } from "../model/admin/ClientesRepository.js";

export function buscarClientes(params) {
  return listarClientes(params);
}

export function atualizarStatus(usuarioId, status) {
  return atualizarStatusCliente(usuarioId, status);
}
