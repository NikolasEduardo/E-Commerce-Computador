import { carregarPerfil } from "../../controller/PerfilController.js";
import {
  carregarCarrinho,
  atualizarQuantidadeItem,
  removerItem
} from "../../controller/CarrinhoController.js";
import { initCartNotice, refreshCartNotice, showCartPopup } from "./cart-notice.js";

const perfilButton = document.getElementById("perfil-btn");
const carrinhoButton = document.getElementById("btn-carrinho");
const itemsList = document.getElementById("cart-items-list");
const summaryDetails = document.getElementById("cart-summary-details");
const btnContinuar = document.getElementById("btn-continuar");
const btnFinalizar = document.getElementById("btn-finalizar");

function formatCurrency(value) {
  if (!Number.isFinite(value)) {
    return "R$ 0,00";
  }
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function renderSummary(valorTotal) {
  summaryDetails.innerHTML = `
    <div>Total: ${formatCurrency(Number(valorTotal || 0))}</div>
  `;
}

function showWarning(message) {
  showCartPopup({
    title: "Aviso",
    message,
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

function renderItems(itens) {
  itemsList.innerHTML = "";
  if (!itens.length) {
    const empty = document.createElement("div");
    empty.className = "cart-item";
    empty.textContent = "Nenhum produto no carrinho.";
    itemsList.appendChild(empty);
    return;
  }

  itens.forEach((item) => {
    const card = document.createElement("div");
    card.className = "cart-item";
    if (Number(item.quantidade) === 0) {
      card.classList.add("is-zero");
    }

    const imageBox = document.createElement("div");
    imageBox.className = "cart-item-image";
    if (item.imagem) {
      const img = document.createElement("img");
      img.src = item.imagem;
      img.alt = item.nome || "Produto";
      imageBox.appendChild(img);
    } else {
      imageBox.textContent = "IMAGEM";
    }

    const details = document.createElement("div");
    details.className = "cart-item-details";
    const title = document.createElement("strong");
    title.textContent = item.nome || "SEM NOME";
    const modelo = document.createElement("span");
    modelo.textContent = item.modelo ? `Modelo: ${item.modelo}` : "Modelo: -";
    const precoUnit = document.createElement("span");
    precoUnit.textContent = `Preco p/unidade: ${formatCurrency(Number(item.precoUnitario || 0))}`;
    const precoTotal = document.createElement("span");
    precoTotal.textContent = `Preco total: ${formatCurrency(Number(item.precoTotal || 0))}`;

    const actions = document.createElement("div");
    actions.className = "cart-item-actions";
    const btnRemover = document.createElement("button");
    btnRemover.textContent = "RETIRAR";
    btnRemover.addEventListener("click", async () => {
      try {
        await removerItem(item.codigoProduto);
        await carregarCarrinhoPagina();
        await refreshCartNotice();
      } catch (error) {
        showWarning(error?.message || "Erro ao remover item.");
      }
    });

    const btnMinus = document.createElement("button");
    btnMinus.textContent = "-";
    btnMinus.addEventListener("click", async () => {
      const novaQtd = Math.max(Number(item.quantidade || 0) - 1, 0);
      try {
        const resp = await atualizarQuantidadeItem(item.codigoProduto, novaQtd);
        if (resp?.warning) {
          showWarning(resp.warning);
        }
        await carregarCarrinhoPagina();
        await refreshCartNotice();
      } catch (error) {
        showWarning(error?.message || "Erro ao atualizar quantidade.");
      }
    });

    const qty = document.createElement("input");
    qty.className = "qty";
    qty.type = "text";
    qty.inputMode = "numeric";
    qty.pattern = "\\d*";
    qty.value = item.quantidade ?? 0;

    const commitQuantidade = async () => {
      const raw = `${qty.value || ""}`.trim();
      const parsed = raw === "" ? 0 : Number(raw);
      const novaQtd = Math.min(Math.max(Number.isFinite(parsed) ? parsed : 0, 0), 99);
      if (novaQtd === Number(item.quantidade || 0)) {
        qty.value = novaQtd;
        return;
      }
      try {
        const resp = await atualizarQuantidadeItem(item.codigoProduto, novaQtd);
        if (resp?.warning) {
          showWarning(resp.warning);
        }
        await carregarCarrinhoPagina();
        await refreshCartNotice();
      } catch (error) {
        showWarning(error?.message || "Erro ao atualizar quantidade.");
        qty.value = item.quantidade ?? 0;
      }
    };

    qty.addEventListener("input", () => {
      const cleaned = qty.value.replace(/\D/g, "").slice(0, 2);
      qty.value = cleaned;
    });

    qty.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commitQuantidade();
      }
    });

    qty.addEventListener("blur", () => {
      commitQuantidade();
    });

    const btnPlus = document.createElement("button");
    btnPlus.textContent = "+";
    btnPlus.addEventListener("click", async () => {
      const novaQtd = Math.min(Number(item.quantidade || 0) + 1, 99);
      try {
        const resp = await atualizarQuantidadeItem(item.codigoProduto, novaQtd);
        if (resp?.warning) {
          showWarning(resp.warning);
        }
        await carregarCarrinhoPagina();
        await refreshCartNotice();
      } catch (error) {
        showWarning(error?.message || "Erro ao atualizar quantidade.");
      }
    });

    actions.appendChild(btnRemover);
    actions.appendChild(btnMinus);
    actions.appendChild(qty);
    actions.appendChild(btnPlus);

    details.appendChild(title);
    details.appendChild(modelo);
    details.appendChild(precoUnit);
    details.appendChild(precoTotal);
    details.appendChild(actions);

    card.appendChild(imageBox);
    card.appendChild(details);
    itemsList.appendChild(card);
  });
}

async function carregarCarrinhoPagina() {
  const carrinho = await carregarCarrinho();
  renderItems(carrinho?.itens || []);
  renderSummary(carrinho?.valorTotal || 0);
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

btnContinuar.addEventListener("click", () => {
  window.location.href = "./home.html";
});

btnFinalizar.addEventListener("click", () => {
  window.location.href = "./finalizar.html";
});

window.addEventListener("cart-updated", () => {
  carregarCarrinhoPagina().catch((error) => {
    renderItems([]);
    showWarning(error?.message || "Erro ao carregar carrinho.");
  });
});

carregarCarrinhoPagina().catch((error) => {
  renderItems([]);
  showWarning(error?.message || "Erro ao carregar carrinho.");
});

initCartNotice();
