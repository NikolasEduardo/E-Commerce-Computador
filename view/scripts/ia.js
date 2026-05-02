import { carregarPerfil } from "../../controller/PerfilController.js";
import {
  aguardarUsuarioGamzu,
  carregarCatalogoProdutosGamzu,
  carregarConversaGamzu,
  conversaGamzuBloqueada,
  enviarTextoParaGamzu,
  iniciarNovaConversaGamzu
} from "../../controller/GamzuController.js";
import { adicionarAoCarrinho } from "../../controller/CarrinhoController.js";
import { SYSTEM_MESSAGES, getErrorMessage } from "../../model/SystemMessages.js";
import { initCartNotice, refreshCartNotice, showCartPopup } from "./cart-notice.js";

const perfilButton = document.getElementById("perfil-btn");
const carrinhoButton = document.getElementById("btn-carrinho");
const novaConversaButton = document.getElementById("btn-nova-conversa");
const chatPanel = document.querySelector(".chat-panel");
const chatStatus = document.getElementById("chat-status");
const messagesEl = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");

let produtosCatalogo = [];
let produtosPorCodigo = new Map();

function formatCurrency(value) {
  const numero = Number(value || 0);
  if (!Number.isFinite(numero) || numero <= 0) {
    return "R$ 0,00";
  }
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function produtoLink(codigoProduto) {
  return new URL(`./produto.html?codigo=${encodeURIComponent(codigoProduto)}`, window.location.href).href;
}

function getProdutoImagem(produto) {
  return produto?.getImagemPrincipalUrl?.() || produto?.imagem || "";
}

function getProdutoMarca(produto) {
  return produto?.getMarcaNome?.() || "-";
}

function getProdutoCategorias(produto) {
  return produto?.getCategoriasTexto?.() || "-";
}

function getProdutoPreco(produto) {
  return Number(produto?.getPreco?.() ?? produto?.preco ?? 0);
}

function setStatus(text = "") {
  chatStatus.textContent = text;
  chatStatus.classList.toggle("hidden", !text);
}

function syncBlockedState(blocked) {
  chatPanel.classList.toggle("is-blocked", blocked);
  chatInput.disabled = blocked;
  chatSend.disabled = blocked;
  if (blocked) {
    setStatus(SYSTEM_MESSAGES.ia.warnings.violationClosed);
  } else {
    setStatus("");
  }
}

function appendTextWithLinks(container, text) {
  const regex = /(https?:\/\/[^\s)]+)/g;
  const parts = `${text || ""}`.split(regex);
  parts.forEach((part) => {
    if (!part) {
      return;
    }
    if (/^https?:\/\//i.test(part)) {
      const link = document.createElement("a");
      link.href = part;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = part;
      container.appendChild(link);
      return;
    }
    container.appendChild(document.createTextNode(part));
  });
}

function closePopup() {
  const overlay = document.getElementById("cart-popup");
  if (overlay) {
    overlay.classList.add("hidden");
  }
}

