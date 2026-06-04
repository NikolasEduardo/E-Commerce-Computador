import { adicionarAoCarrinho } from "../../controller/CarrinhoController.js";
import { carregarProdutosBusca } from "../../controller/HomeController.js";
import { carregarPerfil } from "../../controller/PerfilController.js";
import { SYSTEM_MESSAGES, getErrorMessage } from "../../model/SystemMessages.js";
import { initCartNotice, refreshCartNotice } from "./cart-notice.js";
import { showToast, toastSuccess, toastWarning } from "./toast.js";

const MAIN_CATEGORIES = [
  "PLACA DE VIDEO",
  "PROCESSADOR",
  "PLACA-MAE",
  "MEMORIA RAM",
  "ARMAZENAMENTO",
  "FONTE"
];

const perfilButton = document.getElementById("perfil-btn");
const carrinhoButton = document.getElementById("btn-carrinho");
const searchInput = document.getElementById("busca-input");
const resultadosList = document.getElementById("resultados-list");
const mainCategoriesBox = document.getElementById("main-categories");
const otherCategoriesBox = document.getElementById("other-categories");
const marcaFilter = document.getElementById("marca-filter");
const precoMinInput = document.getElementById("preco-min");
const precoMaxInput = document.getElementById("preco-max");
const applyPriceButton = document.getElementById("apply-price");
const clearFiltersButton = document.getElementById("clear-filters");
const sortButtons = document.querySelectorAll(".sort-button");

const state = {
  q: "",
  categorias: new Set(),
  marca: "",
  precoMin: "",
  precoMax: "",
  sortField: "",
  sortDirection: ""
};

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

