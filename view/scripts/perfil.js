import {
  carregarPerfil,
  carregarDadosPerfil,
  salvarDadosPerfil,
  carregarMetadataPerfil,
  carregarEnderecos,
  adicionarEndereco,
  atualizarEnderecoUsuario,
  excluirEnderecoUsuario,
  definirEnderecoResidencial,
  carregarPedidosUsuario,
  carregarPedidoDetalheUsuario,
  readicionarPedidoAoCarrinhoUsuario,
  carregarCartoes,
  adicionarCartao,
  inativarCartaoUsuario,
  definirCartaoPreferencialUsuario
} from "../../controller/PerfilController.js";
import {
  carregarTrocasUsuario,
  carregarPedidosElegiveisTrocaUsuario,
  solicitarTrocaUsuario
} from "../../controller/TrocaController.js";
import { carregarCupons } from "../../controller/CupomController.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth } from "../../model/firebaseApp.js";
import { SYSTEM_MESSAGES, getErrorMessage } from "../../model/SystemMessages.js";
import { initCartNotice, refreshCartNotice } from "./cart-notice.js";

const messageBox = document.getElementById("perfil-message");
const editButton = document.getElementById("btn-edit");
const perfilButton = document.getElementById("perfil-btn");
const logoutButton = document.getElementById("btn-logout");
const carrinhoButton = document.getElementById("btn-carrinho");
const navDetalhes = document.getElementById("nav-detalhes");
const navEnderecos = document.getElementById("nav-enderecos");
const navCartoes = document.getElementById("nav-cartoes");
const navPedidos = document.getElementById("nav-pedidos");
const navTrocas = document.getElementById("nav-trocas");
const sectionDetalhes = document.getElementById("section-detalhes");
const sectionEnderecos = document.getElementById("section-enderecos");
const sectionCartoes = document.getElementById("section-cartoes");
const sectionPedidos = document.getElementById("section-pedidos");
const sectionTrocas = document.getElementById("section-trocas");
const enderecosList = document.getElementById("enderecos-list");
const cartoesList = document.getElementById("cartoes-list");
const cuponsAtivosList = document.getElementById("cupons-ativos-list");
const cuponsInativosList = document.getElementById("cupons-inativos-list");
const pedidosList = document.getElementById("pedidos-list");
const pedidosListPanel = document.getElementById("pedidos-list-panel");
const pedidoDetalhePanel = document.getElementById("pedido-detalhe-panel");
const pedidoDetalheTitle = document.getElementById("pedido-detalhe-title");
const pedidoDetalheMeta = document.getElementById("pedido-detalhe-meta");
const pedidoItensList = document.getElementById("pedido-itens-list");
const pedidoPagamento = document.getElementById("pedido-pagamento");
const btnVoltarPedido = document.getElementById("btn-voltar-pedido");
const trocasList = document.getElementById("trocas-list");
const trocasListPanel = document.getElementById("trocas-list-panel");
const trocaFormPanel = document.getElementById("troca-form-panel");
const trocaDetalhePanel = document.getElementById("troca-detalhe-panel");
const trocaDetalheTitle = document.getElementById("troca-detalhe-title");
const trocaDetalheMeta = document.getElementById("troca-detalhe-meta");
const trocaDetalheItens = document.getElementById("troca-detalhe-itens");
const btnSolicitarTroca = document.getElementById("btn-solicitar-troca");
const btnCancelTroca = document.getElementById("btn-cancel-troca");
const btnSaveTroca = document.getElementById("btn-save-troca");
const btnVoltarTroca = document.getElementById("btn-voltar-troca");
const trocaPedidoSelect = document.getElementById("troca-pedido");
const trocaPedidoInfo = document.getElementById("troca-pedido-info");
const trocaItensList = document.getElementById("troca-itens-list");
const trocaHint = document.getElementById("troca-hint");
const btnAddEndereco = document.getElementById("btn-add-endereco");
const enderecoFormPanel = document.getElementById("endereco-form-panel");
const enderecoFormTitle = document.getElementById("endereco-form-title");
const btnSaveEndereco = document.getElementById("btn-save-endereco");
const btnCancelEndereco = document.getElementById("btn-cancel-endereco");
const btnAddCartao = document.getElementById("btn-add-cartao");
const cartaoFormPanel = document.getElementById("cartao-form-panel");
const cartaoFormTitle = document.getElementById("cartao-form-title");
const btnSaveCartao = document.getElementById("btn-save-cartao");
const btnCancelCartao = document.getElementById("btn-cancel-cartao");

const editableFields = [
  "nome",
  "dataNascimento",
  "genero",
  "telefoneTipo",
  "telefoneDdd",
  "telefoneNumero",
  "tipoLogradouro",
  "tipoResidencia",
  "logradouro",
  "numero",
  "bairro",
  "cep",
  "cidade",
  "estado",
  "pais",
  "observacoes"
];

const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const cepRegex = /^\d{5}-\d{3}$/;

let isEditing = false;
let enderecoEditId = null;
let pedidosTrocaCache = [];
let pedidoTrocaSelecionado = null;

let metadataCache = {
  tipoTelefones: [],
  tipoResidencias: [],
  tipoLogradouros: [],
  bandeiraCartaos: []
};

const tipoLogradouroMap = new Map();
const tipoResidenciaMap = new Map();
const bandeiraMap = new Map();

function setMessage(text) {
  messageBox.textContent = text;
  messageBox.classList.toggle("is-visible", Boolean(text));
}

function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.value = value ?? "";
  }
}

function setEditable(enabled) {
  editableFields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.disabled = !enabled;
    }
  });

  const cpfInput = document.getElementById("cpf");
  const emailInput = document.getElementById("email");
  if (cpfInput) cpfInput.disabled = true;
  if (emailInput) emailInput.disabled = true;
}

function onlyDigits(value) {
  return value.replace(/\D/g, "");
}

function formatCep(value) {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) {
    return digits;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function formatPhoneNumber(value, max = 9) {
  return onlyDigits(value).slice(0, max);
}

function formatCardNumber(value) {
  return onlyDigits(value).slice(0, 16);
}

function formatCvv(value) {
  return onlyDigits(value).slice(0, 4);
}

function fillSelect(selectId, items, labelBuilder) {
  const select = document.getElementById(selectId);
  if (!select || !Array.isArray(items)) {
    return;
  }

  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = labelBuilder(item);
    select.appendChild(option);
  });
}

async function carregarMetadata() {
  try {
    const data = await carregarMetadataPerfil();
    metadataCache = {
      tipoTelefones: data?.tipoTelefones || [],
      tipoResidencias: data?.tipoResidencias || [],
      tipoLogradouros: data?.tipoLogradouros || [],
      bandeiraCartaos: data?.bandeiraCartaos || []
    };

    tipoLogradouroMap.clear();
    tipoResidenciaMap.clear();
    bandeiraMap.clear();

    metadataCache.tipoLogradouros.forEach((item) => {
      const label = item.sigla ? `${item.nome} (${item.sigla})` : item.nome;
      tipoLogradouroMap.set(item.id, label);
    });

    metadataCache.tipoResidencias.forEach((item) => {
      tipoResidenciaMap.set(item.id, item.nome);
    });

    metadataCache.bandeiraCartaos.forEach((item) => {
      bandeiraMap.set(item.id, item.nome);
    });

    fillSelect("telefoneTipo", metadataCache.tipoTelefones, (item) => item.nome);
    fillSelect("tipoResidencia", metadataCache.tipoResidencias, (item) => item.nome);
    fillSelect("tipoLogradouro", metadataCache.tipoLogradouros, (item) =>
      item.sigla ? `${item.nome} (${item.sigla})` : item.nome
    );
    fillSelect("end-tipoResidencia", metadataCache.tipoResidencias, (item) => item.nome);
    fillSelect("end-tipoLogradouro", metadataCache.tipoLogradouros, (item) =>
      item.sigla ? `${item.nome} (${item.sigla})` : item.nome
    );
    fillSelect("cartao-bandeira", metadataCache.bandeiraCartaos, (item) => item.nome);

    return data;
  } catch (error) {
    setMessage(getErrorMessage(error, SYSTEM_MESSAGES.perfil.errors.loadDataFailed));
    return null;
  }
}

