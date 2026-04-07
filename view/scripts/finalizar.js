import {
  carregarPerfil,
  carregarEnderecos,
  carregarCartoes,
  carregarMetadataPerfil,
  adicionarEndereco
} from "../../controller/PerfilController.js";
import { carregarCarrinho } from "../../controller/CarrinhoController.js";
import { carregarCupons } from "../../controller/CupomController.js";
import { initCartNotice, refreshCartNotice, showCartPopup } from "./cart-notice.js";

const perfilButton = document.getElementById("perfil-btn");
const carrinhoButton = document.getElementById("btn-carrinho");
const itemsList = document.getElementById("checkout-items-list");
const enderecoSelect = document.getElementById("endereco-select");
const enderecoInfo = document.getElementById("endereco-info");
const btnEnderecoAdd = document.getElementById("btn-endereco-add");
const cartaoEmpty = document.getElementById("cartao-empty");
const cartaoPrincipalSelect = document.getElementById("cartao-principal");
const cartaoExtraToggle = document.getElementById("cartao-extra-toggle");
const cartaoExtraRow = document.getElementById("cartao-extra-row");
const cartaoExtraSelect = document.getElementById("cartao-extra");
const cartaoExtraValor = document.getElementById("cartao-extra-valor");
const cartaoMsg = document.getElementById("cartao-msg");
const cupomPromoSelect = document.getElementById("cupom-promo");
const cupomPromoMsg = document.getElementById("cupom-promo-msg");
const cupomTrocaList = document.getElementById("cupom-troca-list");
const totalsBox = document.getElementById("checkout-totals");

const modal = document.getElementById("endereco-modal");
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

const cepRegex = /^\d{5}-\d{3}$/;

let carrinhoItens = [];
let enderecos = [];
let cartoes = [];
let cuponsPromo = [];
let cuponsTroca = [];
let selectedTroca = new Set();

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
  return value.replace(/\D/g, "");
}

function formatCep(value) {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) {
    return digits;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
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
          if (overlay) overlay.classList.add("hidden");
        }
      }
    ]
  });
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
  if (!endereco) {
    enderecoInfo.textContent = "";
    return;
  }
  enderecoInfo.textContent = `${endereco.cidade}/${endereco.estado} - CEP ${endereco.cep}`;
}

function renderCartoes() {
  cartaoPrincipalSelect.innerHTML = "";
  cartaoExtraSelect.innerHTML = "";
  cartaoMsg.textContent = "";

  if (!cartoes.length) {
    cartaoEmpty.classList.remove("hidden");
    cartaoPrincipalSelect.disabled = true;
    cartaoExtraToggle.disabled = true;
    cartaoExtraRow.classList.add("hidden");
    return;
  }

  cartaoEmpty.classList.add("hidden");
  cartaoPrincipalSelect.disabled = false;
  cartaoExtraToggle.disabled = false;

  const preferencial = cartoes.find((item) => item.preferencial) || cartoes[0];

  cartoes.forEach((cartao) => {
    const option = document.createElement("option");
    option.value = cartao.id;
    option.textContent = `${cartao.bandeira?.nome || "CARTAO"} •••• ${cartao.numero.slice(-4)}`;
    cartaoPrincipalSelect.appendChild(option);
  });

  cartaoPrincipalSelect.value = preferencial.id;
  updateCartaoExtraOptions();
}

function updateCartaoExtraOptions() {
  cartaoExtraSelect.innerHTML = "";
  const principalId = cartaoPrincipalSelect.value;
  const options = cartoes.filter((cartao) => cartao.id !== principalId);
  options.forEach((cartao) => {
    const option = document.createElement("option");
    option.value = cartao.id;
    option.textContent = `${cartao.bandeira?.nome || "CARTAO"} •••• ${cartao.numero.slice(-4)}`;
    cartaoExtraSelect.appendChild(option);
  });
  if (options.length) {
    cartaoExtraSelect.value = options[0].id;
  }
  if (!options.length) {
    cartaoExtraToggle.checked = false;
    cartaoExtraRow.classList.add("hidden");
  }
}