function normalizeText(value) {
  return `${value || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function getCategoriaKey(nome) {
  const key = normalizeText(nome).replace(/[^A-Z0-9]/g, "");
  return key === "FONTES" ? "FONTE" : key;
}

function getMainCategoryKeySet() {
  return new Set(MAIN_CATEGORIES.map(getCategoriaKey));
}

function categoriaSelecionada(nome) {
  const key = getCategoriaKey(nome);
  return Array.from(state.categorias).some((categoria) => getCategoriaKey(categoria) === key);
}

function removerCategoria(nome) {
  const key = getCategoriaKey(nome);
  Array.from(state.categorias).forEach((categoria) => {
    if (getCategoriaKey(categoria) === key) {
      state.categorias.delete(categoria);
    }
  });
}

function setCategoriaSelecionada(nome, selected) {
  removerCategoria(nome);
  if (selected) {
    state.categorias.add(nome);
  }
}

function parseUrlState() {
  const params = new URLSearchParams(window.location.search);
  state.q = params.get("q") || "";
  state.marca = params.get("marca") || "";
  state.precoMin = params.get("precoMin") || "";
  state.precoMax = params.get("precoMax") || "";
  state.sortField = params.get("sortField") || "";
  state.sortDirection = params.get("sortDirection") || "";
  if (!["down", "up"].includes(state.sortDirection)) {
    state.sortDirection = "";
  }
  if (!["popularidade", "preco", "nome"].includes(state.sortField)) {
    state.sortField = "";
    state.sortDirection = "";
  }

  const categorias = [
    ...params.getAll("categoria"),
    ...params.getAll("categorias")
  ]
    .flatMap((item) => `${item || ""}`.split(","))
    .map((item) => item.trim())
    .filter(Boolean);

  categorias.forEach((categoria) => state.categorias.add(categoria));
  searchInput.value = state.q;
  precoMinInput.value = state.precoMin;
  precoMaxInput.value = state.precoMax;
}

function updateUrl() {
  const params = new URLSearchParams();
  if (state.q) {
    params.set("q", state.q);
  }
  if (state.categorias.size) {
    params.set("categorias", Array.from(state.categorias).join(","));
  }
  if (state.marca) {
    params.set("marca", state.marca);
  }
  if (state.precoMin) {
    params.set("precoMin", state.precoMin);
  }
  if (state.precoMax) {
    params.set("precoMax", state.precoMax);
  }
  if (state.sortField && state.sortDirection) {
    params.set("sortField", state.sortField);
    params.set("sortDirection", state.sortDirection);
  }

  const query = params.toString();
  window.history.replaceState({}, "", `./busca.html${query ? `?${query}` : ""}`);
}

function getSortOrder() {
  if (!state.sortField || !state.sortDirection) {
    return "";
  }

  if (state.sortField === "nome") {
    return state.sortDirection === "down" ? "ASC" : "DESC";
  }

  return state.sortDirection === "down" ? "DESC" : "ASC";
}

function buildFiltros() {
  return {
    q: state.q,
    categorias: Array.from(state.categorias).join(","),
    marca: state.marca,
    precoMin: state.precoMin,
    precoMax: state.precoMax,
    sortField: state.sortField,
    sortOrder: getSortOrder()
  };
}

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

function renderSortButtons() {
  sortButtons.forEach((button) => {
    const field = button.dataset.sortField || "";
    const label = button.dataset.label || button.dataset.baseLabel || button.textContent.trim();
    button.dataset.baseLabel = label;
    const active = state.sortField === field && state.sortDirection;
    button.classList.toggle("is-active", Boolean(active));
    button.setAttribute("aria-pressed", active ? "true" : "false");
    const iconClass = active
      ? (state.sortDirection === "down" ? "bi-sort-down" : "bi-sort-up")
      : (button.dataset.icon || "bi-arrow-down-up");
    setIconContent(button, iconClass, label);
  });
}

function renderCategoriaOption(container, nome) {
  const label = document.createElement("label");
  label.className = "filter-option";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "form-check-input";
  input.checked = categoriaSelecionada(nome);
  input.addEventListener("change", async () => {
    setCategoriaSelecionada(nome, input.checked);
    updateUrl();
    await carregarResultados();
  });

  const span = document.createElement("span");
  span.textContent = nome;

  label.appendChild(input);
  label.appendChild(span);
  container.appendChild(label);
}

function renderCategorias(categoriasPrincipais = [], categorias = []) {
  const principais = categoriasPrincipais.length ? categoriasPrincipais : MAIN_CATEGORIES;
  const mainKeys = getMainCategoryKeySet();
  const otherCategorias = [...categorias];

  Array.from(state.categorias).forEach((categoria) => {
    const key = getCategoriaKey(categoria);
    const jaExiste = otherCategorias.some((item) => getCategoriaKey(item) === key);
    if (!mainKeys.has(key) && !jaExiste) {
      otherCategorias.push(categoria);
    }
  });

  mainCategoriesBox.innerHTML = "";
  principais.forEach((categoria) => renderCategoriaOption(mainCategoriesBox, categoria));

  otherCategoriesBox.innerHTML = "";
  if (!otherCategorias.length) {
    const empty = document.createElement("span");
    empty.className = "filter-option";
    empty.textContent = "Nenhuma categoria extra.";
    otherCategoriesBox.appendChild(empty);
    return;
  }

  otherCategorias.forEach((categoria) => renderCategoriaOption(otherCategoriesBox, categoria));
}

function renderMarcaOptions(marcas = []) {
  marcaFilter.innerHTML = '<option value="">Todas</option>';
  const marcasVisiveis = state.marca && !marcas.includes(state.marca)
    ? [...marcas, state.marca]
    : marcas;
  marcasVisiveis.forEach((marca) => {
    const option = document.createElement("option");
    option.value = marca;
    option.textContent = marca;
    marcaFilter.appendChild(option);
  });
  marcaFilter.value = state.marca;
}

function renderFiltros(metadata) {
  renderCategorias(metadata?.categoriasPrincipais || [], metadata?.categorias || []);
  renderMarcaOptions(metadata?.marcas || []);
  precoMinInput.value = state.precoMin;
  precoMaxInput.value = state.precoMax;
  renderSortButtons();
}

function renderProdutos(produtos) {
  resultadosList.innerHTML = "";
  if (!produtos.length) {
    const empty = document.createElement("div");
    empty.className = "empty-results";
    setIconContent(empty, "bi-search", SYSTEM_MESSAGES.produto.empty.noProducts);
    resultadosList.appendChild(empty);
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
    setIconContent(infoButton, "bi-info-circle", "Info");
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
    resultadosList.appendChild(card);
  });
}

async function carregarResultados() {
  try {
    const resultado = await carregarProdutosBusca(buildFiltros());
    renderFiltros(resultado);
    renderProdutos(resultado.produtos || []);
  } catch (error) {
    resultadosList.innerHTML = "";
    const empty = document.createElement("div");
    empty.className = "empty-results";
    setIconContent(empty, "bi-exclamation-triangle", getErrorMessage(error, SYSTEM_MESSAGES.produto.errors.loadListFailed));
    resultadosList.appendChild(empty);
    showToast({ message: getErrorMessage(error, SYSTEM_MESSAGES.produto.errors.loadListFailed), variant: "danger" });
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

searchInput.addEventListener("keydown", async (event) => {
  if (event.key !== "Enter") {
    return;
  }

  state.q = searchInput.value.trim();
  updateUrl();
  await carregarResultados();
});

marcaFilter.addEventListener("change", async () => {
  state.marca = marcaFilter.value;
  updateUrl();
  await carregarResultados();
});

applyPriceButton.addEventListener("click", async () => {
  state.precoMin = precoMinInput.value.trim();
  state.precoMax = precoMaxInput.value.trim();
  updateUrl();
  await carregarResultados();
});

[precoMinInput, precoMaxInput].forEach((input) => {
  input.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter") {
      return;
    }
    state.precoMin = precoMinInput.value.trim();
    state.precoMax = precoMaxInput.value.trim();
    updateUrl();
    await carregarResultados();
  });
});

clearFiltersButton.addEventListener("click", async () => {
  state.categorias.clear();
  state.marca = "";
  state.precoMin = "";
  state.precoMax = "";
  precoMinInput.value = "";
  precoMaxInput.value = "";
  updateUrl();
  await carregarResultados();
});

sortButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const field = button.dataset.sortField || "";
    if (state.sortField !== field) {
      state.sortField = field;
      state.sortDirection = "down";
    } else if (state.sortDirection === "down") {
      state.sortDirection = "up";
    } else {
      state.sortField = "";
      state.sortDirection = "";
    }

    updateUrl();
    renderSortButtons();
    await carregarResultados();
  });
});

parseUrlState();
renderSortButtons();
carregarResultados();
initCartNotice();
