import { carregarPerfil } from "../../controller/PerfilController.js";
import { carregarProdutosPopulares } from "../../controller/HomeController.js";
import { adicionarAoCarrinho } from "../../controller/CarrinhoController.js";
import { initCartNotice, refreshCartNotice, showCartPopup } from "./cart-notice.js";

const perfilButton = document.getElementById("perfil-btn");
const carrinhoButton = document.getElementById("btn-carrinho");
const productsList = document.getElementById("productsList");

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
    empty.className = "product-card";
    empty.textContent = "Nenhum produto disponivel.";
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
      imageBox.textContent = "IMAGEM";
    }

    const details = document.createElement("div");
    details.className = "product-details";
    const nome = document.createElement("strong");
    nome.textContent = produto.nome || "SEM NOME";
    const modelo = document.createElement("span");
    modelo.textContent = `Modelo: ${produto.modelo || "-"}`;
    const marca = document.createElement("span");
    marca.textContent = `Marca: ${getProdutoMarca(produto)}`;
    const categorias = document.createElement("span");
    categorias.textContent = `Categoria(s): ${getProdutoCategorias(produto)}`;
    details.appendChild(nome);
    details.appendChild(modelo);
    details.appendChild(marca);
    details.appendChild(categorias);

    const actions = document.createElement("div");
    actions.className = "product-actions";
    const priceButton = document.createElement("button");
    priceButton.className = "btn";
    const priceLabel = formatCurrency(getProdutoPreco(produto));
    priceButton.textContent = priceLabel;
    priceButton.dataset.price = priceLabel;
    priceButton.addEventListener("mouseenter", () => {
      priceButton.textContent = "ADICIONAR AO CARRINHO";
    });
    priceButton.addEventListener("mouseleave", () => {
      priceButton.textContent = priceButton.dataset.price;
    });
    priceButton.addEventListener("click", async () => {
      if (!produto.codigoProduto) {
        return;
      }
      try {
        const resp = await adicionarAoCarrinho(produto.codigoProduto);
        if (resp?.warning) {
          showCartPopup({
            title: "Aviso",
            message: resp.warning,
            actions: [
              {
                label: "Fechar",
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
          title: "Erro",
          message: error?.message || "Erro ao adicionar ao carrinho.",
          actions: [
            {
              label: "Fechar",
              onClick: () => {
                const overlay = document.getElementById("cart-popup");
                if (overlay) overlay.classList.add("hidden");
              }
            }
          ]
        });
      }
    });

    const infoButton = document.createElement("button");
    infoButton.className = "btn";
    infoButton.textContent = "INFORMACOES";
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
    productsList.innerHTML = `<article class="product-card">${error.message}</article>`;
  }
}

carregarProdutos();
initCartNotice();
