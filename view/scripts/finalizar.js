import {
  carregarPerfil,
  carregarEnderecos,
  carregarCartoes,
  carregarMetadataPerfil,
  adicionarEndereco,
  adicionarCartao
} from "../../controller/PerfilController.js";
import { carregarCarrinho } from "../../controller/CarrinhoController.js";
import { carregarCupons } from "../../controller/CupomController.js";
import { concluirCompra } from "../../controller/CheckoutController.js";
import { initCartNotice, refreshCartNotice, showCartPopup } from "./cart-notice.js";

const perfilButton = document.getElementById("perfil-btn");
const carrinhoButton = document.getElementById("btn-carrinho");
const itemsList = document.getElementById("checkout-items-list");
const enderecoSelect = document.getElementById("endereco-select");
const enderecoInfo = document.getElementById("endereco-info");
const btnEnderecoAdd = document.getElementById("btn-endereco-add");
const cartaoEmpty = document.getElementById("cartao-empty");
const cartaoPrincipalSelect = document.getElementById("cartao-principal");
const btnCartaoAdd = document.getElementById("btn-cartao-add");
const btnCartaoExtraAdd = document.getElementById("btn-cartao-extra-add");
const cartoesExtrasList = document.getElementById("cartoes-extras-list");
const cartaoMsg = document.getElementById("cartao-msg");
const cupomPromoSelect = document.getElementById("cupom-promo");
const cupomPromoMsg = document.getElementById("cupom-promo-msg");
const cupomTrocaList = document.getElementById("cupom-troca-list");
const totalsBox = document.getElementById("checkout-totals");
const btnComprar = document.getElementById("btn-comprar");

const enderecoModal = document.getElementById("endereco-modal");
const btnEnderecoCancelar = document.getElementById("btn-endereco-cancelar");
const btnEnderecoSalvar = document.getElementById("btn-endereco-salvar");
const enderecoModalMsg = document.getElementById("endereco-modal-msg");

const endTipoResidencia = document.getElementById("end-tipoResidencia");
const endTipoLogradouro = document.getElementById("end-tipoLogradouro");
const endLogradouro = document.getElementById("end-logradouro");
const endNumero = document.getElementById("end-numero");
const endBairro = document.getElementById("end-bairro");
const endCep = document.getElementById("end-cep");
const endCidade = document.getElementById("end-cidade");
const endEstado = document.getElementById("end-estado");
const endPais = document.getElementById("end-pais");
const endObservacoes = document.getElementById("end-observacoes");

const cartaoModal = document.getElementById("cartao-modal");
const btnCartaoCancelar = document.getElementById("btn-cartao-cancelar");
const btnCartaoSalvar = document.getElementById("btn-cartao-salvar");
const cartaoModalMsg = document.getElementById("cartao-modal-msg");
const modalCartaoBandeira = document.getElementById("modal-cartao-bandeira");
const modalCartaoNumero = document.getElementById("modal-cartao-numero");
const modalCartaoNome = document.getElementById("modal-cartao-nome");
const modalCartaoCvv = document.getElementById("modal-cartao-cvv");
const modalCartaoValidade = document.getElementById("modal-cartao-validade");

const cepRegex = /^\d{5}-\d{3}$/;
const cardNumberRegex = /^\d{13,16}$/;
const cvvRegex = /^\d{3,4}$/;

let carrinhoItens = [];
let enderecos = [];
let cartoes = [];
let cuponsPromo = [];
let cuponsTroca = [];
let selectedTroca = new Set();
let cartoesExtras = [];
let cartaoExtraSeq = 0;

