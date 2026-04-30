import { carregarPerfil } from "../../controller/PerfilController.js";
import { carregarProdutoPublico } from "../../controller/HomeController.js";
import { adicionarAoCarrinho } from "../../controller/CarrinhoController.js";
import { SYSTEM_MESSAGES, getErrorMessage } from "../../model/SystemMessages.js";
import { initCartNotice, refreshCartNotice, showCartPopup } from "./cart-notice.js";

const perfilButton = document.getElementById("perfil-btn");
const carrinhoButton = document.getElementById("btn-carrinho");
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

function setMessage(text) {
  messageBox.textContent = text || "";
  messageBox.classList.toggle("hidden", !text);
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
    mainImage.textContent = "IMAGEM";
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
      btn.textContent = "IMG";
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
  addCarrinhoButton.textContent = `${priceLabel} - ADICIONAR AO CARRINHO`;
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
    perfilButton.textContent = `PERFIL: ${perfil.nome.split(" ")[0].toUpperCase()}`;
  } else if (error) {
    perfilButton.textContent = "PERFIL";
  }
});

perfilButton.addEventListener("click", () => {
  window.location.href = "./perfil.html";
});

carrinhoButton.addEventListener("click", () => {
  window.location.href = "./carrinho.html";
});

addCarrinhoButton.addEventListener("click", async () => {
  if (!codigoProdutoAtual) {
    return;
  }
  try {
    const resp = await adicionarAoCarrinho(codigoProdutoAtual);
    if (resp?.warning) {
      showCartPopup({
        title: SYSTEM_MESSAGES.general.warningTitle,
        message: resp.warning,
        actions: [
          {
            label: SYSTEM_MESSAGES.general.close,
            onClick: () => {
              const overlay = document.getElementById("cart-popup");
              if (overlay) overlay.classList.add("hidden");
            }
          }
        ]
      });
    }
    await refreshCartNotice();
  } catch (error) {
    showCartPopup({
      title: SYSTEM_MESSAGES.general.errorTitle,
      message: getErrorMessage(error, SYSTEM_MESSAGES.carrinho.errors.addFailed),
      actions: [
        {
          label: SYSTEM_MESSAGES.general.close,
          onClick: () => {
            const overlay = document.getElementById("cart-popup");
            if (overlay) overlay.classList.add("hidden");
          }
        }
      ]
    });
  }
});

carregarProduto();
initCartNotice();
