import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth } from "../model/firebaseApp.js";
import {
  obterPerfil,
  obterDadosPerfil,
  atualizarDadosPerfil,
  obterMetadataCadastro,
  obterEnderecos,
  criarEndereco,
  atualizarEndereco,
  excluirEndereco,
  definirEnderecoPrincipal,
  obterCartoes,
  criarCartao,
  inativarCartao,
  definirCartaoPreferencial,
  obterPedidos,
  obterPedidoDetalhe,
  readicionarPedidoCarrinho
} from "../model/usuario/PerfilRepository.js";

export function carregarPerfil(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null, "Usuario nao autenticado.");
      return;
    }

    try {
      const idToken = await user.getIdToken(true);
      const perfil = await obterPerfil(idToken);
      callback(perfil, null);
    } catch (error) {
      callback(null, error?.message || "Erro ao carregar perfil.");
    }
  });
}

export function carregarDadosPerfil(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null, "Usuario nao autenticado.");
      return;
    }

    try {
      const idToken = await user.getIdToken(true);
      const dados = await obterDadosPerfil(idToken);
      callback(dados, null);
    } catch (error) {
      callback(null, error?.message || "Erro ao carregar dados.");
    }
  });
}

export async function salvarDadosPerfil(payload) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuario nao autenticado.");
  }
  const idToken = await user.getIdToken(true);
  return atualizarDadosPerfil(idToken, payload);
}

export function carregarMetadataPerfil() {
  return obterMetadataCadastro();
}

export function carregarEnderecos(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null, "Usuario nao autenticado.");
      return;
    }

    try {
      const idToken = await user.getIdToken(true);
      const enderecos = await obterEnderecos(idToken);
      callback(enderecos, null);
    } catch (error) {
      callback(null, error?.message || "Erro ao carregar enderecos.");
    }
  });
}

export async function adicionarEndereco(payload) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuario nao autenticado.");
  }
  const idToken = await user.getIdToken(true);
  return criarEndereco(idToken, payload);
}

export async function atualizarEnderecoUsuario(payload) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuario nao autenticado.");
  }
  const idToken = await user.getIdToken(true);
  return atualizarEndereco(idToken, payload);
}

export async function excluirEnderecoUsuario(enderecoId) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuario nao autenticado.");
  }
  const idToken = await user.getIdToken(true);
  return excluirEndereco(idToken, enderecoId);
}

export async function definirEnderecoResidencial(enderecoId) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuario nao autenticado.");
  }
  const idToken = await user.getIdToken(true);
  return definirEnderecoPrincipal(idToken, enderecoId);
}

export function carregarCartoes(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null, "Usuario nao autenticado.");
      return;
    }

    try {
      const idToken = await user.getIdToken(true);
      const cartoes = await obterCartoes(idToken);
      callback(cartoes, null);
    } catch (error) {
      callback(null, error?.message || "Erro ao carregar cartoes.");
    }
  });
}

export async function adicionarCartao(payload) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuario nao autenticado.");
  }
  const idToken = await user.getIdToken(true);
  return criarCartao(idToken, payload);
}

export async function inativarCartaoUsuario(cartaoId) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuario nao autenticado.");
  }
  const idToken = await user.getIdToken(true);
  return inativarCartao(idToken, cartaoId);
}

export async function definirCartaoPreferencialUsuario(cartaoId) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuario nao autenticado.");
  }
  const idToken = await user.getIdToken(true);
  return definirCartaoPreferencial(idToken, cartaoId);
}

export function carregarPedidosUsuario(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null, "Usuario nao autenticado.");
      return;
    }

    try {
      const idToken = await user.getIdToken(true);
      const pedidos = await obterPedidos(idToken);
      callback(pedidos, null);
    } catch (error) {
      callback(null, error?.message || "Erro ao carregar pedidos.");
    }
  });
}

export async function carregarPedidoDetalheUsuario(pedidoId) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuario nao autenticado.");
  }
  const idToken = await user.getIdToken(true);
  return obterPedidoDetalhe(idToken, pedidoId);
}

export async function readicionarPedidoAoCarrinhoUsuario(pedidoId) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuario nao autenticado.");
  }
  const idToken = await user.getIdToken(true);
  return readicionarPedidoCarrinho(idToken, pedidoId);
}