function renderCupons() {
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
  if (!id) return null;
  return cuponsPromo.find((cupom) => cupom.id === id) || null;
}

function calcularTotais() {
  const totalProdutos = carrinhoItens
    .filter((item) => Number(item.quantidade || 0) > 0)
    .reduce((acc, item) => acc + Number(item.precoTotal || 0), 0);

  const endereco = enderecos.find((item) => item.id === enderecoSelect.value);
  const frete = endereco ? calcularFrete(endereco.cep) : 0;
  const totalBruto = totalProdutos + frete;

  const trocaTotal = cuponsTroca.reduce((acc, cupom) => {
    if (selectedTroca.has(cupom.id)) {
      return acc + Number(cupom.valor || 0);
    }
    return acc;
  }, 0);

  const trocaAplicada = Math.min(trocaTotal, totalBruto);
  const trocaSobra = Math.max(trocaTotal - totalBruto, 0);
  const restanteAposTroca = Math.max(totalBruto - trocaAplicada, 0);

  let promoDesconto = 0;
  let promoMsg = "";
  const promo = obterCupomPromoSelecionado();
  if (promo) {
    const tipo = normalizeTexto(promo.tipo?.nome || "");
    if (tipo === "DESCONTO") {
      promoDesconto = Math.min(Number(promo.valor || 0), restanteAposTroca);
    } else if (tipo === "FRETE GRATIS") {
      if (totalProdutos >= Number(promo.valor || 0)) {
        promoDesconto = Math.min(frete, restanteAposTroca);
      } else {
        promoMsg = "Cupom nao aplicavel (valor minimo nao atingido).";
      }
    }
  }

  const restanteAposPromo = Math.max(restanteAposTroca - promoDesconto, 0);

  return {
    totalProdutos,
    frete,
    totalBruto,
    trocaTotal,
    trocaAplicada,
    trocaSobra,
    promoDesconto,
    promoMsg,
    restanteAposPromo
  };
}

function atualizarCuponsTrocaDisponiveis(totalBruto) {
  const trocaTotal = cuponsTroca.reduce((acc, cupom) => {
    if (selectedTroca.has(cupom.id)) {
      return acc + Number(cupom.valor || 0);
    }
    return acc;
  }, 0);

  const bloquearNovos = trocaTotal >= totalBruto && totalBruto > 0;
  const checkboxes = cupomTrocaList.querySelectorAll("input[type='checkbox']");
  checkboxes.forEach((checkbox) => {
    if (!checkbox.checked) {
      checkbox.disabled = bloquearNovos;
    } else {
      checkbox.disabled = false;
    }
  });
}

function atualizarResumo() {
  const totais = calcularTotais();
  cupomPromoMsg.textContent = totais.promoMsg || "";
  atualizarCuponsTrocaDisponiveis(totais.totalBruto);
  const pagamentos = atualizarCartoes(totais);
  renderTotais(totais, pagamentos);
}

function atualizarCartoes(totais) {
  cartaoMsg.textContent = "";
  if (!cartoes.length) {
    cartaoEmpty.classList.remove("hidden");
    cartaoExtraToggle.checked = false;
    cartaoExtraRow.classList.add("hidden");
    return { principal: 0, adicional: 0 };
  }

  cartaoEmpty.classList.add("hidden");
  if (totais.restanteAposPromo <= 0) {
    cartaoExtraToggle.checked = false;
    cartaoExtraRow.classList.add("hidden");
    cartaoMsg.textContent = "Compra coberta pelos cupons.";
    return { principal: 0, adicional: 0 };
  }

  const restante = totais.restanteAposPromo;
  const podeUsarExtra = cartoes.length >= 2 && restante >= 20;
  cartaoExtraToggle.disabled = !podeUsarExtra;
  if (!podeUsarExtra) {
    cartaoExtraToggle.checked = false;
    cartaoExtraRow.classList.add("hidden");
    if (cartoes.length >= 2 && restante < 20) {
      cartaoMsg.textContent = "Valor restante menor que R$ 20. Segundo cartao removido.";
    }
  }

  let adicional = 0;
  if (cartaoExtraToggle.checked && podeUsarExtra) {
    cartaoExtraRow.classList.remove("hidden");
    const valorInformado = Number(cartaoExtraValor.value || 0);
    const maxAdicional = restante - 10;
    adicional = Number.isFinite(valorInformado) ? valorInformado : 0;
    if (adicional < 10) {
      adicional = 10;
    }
    if (adicional > maxAdicional) {
      adicional = maxAdicional;
    }
    cartaoExtraValor.value = adicional ? adicional.toFixed(2) : "";
  } else {
    cartaoExtraRow.classList.add("hidden");
    cartaoExtraValor.value = "";
  }

  const principal = Math.max(restante - adicional, 0);
  return { principal, adicional };
}