function carregarDados() {
  carregarDadosPerfil((dados, error) => {
    if (error) {
      setMessage(error);
      return;
    }

    if (!dados) {
      setMessage(SYSTEM_MESSAGES.general.dataNotFound);
      return;
    }

    const usuario = dados.usuario || {};
    const telefone = dados.telefone || null;
    const endereco = dados.endereco || null;

    setValue("nome", usuario.nome);
    setValue("cpf", usuario.cpf);
    setValue("email", usuario.email);
    setValue("dataNascimento", usuario.dataNascimento);
    setValue("genero", usuario.genero);

    if (telefone) {
      setValue("telefoneTipo", telefone.tipoId);
      setValue("telefoneDdd", telefone.ddd);
      setValue("telefoneNumero", telefone.numero);
    } else {
      setValue("telefoneTipo", "");
      setValue("telefoneDdd", "");
      setValue("telefoneNumero", "");
    }

    if (endereco) {
      setValue("tipoLogradouro", endereco.tipoLogradouroId);
      setValue("tipoResidencia", endereco.tipoResidenciaId);
      setValue("logradouro", endereco.logradouro);
      setValue("numero", endereco.numero);
      setValue("bairro", endereco.bairro);
      setValue("cep", endereco.cep);
      setValue("cidade", endereco.cidade);
      setValue("estado", endereco.estado);
      setValue("pais", endereco.pais || "Brasil");
      setValue("observacoes", endereco.observacoes);
    } else {
      setValue("tipoLogradouro", "");
      setValue("tipoResidencia", "");
      setValue("logradouro", "");
      setValue("numero", "");
      setValue("bairro", "");
      setValue("cep", "");
      setValue("cidade", "");
      setValue("estado", "");
      setValue("pais", "Brasil");
      setValue("observacoes", "");
    }

    if (!endereco?.pais) {
      setValue("pais", getValue("pais") || "Brasil");
    }
  });
}

function setNavActive(target) {
  const isDetalhes = target === "detalhes";
  const isEnderecos = target === "enderecos";
  const isCartoes = target === "cartoes";
  const isPedidos = target === "pedidos";
  const isTrocas = target === "trocas";

  navDetalhes.classList.toggle("is-active", isDetalhes);
  navEnderecos.classList.toggle("is-active", isEnderecos);
  navCartoes.classList.toggle("is-active", isCartoes);
  navPedidos.classList.toggle("is-active", isPedidos);
  navTrocas.classList.toggle("is-active", isTrocas);

  sectionDetalhes.classList.toggle("hidden", !isDetalhes);
  sectionEnderecos.classList.toggle("hidden", !isEnderecos);
  sectionCartoes.classList.toggle("hidden", !isCartoes);
  sectionPedidos.classList.toggle("hidden", !isPedidos);
  sectionTrocas.classList.toggle("hidden", !isTrocas);

  if (!isEnderecos) {
    fecharEnderecoForm();
  }
  if (!isCartoes) {
    fecharCartaoForm();
  }
  if (!isPedidos) {
    mostrarListaPedidos();
  }
  if (!isTrocas) {
    mostrarListaTrocas();
  }
}

function getEnderecoValue(id) {
  const el = document.getElementById(id);
  if (!el) {
    return "";
  }
  if (el.type === "checkbox") {
    return el.checked;
  }
  return el.value.trim();
}

function setEnderecoValue(id, value) {
  const el = document.getElementById(id);
  if (!el) {
    return;
  }
  if (el.type === "checkbox") {
    el.checked = Boolean(value);
    return;
  }
  el.value = value ?? "";
}

function limparEnderecoForm() {
  enderecoEditId = null;
  enderecoFormTitle.textContent = "NOVO ENDERECO";
  setEnderecoValue("end-tipoLogradouro", "");
  setEnderecoValue("end-tipoResidencia", "");
  setEnderecoValue("end-logradouro", "");
  setEnderecoValue("end-numero", "");
  setEnderecoValue("end-bairro", "");
  setEnderecoValue("end-cep", "");
  setEnderecoValue("end-cidade", "");
  setEnderecoValue("end-estado", "");
  setEnderecoValue("end-pais", "Brasil");
  setEnderecoValue("end-observacoes", "");
  setEnderecoValue("end-residencial", false);
}

function abrirEnderecoForm(endereco) {
  if (endereco) {
    enderecoEditId = endereco.id;
    enderecoFormTitle.textContent = "EDITAR ENDERECO";
    setEnderecoValue("end-tipoLogradouro", endereco.tipoLogradouroId);
    setEnderecoValue("end-tipoResidencia", endereco.tipoResidenciaId);
    setEnderecoValue("end-logradouro", endereco.logradouro);
    setEnderecoValue("end-numero", endereco.numero);
    setEnderecoValue("end-bairro", endereco.bairro);
    setEnderecoValue("end-cep", endereco.cep);
    setEnderecoValue("end-cidade", endereco.cidade);
    setEnderecoValue("end-estado", endereco.estado);
    setEnderecoValue("end-pais", endereco.pais || "Brasil");
    setEnderecoValue("end-observacoes", endereco.observacoes || "");
    setEnderecoValue("end-residencial", endereco.isPrincipal?.() || endereco.tipo === "Principal");
  } else {
    limparEnderecoForm();
  }
  enderecoFormPanel.classList.remove("hidden");
}

function fecharEnderecoForm() {
  enderecoFormPanel.classList.add("hidden");
  limparEnderecoForm();
}

function validarEnderecoForm() {
  const tipoLogradouro = getEnderecoValue("end-tipoLogradouro");
  const tipoResidencia = getEnderecoValue("end-tipoResidencia");
  const logradouro = getEnderecoValue("end-logradouro");
  const numero = getEnderecoValue("end-numero");
  const bairro = getEnderecoValue("end-bairro");
  const cep = getEnderecoValue("end-cep");
  const cidade = getEnderecoValue("end-cidade");
  const estado = getEnderecoValue("end-estado");
  const pais = getEnderecoValue("end-pais");

  if (
    !tipoLogradouro ||
    !tipoResidencia ||
    !logradouro ||
    !numero ||
    !bairro ||
    !cep ||
    !cidade ||
    !estado ||
    !pais
  ) {
    return SYSTEM_MESSAGES.perfil.errors.addressFormRequired;
  }

  if (!cepRegex.test(cep)) {
    return SYSTEM_MESSAGES.perfil.errors.cepInvalid;
  }

  return null;
}