function formatCurrency(value) {
  if (!Number.isFinite(value)) {
    return "R$ 0,00";
  }
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function normalizeTexto(texto) {
  return `${texto || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function onlyDigits(value) {
  return `${value || ""}`.replace(/\D/g, "");
}

function formatCep(value) {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) {
    return digits;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function formatCardNumber(value) {
  return onlyDigits(value).slice(0, 16);
}

function formatCvv(value) {
  return onlyDigits(value).slice(0, 4);
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

function parseMoneyInput(value) {
  if (value === null || value === undefined || value === "") {
    return NaN;
  }
  return Number.parseFloat(`${value}`.replace(",", "."));
}

function formatMoneyInput(value) {
  const number = Number(value || 0);
  return number.toFixed(2);
}

function calcularFrete(cep) {
  const digits = onlyDigits(cep || "");
  if (digits.length !== 8) {
    return 0;
  }
  const numero = Number(digits);
  if (numero >= 1000000 && numero <= 19999999) {
    return 100;
  }
  return 150;
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
          if (overlay) {
            overlay.classList.add("hidden");
          }
        }
      }
    ]
  });
}

function fillSelect(select, items, labelBuilder, placeholder = "") {
  if (!select) {
    return;
  }
  select.innerHTML = "";
  if (placeholder) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = placeholder;
    select.appendChild(option);
  }
  (items || []).forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = labelBuilder(item);
    select.appendChild(option);
  });
}

function getCartaoLabel(cartao) {
  if (!cartao) {
    return "Cartao";
  }
  const bandeira = cartao.bandeira?.nome || "CARTAO";
  const final = `${cartao.numero || ""}`.slice(-4) || "----";
  return `${bandeira} - final ${final}`;
}

function getCartaoById(cartaoId) {
  return cartoes.find((cartao) => cartao.id === cartaoId) || null;
}

function nextCartaoExtraId() {
  cartaoExtraSeq += 1;
  return cartaoExtraSeq;
}

function getMaxCartoesExtras(restante) {
  if (restante < 20) {
    return 0;
  }
  return Math.max(Math.floor(restante / 10) - 1, 0);
}

function getCartoesDisponiveisParaLinha(rowId = null) {
  const principalId = cartaoPrincipalSelect.value;
  const usados = new Set();
  if (principalId) {
    usados.add(principalId);
  }

  cartoesExtras.forEach((row) => {
    if (row.rowId !== rowId && row.cartaoId) {
      usados.add(row.cartaoId);
    }
  });

  return cartoes.filter((cartao) => !usados.has(cartao.id));
}

function renderItems() {
  itemsList.innerHTML = "";
  const ativos = carrinhoItens.filter((item) => Number(item.quantidade || 0) > 0);
  if (!ativos.length) {
    const empty = document.createElement("div");
    empty.className = "checkout-item";
    empty.textContent = "Nenhum produto para finalizar.";
    itemsList.appendChild(empty);
    return;
  }

  ativos.forEach((item) => {
    const card = document.createElement("div");
    card.className = "checkout-item";

    const imageBox = document.createElement("div");
    imageBox.className = "checkout-item-image";
    if (item.imagem) {
      const img = document.createElement("img");
      img.src = item.imagem;
      img.alt = item.nome || "Produto";
      imageBox.appendChild(img);
    } else {
      imageBox.textContent = "IMAGEM";
    }

    const details = document.createElement("div");
    details.className = "checkout-item-details";

    const title = document.createElement("strong");
    title.textContent = item.nome || "SEM NOME";
    const modelo = document.createElement("span");
    modelo.textContent = item.modelo ? `Modelo: ${item.modelo}` : "Modelo: -";
    const precoUnit = document.createElement("span");
    precoUnit.textContent = `Preco p/unidade: ${formatCurrency(Number(item.precoUnitario || 0))}`;
    const precoTotal = document.createElement("span");
    precoTotal.textContent = `Preco total: ${formatCurrency(Number(item.precoTotal || 0))}`;
    const quantidade = document.createElement("span");
    quantidade.textContent = `Quantidade: ${item.quantidade ?? 0}`;

    details.appendChild(title);
    details.appendChild(modelo);
    details.appendChild(precoUnit);
    details.appendChild(precoTotal);
    details.appendChild(quantidade);

    card.appendChild(imageBox);
    card.appendChild(details);
    itemsList.appendChild(card);
  });
}

function renderEnderecos() {
  enderecoSelect.innerHTML = "";
  if (!enderecos.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Nenhum endereco cadastrado";
    enderecoSelect.appendChild(option);
    enderecoInfo.textContent = "Cadastre um endereco para prosseguir.";
    return;
  }

  const principal = enderecos.find((item) => item.tipo === "Principal") || enderecos[0];
  enderecos.forEach((endereco) => {
    const option = document.createElement("option");
    option.value = endereco.id;
    const tipo = endereco.tipo === "Principal" ? "Residencial" : "Endereco";
    option.textContent = `${tipo}: ${endereco.logradouro}, ${endereco.numero} - ${endereco.bairro}`;
    enderecoSelect.appendChild(option);
  });
  enderecoSelect.value = principal.id;
  updateEnderecoInfo();
}

function updateEnderecoInfo() {
  const endereco = enderecos.find((item) => item.id === enderecoSelect.value);
  enderecoInfo.textContent = endereco
    ? `${endereco.cidade}/${endereco.estado} - CEP ${endereco.cep}`
    : "";
}

function renderCartoes() {
  const valorAtual = cartaoPrincipalSelect.value;
  cartaoPrincipalSelect.innerHTML = "";
  cartaoMsg.textContent = "";

  if (!cartoes.length) {
    cartaoEmpty.classList.remove("hidden");
    cartaoPrincipalSelect.disabled = true;
    btnCartaoExtraAdd.disabled = true;
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Nenhum cartao cadastrado";
    cartaoPrincipalSelect.appendChild(option);
    cartoesExtras = [];
    renderCartoesExtras();
    return;
  }

  cartaoEmpty.classList.add("hidden");
  cartaoPrincipalSelect.disabled = false;
  btnCartaoExtraAdd.disabled = false;

  cartoes.forEach((cartao) => {
    const option = document.createElement("option");
    option.value = cartao.id;
    option.textContent = getCartaoLabel(cartao);
    cartaoPrincipalSelect.appendChild(option);
  });

  const preferencial = cartoes.find((item) => item.preferencial) || cartoes[0];
  const principalValido = cartoes.some((item) => item.id === valorAtual)
    ? valorAtual
    : preferencial?.id || cartoes[0]?.id || "";
  cartaoPrincipalSelect.value = principalValido;
  renderCartoesExtras();
}

function renderCartoesExtras() {
  cartoesExtrasList.innerHTML = "";
  if (!cartoesExtras.length) {
    return;
  }

  cartoesExtras.forEach((row, index) => {
    const container = document.createElement("div");
    container.className = "card-extra-row";

    const header = document.createElement("div");
    header.className = "card-extra-header";
    const title = document.createElement("strong");
    title.textContent = `Cartao adicional ${index + 1}`;
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn small";
    removeBtn.type = "button";
    removeBtn.textContent = "REMOVER";
    removeBtn.addEventListener("click", () => {
      cartoesExtras = cartoesExtras.filter((item) => item.rowId !== row.rowId);
      atualizarResumo();
    });
    header.appendChild(title);
    header.appendChild(removeBtn);

    const rowFields = document.createElement("div");
    rowFields.className = "field-row double";

    const select = document.createElement("select");
    const options = getCartoesDisponiveisParaLinha(row.rowId);
    options.forEach((cartao) => {
      const option = document.createElement("option");
      option.value = cartao.id;
      option.textContent = getCartaoLabel(cartao);
      select.appendChild(option);
    });
    if (options.length) {
      if (!options.some((item) => item.id === row.cartaoId)) {
        row.cartaoId = options[0].id;
      }
      select.value = row.cartaoId;
    }
    select.addEventListener("change", () => {
      row.cartaoId = select.value;
      atualizarResumo();
    });

    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "decimal";
    input.placeholder = "Valor";
    input.value = row.valorInput || "";
    input.addEventListener("input", () => {
      const cleaned = input.value.replace(/[^\d.,]/g, "").replace(",", ".");
      row.valorInput = cleaned;
      input.value = cleaned;
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
      }
    });
    input.addEventListener("blur", () => {
      if (!row.valorInput) {
        atualizarResumo();
        return;
      }
      const parsed = parseMoneyInput(row.valorInput);
      if (Number.isFinite(parsed)) {
        row.valorInput = formatMoneyInput(parsed);
        input.value = row.valorInput;
      }
      atualizarResumo();
    });

    rowFields.appendChild(select);
    rowFields.appendChild(input);
    container.appendChild(header);
    container.appendChild(rowFields);
    cartoesExtrasList.appendChild(container);
  });
}

function renderCupons() {
  const promoSelecionadoAtual = cupomPromoSelect.value;
  selectedTroca = new Set(
    Array.from(selectedTroca).filter((id) => cuponsTroca.some((cupom) => cupom.id === id))
  );

  cupomPromoSelect.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Nenhum cupom";
  cupomPromoSelect.appendChild(defaultOption);

  cuponsPromo.forEach((cupom) => {
    const option = document.createElement("option");
    option.value = cupom.id;
    const tipo = normalizeTexto(cupom.tipo?.nome || "");
    if (tipo === "FRETE GRATIS") {
      option.textContent = `${cupom.codigo} (Frete gratis acima de ${formatCurrency(cupom.valor)})`;
    } else {
      option.textContent = `${cupom.codigo} (${formatCurrency(cupom.valor)})`;
    }
    cupomPromoSelect.appendChild(option);
  });

  if (cuponsPromo.some((cupom) => cupom.id === promoSelecionadoAtual)) {
    cupomPromoSelect.value = promoSelecionadoAtual;
  }

  cupomTrocaList.innerHTML = "";
  if (!cuponsTroca.length) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "Nenhum cupom de troca disponivel.";
    cupomTrocaList.appendChild(empty);
    return;
  }

  cuponsTroca.forEach((cupom) => {
    const label = document.createElement("label");
    label.className = "coupon-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = cupom.id;
    checkbox.checked = selectedTroca.has(cupom.id);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedTroca.add(cupom.id);
      } else {
        selectedTroca.delete(cupom.id);
      }
      atualizarResumo();
    });

    const span = document.createElement("span");
    span.textContent = `${cupom.codigo} - ${formatCurrency(cupom.valor)}`;

    label.appendChild(checkbox);
    label.appendChild(span);
    cupomTrocaList.appendChild(label);
  });
}

function obterCupomPromoSelecionado() {
  const id = cupomPromoSelect.value;
  if (!id) {
    return null;
  }
  return cuponsPromo.find((cupom) => cupom.id === id) || null;
}

function calcularTotais() {
  const totalProdutos = carrinhoItens
    .filter((item) => Number(item.quantidade || 0) > 0)
    .reduce((acc, item) => acc + Number(item.precoTotal || 0), 0);

  const endereco = enderecos.find((item) => item.id === enderecoSelect.value);
  const frete = endereco ? calcularFrete(endereco.cep) : 0;
  const totalBruto = totalProdutos + frete;

  let promoValor = 0;
  let promoMsg = "";
  const promo = obterCupomPromoSelecionado();
  if (promo) {
    const tipo = normalizeTexto(promo.tipo?.nome || "");
    if (tipo === "DESCONTO") {
      promoValor = Number(promo.valor || 0);
    } else if (tipo === "FRETE GRATIS") {
      if (totalProdutos >= Number(promo.valor || 0)) {
        promoValor = frete;
      } else {
        promoMsg = "Cupom nao aplicavel (valor minimo nao atingido).";
      }
    }
  }

  const promoAplicada = Math.min(promoValor, totalBruto);
  const restanteAposPromo = Math.max(totalBruto - promoAplicada, 0);

  const trocaTotal = cuponsTroca.reduce((acc, cupom) => {
    if (selectedTroca.has(cupom.id)) {
      return acc + Number(cupom.valor || 0);
    }
    return acc;
  }, 0);

  const trocaAplicada = Math.min(trocaTotal, restanteAposPromo);
  const trocaSobra = Math.max(trocaTotal - trocaAplicada, 0);
  const restanteAposTroca = Math.max(restanteAposPromo - trocaAplicada, 0);

  return {
    totalProdutos,
    frete,
    totalBruto,
    trocaTotal,
    trocaAplicada,
    trocaSobra,
    promoValor,
    promoAplicada,
    promoMsg,
    restanteAposPromo,
    restanteAposTroca
  };
}

function atualizarCuponsTrocaDisponiveis(restanteAposPromo) {
  const trocaTotal = cuponsTroca.reduce((acc, cupom) => {
    if (selectedTroca.has(cupom.id)) {
      return acc + Number(cupom.valor || 0);
    }
    return acc;
  }, 0);

  const bloquearNovos = trocaTotal >= restanteAposPromo && restanteAposPromo > 0;
  const checkboxes = cupomTrocaList.querySelectorAll("input[type='checkbox']");
  checkboxes.forEach((checkbox) => {
    checkbox.disabled = bloquearNovos && !checkbox.checked;
  });
}

function normalizarCartoesExtras(restante) {
  const principalId = cartaoPrincipalSelect.value;
  const originalLength = cartoesExtras.length;
  const mensagens = [];

  if (!cartoes.length || !principalId || restante <= 0) {
    if (originalLength > 0) {
      cartoesExtras = [];
    }
    return { alterou: originalLength > 0, mensagem: "" };
  }

  const maxExtras = getMaxCartoesExtras(restante);
  const sanitizados = [];
  const usados = new Set([principalId]);

  for (const row of cartoesExtras) {
    if (sanitizados.length >= maxExtras) {
      break;
    }

    const disponiveis = cartoes.filter((cartao) => !usados.has(cartao.id));
    if (!disponiveis.length) {
      break;
    }

    let cartaoId = row.cartaoId;
    if (!cartaoId || usados.has(cartaoId) || !cartoes.some((cartao) => cartao.id === cartaoId)) {
      cartaoId = disponiveis[0].id;
    }

    if (usados.has(cartaoId)) {
      continue;
    }

    usados.add(cartaoId);
    sanitizados.push({
      rowId: row.rowId,
      cartaoId,
      valorInput: row.valorInput || "10.00"
    });
  }

  if (originalLength > sanitizados.length) {
    mensagens.push("Cartoes adicionais ajustados ao valor restante.");
  }

  cartoesExtras = sanitizados;
  return { alterou: originalLength !== sanitizados.length, mensagem: mensagens.join(" ") };
}

function calcularPagamentosCartao(totais) {
  const restante = Number(totais.restanteAposTroca || 0);

  if (!cartoes.length) {
    cartoesExtras = [];
    return {
      principal: 0,
      extras: [],
      mensagem: restante > 0 ? "Nenhum cartao cadastrado." : "",
      totalCartoes: 0
    };
  }

  if (restante <= 0) {
    cartoesExtras = [];
    return {
      principal: 0,
      extras: [],
      mensagem: "Compra coberta pelos cupons.",
      totalCartoes: 0
    };
  }

  const normalizacao = normalizarCartoesExtras(restante);
  const extrasProcessados = [];
  let restanteDistribuir = restante;

  cartoesExtras.forEach((row, index) => {
    const slotsDepois = cartoesExtras.length - index - 1;
    const maxValor = restanteDistribuir - 10 * (slotsDepois + 1);
    if (maxValor < 10) {
      return;
    }

    let valor = parseMoneyInput(row.valorInput);
    if (!Number.isFinite(valor)) {
      valor = 10;
    }
    if (valor < 10) {
      valor = 10;
    }
    if (valor > maxValor) {
      valor = maxValor;
    }

    valor = Number(valor.toFixed(2));
    row.valorInput = formatMoneyInput(valor);
    extrasProcessados.push({
      rowId: row.rowId,
      cartaoId: row.cartaoId,
      valor
    });
    restanteDistribuir = Number((restanteDistribuir - valor).toFixed(2));
  });

  if (extrasProcessados.length !== cartoesExtras.length) {
    cartoesExtras = cartoesExtras
      .filter((row) => extrasProcessados.some((item) => item.rowId === row.rowId))
      .map((row) => {
        const extra = extrasProcessados.find((item) => item.rowId === row.rowId);
        return {
          ...row,
          valorInput: formatMoneyInput(extra?.valor || 10)
        };
      });
  }

  const principal = Number(Math.max(restanteDistribuir, 0).toFixed(2));
  let mensagem = normalizacao.mensagem;

  if (!cartoesExtras.length && restante < 20 && cartoes.length >= 2) {
    mensagem = "Valor restante menor que R$ 20. Cartoes adicionais removidos.";
  }

  return {
    principal,
    extras: extrasProcessados,
    mensagem,
    totalCartoes: principal > 0 ? extrasProcessados.length + 1 : 0
  };
}

function renderTotais(totais, pagamentos) {
  const linhas = [
    `Total produtos: ${formatCurrency(totais.totalProdutos)}`,
    `Frete: ${formatCurrency(totais.frete)}`,
    "SEPARADOR",
    `Total a ser pago: ${formatCurrency(totais.totalBruto)}`,
    `Cupom promocional: -${formatCurrency(totais.promoValor)}`,
    `Cupom troca: -${formatCurrency(totais.trocaAplicada)}`
  ];

  if (totais.trocaSobra > 0) {
    linhas.push(`Sobra cupons troca: ${formatCurrency(totais.trocaSobra)}`);
  }

  pagamentos.extras.forEach((item, index) => {
    linhas.push(`Cartao adicional ${index + 1}: ${formatCurrency(item.valor)}`);
  });
  linhas.push(`Cartao principal: ${formatCurrency(pagamentos.principal)}`);

  totalsBox.innerHTML = linhas
    .map((linha) => (linha === "SEPARADOR" ? `<div class="separator"></div>` : `<div>${linha}</div>`))
    .join("");
}

function atualizarResumo() {
  const totais = calcularTotais();
  cupomPromoMsg.textContent = totais.promoMsg || "";
  atualizarCuponsTrocaDisponiveis(totais.restanteAposPromo);

  const pagamentos = calcularPagamentosCartao(totais);
  cartaoMsg.textContent = pagamentos.mensagem || "";
  renderCartoesExtras();
  renderTotais(totais, pagamentos);
}

function openEnderecoModal() {
  enderecoModalMsg.textContent = "";
  endPais.value = endPais.value || "Brasil";
  enderecoModal.classList.remove("hidden");
}

function closeEnderecoModal() {
  enderecoModal.classList.add("hidden");
}

function limparCartaoModal() {
  cartaoModalMsg.textContent = "";
  modalCartaoBandeira.value = modalCartaoBandeira.options[0]?.value || "";
  modalCartaoNumero.value = "";
  modalCartaoNome.value = "";
  modalCartaoCvv.value = "";
  modalCartaoValidade.value = "";
}

function openCartaoModal() {
  limparCartaoModal();
  cartaoModal.classList.remove("hidden");
}

function closeCartaoModal() {
  cartaoModal.classList.add("hidden");
  limparCartaoModal();
}

function adicionarLinhaCartaoExtra() {
  const totais = calcularTotais();
  const restante = Number(totais.restanteAposTroca || 0);
  const maxExtras = getMaxCartoesExtras(restante);

  if (!cartoes.length) {
    cartaoMsg.textContent = "Cadastre um cartao para continuar.";
    return;
  }

  if (restante <= 0) {
    cartaoMsg.textContent = "Compra coberta pelos cupons.";
    return;
  }

  if (maxExtras <= 0) {
    cartaoMsg.textContent = "O valor restante nao permite adicionar outro cartao.";
    return;
  }

  if (cartoesExtras.length >= maxExtras) {
    cartaoMsg.textContent = "Nao e possivel adicionar mais cartoes para este valor.";
    return;
  }

  const disponiveis = getCartoesDisponiveisParaLinha();
  if (!disponiveis.length) {
    cartaoMsg.textContent = "Nao ha mais cartoes disponiveis para adicionar.";
    return;
  }

  cartoesExtras.push({
    rowId: nextCartaoExtraId(),
    cartaoId: disponiveis[0].id,
    valorInput: "10.00"
  });
  atualizarResumo();
}

function construirPayloadCompra() {
  const enderecoId = enderecoSelect.value || null;
  const cupomPromocionalId = cupomPromoSelect.value || null;
  const cupomTrocaIds = Array.from(selectedTroca || []);
  const totais = calcularTotais();
  const pagamentos = calcularPagamentosCartao(totais);
  const cartoesPayload = [];

  if (pagamentos.principal > 0 && cartaoPrincipalSelect.value) {
    cartoesPayload.push({
      cartaoId: cartaoPrincipalSelect.value,
      valor: pagamentos.principal
    });
  }

  pagamentos.extras.forEach((item) => {
    if (item.cartaoId && item.valor > 0) {
      cartoesPayload.push({
        cartaoId: item.cartaoId,
        valor: item.valor
      });
    }
  });

  return {
    enderecoId,
    cupomPromocionalId,
    cupomTrocaIds,
    cartoes: cartoesPayload
  };
}

async function salvarNovoEndereco() {
  enderecoModalMsg.textContent = "";

  const endereco = {
    tipoResidenciaId: endTipoResidencia.value,
    tipoLogradouroId: endTipoLogradouro.value,
    logradouro: endLogradouro.value.trim(),
    numero: endNumero.value.trim(),
    bairro: endBairro.value.trim(),
    cep: endCep.value.trim(),
    cidade: endCidade.value.trim(),
    estado: endEstado.value.trim(),
    pais: endPais.value.trim() || "Brasil",
    observacoes: endObservacoes.value.trim()
  };

  if (
    !endereco.tipoResidenciaId ||
    !endereco.tipoLogradouroId ||
    !endereco.logradouro ||
    !endereco.numero ||
    !endereco.bairro ||
    !endereco.cep ||
    !endereco.cidade ||
    !endereco.estado ||
    !endereco.pais
  ) {
    enderecoModalMsg.textContent = "Preencha todos os campos obrigatorios.";
    return;
  }

  if (!cepRegex.test(endereco.cep)) {
    enderecoModalMsg.textContent = "CEP invalido. Use 00000-000.";
    return;
  }

  try {
    const result = await adicionarEndereco({ endereco, principal: false });
    closeEnderecoModal();
    await carregarDados();
    if (result?.id) {
      enderecoSelect.value = result.id;
      updateEnderecoInfo();
    }
    atualizarResumo();
  } catch (error) {
    enderecoModalMsg.textContent = error?.message || "Erro ao cadastrar endereco.";
  }
}

function validarCartaoModal() {
  const bandeiraId = modalCartaoBandeira.value;
  const numero = formatCardNumber(modalCartaoNumero.value);
  const nomeImpresso = modalCartaoNome.value.trim();
  const codigoSeguranca = formatCvv(modalCartaoCvv.value);
  const dataValidade = normalizeValidade(modalCartaoValidade.value);

  if (!bandeiraId || !numero || !nomeImpresso || !codigoSeguranca || !dataValidade) {
    return "Preencha todos os dados do cartao.";
  }
  if (!cardNumberRegex.test(numero)) {
    return "Numero do cartao invalido. Use entre 13 e 16 digitos.";
  }
  if (!cvvRegex.test(codigoSeguranca)) {
    return "CVV invalido. Use 3 ou 4 digitos.";
  }
  return null;
}

async function salvarNovoCartao() {
  cartaoModalMsg.textContent = "";
  const erro = validarCartaoModal();
  if (erro) {
    cartaoModalMsg.textContent = erro;
    return;
  }

  const payload = {
    cartao: {
      bandeiraId: modalCartaoBandeira.value,
      numero: formatCardNumber(modalCartaoNumero.value),
      nomeImpresso: modalCartaoNome.value.trim(),
      codigoSeguranca: formatCvv(modalCartaoCvv.value),
      dataValidade: normalizeValidade(modalCartaoValidade.value)
    }
  };

  try {
    const cartoesAntes = cartoes.length;
    const result = await adicionarCartao(payload);
    closeCartaoModal();
    await carregarDados();

    if (result?.id && cartoesAntes === 0 && cartoes.some((item) => item.id === result.id)) {
      cartaoPrincipalSelect.value = result.id;
    }
    atualizarResumo();
  } catch (error) {
    cartaoModalMsg.textContent = error?.message || "Erro ao cadastrar cartao.";
  }
}

function carregarEnderecosAsync() {
  return new Promise((resolve) => {
    carregarEnderecos((data, error) => {
      if (error) {
        showWarning(error);
        enderecos = [];
      } else {
        enderecos = data?.enderecos || [];
      }
      renderEnderecos();
      resolve();
    });
  });
}

function carregarCartoesAsync() {
  return new Promise((resolve) => {
    carregarCartoes((data, error) => {
      if (error) {
        showWarning(error);
        cartoes = [];
      } else {
        cartoes = data?.cartoes || [];
      }
      renderCartoes();
      resolve();
    });
  });
}

function carregarCuponsAsync() {
  return new Promise((resolve) => {
    carregarCupons((data, error) => {
      if (error) {
        showWarning(error);
        cuponsPromo = [];
        cuponsTroca = [];
      } else {
        cuponsPromo = data?.promocionais || [];
        cuponsTroca = data?.troca || [];
      }
      renderCupons();
      resolve();
    });
  });
}

async function carregarDados() {
  const carrinho = await carregarCarrinho();
  carrinhoItens = carrinho?.itens || [];
  renderItems();

  await carregarEnderecosAsync();
  await carregarCartoesAsync();
  await carregarCuponsAsync();
  atualizarResumo();
}

async function carregarMetadataCheckout() {
  try {
    const data = await carregarMetadataPerfil();
    fillSelect(
      endTipoResidencia,
      data?.tipoResidencias || [],
      (item) => item.nome
    );
    fillSelect(
      endTipoLogradouro,
      data?.tipoLogradouros || [],
      (item) => (item.sigla ? `${item.nome} (${item.sigla})` : item.nome)
    );
    fillSelect(
      modalCartaoBandeira,
      data?.bandeiraCartaos || [],
      (item) => item.nome,
      "Selecione a bandeira"
    );
  } catch (error) {
    showWarning(error?.message || "Erro ao carregar metadata.");
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

enderecoSelect.addEventListener("change", () => {
  updateEnderecoInfo();
  atualizarResumo();
});

cartaoPrincipalSelect.addEventListener("change", () => {
  atualizarResumo();
});

cupomPromoSelect.addEventListener("change", () => {
  atualizarResumo();
});

btnEnderecoAdd.addEventListener("click", () => {
  openEnderecoModal();
});

btnEnderecoCancelar.addEventListener("click", () => {
  closeEnderecoModal();
});

btnEnderecoSalvar.addEventListener("click", () => {
  salvarNovoEndereco();
});

btnCartaoAdd.addEventListener("click", () => {
  openCartaoModal();
});

btnCartaoCancelar.addEventListener("click", () => {
  closeCartaoModal();
});

btnCartaoSalvar.addEventListener("click", () => {
  salvarNovoCartao();
});

btnCartaoExtraAdd.addEventListener("click", () => {
  adicionarLinhaCartaoExtra();
});

btnComprar.addEventListener("click", async () => {
  try {
    const payload = construirPayloadCompra();
    await concluirCompra(payload);
    await refreshCartNotice();
    window.location.href = "./perfil.html#pedidos";
  } catch (error) {
    showWarning(error?.message || "Erro ao finalizar compra.");
  }
});

endCep.addEventListener("input", () => {
  endCep.value = formatCep(endCep.value);
});

endNumero.addEventListener("input", () => {
  endNumero.value = onlyDigits(endNumero.value).slice(0, 6);
});

modalCartaoNumero.addEventListener("input", () => {
  modalCartaoNumero.value = formatCardNumber(modalCartaoNumero.value);
});

modalCartaoCvv.addEventListener("input", () => {
  modalCartaoCvv.value = formatCvv(modalCartaoCvv.value);
});

window.addEventListener("cart-updated", () => {
  carregarDados().catch((error) => showWarning(error?.message || "Erro ao atualizar carrinho."));
});

carregarMetadataCheckout();
carregarDados().catch((error) => showWarning(error?.message || "Erro ao carregar dados."));
initCartNotice();
refreshCartNotice();