function renderTotais(totais, pagamentos) {
  const lines = [
    `Total produtos: ${formatCurrency(totais.totalProdutos)}`,
    `Frete: ${formatCurrency(totais.frete)}`,
    `Cupom troca: -${formatCurrency(totais.trocaAplicada)}`
  ];

  if (totais.trocaSobra > 0) {
    lines.push(`Sobra cupons troca: ${formatCurrency(totais.trocaSobra)}`);
  }

  lines.push(`Cupom promocional: -${formatCurrency(totais.promoDesconto)}`);

  if (pagamentos.adicional > 0) {
    lines.push(`Cartao adicional: ${formatCurrency(pagamentos.adicional)}`);
    lines.push(`Cartao principal: ${formatCurrency(pagamentos.principal)}`);
  } else {
    lines.push(`Cartao principal: ${formatCurrency(pagamentos.principal)}`);
  }

  totalsBox.innerHTML = lines.map((line) => `<div>${line}</div>`).join("");
}

function openEnderecoModal() {
  enderecoModalMsg.textContent = "";
  endPais.value = endPais.value || "Brasil";
  modal.classList.remove("hidden");
}

function closeEnderecoModal() {
  modal.classList.add("hidden");
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
    }
    updateEnderecoInfo();
    atualizarResumo();
  } catch (error) {
    enderecoModalMsg.textContent = error?.message || "Erro ao cadastrar endereco.";
  }
}

async function carregarDados() {
  const carrinho = await carregarCarrinho();
  carrinhoItens = carrinho?.itens || [];
  renderItems();

  await new Promise((resolve) => {
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

  await new Promise((resolve) => {
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

  await new Promise((resolve) => {
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

  atualizarResumo();
}

function carregarMetadataEndereco() {
  carregarMetadataPerfil()
    .then((data) => {
      const tipoResidencias = data?.tipoResidencias || [];
      const tipoLogradouros = data?.tipoLogradouros || [];
      endTipoResidencia.innerHTML = "";
      endTipoLogradouro.innerHTML = "";
      tipoResidencias.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = item.nome;
        endTipoResidencia.appendChild(option);
      });
      tipoLogradouros.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = item.sigla ? `${item.nome} (${item.sigla})` : item.nome;
        endTipoLogradouro.appendChild(option);
      });
    })
    .catch((error) => {
      showWarning(error?.message || "Erro ao carregar metadata.");
    });
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
  updateCartaoExtraOptions();
  atualizarResumo();
});

cartaoExtraToggle.addEventListener("change", () => {
  atualizarResumo();
});

cartaoExtraSelect.addEventListener("change", () => {
  atualizarResumo();
});

cartaoExtraValor.addEventListener("input", () => {
  cartaoExtraValor.value = cartaoExtraValor.value.replace(/[^\d.,]/g, "").replace(",", ".");
});

cartaoExtraValor.addEventListener("blur", () => {
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

endCep.addEventListener("input", () => {
  endCep.value = formatCep(endCep.value);
});

endNumero.addEventListener("input", () => {
  endNumero.value = onlyDigits(endNumero.value).slice(0, 6);
});

window.addEventListener("cart-updated", () => {
  carregarDados().catch((error) => showWarning(error?.message || "Erro ao atualizar carrinho."));
});

carregarMetadataEndereco();
carregarDados().catch((error) => showWarning(error?.message || "Erro ao carregar dados."));
initCartNotice();
refreshCartNotice();