function formatEnderecoLinha(endereco) {
  const tipoLogradouro = tipoLogradouroMap.get(endereco.tipoLogradouroId) || "";
  const tipoResidencia = tipoResidenciaMap.get(endereco.tipoResidenciaId) || "";
  const logradouro = endereco.logradouro || "";
  const numero = endereco.numero ? `, ${endereco.numero}` : "";
  const linha1 = [tipoLogradouro, logradouro].filter(Boolean).join(" ") + numero;
  const linha2 = endereco.getLinhaBairroCidade?.() || `${endereco.bairro || ""} - ${endereco.cidade || ""}/${endereco.estado || ""}`;
  const linha3 = endereco.getLinhaCepPais?.() || `CEP: ${endereco.cep || ""} | ${endereco.pais || ""}`;
  const linha4 = tipoResidencia ? `Tipo residencia: ${tipoResidencia}` : "";
  return [linha1, linha2, linha3, linha4].filter(Boolean);
}

function renderEnderecos(enderecos) {
  enderecosList.innerHTML = "";

  if (!enderecos.length) {
    const empty = document.createElement("div");
    empty.className = "endereco-card";
    empty.textContent = SYSTEM_MESSAGES.perfil.empty.noAddresses;
    enderecosList.appendChild(empty);
    return;
  }

  const ordenados = [...enderecos].sort((a, b) => {
    if (a.isPrincipal?.() && !b.isPrincipal?.()) return -1;
    if (!a.isPrincipal?.() && b.isPrincipal?.()) return 1;
    return 0;
  });

  ordenados.forEach((endereco, index) => {
    const card = document.createElement("div");
    card.className = "endereco-card";

    const info = document.createElement("div");
    info.className = "endereco-info";
    const title = document.createElement("strong");
    title.textContent = `ENDERECO ${index + 1}`;
    if (endereco.isPrincipal?.()) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "RESIDENCIAL";
      title.appendChild(badge);
    }
    info.appendChild(title);

    const linhas = formatEnderecoLinha(endereco);
    linhas.forEach((linha) => {
      const span = document.createElement("span");
      span.textContent = linha;
      info.appendChild(span);
    });

    const actions = document.createElement("div");
    actions.className = "endereco-actions";

    const btnEditar = document.createElement("button");
    btnEditar.className = "btn small";
    btnEditar.textContent = "EDITAR";
    btnEditar.addEventListener("click", () => abrirEnderecoForm(endereco));
    actions.appendChild(btnEditar);

    if (!endereco.isPrincipal?.()) {
      const btnPrincipal = document.createElement("button");
      btnPrincipal.className = "btn small";
      btnPrincipal.textContent = "DEFINIR RESIDENCIAL";
      btnPrincipal.addEventListener("click", async () => {
        try {
          await definirEnderecoResidencial(endereco.id);
          await carregarEnderecosLista();
          carregarDados();
        } catch (error) {
          setMessage(getErrorMessage(error, SYSTEM_MESSAGES.perfil.errors.addressPrincipalFailed));
        }
      });
      actions.appendChild(btnPrincipal);
    }

    const btnExcluir = document.createElement("button");
    btnExcluir.className = "btn small";
    btnExcluir.textContent = "EXCLUIR";
    btnExcluir.disabled = endereco.isPrincipal?.();
    btnExcluir.addEventListener("click", async () => {
      const confirmacao = window.confirm(SYSTEM_MESSAGES.perfil.confirmations.deleteAddress);
      if (!confirmacao) {
        return;
      }
      try {
        await excluirEnderecoUsuario(endereco.id);
        await carregarEnderecosLista();
      } catch (error) {
        setMessage(getErrorMessage(error, SYSTEM_MESSAGES.perfil.errors.addressDeleteFailed));
      }
    });
    actions.appendChild(btnExcluir);

    card.appendChild(info);
    card.appendChild(actions);
    enderecosList.appendChild(card);
  });
}

function carregarEnderecosLista() {
  carregarEnderecos((dados, error) => {
    if (error) {
      setMessage(error);
      return;
    }
    const lista = dados?.enderecos || [];
    renderEnderecos(lista);
  });
}

function getCartaoValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function setCartaoValue(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.value = value ?? "";
  }
}

function limparCartaoForm() {
  cartaoFormTitle.textContent = "NOVO CARTAO";
  setCartaoValue("cartao-bandeira", "");
  setCartaoValue("cartao-numero", "");
  setCartaoValue("cartao-nome", "");
  setCartaoValue("cartao-cvv", "");
  setCartaoValue("cartao-validade", "");
}

function abrirCartaoForm() {
  limparCartaoForm();
  cartaoFormPanel.classList.remove("hidden");
}

function fecharCartaoForm() {
  cartaoFormPanel.classList.add("hidden");
  limparCartaoForm();
}

function validarCartaoForm() {
  const bandeiraId = getCartaoValue("cartao-bandeira");
  const numero = getCartaoValue("cartao-numero");
  const nome = getCartaoValue("cartao-nome");
  const cvv = getCartaoValue("cartao-cvv");
  const validade = getCartaoValue("cartao-validade");

  if (!bandeiraId || !numero || !nome || !cvv || !validade) {
    return SYSTEM_MESSAGES.perfil.errors.cardRequired;
  }

  if (!/^\d+$/.test(numero) || numero.length < 13 || numero.length > 16) {
    return SYSTEM_MESSAGES.perfil.errors.cardNumberInvalid;
  }

  if (!/^\d+$/.test(cvv) || cvv.length < 3 || cvv.length > 4) {
    return SYSTEM_MESSAGES.perfil.errors.cvvInvalid;
  }

  return null;
}

function formatValidade(dateString) {
  if (!dateString) {
    return "";
  }
  const parts = dateString.split("-");
  if (parts.length < 2) {
    return dateString;
  }
  return `${parts[1]}/${parts[0].slice(-2)}`;
}

function normalizeValidade(value) {
  if (!value) {
    return "";
  }
  const parts = value.split("-");
  if (parts.length < 2) {
    return "";
  }
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  if (!year || !month) {
    return "";
  }
  const lastDay = new Date(year, month, 0).getDate();
  const monthStr = String(month).padStart(2, "0");
  return `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`;
}

function mascararNumeroCartao(numero) {
  const digits = (numero || "").replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  const last4 = digits.slice(-4);
  return `**** **** **** ${last4}`;
}

