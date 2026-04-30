import { backendConfig } from "../firebaseApp.js";
import { CartaoCredito } from "../cliente/CartaoCredito.js";
import { Endereco } from "../cliente/Endereco.js";
import { Telefone } from "../cliente/Telefone.js";
import { Pedido } from "../pedido/Pedido.js";
import { Usuario } from "../usuario/Usuario.js";

const baseUrl = backendConfig.baseUrl;

export async function obterPerfil(idToken) {
  const response = await fetch(`${baseUrl}/api/usuario/perfil`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || "Erro ao carregar perfil.";
    throw new Error(message);
  }
  return payload;
}

export async function obterDadosPerfil(idToken) {
  const response = await fetch(`${baseUrl}/api/usuario/dados`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || "Erro ao carregar dados.";
    throw new Error(message);
  }
  return {
    ...payload,
    usuario: payload?.usuario ? Usuario.fromApi(payload.usuario) : null,
    telefone: payload?.telefone ? Telefone.fromApi(payload.telefone) : null,
    endereco: payload?.endereco
      ? Endereco.fromApi({ ...payload.endereco, tipo: "Principal" })
      : null
  };
}

export async function atualizarDadosPerfil(idToken, payload) {
  const response = await fetch(`${baseUrl}/api/usuario/dados`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || "Erro ao salvar dados.";
    throw new Error(message);
  }
  return data;
}

export async function obterMetadataCadastro() {
  const response = await fetch(`${baseUrl}/api/cadastro/metadata`, {
    method: "GET"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || "Erro ao carregar metadata.";
    throw new Error(message);
  }
  return data;
}

export async function obterEnderecos(idToken) {
  const response = await fetch(`${baseUrl}/api/usuario/enderecos`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || "Erro ao carregar enderecos.";
    throw new Error(message);
  }
  return {
    ...data,
    enderecos: (data?.enderecos || []).map((endereco) => Endereco.fromApi(endereco))
  };
}

export async function criarEndereco(idToken, payload) {
  const response = await fetch(`${baseUrl}/api/usuario/enderecos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || "Erro ao criar endereco.";
    throw new Error(message);
  }
  return data;
}

export async function atualizarEndereco(idToken, payload) {
  const response = await fetch(`${baseUrl}/api/usuario/enderecos/atualizar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || "Erro ao atualizar endereco.";
    throw new Error(message);
  }
  return data;
}

export async function excluirEndereco(idToken, enderecoId) {
  const response = await fetch(`${baseUrl}/api/usuario/enderecos/excluir`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({ id: enderecoId })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || "Erro ao excluir endereco.";
    throw new Error(message);
  }
  return data;
}

export async function definirEnderecoPrincipal(idToken, enderecoId) {
  const response = await fetch(`${baseUrl}/api/usuario/enderecos/principal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({ id: enderecoId })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || "Erro ao definir endereco residencial.";
    throw new Error(message);
  }
  return data;
}

export async function obterCartoes(idToken) {
  const response = await fetch(`${baseUrl}/api/usuario/cartoes`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || "Erro ao carregar cartoes.";
    throw new Error(message);
  }
  return {
    ...data,
    cartoes: (data?.cartoes || []).map((cartao) => CartaoCredito.fromApi(cartao))
  };
}

export async function criarCartao(idToken, payload) {
  const response = await fetch(`${baseUrl}/api/usuario/cartoes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || "Erro ao cadastrar cartao.";
    throw new Error(message);
  }
  return data;
}

export async function inativarCartao(idToken, cartaoId) {
  const response = await fetch(`${baseUrl}/api/usuario/cartoes/inativar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({ id: cartaoId })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || "Erro ao excluir cartao.";
    throw new Error(message);
  }
  return data;
}

export async function definirCartaoPreferencial(idToken, cartaoId) {
  const response = await fetch(`${baseUrl}/api/usuario/cartoes/preferencial`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({ id: cartaoId })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || "Erro ao definir cartao preferencial.";
    throw new Error(message);
  }
  return data;
}

export async function obterPedidos(idToken) {
  const response = await fetch(`${baseUrl}/api/usuario/pedidos`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || "Erro ao carregar pedidos.";
    throw new Error(message);
  }
  return {
    ...data,
    pedidos: (data?.pedidos || []).map((pedido) => Pedido.fromApi(pedido))
  };
}

export async function obterPedidoDetalhe(idToken, pedidoId) {
  const response = await fetch(`${baseUrl}/api/usuario/pedidos/detalhe?id=${encodeURIComponent(pedidoId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || "Erro ao carregar detalhes do pedido.";
    throw new Error(message);
  }
  return {
    ...data,
    pedido: data?.pedido ? Pedido.fromApi(data.pedido) : null
  };
}

export async function readicionarPedidoCarrinho(idToken, pedidoId) {
  const response = await fetch(`${baseUrl}/api/usuario/pedidos/readicionar-carrinho`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({ id: pedidoId })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || "Erro ao readicionar pedido ao carrinho.";
    throw new Error(message);
  }
  return data;
}
