import { carregarPerfil } from "../../controller/PerfilController.js";
import { carregarProdutosPopulares } from "../../controller/HomeController.js";
import { adicionarAoCarrinho } from "../../controller/CarrinhoController.js";
import { SYSTEM_MESSAGES, getErrorMessage } from "../../model/SystemMessages.js";
import { initCartNotice, refreshCartNotice } from "./cart-notice.js";
import { showToast, toastSuccess, toastWarning } from "./toast.js";

const perfilButton = document.getElementById("perfil-btn");
const carrinhoButton = document.getElementById("btn-carrinho");
const productsList = document.getElementById("productsList");
const searchInput = document.getElementById("home-search");
const categoryButtons = document.querySelectorAll(".cat-btn");

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

function abrirBusca({ q = "", categoria = "" } = {}) {
  const params = new URLSearchParams();
  if (q.trim()) {
    params.set("q", q.trim());
  }
  if (categoria.trim()) {
    params.set("categoria", categoria.trim());
  }
  const query = params.toString();
  window.location.href = `./busca.html${query ? `?${query}` : ""}`;
}

searchInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }
  abrirBusca({ q: searchInput.value });
});

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    abrirBusca({ categoria: button.dataset.category || button.textContent || "" });
  });
});

function formatCurrency(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "R$ 0,00";
  }
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getProdutoImagem(produto) {
  return produto?.getImagemPrincipalUrl?.() || "";
}

function getProdutoMarca(produto) {
  return produto?.getMarcaNome?.() || "-";
}

function getProdutoCategorias(produto) {
  return produto?.getCategoriasTexto?.() || "-";
}

function getProdutoPreco(produto) {
  return Number(produto?.getPreco?.() ?? 0);
}

function renderProdutos(produtos) {
  productsList.innerHTML = "";
  if (!produtos.length) {
    const empty = document.createElement("div");
    empty.className = "product-card empty-card";
    setIconContent(empty, "bi-box", SYSTEM_MESSAGES.produto.empty.noAvailableProducts);
    productsList.appendChild(empty);
    return;
  }

  produtos.forEach((produto) => {
    const card = document.createElement("article");
    card.className = "product-card";

    const imageBox = document.createElement("div");
    imageBox.className = "product-image";
    const imageUrl = getProdutoImagem(produto);
    if (imageUrl) {
      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = produto.nome || "Produto";
      imageBox.appendChild(img);
    } else {
      setIconContent(imageBox, "bi-image", "Imagem indisponivel");
    }

    const details = document.createElement("div");
    details.className = "product-details";
    const nome = document.createElement("strong");
    nome.textContent = produto.nome || "SEM NOME";
    const modelo = createDetailLine("bi-cpu", `Modelo: ${produto.modelo || "-"}`);
    const marca = createDetailLine("bi-award", `Marca: ${getProdutoMarca(produto)}`);
    const categorias = createDetailLine("bi-tags", `Categoria(s): ${getProdutoCategorias(produto)}`);
    details.appendChild(nome);
    details.appendChild(modelo);
    details.appendChild(marca);
    details.appendChild(categorias);

    const actions = document.createElement("div");
    actions.className = "product-actions";
    const priceButton = document.createElement("button");
    priceButton.className = "btn";
    const priceLabel = formatCurrency(getProdutoPreco(produto));
    setIconContent(priceButton, "bi-cash-coin", priceLabel);
    priceButton.dataset.price = priceLabel;
    priceButton.addEventListener("mouseenter", () => {
      setIconContent(priceButton, "bi-cart-plus", "Adicionar");
    });
    priceButton.addEventListener("mouseleave", () => {
      setIconContent(priceButton, "bi-cash-coin", priceButton.dataset.price);
    });
    priceButton.addEventListener("click", async () => {
      if (!produto.codigoProduto) {
        return;
      }
      try {
        const resp = await adicionarAoCarrinho(produto.codigoProduto);
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

    const infoButton = document.createElement("button");
    infoButton.className = "btn";
    setIconContent(infoButton, "bi-info-circle", "Informacoes");
    infoButton.addEventListener("click", () => {
      if (produto.codigoProduto) {
        window.location.href = `./produto.html?codigo=${encodeURIComponent(produto.codigoProduto)}`;
      }
    });

    actions.appendChild(priceButton);
    actions.appendChild(infoButton);

    card.appendChild(imageBox);
    card.appendChild(details);
    card.appendChild(actions);
    productsList.appendChild(card);
  });
}

async function carregarProdutos() {
  try {
    const produtos = await carregarProdutosPopulares();
    renderProdutos(produtos);
  } catch (error) {
    productsList.innerHTML = `<article class="product-card">${getErrorMessage(error, SYSTEM_MESSAGES.produto.errors.loadListFailed)}</article>`;
    showToast({ message: getErrorMessage(error, SYSTEM_MESSAGES.produto.errors.loadListFailed), variant: "danger" });
  }
}

carregarProdutos();
initCartNotice();
