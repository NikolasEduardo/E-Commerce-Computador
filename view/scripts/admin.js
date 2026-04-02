import { signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth } from "../../model/firebaseApp.js";
import { buscarClientes, atualizarStatus } from "../../controller/AdminClientesController.js";
import {
  buscarProdutos,
  carregarMetadataProdutos,
  carregarProduto,
  salvarProduto,
  atualizarStatusProdutoAdmin
} from "../../controller/AdminProdutosController.js";
import {
  carregarFornecedores,
  salvarFornecedor,
  carregarEntradasEstoque,
  salvarEntradaEstoque,
  carregarProdutosEstoque
} from "../../controller/AdminEstoqueController.js";
import { uploadImagemCloudinary } from "../../controller/CloudinaryController.js";

const searchInput = document.getElementById("searchInput");
const clientesList = document.getElementById("clientesList");
const logoutButton = document.getElementById("btn-logout");
const navProdutos = document.getElementById("nav-produtos");
const navClientes = document.getElementById("nav-clientes");
const navEstoque = document.getElementById("nav-estoque");
const clientesSection = document.getElementById("clientes-section");
const produtosSection = document.getElementById("produtos-section");
const produtoFormSection = document.getElementById("produto-form-section");
const estoqueSection = document.getElementById("estoque-section");
const produtosList = document.getElementById("produtosList");
const prodSearchInput = document.getElementById("prodSearchInput");
const prodStatusSelect = document.getElementById("prodStatusSelect");
const prodMarcaSelect = document.getElementById("prodMarcaSelect");
const prodCategoriaSelect = document.getElementById("prodCategoriaSelect");
const btnAddProduto = document.getElementById("btn-add-produto");
const produtoFormTitle = document.getElementById("produto-form-title");
const btnCancelProduto = document.getElementById("btn-cancel-produto");
const btnSaveProduto = document.getElementById("btn-save-produto");
const produtoNomeInput = document.getElementById("produto-nome");
const produtoModeloInput = document.getElementById("produto-modelo");
const produtoGarantiaInput = document.getElementById("produto-garantia");
const produtoMarcaSelect = document.getElementById("produto-marca-select");
const produtoMarcaNovaInput = document.getElementById("produto-marca-nova");
const produtoGrupoSelect = document.getElementById("produto-grupo-select");
const produtoCategoriaSelect = document.getElementById("produto-categoria-select");
const produtoCategoriaNovaInput = document.getElementById("produto-categoria-nova");
const btnAddCategoria = document.getElementById("btn-add-categoria");
const categoriasSelecionadasEl = document.getElementById("categorias-selecionadas");
const produtoDescricaoInput = document.getElementById("produto-descricao");
const produtoEspecificacoesInput = document.getElementById("produto-especificacoes");
const produtoImagensInput = document.getElementById("produto-imagens");
const imagensPreview = document.getElementById("imagens-preview");
const produtoFormMessage = document.getElementById("produto-form-message");
const statusModal = document.getElementById("status-modal");
const statusModalTitle = document.getElementById("status-modal-title");
const statusModalContext = document.getElementById("status-modal-context");
const statusModalTitulo = document.getElementById("status-modal-titulo");
const statusModalDescricao = document.getElementById("status-modal-descricao");
const statusModalCancel = document.getElementById("status-modal-cancel");
const statusModalConfirm = document.getElementById("status-modal-confirm");

const btnAddFornecedor = document.getElementById("btn-add-fornecedor");
const btnAddEntrada = document.getElementById("btn-add-entrada");
const estoqueMessage = document.getElementById("estoque-message");
const fornecedorFormPanel = document.getElementById("fornecedor-form-panel");
const entradaFormPanel = document.getElementById("entrada-form-panel");
const btnCancelFornecedor = document.getElementById("btn-cancel-fornecedor");
const btnSaveFornecedor = document.getElementById("btn-save-fornecedor");
const btnCancelEntrada = document.getElementById("btn-cancel-entrada");
const btnSaveEntrada = document.getElementById("btn-save-entrada");
const fornecedorNomeInput = document.getElementById("fornecedor-nome");
const fornecedorEmailInput = document.getElementById("fornecedor-email");
const fornecedorTelefoneInput = document.getElementById("fornecedor-telefone");
const entradaProdutoSelect = document.getElementById("entrada-produto");
const entradaQuantidadeInput = document.getElementById("entrada-quantidade");
const entradaCustoInput = document.getElementById("entrada-custo");
const entradaCustoTipoSelect = document.getElementById("entrada-custo-tipo");
const entradaFornecedorSelect = document.getElementById("entrada-fornecedor");
const fornecedoresList = document.getElementById("fornecedoresList");
const entradasList = document.getElementById("entradasList");

