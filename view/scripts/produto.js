import { carregarPerfil } from "../../controller/PerfilController.js";
import { carregarProdutoPublico } from "../../controller/HomeController.js";
import { adicionarAoCarrinho } from "../../controller/CarrinhoController.js";
import { SYSTEM_MESSAGES, getErrorMessage } from "../../model/SystemMessages.js";
import { initCartNotice, refreshCartNotice } from "./cart-notice.js";
import { showToast, toastSuccess, toastWarning } from "./toast.js";

const perfilButton = document.getElementById("perfil-btn");
const carrinhoButton = document.getElementById("btn-carrinho");
const searchInput = document.getElementById("produto-search");
const messageBox = document.getElementById("produto-message");
const mainImage = document.getElementById("main-image");
const thumbs = document.getElementById("thumbs");
const nomeEl = document.getElementById("produto-nome");
const modeloEl = document.getElementById("produto-modelo");
const marcaEl = document.getElementById("produto-marca");
const categoriasEl = document.getElementById("produto-categorias");
const descricaoEl = document.getElementById("produto-descricao");
const especificacoesEl = document.getElementById("produto-especificacoes");
const addCarrinhoButton = document.getElementById("btn-add-carrinho");
let codigoProdutoAtual = "";

function setIconContent(element, iconClass, label) {
  const icon = document.createElement("i");
  icon.className = `bi ${iconClass}`;
  icon.setAttribute("aria-hidden", "true");
  const text = document.createElement("span");
  text.textContent = label;
  element.replaceChildren(icon, text);
}

function setMessage(text) {
  messageBox.textContent = text || "";
  messageBox.classList.toggle("hidden", !text);
  if (text) {
    showToast({ message: text });
  }
}

function formatCurrency(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "R$ 0,00";
  }
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getProdutoMarca(produto) {
  return produto?.getMarcaNome?.() || "-";
}

function getProdutoCategorias(produto) {
  return produto?.getCategoriasTexto?.() || "-";
}

function getProdutoImagens(produto) {
  return produto?.getImagensOrdenadas?.() || [];
}

function getProdutoPreco(produto) {
  return Number(produto?.getPreco?.() ?? 0);
}

function setMainImage(url) {
  mainImage.innerHTML = "";
  if (!url) {
    setIconContent(mainImage, "bi-image", "Imagem do produto");
    return;
  }
  const img = document.createElement("img");
  img.src = url;
  img.alt = "Imagem do produto";
  mainImage.appendChild(img);
}

function renderThumbs(imagens) {
  thumbs.innerHTML = "";
  imagens.forEach((imagem, index) => {
    const imageUrl = imagem?.url || imagem?.urlImagem || "";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "thumb-button";
    if (index === 0) {
      btn.classList.add("is-active");
    }

    if (imageUrl) {
      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = "Miniatura";
      btn.appendChild(img);
    } else {
      setIconContent(btn, "bi-image", "IMG");
    }

    btn.addEventListener("click", () => {
      setMainImage(imageUrl);
      Array.from(thumbs.children).forEach((child) => child.classList.remove("is-active"));
      btn.classList.add("is-active");
    });

    thumbs.appendChild(btn);
  });
}

function renderProduto(produto) {
  if (!produto) {
    setMessage(SYSTEM_MESSAGES.produto.errors.notFound);
    return;
  }

  codigoProdutoAtual = produto.codigoProduto || "";
  nomeEl.textContent = produto.nome || "SEM NOME";
  modeloEl.textContent = `Modelo: ${produto.modelo || "-"}`;
  marcaEl.textContent = `Marca: ${getProdutoMarca(produto)}`;
  categoriasEl.textContent = `Categorias: ${getProdutoCategorias(produto)}`;
  descricaoEl.textContent = produto.descricaoTecnica || "-";
  especificacoesEl.textContent = produto.especificacoesTecnicas || "-";

  const imagens = getProdutoImagens(produto);

  if (imagens.length) {
    setMainImage(imagens[0].url || imagens[0].urlImagem || "");
  } else {
    setMainImage("");
  }
  renderThumbs(imagens);

  const priceLabel = formatCurrency(getProdutoPreco(produto));
  setIconContent(addCarrinhoButton, "bi-cart-plus", `${priceLabel} - Adicionar ao carrinho`);
}

async function carregarProduto() {
  const params = new URLSearchParams(window.location.search);
  const codigo = params.get("codigo");
  if (!codigo) {
    setMessage(SYSTEM_MESSAGES.produto.errors.codeMissing);
    return;
  }

  try {
    const produto = await carregarProdutoPublico(codigo);
    renderProduto(produto);
  } catch (error) {
    setMessage(getErrorMessage(error, SYSTEM_MESSAGES.produto.errors.loadFailed));
  }
}

carregarPerfil((perfil, error) => {
  if (perfil && perfil.nome) {
    setIconContent(perfilButton, "bi-person-circle", `Perfil: ${perfil.nome.split(" ")[0]}`);
  } else if (error) {
    setIconContent(perfilButton, "bi-person-circle", "Perfil");
  }
});

perfilButton.addEventListener("click", () => {
  window.location.href = "./perfil.html";
});

carrinhoButton.addEventListener("click", () => {
  window.location.href = "./carrinho.html";
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  const params = new URLSearchParams();
  const q = searchInput.value.trim();
  if (q) {
    params.set("q", q);
  }
  const query = params.toString();
  window.location.href = `./busca.html${query ? `?${query}` : ""}`;
});

addCarrinhoButton.addEventListener("click", async () => {
  if (!codigoProdutoAtual) {
    return;
  }
  try {
    const resp = await adicionarAoCarrinho(codigoProdutoAtual);
    if (resp?.warning) {
      toastWarning(resp.warning);
    } else {
      toastSuccess("Produto inserido no carrinho.");
    }
    await refreshCartNotice();
  } catch (error) {
    showToast({ message: getErrorMessage(error, SYSTEM_MESSAGES.carrinho.errors.addFailed), variant: "danger" });
  }
});

carregarProduto();
initCartNotice();
