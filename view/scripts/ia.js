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
import { initCartNotice, refreshCartNotice } from "./cart-notice.js";
import { showToast, toastSuccess, toastWarning } from "./toast.js";

const perfilButton = document.getElementById("perfil-btn");
const carrinhoButton = document.getElementById("btn-carrinho");
const novaConversaButton = document.getElementById("btn-nova-conversa");
const chatPanel = document.querySelector(".chat-panel");
const chatStatus = document.getElementById("chat-status");
const messagesEl = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const confirmModal = document.getElementById("ia-confirm-modal");
const confirmTitle = document.getElementById("ia-confirm-title");
const confirmMessage = document.getElementById("ia-confirm-message");
const confirmClose = document.getElementById("ia-confirm-close");
const confirmCancel = document.getElementById("ia-confirm-cancel");
const confirmOk = document.getElementById("ia-confirm-ok");

let produtosCatalogo = [];
let produtosPorCodigo = new Map();
let confirmResolver = null;
let confirmPreviousFocus = null;

function setIconContent(element, iconClass, label) {
  const icon = document.createElement("i");
  icon.className = `bi ${iconClass}`;
  icon.setAttribute("aria-hidden", "true");
  const text = document.createElement("span");
  text.textContent = label;
  element.replaceChildren(icon, text);
}

function createDetailLine(iconClass, textValue) {
  const line = document.createElement("span");
  line.className = "detail-line";
  const icon = document.createElement("i");
  icon.className = `bi ${iconClass}`;
  icon.setAttribute("aria-hidden", "true");
  const text = document.createElement("span");
  text.textContent = textValue;
  line.appendChild(icon);
  line.appendChild(text);
  return line;
}

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
  chatStatus.innerHTML = "";
  if (text) {
    setIconContent(chatStatus, "bi-info-circle", text);
    showToast({ message: text });
  }
  chatStatus.classList.toggle("hidden", !text);
}

function closeConfirmModal(confirmed) {
  confirmModal.classList.add("hidden");
  const resolver = confirmResolver;
  confirmResolver = null;
  if (confirmPreviousFocus?.focus) {
    confirmPreviousFocus.focus();
  }
  confirmPreviousFocus = null;
  resolver?.(confirmed);
}

function openConfirmModal({ title, message, confirmLabel }) {
  setIconContent(confirmTitle, "bi-exclamation-triangle", title);
  confirmMessage.textContent = message;
  setIconContent(confirmCancel, "bi-x-circle", "Cancelar");
  setIconContent(confirmOk, "bi-arrow-clockwise", confirmLabel);
  confirmPreviousFocus = document.activeElement;
  confirmModal.classList.remove("hidden");
  confirmOk.focus();

  return new Promise((resolve) => {
    confirmResolver = resolve;
  });
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

async function addProdutoCarrinho(codigoProduto, button) {
  if (!codigoProduto) {
    return;
  }

  const label = button.dataset.label || button.textContent;
  button.disabled = true;
  setIconContent(button, "bi-hourglass-split", "Inserindo...");
  try {
    const resp = await adicionarAoCarrinho(codigoProduto);
    if (resp?.warning) {
      toastWarning(resp.warning);
    } else {
      toastSuccess("Produto inserido no carrinho.");
    }
    await refreshCartNotice();
  } catch (error) {
    showToast({ message: getErrorMessage(error, SYSTEM_MESSAGES.carrinho.errors.addFailed), variant: "danger" });
  } finally {
    button.disabled = false;
    setIconContent(button, "bi-cart-plus", label);
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
    setIconContent(imageBox, "bi-image", "Imagem indisponivel");
  }

  const info = document.createElement("div");
  info.className = "ia-product-info";
  const title = document.createElement("strong");
  title.textContent = produto.nome || "Produto";
  const modelo = createDetailLine("bi-cpu", `Modelo: ${produto.modelo || "-"}`);
  const marca = createDetailLine("bi-award", `Marca: ${getProdutoMarca(produto)}`);
  const categorias = createDetailLine("bi-tags", `Categoria(s): ${getProdutoCategorias(produto)}`);
  const preco = createDetailLine("bi-cash-coin", `Preco: ${formatCurrency(getProdutoPreco(produto))}`);

  const actions = document.createElement("div");
  actions.className = "ia-product-actions";
  const abrir = document.createElement("a");
  abrir.href = produtoLink(produto.codigoProduto);
  abrir.target = "_blank";
  abrir.rel = "noopener noreferrer";
  setIconContent(abrir, "bi-box-arrow-up-right", "Abrir produto");
  const add = document.createElement("button");
  add.type = "button";
  add.dataset.label = "Inserir no carrinho";
  setIconContent(add, "bi-cart-plus", "Inserir no carrinho");
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
      setIconContent(perfilButton, "bi-person-circle", `Perfil: ${perfil.nome.split(" ")[0]}`);
    } else if (error) {
      setIconContent(perfilButton, "bi-person-circle", "Perfil");
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
  openConfirmModal({
    title: "Iniciar nova conversa",
    message: SYSTEM_MESSAGES.ia.warnings.newConversation,
    confirmLabel: "Iniciar nova conversa"
  }).then((confirmed) => {
    if (!confirmed) {
      return;
    }
    iniciarNovaConversaGamzu();
    syncBlockedState(false);
    renderMessages([]);
    chatInput.focus();
  });
});

confirmClose.addEventListener("click", () => closeConfirmModal(false));
confirmCancel.addEventListener("click", () => closeConfirmModal(false));
confirmOk.addEventListener("click", () => closeConfirmModal(true));

confirmModal.addEventListener("click", (event) => {
  if (event.target === confirmModal) {
    closeConfirmModal(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || confirmModal.classList.contains("hidden")) {
    return;
  }
  closeConfirmModal(false);
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const texto = chatInput.value.trim();
  if (!texto || conversaGamzuBloqueada()) {
    return;
  }

  chatInput.value = "";
  chatSend.disabled = true;
  setIconContent(chatSend, "bi-hourglass-split", "Enviando...");
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
    setIconContent(chatSend, "bi-send", "Enviar");
    if (!conversaGamzuBloqueada()) {
      chatInput.focus();
    }
  }
});

inicializar();