function normalizeText(value) {
  return `${value || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function formatCurrency(value) {
  const number = Number(value || 0);
  return `R$ ${number.toFixed(2).replace(".", ",")}`;
}

function getCupomStatusExibicao(cupom) {
  return cupom?.getStatusExibicao?.() || "ATIVO";
}

function formatTempoRestante(validade) {
  const date = validade ? new Date(validade) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return "Expiracao invalida";
  }

  const diff = date.getTime() - Date.now();
  if (diff <= 0) {
    return "Expirado";
  }

  const minuto = 60 * 1000;
  const hora = 60 * minuto;
  const dia = 24 * hora;

  const dias = Math.floor(diff / dia);
  const horas = Math.floor((diff % dia) / hora);
  const minutos = Math.floor((diff % hora) / minuto);

  if (dias > 0) {
    return horas > 0
      ? `${dias} dia(s) e ${horas} hora(s)`
      : `${dias} dia(s)`;
  }

  if (horas > 0) {
    return minutos > 0
      ? `${horas} hora(s) e ${minutos} minuto(s)`
      : `${horas} hora(s)`;
  }

  return `${Math.max(minutos, 1)} minuto(s)`;
}

function getCupomTipoTitulo(cupom) {
  return cupom?.getTipoTitulo?.() || cupom?.tipo?.nome || "CUPOM";
}

function getCupomDescricaoValor(cupom) {
  return cupom?.getDescricaoValor?.() || `Valor: ${formatCurrency(cupom?.valor)}`;
}

function renderCuponsLista(listEl, cupons, inactive = false) {
  listEl.innerHTML = "";

  if (!cupons.length) {
    const empty = document.createElement("div");
    empty.className = "cupom-card";
    empty.textContent = inactive
      ? SYSTEM_MESSAGES.perfil.empty.noInactiveCoupons
      : SYSTEM_MESSAGES.perfil.empty.noActiveCoupons;
    listEl.appendChild(empty);
    return;
  }

  cupons.forEach((cupom) => {
    const card = document.createElement("div");
    card.className = `cupom-card${inactive ? " is-inativo" : ""}`;

    const title = document.createElement("div");
    title.className = "cupom-title";
    title.innerHTML = `<strong>${cupom.codigo || "CUPOM"} - ${getCupomTipoTitulo(cupom)}</strong>`;

    const valor = document.createElement("span");
    valor.textContent = getCupomDescricaoValor(cupom);

    const status = document.createElement("span");
    if (inactive) {
      status.textContent = `Status: ${getCupomStatusExibicao(cupom)}`;
    } else {
      status.textContent = `Expira em: ${cupom?.getTempoRestante?.() || formatTempoRestante(cupom.validade)}`;
    }

    card.appendChild(title);
    card.appendChild(valor);
    card.appendChild(status);
    listEl.appendChild(card);
  });
}

function renderCupons(cupons) {
  const ordenados = [...(cupons || [])].sort((a, b) => {
    const aTime = a?.validade ? new Date(a.validade).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b?.validade ? new Date(b.validade).getTime() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });

  const ativos = [];
  const inativos = [];

  ordenados.forEach((cupom) => {
    if (getCupomStatusExibicao(cupom) === "ATIVO") {
      ativos.push(cupom);
    } else {
      inativos.push(cupom);
    }
  });

  renderCuponsLista(cuponsAtivosList, ativos, false);
  renderCuponsLista(cuponsInativosList, inativos, true);
}

function formatPedidoDataHora(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const data = date.toLocaleDateString("pt-BR");
  const hora = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
  return `${data} ${hora}`;
}

function formatPedidoDataCompleta(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("pt-BR");
}

function getPedidoCupomPromocional(pedido) {
  return pedido?.getCupomPromocional?.() || null;
}

function pedidoTemFreteGratis(pedido) {
  return pedido?.temFreteGratis?.() || false;
}

function contarItensPedido(pedido) {
  return pedido?.getQuantidadeTotalItens?.() || 0;
}

function pedidoPodeReadicionarCarrinho(pedido) {
  return pedido?.podeReadicionarCarrinho?.() || false;
}

function escapeHtml(value) {
  return `${value ?? ""}`
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getItensElegiveisTroca(pedido) {
  return (pedido?.getItens?.() || []).filter((item) => {
    const status = normalizeText(item?.getStatusNome?.());
    const quantidadeDisponivel = item?.getQuantidadeRestante?.() ?? Number(item?.quantidade || 0);
    return quantidadeDisponivel > 0 && status !== "EM TROCA" && status !== "TROCADO";
  });
}

function getQuantidadeDisponivelTroca(item) {
  return item?.getQuantidadeRestante?.() ?? Number(item?.quantidade || 0);
}

function getTotalSelecionadoTroca() {
  return [...trocaItensList.querySelectorAll(".troca-item-card")]
    .filter((card) => card.querySelector(".troca-item-check")?.checked)
    .reduce((acc, card) => acc + Number(card.querySelector(".troca-item-qtd")?.value || 0), 0);
}

function atualizarTrocaHint() {
  const total = getTotalSelecionadoTroca();
  trocaHint.textContent = total > 1
    ? "Como esta troca possui mais de 1 item, escreva o maximo de detalhes possivel de todos os produtos."
    : "";
  trocaHint.classList.toggle("hidden", total <= 1);
}

function montarResumoTrocaItemPedido(item) {
  const quantidadeEmTroca = item?.getQuantidadeEmTroca?.() || 0;
  const quantidadeRestante = item?.getQuantidadeRestante?.() ?? Number(item?.quantidade || 0);
  const status = item?.getStatusNome?.() || "";
  const linhas = [];

  if (status) {
    linhas.push(`Status do item: ${status}`);
  }
  if (quantidadeEmTroca > 0) {
    linhas.push(`Quantidade em troca: ${quantidadeEmTroca}`);
    linhas.push(`Quantidade ainda com voce: ${quantidadeRestante}`);
  }

  return linhas;
}

function mostrarListaPedidos() {
  pedidosListPanel.classList.remove("hidden");
  pedidoDetalhePanel.classList.add("hidden");
}

function mostrarDetalhePedido() {
  pedidosListPanel.classList.add("hidden");
  pedidoDetalhePanel.classList.remove("hidden");
}

function renderPedidos(pedidos) {
  pedidosList.innerHTML = "";

  if (!pedidos.length) {
    const empty = document.createElement("div");
    empty.className = "pedido-card";
    empty.textContent = SYSTEM_MESSAGES.perfil.empty.noOrders;
    pedidosList.appendChild(empty);
    return;
  }

  pedidos.forEach((pedido) => {
    const card = document.createElement("div");
    card.className = "pedido-card";

    const info = document.createElement("div");
    info.className = "pedido-info";

    const titulo = document.createElement("strong");
    titulo.textContent = `${formatPedidoDataHora(pedido.dataCriacao)} - ${pedido?.getStatusNome?.() || "-"}`;
    info.appendChild(titulo);

    const total = document.createElement("span");
    total.textContent = `Total: ${formatCurrency(pedido.valorTotal)}`;
    info.appendChild(total);

    const frete = document.createElement("span");
    frete.textContent = pedidoTemFreteGratis(pedido)
      ? "Frete: Grátis"
      : `Frete: ${formatCurrency(pedido.valorFrete)}`;
    info.appendChild(frete);

    const itens = document.createElement("span");
    itens.textContent = `Quantidade de itens: ${contarItensPedido(pedido)}`;
    info.appendChild(itens);

    if (pedido?.getQuantidadeTrocas?.() > 0 || normalizeText(pedido?.getStatusNome?.()).includes("TROCA")) {
      const trocas = document.createElement("span");
      trocas.textContent = `Situacao de troca: ${pedido?.getStatusNome?.() || "-"}${
        pedido?.getQuantidadeTrocas?.() > 0 ? ` (${pedido.getQuantidadeTrocas()} item(ns))` : ""
      }`;
      info.appendChild(trocas);
    }

    const actions = document.createElement("div");
    actions.className = "pedido-actions";

    const btnDetalhes = document.createElement("button");
    btnDetalhes.className = "btn small";
    btnDetalhes.textContent = "VER DETALHES";
    btnDetalhes.addEventListener("click", async () => {
      try {
        const data = await carregarPedidoDetalheUsuario(pedido.id);
        renderPedidoDetalhe(data?.pedido || null);
        mostrarDetalhePedido();
      } catch (error) {
        setMessage(getErrorMessage(error, SYSTEM_MESSAGES.perfil.errors.orderLoadFailed));
      }
    });
    actions.appendChild(btnDetalhes);

    if (pedidoPodeReadicionarCarrinho(pedido)) {
      const btnReadicionar = document.createElement("button");
      btnReadicionar.className = "btn small";
      btnReadicionar.textContent = "RECOLOCAR NO CARRINHO";
      btnReadicionar.addEventListener("click", async () => {
        btnReadicionar.disabled = true;
        btnReadicionar.textContent = "RECOLOCANDO...";
        try {
          const resultado = await readicionarPedidoAoCarrinhoUsuario(pedido.id);
          setMessage(resultado?.message || SYSTEM_MESSAGES.perfil.success.orderReadicionado);
          window.dispatchEvent(new CustomEvent("cart-updated"));
          await refreshCartNotice();
        } catch (error) {
          setMessage(getErrorMessage(error, SYSTEM_MESSAGES.perfil.errors.orderReadicionarFailed));
        } finally {
          btnReadicionar.disabled = false;
          btnReadicionar.textContent = "RECOLOCAR NO CARRINHO";
        }
      });
      actions.appendChild(btnReadicionar);
    }

    card.appendChild(info);
    card.appendChild(actions);
    pedidosList.appendChild(card);
  });
}

function renderPedidoDetalhe(pedido) {
  if (!pedido) {
    pedidoDetalheTitle.textContent = "DETALHES DO PEDIDO";
    pedidoDetalheMeta.innerHTML = `<div>${SYSTEM_MESSAGES.perfil.errors.orderNotFound}</div>`;
    pedidoItensList.innerHTML = "";
    pedidoPagamento.innerHTML = "";
    return;
  }

  pedidoDetalheTitle.textContent = `${formatPedidoDataHora(pedido.dataCriacao)} - ${pedido?.getStatusNome?.() || "-"}`;

  const freteGratis = pedidoTemFreteGratis(pedido);
  pedidoDetalheMeta.innerHTML = `
    <div>Data da compra: ${formatPedidoDataCompleta(pedido.dataCriacao)}</div>
    <div>Valor total: ${formatCurrency(pedido.valorTotal)}</div>
    <div>${freteGratis ? "Frete: Grátis" : `Frete: ${formatCurrency(pedido.valorFrete)}`}</div>
    <div>Quantidade de itens: ${contarItensPedido(pedido)}</div>
    ${pedido?.justificativaReprovacao ? `<div>Justificativa de reprovacao: ${pedido.justificativaReprovacao}</div>` : ""}
  `;

  pedidoItensList.innerHTML = "";
  (pedido?.getItens?.() || []).forEach((item) => {
    const card = document.createElement("div");
    card.className = "pedido-item";

    const image = document.createElement("div");
    image.className = "pedido-item-image";
    const imageUrl = item?.getImagemUrl?.() || "";
    if (imageUrl) {
      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = item?.nome || item?.produto?.nome || "Produto";
      image.appendChild(img);
    } else {
      image.textContent = "IMG";
    }

    const info = document.createElement("div");
    info.className = "pedido-item-info";
    info.innerHTML = `
      <strong>${item?.nome || item?.produto?.nome || "SEM NOME"}</strong>
      <span>Modelo: ${item?.modelo || item?.produto?.modelo || "-"}</span>
      <span>Quantidade: ${Number(item?.quantidade || 0)}x</span>
      <span>Preco na compra: ${formatCurrency(item?.getPrecoAtual?.() ?? item?.getPrecoUnitario?.() ?? 0)}</span>
    `;
    montarResumoTrocaItemPedido(item).forEach((linha) => {
      const span = document.createElement("span");
      span.textContent = linha;
      info.appendChild(span);
    });

    card.appendChild(image);
    card.appendChild(info);
    pedidoItensList.appendChild(card);
  });

  const pagamento = pedido?.getPagamentoPrincipal?.() || null;
  const lines = [];

  if (pagamento) {
    lines.push(`<div>Data do pagamento: ${formatPedidoDataCompleta(pagamento.dataPagamento)}</div>`);
    lines.push(`<div>Total pago: ${formatCurrency(pagamento.valorTotalPago)}</div>`);
  }

  const cupomPromo = getPedidoCupomPromocional(pedido);
  if (cupomPromo) {
    if (cupomPromo?.isDesconto?.()) {
      lines.push(`<div>Cupom promocional: ${cupomPromo.codigo} (${formatCurrency(cupomPromo.valor)})</div>`);
    } else if (cupomPromo?.isFreteGratis?.()) {
      lines.push(`<div>Cupom promocional: ${cupomPromo.codigo} - Frete Grátis</div>`);
    }
  }

  const cuponsTroca = pagamento?.getCuponsTroca?.() || [];
  if (cuponsTroca.length) {
    const lista = cuponsTroca
      .map((item) => {
        const cupom = item?.getCupomTroca?.() || item?.cupomTroca || null;
        return `<li>${cupom?.codigo || "-"} - ${formatCurrency(cupom?.valor || 0)}</li>`;
      })
      .join("");
    lines.push(`<div>Cupons troca/sobra:</div><ul>${lista}</ul>`);
  }

  const cartoes = pagamento?.getCartoes?.() || [];
  if (cartoes.length) {
    const lista = cartoes
      .map((item) => {
        const cartao = item?.getCartao?.() || item?.cartaoCredito || null;
        const nome = cartao?.getNomeTitularCurto?.() || `${cartao?.nomeImpresso || ""}`.trim().split(/\s+/)[0] || "-";
        const numero = cartao?.getNumeroMascarado?.() || mascararNumeroCartao(cartao?.numero || "");
        const validade = cartao?.getValidadeFormatada?.() || formatValidade(cartao?.dataValidade || "");
        return `<li>${numero} - ${nome} - ${validade}</li>`;
      })
      .join("");
    lines.push(`<div>Cartoes utilizados:</div><ul>${lista}</ul>`);
  }

  pedidoPagamento.innerHTML = lines.length
    ? lines.join("")
    : `<div>${SYSTEM_MESSAGES.perfil.empty.noPayment}</div>`;
}

function carregarPedidosLista() {
  carregarPedidosUsuario((dados, error) => {
    if (error) {
      setMessage(error);
      return;
    }
    renderPedidos(dados?.pedidos || []);
    mostrarListaPedidos();
  });
}

function mostrarListaTrocas() {
  trocasListPanel.classList.remove("hidden");
  trocaFormPanel.classList.add("hidden");
  trocaDetalhePanel.classList.add("hidden");
}

function mostrarFormularioTroca() {
  trocasListPanel.classList.add("hidden");
  trocaDetalhePanel.classList.add("hidden");
  trocaFormPanel.classList.remove("hidden");
}

function mostrarDetalheTroca() {
  trocasListPanel.classList.add("hidden");
  trocaFormPanel.classList.add("hidden");
  trocaDetalhePanel.classList.remove("hidden");
}

function limparTrocaForm() {
  pedidoTrocaSelecionado = null;
  trocaPedidoSelect.innerHTML = `<option value="">SELECIONE UM PEDIDO</option>`;
  trocaPedidoInfo.innerHTML = "";
  trocaItensList.innerHTML = "";
  trocaHint.textContent = "";
  trocaHint.classList.add("hidden");
  setValue("troca-motivo", "");
  setValue("troca-descricao", "");
}

function renderTrocas(trocas) {
  trocasList.innerHTML = "";

  if (!trocas.length) {
    const empty = document.createElement("div");
    empty.className = "troca-card";
    empty.textContent = SYSTEM_MESSAGES.perfil.empty.noExchanges;
    trocasList.appendChild(empty);
    return;
  }

  trocas.forEach((trocaDescricao) => {
    const card = document.createElement("div");
    card.className = "troca-card";

    const info = document.createElement("div");
    info.className = "troca-info";

    const title = document.createElement("strong");
    title.textContent = `${trocaDescricao.motivo || "TROCA"} - ${trocaDescricao.getQuantidadeItens()} item(ns) - ${trocaDescricao.getStatusNome() || "-"}`;
    info.appendChild(title);

    const data = document.createElement("span");
    data.textContent = `Solicitada em: ${formatPedidoDataCompleta(trocaDescricao.data)}`;
    info.appendChild(data);

    const actions = document.createElement("div");
    actions.className = "pedido-actions";

    const btnDetalhes = document.createElement("button");
    btnDetalhes.className = "btn small";
    btnDetalhes.textContent = "DETALHES";
    btnDetalhes.addEventListener("click", () => {
      renderTrocaDetalhe(trocaDescricao);
      mostrarDetalheTroca();
    });
    actions.appendChild(btnDetalhes);

    card.appendChild(info);
    card.appendChild(actions);
    trocasList.appendChild(card);
  });
}

function renderTrocaDetalhe(trocaDescricao) {
  trocaDetalheTitle.textContent = `TROCA - ${trocaDescricao?.getStatusNome?.() || "-"}`;
  trocaDetalheMeta.innerHTML = `
    <div>Motivo: ${escapeHtml(trocaDescricao?.motivo || "-")}</div>
    <div>Descricao: ${escapeHtml(trocaDescricao?.descricaoUsuario || "-")}</div>
    <div>Data: ${formatPedidoDataCompleta(trocaDescricao?.data)}</div>
    <div>Quantidade de itens: ${trocaDescricao?.getQuantidadeItens?.() || 0}</div>
  `;

  trocaDetalheItens.innerHTML = "";
  const trocas = trocaDescricao?.getTrocas?.() || [];
  const trocaConcluida = normalizeText(trocaDescricao?.getStatusNome?.() || trocaDescricao?.status) === "CONCLUIDA";
  if (!trocas.length) {
    const empty = document.createElement("div");
    empty.className = "troca-detalhe-item";
    empty.textContent = "Nenhum item vinculado a esta solicitacao.";
    trocaDetalheItens.appendChild(empty);
    return;
  }

  trocas.forEach((troca, index) => {
    const item = document.createElement("div");
    item.className = "troca-detalhe-item";

    const image = document.createElement("div");
    image.className = "pedido-item-image";
    const produto = troca.getProduto?.() || null;
    const imageUrl = produto?.getImagemPrincipalUrl?.() || produto?.imagem || "";
    if (imageUrl) {
      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = troca.getProdutoNome?.() || "Produto";
      image.appendChild(img);
    } else {
      image.textContent = "IMG";
    }

    const info = document.createElement("div");
    info.className = "troca-detalhe-info";
    const modelo = troca.getProdutoModelo?.() ? ` - ${troca.getProdutoModelo()}` : "";
    const cupomCodigo = troca.getCupomCodigo?.() || "";
    const cupomTexto = cupomCodigo
      ? cupomCodigo
      : trocaConcluida
        ? "Nao sera entregue cupom de troca devido as condicoes do produto ou data da garantia"
        : "Ainda nao gerado";
    info.innerHTML = `
      <strong>Unidade ${index + 1}: ${escapeHtml(troca.getProdutoNome?.() || "Produto")}${escapeHtml(modelo)}</strong>
      <span>Classificacao tecnica: ${escapeHtml(troca.getClassificacaoTecnica?.() || "-")}</span>
      <span>Cupom gerado: ${escapeHtml(cupomTexto)}</span>
    `;

    item.appendChild(image);
    item.appendChild(info);
    trocaDetalheItens.appendChild(item);
  });
}

function renderPedidosTrocaOptions(pedidos) {
  trocaPedidoSelect.innerHTML = `<option value="">SELECIONE UM PEDIDO</option>`;

  pedidos.forEach((pedido) => {
    const option = document.createElement("option");
    option.value = pedido.id;
    option.textContent = `${formatPedidoDataHora(pedido.dataCriacao)} - ${pedido.getStatusNome?.() || "-"}`;
    trocaPedidoSelect.appendChild(option);
  });
}

function renderPedidoTrocaSelecionado(pedido) {
  pedidoTrocaSelecionado = pedido;
  trocaPedidoInfo.innerHTML = "";
  trocaItensList.innerHTML = "";

  if (!pedido) {
    return;
  }

  trocaPedidoInfo.innerHTML = `
    <strong>${formatPedidoDataHora(pedido.dataCriacao)} - ${escapeHtml(pedido.getStatusNome?.() || "-")}</strong>
    <span>Total: ${formatCurrency(pedido.valorTotal)}</span>
    <span>Itens adquiridos: ${contarItensPedido(pedido)}</span>
  `;

  const itens = getItensElegiveisTroca(pedido);
  if (!itens.length) {
    const empty = document.createElement("div");
    empty.className = "troca-item-card";
    empty.textContent = SYSTEM_MESSAGES.perfil.empty.noExchangeOrders;
    trocaItensList.appendChild(empty);
    atualizarTrocaHint();
    return;
  }

  itens.forEach((item, index) => {
    const disponivel = getQuantidadeDisponivelTroca(item);
    const card = document.createElement("div");
    card.className = "troca-item-card";
    card.dataset.produtoId = item.produtoId || item.produto?.id || "";

    const info = document.createElement("div");
    info.className = "troca-item-info";
    info.innerHTML = `
      <strong>${escapeHtml(item?.nome || item?.produto?.nome || "Produto")}</strong>
      <span>Modelo: ${escapeHtml(item?.modelo || item?.produto?.modelo || "-")}</span>
      <span>Comprado: ${Number(item?.quantidade || 0)}x</span>
      <span>Disponivel para troca: ${disponivel}x</span>
    `;

    const actions = document.createElement("div");
    actions.className = "troca-item-actions";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "troca-item-check";
    checkbox.checked = true;
    checkbox.id = `troca-item-${index}`;

    const quantidade = document.createElement("input");
    quantidade.type = "number";
    quantidade.className = "troca-item-qtd";
    quantidade.min = "1";
    quantidade.max = String(disponivel);
    quantidade.value = String(disponivel);

    checkbox.addEventListener("change", () => {
      quantidade.disabled = !checkbox.checked;
      atualizarTrocaHint();
    });
    quantidade.addEventListener("input", atualizarTrocaHint);
    quantidade.addEventListener("change", () => {
      const value = Math.max(1, Math.min(disponivel, Number(quantidade.value || 1)));
      quantidade.value = String(value);
      atualizarTrocaHint();
    });

    actions.appendChild(checkbox);
    actions.appendChild(quantidade);
    card.appendChild(info);
    card.appendChild(actions);
    trocaItensList.appendChild(card);
  });

  atualizarTrocaHint();
}

async function abrirFormularioTroca() {
  setMessage("");
  limparTrocaForm();
  mostrarFormularioTroca();

  try {
    const data = await carregarPedidosElegiveisTrocaUsuario();
    pedidosTrocaCache = data?.pedidos || [];
    renderPedidosTrocaOptions(pedidosTrocaCache);

    if (!pedidosTrocaCache.length) {
      trocaPedidoInfo.textContent = SYSTEM_MESSAGES.perfil.empty.noExchangeOrders;
      return;
    }

    trocaPedidoSelect.value = pedidosTrocaCache[0].id;
    renderPedidoTrocaSelecionado(pedidosTrocaCache[0]);
  } catch (error) {
    setMessage(getErrorMessage(error, SYSTEM_MESSAGES.perfil.errors.exchangeOrdersLoadFailed));
    mostrarListaTrocas();
  }
}

function getTrocaPayload() {
  const itens = [...trocaItensList.querySelectorAll(".troca-item-card")]
    .filter((card) => card.querySelector(".troca-item-check")?.checked)
    .map((card) => ({
      produtoId: card.dataset.produtoId,
      quantidade: Number(card.querySelector(".troca-item-qtd")?.value || 0)
    }))
    .filter((item) => item.produtoId && item.quantidade > 0);

  return {
    pedidoId: trocaPedidoSelect.value,
    motivo: getValue("troca-motivo"),
    descricaoUsuario: getValue("troca-descricao"),
    itens
  };
}

function validarTrocaPayload(payload) {
  if (!payload.pedidoId) {
    return "Selecione um pedido.";
  }
  if (!payload.motivo || !payload.descricaoUsuario) {
    return SYSTEM_MESSAGES.perfil.errors.exchangeReasonRequired;
  }
  if (!payload.itens.length) {
    return SYSTEM_MESSAGES.perfil.errors.exchangeItemsRequired;
  }

  const invalido = payload.itens.some((item) => !Number.isInteger(item.quantidade) || item.quantidade <= 0);
  if (invalido) {
    return SYSTEM_MESSAGES.perfil.errors.exchangeQuantityInvalid;
  }
  return "";
}

function carregarTrocasLista() {
  carregarTrocasUsuario((dados, error) => {
    if (error) {
      setMessage(error);
      return;
    }
    renderTrocas(dados?.trocas || []);
    mostrarListaTrocas();
  });
}

function renderCartoes(cartoes) {
  cartoesList.innerHTML = "";

  if (!cartoes.length) {
    const empty = document.createElement("div");
    empty.className = "cartao-card";
    empty.textContent = SYSTEM_MESSAGES.perfil.empty.noCards;
    cartoesList.appendChild(empty);
    return;
  }

  cartoes.forEach((cartao, index) => {
    const card = document.createElement("div");
    card.className = "cartao-card";

    const info = document.createElement("div");
    info.className = "cartao-info";

    const title = document.createElement("strong");
    const bandeira = cartao.getBandeiraNome?.() || cartao.bandeira?.nome || bandeiraMap.get(cartao.bandeiraId) || "";
    title.textContent = bandeira ? `CARTAO ${index + 1} - ${bandeira}` : `CARTAO ${index + 1}`;
    if (cartao.isPreferencial?.()) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "PREFERENCIAL";
      title.appendChild(badge);
    }
    info.appendChild(title);

    const numero = document.createElement("span");
    numero.textContent = cartao.getNumeroMascarado?.() || mascararNumeroCartao(cartao.numero);
    info.appendChild(numero);

    const nome = document.createElement("span");
    nome.textContent = `Nome: ${cartao.nomeImpresso || ""}`;
    info.appendChild(nome);

    const validade = document.createElement("span");
    validade.textContent = `Validade: ${cartao.getValidadeFormatada?.() || formatValidade(cartao.dataValidade)}`;
    info.appendChild(validade);

    const actions = document.createElement("div");
    actions.className = "cartao-actions";

    if (!cartao.isPreferencial?.()) {
      const btnPreferencial = document.createElement("button");
      btnPreferencial.className = "btn small";
      btnPreferencial.textContent = "DEFINIR PREFERENCIAL";
      btnPreferencial.addEventListener("click", async () => {
        try {
          await definirCartaoPreferencialUsuario(cartao.id);
          await carregarCartoesLista();
        } catch (error) {
          setMessage(getErrorMessage(error, SYSTEM_MESSAGES.perfil.errors.cardPreferentialFailed));
        }
      });
      actions.appendChild(btnPreferencial);
    }

    const btnExcluir = document.createElement("button");
    btnExcluir.className = "btn small";
    btnExcluir.textContent = "EXCLUIR";
    btnExcluir.addEventListener("click", async () => {
      const confirmacao = window.confirm(SYSTEM_MESSAGES.perfil.confirmations.deleteCard);
      if (!confirmacao) {
        return;
      }
      try {
        await inativarCartaoUsuario(cartao.id);
        await carregarCartoesLista();
      } catch (error) {
        setMessage(getErrorMessage(error, SYSTEM_MESSAGES.perfil.errors.cardDeleteFailed));
      }
    });
    actions.appendChild(btnExcluir);

    card.appendChild(info);
    card.appendChild(actions);
    cartoesList.appendChild(card);
  });
}

function carregarCartoesLista() {
  carregarCartoes((dados, error) => {
    if (error) {
      setMessage(error);
      return;
    }
    const lista = dados?.cartoes || [];
    renderCartoes(lista);
  });
}

function carregarCuponsLista() {
  carregarCupons((dados, error) => {
    if (error) {
      setMessage(error);
      return;
    }
    renderCupons(dados?.todos || []);
  });
}

function validarFormulario() {
  const nome = getValue("nome");
  const cpf = getValue("cpf");
  const email = getValue("email");
  const dataNascimento = getValue("dataNascimento");
  const genero = getValue("genero");
  const telefoneTipo = getValue("telefoneTipo");
  const telefoneDdd = getValue("telefoneDdd");
  const telefoneNumero = getValue("telefoneNumero");
  const tipoLogradouro = getValue("tipoLogradouro");
  const tipoResidencia = getValue("tipoResidencia");
  const logradouro = getValue("logradouro");
  const numero = getValue("numero");
  const bairro = getValue("bairro");
  const cep = getValue("cep");
  const cidade = getValue("cidade");
  const estado = getValue("estado");
  const pais = getValue("pais");

  if (!nome || !cpf || !email || !dataNascimento || !genero) {
    return SYSTEM_MESSAGES.perfil.errors.profileRequired;
  }

  if (!cpfRegex.test(cpf)) {
    return SYSTEM_MESSAGES.perfil.errors.cpfInvalid;
  }

  if (!telefoneTipo || !telefoneDdd || !telefoneNumero) {
    return SYSTEM_MESSAGES.perfil.errors.phoneRequired;
  }

  if (
    !tipoLogradouro ||
    !tipoResidencia ||
    !logradouro ||
    !numero ||
    !bairro ||
    !cep ||
    !cidade ||
    !estado ||
    !pais
  ) {
    return SYSTEM_MESSAGES.perfil.errors.addressRequired;
  }

  if (!cepRegex.test(cep)) {
    return SYSTEM_MESSAGES.perfil.errors.cepInvalid;
  }

  return null;
}

async function salvar() {
  const payload = {
    usuario: {
      nome: getValue("nome"),
      genero: getValue("genero"),
      dataNascimento: getValue("dataNascimento")
    },
    telefone: {
      tipoId: getValue("telefoneTipo"),
      ddd: getValue("telefoneDdd"),
      numero: getValue("telefoneNumero")
    },
    endereco: {
      tipoLogradouroId: getValue("tipoLogradouro"),
      tipoResidenciaId: getValue("tipoResidencia"),
      logradouro: getValue("logradouro"),
      numero: getValue("numero"),
      bairro: getValue("bairro"),
      cep: getValue("cep"),
      cidade: getValue("cidade"),
      estado: getValue("estado"),
      pais: getValue("pais"),
      observacoes: getValue("observacoes")
    }
  };

  await salvarDadosPerfil(payload);
}

const cepInput = document.getElementById("cep");
const telefoneDddInput = document.getElementById("telefoneDdd");
const telefoneNumeroInput = document.getElementById("telefoneNumero");
const numeroEnderecoInput = document.getElementById("numero");
const endCepInput = document.getElementById("end-cep");
const endNumeroInput = document.getElementById("end-numero");
const cartaoNumeroInput = document.getElementById("cartao-numero");
const cartaoCvvInput = document.getElementById("cartao-cvv");

cepInput.addEventListener("input", (event) => {
  event.target.value = formatCep(event.target.value);
});

telefoneDddInput.addEventListener("input", (event) => {
  event.target.value = formatPhoneNumber(event.target.value, 2);
});

telefoneNumeroInput.addEventListener("input", (event) => {
  event.target.value = formatPhoneNumber(event.target.value, 9);
});

numeroEnderecoInput.addEventListener("input", (event) => {
  event.target.value = formatPhoneNumber(event.target.value, 8);
});

endCepInput.addEventListener("input", (event) => {
  event.target.value = formatCep(event.target.value);
});

endNumeroInput.addEventListener("input", (event) => {
  event.target.value = formatPhoneNumber(event.target.value, 8);
});

cartaoNumeroInput.addEventListener("input", (event) => {
  event.target.value = formatCardNumber(event.target.value);
});

cartaoCvvInput.addEventListener("input", (event) => {
  event.target.value = formatCvv(event.target.value);
});

editButton.addEventListener("click", async () => {
  setMessage("");
  if (!isEditing) {
    isEditing = true;
    editButton.textContent = "SALVAR";
    setEditable(true);
    return;
  }

  const error = validarFormulario();
  if (error) {
    setMessage(error);
    return;
  }

  editButton.disabled = true;
  editButton.textContent = "SALVANDO...";

  try {
    await salvar();
    setMessage(SYSTEM_MESSAGES.perfil.success.updated);
    isEditing = false;
    setEditable(false);
    editButton.textContent = "EDITAR DADOS";
  } catch (err) {
    setMessage(getErrorMessage(err, SYSTEM_MESSAGES.perfil.errors.updateFailed));
    editButton.textContent = "SALVAR";
  } finally {
    editButton.disabled = false;
  }
});

carregarPerfil((perfil, error) => {
  if (perfil && perfil.nome) {
    perfilButton.textContent = `PERFIL: ${perfil.nome.split(" ")[0].toUpperCase()}`;
  } else if (error) {
    perfilButton.textContent = "PERFIL";
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } finally {
    window.location.href = "../index.html";
  }
});

carrinhoButton.addEventListener("click", () => {
  window.location.href = "./carrinho.html";
});

navDetalhes.addEventListener("click", () => {
  setNavActive("detalhes");
});

navEnderecos.addEventListener("click", () => {
  setNavActive("enderecos");
  fecharEnderecoForm();
  metadataPromise.then(() => carregarEnderecosLista());
});

navCartoes.addEventListener("click", () => {
  setNavActive("cartoes");
  fecharCartaoForm();
  metadataPromise.then(() => {
    carregarCartoesLista();
    carregarCuponsLista();
  });
});

navPedidos.addEventListener("click", () => {
  setNavActive("pedidos");
  carregarPedidosLista();
});

navTrocas.addEventListener("click", () => {
  setNavActive("trocas");
  carregarTrocasLista();
});

btnVoltarPedido.addEventListener("click", () => {
  mostrarListaPedidos();
});

btnSolicitarTroca.addEventListener("click", () => {
  abrirFormularioTroca();
});

btnCancelTroca.addEventListener("click", () => {
  mostrarListaTrocas();
});

btnVoltarTroca.addEventListener("click", () => {
  mostrarListaTrocas();
});

trocaPedidoSelect.addEventListener("change", () => {
  const pedido = pedidosTrocaCache.find((item) => item.id === trocaPedidoSelect.value) || null;
  renderPedidoTrocaSelecionado(pedido);
});

btnSaveTroca.addEventListener("click", async () => {
  setMessage("");
  const payload = getTrocaPayload();
  const error = validarTrocaPayload(payload);
  if (error) {
    setMessage(error);
    return;
  }

  btnSaveTroca.disabled = true;
  btnSaveTroca.textContent = "SOLICITANDO...";

  try {
    await solicitarTrocaUsuario(payload);
    setMessage(SYSTEM_MESSAGES.perfil.success.exchangeRequested);
    carregarTrocasLista();
  } catch (err) {
    setMessage(getErrorMessage(err, SYSTEM_MESSAGES.perfil.errors.exchangeCreateFailed));
  } finally {
    btnSaveTroca.disabled = false;
    btnSaveTroca.textContent = "SOLICITAR";
  }
});

btnAddEndereco.addEventListener("click", () => {
  abrirEnderecoForm();
});

btnCancelEndereco.addEventListener("click", () => {
  fecharEnderecoForm();
});

btnSaveEndereco.addEventListener("click", async () => {
  setMessage("");
  const error = validarEnderecoForm();
  if (error) {
    setMessage(error);
    return;
  }

  btnSaveEndereco.disabled = true;
  btnSaveEndereco.textContent = "SALVANDO...";

  const enderecoPayload = {
    tipoLogradouroId: getEnderecoValue("end-tipoLogradouro"),
    tipoResidenciaId: getEnderecoValue("end-tipoResidencia"),
    logradouro: getEnderecoValue("end-logradouro"),
    numero: getEnderecoValue("end-numero"),
    bairro: getEnderecoValue("end-bairro"),
    cep: getEnderecoValue("end-cep"),
    cidade: getEnderecoValue("end-cidade"),
    estado: getEnderecoValue("end-estado"),
    pais: getEnderecoValue("end-pais"),
    observacoes: getEnderecoValue("end-observacoes")
  };

  const principal = Boolean(getEnderecoValue("end-residencial"));

  try {
    if (enderecoEditId) {
      await atualizarEnderecoUsuario({
        id: enderecoEditId,
        endereco: enderecoPayload,
        principal
      });
    } else {
      await adicionarEndereco({
        endereco: enderecoPayload,
        principal
      });
    }
    fecharEnderecoForm();
    await carregarEnderecosLista();
    carregarDados();
  } catch (err) {
    setMessage(getErrorMessage(err, SYSTEM_MESSAGES.perfil.errors.addressSaveFailed));
  } finally {
    btnSaveEndereco.disabled = false;
    btnSaveEndereco.textContent = "SALVAR";
  }
});

btnAddCartao.addEventListener("click", () => {
  abrirCartaoForm();
});

btnCancelCartao.addEventListener("click", () => {
  fecharCartaoForm();
});

btnSaveCartao.addEventListener("click", async () => {
  setMessage("");
  const error = validarCartaoForm();
  if (error) {
    setMessage(error);
    return;
  }

  btnSaveCartao.disabled = true;
  btnSaveCartao.textContent = "SALVANDO...";

  const payload = {
    cartao: {
      bandeiraId: getCartaoValue("cartao-bandeira"),
      numero: getCartaoValue("cartao-numero"),
      nomeImpresso: getCartaoValue("cartao-nome"),
      codigoSeguranca: getCartaoValue("cartao-cvv"),
      dataValidade: normalizeValidade(getCartaoValue("cartao-validade"))
    }
  };

  try {
    await adicionarCartao(payload);
    fecharCartaoForm();
    carregarCartoesLista();
    carregarCuponsLista();
  } catch (err) {
    setMessage(getErrorMessage(err, SYSTEM_MESSAGES.perfil.errors.cardCreateFailed));
  } finally {
    btnSaveCartao.disabled = false;
    btnSaveCartao.textContent = "SALVAR";
  }
});

setEditable(false);
const metadataPromise = carregarMetadata();
metadataPromise.then(() => carregarDados());
if (window.location.hash === "#pedidos") {
  setNavActive("pedidos");
  carregarPedidosLista();
} else if (window.location.hash === "#trocas") {
  setNavActive("trocas");
  carregarTrocasLista();
}
initCartNotice();