async function addProdutoCarrinho(codigoProduto, button) {
  if (!codigoProduto) {
    return;
  }

  const label = button.textContent;
  button.disabled = true;
  button.textContent = "INSERINDO...";
  try {
    const resp = await adicionarAoCarrinho(codigoProduto);
    showCartPopup({
      title: resp?.warning ? SYSTEM_MESSAGES.general.warningTitle : "Carrinho",
      message: resp?.warning || "Produto inserido no carrinho.",
      actions: [{ label: SYSTEM_MESSAGES.general.close, onClick: closePopup }]
    });
    await refreshCartNotice();
  } catch (error) {
    showCartPopup({
      title: SYSTEM_MESSAGES.general.errorTitle,
      message: getErrorMessage(error, SYSTEM_MESSAGES.carrinho.errors.addFailed),
      actions: [{ label: SYSTEM_MESSAGES.general.close, onClick: closePopup }]
    });
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
}

function renderProductCard(produto) {
  const card = document.createElement("article");
  card.className = "ia-product-card";

  const imageBox = document.createElement("div");
  imageBox.className = "ia-product-image";
  const imageUrl = getProdutoImagem(produto);
  if (imageUrl) {
    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = produto.nome || "Produto";
    imageBox.appendChild(img);
  } else {
    imageBox.textContent = "IMAGEM";
  }

  const info = document.createElement("div");
  info.className = "ia-product-info";
  const title = document.createElement("strong");
  title.textContent = produto.nome || "Produto";
  const modelo = document.createElement("span");
  modelo.textContent = `Modelo: ${produto.modelo || "-"}`;
  const marca = document.createElement("span");
  marca.textContent = `Marca: ${getProdutoMarca(produto)}`;
  const categorias = document.createElement("span");
  categorias.textContent = `Categoria(s): ${getProdutoCategorias(produto)}`;
  const preco = document.createElement("span");
  preco.textContent = `Preco: ${formatCurrency(getProdutoPreco(produto))}`;

  const actions = document.createElement("div");
  actions.className = "ia-product-actions";
  const abrir = document.createElement("a");
  abrir.href = produtoLink(produto.codigoProduto);
  abrir.target = "_blank";
  abrir.rel = "noopener noreferrer";
  abrir.textContent = "ABRIR PRODUTO";
  const add = document.createElement("button");
  add.type = "button";
  add.textContent = "INSERIR NO CARRINHO";
  add.addEventListener("click", () => addProdutoCarrinho(produto.codigoProduto, add));

  actions.appendChild(abrir);
  actions.appendChild(add);
  info.appendChild(title);
  info.appendChild(modelo);
  info.appendChild(marca);
  info.appendChild(categorias);
  info.appendChild(preco);
  info.appendChild(actions);
  card.appendChild(imageBox);
  card.appendChild(info);
  return card;
}

function renderMessage(message) {
  const wrapper = document.createElement("article");
  wrapper.className = `message ${message.role === "user" ? "user" : "assistant"}`;

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  appendTextWithLinks(bubble, message.text);
  wrapper.appendChild(bubble);

  if (message.role === "assistant") {
    const codes = [...new Set(message.productCodes || [])];
    const produtos = codes.map((codigo) => produtosPorCodigo.get(`${codigo}`.toUpperCase())).filter(Boolean);
    if (produtos.length) {
      const cards = document.createElement("div");
      cards.className = "product-cards";
      produtos.forEach((produto) => cards.appendChild(renderProductCard(produto)));
      wrapper.appendChild(cards);
    }
  }

  messagesEl.appendChild(wrapper);
}

function renderMessages(messages) {
  messagesEl.innerHTML = "";
  if (!messages.length) {
    renderMessage({
      role: "assistant",
      text: SYSTEM_MESSAGES.ia.empty.noMessages,
      productCodes: []
    });
  } else {
    messages.forEach(renderMessage);
  }
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function carregarCatalogo() {
  produtosCatalogo = await carregarCatalogoProdutosGamzu();
  produtosPorCodigo = new Map(
    produtosCatalogo
      .filter((produto) => produto?.codigoProduto)
      .map((produto) => [produto.codigoProduto.toUpperCase(), produto])
  );
}

async function inicializar() {
  try {
    await aguardarUsuarioGamzu();
  } catch (error) {
    renderMessages([]);
    chatPanel.classList.add("is-blocked");
    chatInput.disabled = true;
    chatSend.disabled = true;
    setStatus(getErrorMessage(error, SYSTEM_MESSAGES.general.unauthenticated));
    return;
  }

  carregarPerfil((perfil, error) => {
    if (perfil && perfil.nome) {
      perfilButton.textContent = `PERFIL: ${perfil.nome.split(" ")[0].toUpperCase()}`;
    } else if (error) {
      perfilButton.textContent = "PERFIL";
    }
  });

  try {
    await carregarCatalogo();
  } catch (error) {
    setStatus(getErrorMessage(error, SYSTEM_MESSAGES.ia.errors.loadCatalogFailed));
  }

  renderMessages(carregarConversaGamzu());
  syncBlockedState(conversaGamzuBloqueada());
  initCartNotice();
}

perfilButton.addEventListener("click", () => {
  window.location.href = "./perfil.html";
});

carrinhoButton.addEventListener("click", () => {
  window.location.href = "./carrinho.html";
});

novaConversaButton.addEventListener("click", () => {
  if (!window.confirm(SYSTEM_MESSAGES.ia.warnings.newConversation)) {
    return;
  }
  iniciarNovaConversaGamzu();
  syncBlockedState(false);
  renderMessages([]);
  chatInput.focus();
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const texto = chatInput.value.trim();
  if (!texto || conversaGamzuBloqueada()) {
    return;
  }

  chatInput.value = "";
  chatSend.disabled = true;
  chatSend.textContent = "ENVIANDO...";
  setStatus("");

  const pending = [
    ...carregarConversaGamzu(),
    {
      role: "user",
      text: texto,
      productCodes: []
    },
    {
      role: "assistant",
      text: "Gamzu esta pensando...",
      productCodes: []
    }
  ];
  renderMessages(pending);

  try {
    const result = await enviarTextoParaGamzu(texto);
    renderMessages(result.messages || carregarConversaGamzu());
    syncBlockedState(Boolean(result.blocked));
  } catch (error) {
    setStatus(getErrorMessage(error, SYSTEM_MESSAGES.ia.errors.sendFailed));
    renderMessages(carregarConversaGamzu());
  } finally {
    chatSend.disabled = conversaGamzuBloqueada();
    chatSend.textContent = "ENVIAR";
    if (!conversaGamzuBloqueada()) {
      chatInput.focus();
    }
  }
});

inicializar();