const statusCheckboxes = Array.from(document.querySelectorAll(".filter-status"));
const generoCheckboxes = Array.from(document.querySelectorAll(".filter-genero"));
const sortButtons = Array.from(document.querySelectorAll(".client-sort-button"));
const prodSortButtons = Array.from(document.querySelectorAll(".prod-sort-button"));

const clientesState = {
  search: "",
  status: new Set(),
  genero: new Set(),
  sortField: "",
  sortDir: ""
};

const produtosState = {
  search: "",
  status: "",
  marcaId: "",
  categoriaId: "",
  sortField: "",
  sortDir: ""
};

let debounceTimer = null;
let produtosDebounce = null;
let produtoEditId = null;
let categoriasSelecionadas = [];
let imagensSelecionadas = [];
let uploadsPendentes = 0;
let produtosMetadata = {
  marcas: [],
  categorias: [],
  grupos: []
};
let produtosMetadataLoaded = false;
let modalResolver = null;
let statusModalContextBase = "";
let estoqueCache = {
  fornecedores: [],
  entradas: [],
  produtos: []
};

function formatCpfSearch(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  let formatted = digits;
  if (digits.length > 3) formatted = `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length > 6) formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  if (digits.length > 9) formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  return formatted;
}

function computeSortOrder(field, dir) {
  if (!field || !dir) return "";
  if (dir === "down") {
    return field === "ranking" ? "DESC" : "ASC";
  }
  return field === "ranking" ? "ASC" : "DESC";
}

function computeProdutoSortOrder(field, dir) {
  if (!field || !dir) return "";
  if (dir === "down") {
    return field === "nome" ? "ASC" : "DESC";
  }
  return field === "nome" ? "DESC" : "ASC";
}

function setProdutoFormMessage(text) {
  if (!produtoFormMessage) {
    return;
  }
  produtoFormMessage.textContent = text || "";
  produtoFormMessage.classList.toggle("hidden", !text);
}

function setEstoqueMessage(text) {
  if (!estoqueMessage) {
    return;
  }
  estoqueMessage.textContent = text || "";
  estoqueMessage.classList.toggle("hidden", !text);
}

function updateSortUI() {
  sortButtons.forEach((button) => {
    const icon = button.querySelector(".sort-icon");
    if (button.dataset.field !== clientesState.sortField || !clientesState.sortDir) {
      icon.innerHTML = "";
      return;
    }
    icon.innerHTML = clientesState.sortDir === "down" ? "&darr;" : "&uarr;";
  });
}

function updateProdutoSortUI() {
  prodSortButtons.forEach((button) => {
    const icon = button.querySelector(".sort-icon");
    if (button.dataset.field !== produtosState.sortField || !produtosState.sortDir) {
      icon.innerHTML = "";
      return;
    }
    icon.innerHTML = produtosState.sortDir === "down" ? "&darr;" : "&uarr;";
  });
}

async function carregarClientes() {
  const params = {
    q: clientesState.search,
    status: Array.from(clientesState.status).join(","),
    genero: Array.from(clientesState.genero).join(","),
    sortField: clientesState.sortField,
    sortOrder: computeSortOrder(clientesState.sortField, clientesState.sortDir)
  };

  const clientes = await buscarClientes(params);
  renderClientes(clientes);
}

function renderClientes(clientes) {
  clientesList.innerHTML = "";
  if (!clientes.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Nenhum cliente encontrado.";
    clientesList.appendChild(empty);
    return;
  }

  clientes.forEach((cliente) => {
    const card = document.createElement("div");
    card.className = "cliente-card";

    const info = document.createElement("div");
    info.className = "cliente-info";
    info.innerHTML = `
      <strong>${cliente.nome || "SEM NOME"}</strong>
      <span>CPF: ${cliente.cpf || "-"}</span>
      <span>Email: ${cliente.email || "-"}</span>
      <span>Status: ${cliente.status?.nome || "-"}</span>
      <span>Genero: ${cliente.genero || "-"}</span>
      <span>Ranking: ${cliente.ranking ?? "-"}</span>
      <span>Nascimento: ${cliente.dataNascimento || "-"}</span>
    `;

    const actions = document.createElement("div");
    actions.className = "cliente-actions";
    const isInativo = cliente.status?.nome === "INATIVO";
    const actionLabel = isInativo ? "ATIVAR" : "INATIVAR";
    actions.innerHTML = `
      <button type="button">TRANSACOES</button>
      <button type="button" class="toggle-status">${actionLabel}</button>
    `;

    card.appendChild(info);
    card.appendChild(actions);
    clientesList.appendChild(card);

    const toggleButton = actions.querySelector(".toggle-status");
    toggleButton.addEventListener("click", async () => {
      toggleButton.disabled = true;
      try {
        const nextStatus = isInativo ? "ATIVO" : "INATIVO";
        await atualizarStatus(cliente.id, nextStatus);
        await carregarClientes();
      } catch (error) {
        clientesList.innerHTML = `<div class="empty-state">${error.message}</div>`;
      } finally {
        toggleButton.disabled = false;
      }
    });
  });
}

function setAdminSection(section) {
  const isProdutos = section === "produtos";
  const isClientes = section === "clientes";
  const isProdutoForm = section === "produto-form";
  const isEstoque = section === "estoque";

  produtosSection.classList.toggle("hidden", !isProdutos);
  clientesSection.classList.toggle("hidden", !isClientes);
  produtoFormSection.classList.toggle("hidden", !isProdutoForm);
  estoqueSection.classList.toggle("hidden", !isEstoque);

  navProdutos.classList.toggle("is-active", isProdutos || isProdutoForm);
  navClientes.classList.toggle("is-active", isClientes);
  navEstoque.classList.toggle("is-active", isEstoque);
}

function formatMargemLucro(valor) {
  if (typeof valor !== "number") {
    return "";
  }
  return `${Math.round(valor * 100)}%`;
}

function preencherSelect(select, items, labelFn, placeholder = "SELECIONE") {
  select.innerHTML = `<option value="">${placeholder}</option>`;
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = labelFn(item);
    select.appendChild(option);
  });
}

async function carregarProdutosMetadataAdmin() {
  const data = await carregarMetadataProdutos();
  produtosMetadata = {
    marcas: data?.marcas || [],
    categorias: data?.categorias || [],
    grupos: data?.grupoPrecificacaos || []
  };

  preencherSelect(prodMarcaSelect, produtosMetadata.marcas, (item) => item.nome, "TODAS");
  preencherSelect(prodCategoriaSelect, produtosMetadata.categorias, (item) => item.nome, "TODAS");
  preencherSelect(produtoMarcaSelect, produtosMetadata.marcas, (item) => item.nome);
  preencherSelect(produtoCategoriaSelect, produtosMetadata.categorias, (item) => item.nome);
  preencherSelect(
    produtoGrupoSelect,
    produtosMetadata.grupos,
    (item) => `${item.nome} (${formatMargemLucro(item.margemLucro)})`
  );
  produtosMetadataLoaded = true;
}

async function ensureProdutosMetadata() {
  if (produtosMetadataLoaded) {
    return;
  }
  await carregarProdutosMetadataAdmin();
}

async function carregarProdutos() {
  const params = {
    q: produtosState.search,
    status: produtosState.status,
    marcaId: produtosState.marcaId,
    categoriaId: produtosState.categoriaId,
    sortField: produtosState.sortField,
    sortOrder: computeProdutoSortOrder(produtosState.sortField, produtosState.sortDir)
  };

  const produtos = await buscarProdutos(params);
  renderProdutos(produtos);
}

function renderProdutos(produtos) {
  produtosList.innerHTML = "";
  if (!produtos.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Nenhum produto encontrado.";
    produtosList.appendChild(empty);
    return;
  }

  produtos.forEach((produto) => {
    const card = document.createElement("div");
    card.className = "produto-card";

    const imageWrap = document.createElement("div");
    imageWrap.className = "produto-image";
    const imgUrl = produto?.imagemProdutos_on_produto?.[0]?.url;
    if (imgUrl) {
      const img = document.createElement("img");
      img.src = imgUrl;
      img.alt = produto.nome || "Produto";
      imageWrap.appendChild(img);
    } else {
      imageWrap.textContent = "SEM IMAGEM";
    }

    const info = document.createElement("div");
    info.className = "produto-info";
    const categorias = (produto?.produtoCategorias_on_produto || [])
      .map((item) => item?.categoria?.nome)
      .filter(Boolean)
      .join(", ");
    info.innerHTML = `
      <strong>${produto.nome || "SEM NOME"}</strong>
      <span>Marca: ${produto?.marca?.nome || "-"}</span>
      <span>Modelo: ${produto.modelo || "-"}</span>
      <span>Categoria(s): ${categorias || "-"}</span>
      <span>Estoque fisico: ${produto.estoqueFisico ?? 0}</span>
      <span>Quantidade vendida: ${produto.quantidadeVendida ?? 0}</span>
      <span>Status: ${produto.status || "-"}</span>
    `;

    const actions = document.createElement("div");
    actions.className = "produto-actions";
    const btnEditar = document.createElement("button");
    btnEditar.textContent = "EDITAR";
    btnEditar.addEventListener("click", () => abrirEdicaoProduto(produto.id));

    const btnToggle = document.createElement("button");
    const isInativo = produto.status === "INATIVO";
    btnToggle.textContent = isInativo ? "ATIVAR" : "INATIVAR";
    btnToggle.addEventListener("click", async () => {
      const proximoStatus = isInativo ? "ATIVO" : "INATIVO";
      const justificativa = await abrirModalStatus(produto, proximoStatus);
      if (!justificativa) {
        return;
      }
      btnToggle.disabled = true;
      try {
        await atualizarStatusProdutoAdmin({
          id: produto.id,
          status: proximoStatus,
          titulo: justificativa.titulo,
          descricao: justificativa.descricao
        });
        await carregarProdutos();
      } catch (error) {
        produtosList.innerHTML = `<div class="empty-state">${error.message}</div>`;
      } finally {
        btnToggle.disabled = false;
      }
    });

    actions.appendChild(btnEditar);
    actions.appendChild(btnToggle);

    card.appendChild(imageWrap);
    card.appendChild(info);
    card.appendChild(actions);
    produtosList.appendChild(card);
  });
}

function scheduleProdutosSearch() {
  clearTimeout(produtosDebounce);
  produtosDebounce = setTimeout(() => {
    carregarProdutos().catch((error) => {
      produtosList.innerHTML = `<div class="empty-state">${error.message}</div>`;
    });
  }, 300);
}

function renderCategoriasSelecionadas() {
  categoriasSelecionadasEl.innerHTML = "";
  categoriasSelecionadas.forEach((categoria, index) => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.textContent = categoria.nome;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "x";
    btn.addEventListener("click", () => {
      categoriasSelecionadas = categoriasSelecionadas.filter((_, idx) => idx !== index);
      renderCategoriasSelecionadas();
    });
    chip.appendChild(btn);
    categoriasSelecionadasEl.appendChild(chip);
  });
}

function renderImagensPreview() {
  imagensPreview.innerHTML = "";
  imagensSelecionadas.forEach((imagem, index) => {
    const card = document.createElement("div");
    card.className = "imagem-card";
    const img = document.createElement("img");
    img.src = imagem.url;
    img.alt = "Imagem";
    card.appendChild(img);

    const capaLabel = document.createElement("label");
    const capaRadio = document.createElement("input");
    capaRadio.type = "radio";
    capaRadio.name = "imagem-capa";
    capaRadio.checked = Boolean(imagem.capa);
    capaRadio.addEventListener("change", () => {
      imagensSelecionadas = imagensSelecionadas.map((item, idx) => ({
        ...item,
        capa: idx === index
      }));
      renderImagensPreview();
    });
    capaLabel.appendChild(capaRadio);
    capaLabel.appendChild(document.createTextNode("Capa"));
    card.appendChild(capaLabel);

    const btnRemover = document.createElement("button");
    btnRemover.type = "button";
    btnRemover.textContent = "REMOVER";
    btnRemover.addEventListener("click", () => {
      imagensSelecionadas = imagensSelecionadas.filter((_, idx) => idx !== index);
      if (!imagensSelecionadas.some((imgItem) => imgItem.capa) && imagensSelecionadas.length > 0) {
        imagensSelecionadas[0].capa = true;
      }
      renderImagensPreview();
    });
    card.appendChild(btnRemover);

    imagensPreview.appendChild(card);
  });
}

function limparProdutoForm() {
  produtoEditId = null;
  produtoFormTitle.textContent = "NOVO PRODUTO";
  setProdutoFormMessage("");
  produtoNomeInput.value = "";
  produtoModeloInput.value = "";
  produtoGarantiaInput.value = "";
  produtoMarcaSelect.value = "";
  produtoMarcaNovaInput.value = "";
  produtoGrupoSelect.value = "";
  produtoCategoriaSelect.value = "";
  produtoCategoriaNovaInput.value = "";
  produtoDescricaoInput.value = "";
  produtoEspecificacoesInput.value = "";
  categoriasSelecionadas = [];
  imagensSelecionadas = [];
  renderCategoriasSelecionadas();
  renderImagensPreview();
  produtoImagensInput.value = "";
}

async function abrirEdicaoProduto(produtoId) {
  try {
    await ensureProdutosMetadata();
    const produto = await carregarProduto(produtoId);
    if (!produto) {
      return;
    }

    produtoEditId = produto.id;
    produtoFormTitle.textContent = "EDITAR PRODUTO";
    setProdutoFormMessage("");
    produtoNomeInput.value = produto.nome || "";
    produtoModeloInput.value = produto.modelo || "";
    produtoGarantiaInput.value = produto.garantia || "";
    produtoMarcaSelect.value = produto?.marca?.id || "";
    produtoMarcaNovaInput.value = "";
    produtoGrupoSelect.value = produto?.grupoPrecificacao?.id || "";
    produtoDescricaoInput.value = produto.descricaoTecnica || "";
    produtoEspecificacoesInput.value = produto.especificacoesTecnicas || "";

    categoriasSelecionadas = (produto?.produtoCategorias_on_produto || [])
      .map((item) => item?.categoria)
      .filter(Boolean)
      .map((categoria) => ({ id: categoria.id, nome: categoria.nome }));
    renderCategoriasSelecionadas();

    imagensSelecionadas = (produto?.imagemProdutos_on_produto || []).map((img) => ({
      url: img.url,
      capa: Boolean(img.capa)
    }));
    if (!imagensSelecionadas.some((img) => img.capa) && imagensSelecionadas.length) {
      imagensSelecionadas[0].capa = true;
    }
    renderImagensPreview();

    setAdminSection("produto-form");
  } catch (error) {
    produtosList.innerHTML = `<div class="empty-state">${error.message}</div>`;
  }
}

function validarProdutoForm() {
  if (!produtoNomeInput.value.trim() || !produtoModeloInput.value.trim()) {
    return "Informe nome e modelo.";
  }
  if (!produtoGarantiaInput.value.trim()) {
    return "Informe a garantia.";
  }
  if (!produtoDescricaoInput.value.trim() || !produtoEspecificacoesInput.value.trim()) {
    return "Informe descricao e especificacoes.";
  }
  const marcaNova = produtoMarcaNovaInput.value.trim();
  const marcaSelecionada = produtoMarcaSelect.value;
  if (!marcaNova && !marcaSelecionada) {
    return "Selecione ou informe uma marca.";
  }
  if (!produtoGrupoSelect.value) {
    return "Selecione o grupo de precificacao.";
  }
  if (!categoriasSelecionadas.length) {
    return "Adicione pelo menos uma categoria.";
  }
  if (!imagensSelecionadas.length) {
    return "Adicione pelo menos uma imagem.";
  }
  const capaCount = imagensSelecionadas.filter((img) => img.capa).length;
  if (capaCount !== 1) {
    return "Defina exatamente uma imagem como capa.";
  }
  if (uploadsPendentes > 0) {
    return "Aguarde o upload das imagens.";
  }
  return null;
}

function abrirModalStatus(produto, proximoStatus) {
  return new Promise((resolve) => {
    modalResolver = resolve;
    statusModalTitle.textContent = proximoStatus === "ATIVO"
      ? "ATIVAR PRODUTO"
      : "INATIVAR PRODUTO";

    if (proximoStatus === "ATIVO") {
      const categoria = produto.categoriaInativacao || "SEM CATEGORIA";
      const motivo = produto.motivoInativacao || "SEM DESCRICAO";
      statusModalContextBase =
        `Este produto foi inativado pelo motivo ${categoria}, descrito como: ${motivo}`;
    } else {
      const categoria = produto.categoriaAtivacao || "SEM CATEGORIA";
      const motivo = produto.justificativaAtivacao || "SEM DESCRICAO";
      statusModalContextBase =
        `Este produto foi ativado pelo motivo ${categoria}, descrito como: ${motivo}`;
    }

    statusModalContext.textContent = statusModalContextBase;
    statusModalTitulo.value = "";
    statusModalDescricao.value = "";
    statusModal.classList.remove("hidden");
  });
}

function fecharModalStatus(result) {
  statusModal.classList.add("hidden");
  if (modalResolver) {
    modalResolver(result);
    modalResolver = null;
  }
}

function formatDateBr(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("pt-BR");
}

function formatCurrency(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return value.toFixed(2);
}

function limparFornecedorForm() {
  fornecedorNomeInput.value = "";
  fornecedorEmailInput.value = "";
  fornecedorTelefoneInput.value = "";
}

function abrirFornecedorForm() {
  limparFornecedorForm();
  setEstoqueMessage("");
  fornecedorFormPanel.classList.remove("hidden");
  entradaFormPanel.classList.add("hidden");
}

function fecharFornecedorForm() {
  fornecedorFormPanel.classList.add("hidden");
  limparFornecedorForm();
}

function limparEntradaForm() {
  entradaProdutoSelect.value = "";
  entradaQuantidadeInput.value = "";
  entradaCustoInput.value = "";
  entradaCustoTipoSelect.value = "unitario";
  entradaFornecedorSelect.value = "";
}

function abrirEntradaForm() {
  limparEntradaForm();
  setEstoqueMessage("");
  entradaFormPanel.classList.remove("hidden");
  fornecedorFormPanel.classList.add("hidden");
}

function fecharEntradaForm() {
  entradaFormPanel.classList.add("hidden");
  limparEntradaForm();
}

function renderFornecedores(fornecedores) {
  fornecedoresList.innerHTML = "";
  if (!fornecedores.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Nenhum fornecedor cadastrado.";
    fornecedoresList.appendChild(empty);
    return;
  }

  fornecedores.forEach((fornecedor) => {
    const card = document.createElement("div");
    card.className = "fornecedor-card";
    card.innerHTML = `
      <strong>${fornecedor.nome || "SEM NOME"}</strong>
      <span>Email: ${fornecedor.emailContato || "-"}</span>
      <span>Telefone: ${fornecedor.telefoneContato || "-"}</span>
    `;
    fornecedoresList.appendChild(card);
  });
}

function renderEntradas(entradas) {
  entradasList.innerHTML = "";
  if (!entradas.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Nenhuma entrada registrada.";
    entradasList.appendChild(empty);
    return;
  }

  entradas.forEach((entrada) => {
    const card = document.createElement("div");
    card.className = "entrada-card";
    const produtoNome = entrada?.produto?.nome || "PRODUTO";
    const produtoModelo = entrada?.produto?.modelo ? ` - ${entrada.produto.modelo}` : "";
    card.innerHTML = `
      <strong>${produtoNome}${produtoModelo}</strong>
      <span>Quantidade: ${entrada.quantidade ?? 0}</span>
      <span>Valor unitario: ${formatCurrency(Number(entrada.valorCusto))}</span>
      <span>Fornecedor: ${entrada?.fornecedor?.nome || "-"}</span>
      <span>Data: ${formatDateBr(entrada.dataEntrada)}</span>
    `;
    entradasList.appendChild(card);
  });
}

function preencherSelectProdutosEstoque(produtos) {
  preencherSelect(
    entradaProdutoSelect,
    produtos,
    (item) => {
      const modelo = item.modelo ? ` - ${item.modelo}` : "";
      const status = item.status === "INATIVO" ? " (INATIVO)" : "";
      return `${item.nome || "PRODUTO"}${modelo}${status}`;
    }
  );
}

async function carregarEstoqueDados() {
  setEstoqueMessage("");
  const [fornecedores, entradas, produtos] = await Promise.all([
    carregarFornecedores(),
    carregarEntradasEstoque(),
    carregarProdutosEstoque()
  ]);

  estoqueCache = { fornecedores, entradas, produtos };
  renderFornecedores(fornecedores);
  renderEntradas(entradas);
  preencherSelect(entradaFornecedorSelect, fornecedores, (item) => item.nome);
  preencherSelectProdutosEstoque(produtos);
}

function scheduleSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    carregarClientes().catch((error) => {
      clientesList.innerHTML = `<div class="empty-state">${error.message}</div>`;
    });
  }, 300);
}

searchInput.addEventListener("input", (event) => {
  const raw = event.target.value;
  const hasLetters = /[a-zA-Z]/.test(raw);
  const hasAt = raw.includes("@");

  if (!hasLetters && !hasAt && /^\d/.test(raw)) {
    event.target.value = formatCpfSearch(raw);
  }

  clientesState.search = event.target.value.trim();
  scheduleSearch();
});

statusCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      clientesState.status.add(checkbox.value);
    } else {
      clientesState.status.delete(checkbox.value);
    }
    scheduleSearch();
  });
});

generoCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      clientesState.genero.add(checkbox.value);
    } else {
      clientesState.genero.delete(checkbox.value);
    }
    scheduleSearch();
  });
});

sortButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const field = button.dataset.field;
    if (clientesState.sortField !== field) {
      clientesState.sortField = field;
      clientesState.sortDir = "down";
    } else if (clientesState.sortDir === "down") {
      clientesState.sortDir = "up";
    } else {
      clientesState.sortField = "";
      clientesState.sortDir = "";
    }

    updateSortUI();
    scheduleSearch();
  });
});

prodSearchInput.addEventListener("input", (event) => {
  produtosState.search = event.target.value.trim();
  scheduleProdutosSearch();
});

prodStatusSelect.addEventListener("change", (event) => {
  produtosState.status = event.target.value;
  scheduleProdutosSearch();
});

prodMarcaSelect.addEventListener("change", (event) => {
  produtosState.marcaId = event.target.value;
  scheduleProdutosSearch();
});

prodCategoriaSelect.addEventListener("change", (event) => {
  produtosState.categoriaId = event.target.value;
  scheduleProdutosSearch();
});

prodSortButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const field = button.dataset.field;
    if (produtosState.sortField !== field) {
      produtosState.sortField = field;
      produtosState.sortDir = "down";
    } else if (produtosState.sortDir === "down") {
      produtosState.sortDir = "up";
    } else {
      produtosState.sortField = "";
      produtosState.sortDir = "";
    }

    updateProdutoSortUI();
    scheduleProdutosSearch();
  });
});

btnAddProduto.addEventListener("click", async () => {
  setProdutoFormMessage("");
  try {
    await ensureProdutosMetadata();
  } catch (error) {
    setProdutoFormMessage(error?.message || "Erro ao carregar metadata.");
    return;
  }
  limparProdutoForm();
  setAdminSection("produto-form");
});

btnCancelProduto.addEventListener("click", () => {
  limparProdutoForm();
  setAdminSection("produtos");
});

btnAddCategoria.addEventListener("click", () => {
  const novaCategoria = produtoCategoriaNovaInput.value.trim();
  const categoriaId = produtoCategoriaSelect.value;

  let adicionada = false;

  if (categoriaId) {
    const jaExiste = categoriasSelecionadas.some((item) => item.id === categoriaId);
    if (!jaExiste) {
      const categoria = produtosMetadata.categorias.find((item) => item.id === categoriaId);
      categoriasSelecionadas.push({ id: categoriaId, nome: categoria?.nome || "CATEGORIA" });
      adicionada = true;
    }
  }

  if (novaCategoria) {
    const nomeLower = novaCategoria.toLowerCase();
    const jaExiste = categoriasSelecionadas.some(
      (item) => item.nome.toLowerCase() === nomeLower
    );
    if (!jaExiste) {
      const existente = produtosMetadata.categorias.find(
        (item) => item.nome.toLowerCase() === nomeLower
      );
      if (existente) {
        categoriasSelecionadas.push({ id: existente.id, nome: existente.nome });
      } else {
        categoriasSelecionadas.push({ id: null, nome: novaCategoria });
      }
      adicionada = true;
    }
  }

  if (!adicionada) {
    setProdutoFormMessage("Categoria ja adicionada.");
  } else {
    setProdutoFormMessage("");
  }

  produtoCategoriaSelect.value = "";
  produtoCategoriaNovaInput.value = "";
  renderCategoriasSelecionadas();
});

produtoImagensInput.addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []);
  if (!files.length) {
    return;
  }

  uploadsPendentes += files.length;
  setProdutoFormMessage("");

  for (const file of files) {
    try {
      const data = await uploadImagemCloudinary(file, { folder: "produtos" });
      const url = data?.secure_url || data?.url;
      if (!url) {
        throw new Error("Upload nao retornou URL.");
      }
      imagensSelecionadas.push({
        url,
        capa: imagensSelecionadas.length === 0
      });
    } catch (error) {
      setProdutoFormMessage(error?.message || "Erro ao enviar imagem.");
    } finally {
      uploadsPendentes = Math.max(0, uploadsPendentes - 1);
      if (!imagensSelecionadas.some((img) => img.capa) && imagensSelecionadas.length) {
        imagensSelecionadas[0].capa = true;
      }
      renderImagensPreview();
    }
  }

  produtoImagensInput.value = "";
});

btnSaveProduto.addEventListener("click", async () => {
  setProdutoFormMessage("");
  const error = validarProdutoForm();
  if (error) {
    setProdutoFormMessage(error);
    return;
  }

  btnSaveProduto.disabled = true;
  btnSaveProduto.textContent = "SALVANDO...";

  const marcaNova = produtoMarcaNovaInput.value.trim();
  const produtoPayload = {
    nome: produtoNomeInput.value.trim(),
    modelo: produtoModeloInput.value.trim(),
    garantia: produtoGarantiaInput.value.trim(),
    descricaoTecnica: produtoDescricaoInput.value.trim(),
    especificacoesTecnicas: produtoEspecificacoesInput.value.trim(),
    grupoPrecificacaoId: produtoGrupoSelect.value
  };

  if (produtoEditId) {
    produtoPayload.id = produtoEditId;
  }

  if (marcaNova) {
    produtoPayload.marcaNome = marcaNova;
  } else {
    produtoPayload.marcaId = produtoMarcaSelect.value;
  }

  const payload = {
    produto: produtoPayload,
    categorias: categoriasSelecionadas.map((categoria) =>
      categoria.id ? { id: categoria.id } : { nome: categoria.nome }
    ),
    imagens: imagensSelecionadas.map((imagem) => ({
      url: imagem.url,
      capa: Boolean(imagem.capa)
    }))
  };

  try {
    await salvarProduto(payload);
    await carregarProdutos();
    await carregarProdutosMetadataAdmin();
    limparProdutoForm();
    setAdminSection("produtos");
  } catch (err) {
    setProdutoFormMessage(err?.message || "Erro ao salvar produto.");
  } finally {
    btnSaveProduto.disabled = false;
    btnSaveProduto.textContent = "SALVAR";
  }
});

statusModalCancel.addEventListener("click", () => {
  fecharModalStatus(null);
});

statusModalConfirm.addEventListener("click", () => {
  const titulo = statusModalTitulo.value.trim();
  const descricao = statusModalDescricao.value.trim();
  if (!titulo || !descricao) {
    statusModalContext.textContent = `${statusModalContextBase} (Informe titulo e descricao.)`;
    return;
  }
  fecharModalStatus({ titulo, descricao });
});

navProdutos.addEventListener("click", async () => {
  setAdminSection("produtos");
  try {
    await ensureProdutosMetadata();
    await carregarProdutos();
  } catch (error) {
    produtosList.innerHTML = `<div class="empty-state">${error.message}</div>`;
  }
});

navClientes.addEventListener("click", () => {
  setAdminSection("clientes");
  scheduleSearch();
});

navEstoque.addEventListener("click", async () => {
  setAdminSection("estoque");
  fecharFornecedorForm();
  fecharEntradaForm();
  try {
    await carregarEstoqueDados();
  } catch (error) {
    setEstoqueMessage(error?.message || "Erro ao carregar estoque.");
  }
});

btnAddFornecedor.addEventListener("click", () => {
  abrirFornecedorForm();
});

btnAddEntrada.addEventListener("click", () => {
  abrirEntradaForm();
});

btnCancelFornecedor.addEventListener("click", () => {
  fecharFornecedorForm();
});

btnCancelEntrada.addEventListener("click", () => {
  fecharEntradaForm();
});

btnSaveFornecedor.addEventListener("click", async () => {
  setEstoqueMessage("");
  const nome = fornecedorNomeInput.value.trim();
  const emailContato = fornecedorEmailInput.value.trim();
  const telefoneContato = fornecedorTelefoneInput.value.trim();

  if (!nome || !emailContato || !telefoneContato) {
    setEstoqueMessage("Preencha os dados do fornecedor.");
    return;
  }

  btnSaveFornecedor.disabled = true;
  btnSaveFornecedor.textContent = "SALVANDO...";

  try {
    await salvarFornecedor({ nome, emailContato, telefoneContato });
    await carregarEstoqueDados();
    fecharFornecedorForm();
  } catch (error) {
    setEstoqueMessage(error?.message || "Erro ao cadastrar fornecedor.");
  } finally {
    btnSaveFornecedor.disabled = false;
    btnSaveFornecedor.textContent = "SALVAR";
  }
});

btnSaveEntrada.addEventListener("click", async () => {
  setEstoqueMessage("");
  const produtoId = entradaProdutoSelect.value;
  const fornecedorId = entradaFornecedorSelect.value;
  const quantidade = Number(entradaQuantidadeInput.value);
  const custo = Number(entradaCustoInput.value);
  const custoTipo = entradaCustoTipoSelect.value;

  if (!produtoId || !fornecedorId || !Number.isFinite(quantidade) || quantidade <= 0) {
    setEstoqueMessage("Informe produto, fornecedor e quantidade.");
    return;
  }

  if (!Number.isFinite(custo) || custo <= 0) {
    setEstoqueMessage("Informe um custo valido.");
    return;
  }

  const valorCusto =
    custoTipo === "total"
      ? Number((custo / quantidade).toFixed(2))
      : Number(custo.toFixed(2));

  btnSaveEntrada.disabled = true;
  btnSaveEntrada.textContent = "SALVANDO...";

  try {
    await salvarEntradaEstoque({
      produtoId,
      fornecedorId,
      quantidade: Math.round(quantidade),
      valorCusto
    });
    await carregarEstoqueDados();
    fecharEntradaForm();
  } catch (error) {
    setEstoqueMessage(error?.message || "Erro ao registrar entrada.");
  } finally {
    btnSaveEntrada.disabled = false;
    btnSaveEntrada.textContent = "SALVAR";
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } finally {
    window.location.href = "../index.html";
  }
});

updateSortUI();
updateProdutoSortUI();
carregarClientes().catch((error) => {
  clientesList.innerHTML = `<div class="empty-state">${error.message}</div>`;
});

carregarProdutosMetadataAdmin().catch((error) => {
  produtosList.innerHTML = `<div class="empty-state">${error.message}</div>`;
  setProdutoFormMessage(error?.message || "Erro ao carregar metadata.");
});
