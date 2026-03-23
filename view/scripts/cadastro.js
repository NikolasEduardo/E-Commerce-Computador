import {
  obterMetadataCadastro,
  validarEmailECpf,
  registrarNovoUsuario
} from "../../controller/CadastroController.js";

const step1 = document.getElementById("step-1");
const step2 = document.getElementById("step-2");
const messageBox = document.getElementById("cadastro-message");

const btnNext = document.getElementById("btn-next");
const btnBack = document.getElementById("btn-back");
const btnSubmit = document.getElementById("btn-submit");

const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const cepRegex = /^\d{5}-\d{3}$/;
const emailRegex = /^[^@\s]+@[^@\s]+$/;
const senhaRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

function setMessage(text) {
  messageBox.textContent = text;
  messageBox.classList.toggle("is-visible", Boolean(text));
}

function setLoading(button, isLoading, label) {
  button.disabled = isLoading;
  button.textContent = isLoading ? "AGUARDE..." : label;
}

function showStep(step) {
  if (step === 1) {
    step1.classList.remove("hidden");
    step2.classList.add("hidden");
  } else {
    step1.classList.add("hidden");
    step2.classList.remove("hidden");
  }
}

function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function onlyDigits(value) {
  return value.replace(/\D/g, "");
}

function formatCpf(value) {
  const digits = onlyDigits(value).slice(0, 11);
  let formatted = digits;
  if (digits.length > 3) formatted = `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length > 6) formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  if (digits.length > 9) formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  return formatted;
}

function formatCep(value) {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) {
    return digits;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function formatPhoneNumber(value, max = 9) {
  const digits = onlyDigits(value).slice(0, max);
  return digits;
}

function enforceSingleAt(value) {
  const parts = value.split("@");
  if (parts.length <= 2) {
    return value;
  }
  return `${parts[0]}@${parts.slice(1).join("")}`;
}

function validateStep1() {
  const nome = getValue("nome");
  const cpf = getValue("cpf");
  const dataNascimento = getValue("dataNascimento");
  const genero = getValue("genero");
  const telefoneTipo = getValue("telefoneTipo");
  const telefoneDdd = getValue("telefoneDdd");
  const telefoneNumero = getValue("telefoneNumero");
  const email = getValue("email");
  const senha = getValue("senha");
  const senhaConfirmar = getValue("senhaConfirmar");

  if (!nome || !cpf || !dataNascimento || !genero || !telefoneTipo || !telefoneDdd || !telefoneNumero || !email || !senha) {
    return "Preencha todos os campos da primeira etapa.";
  }

  if (!cpfRegex.test(cpf)) {
    return "CPF invalido. Use o formato 000.000.000-00.";
  }

  if (!emailRegex.test(email)) {
    return "Email invalido. Use um formato com apenas um @.";
  }

  if (!senhaRegex.test(senha)) {
    return "Senha fraca. Minimo 8 caracteres, 1 maiusculo, 1 minusculo e 1 especial.";
  }

  if (senha !== senhaConfirmar) {
    return "As senhas nao conferem.";
  }

  return null;
}

function validateStep2() {
  const cep = getValue("cep");
  const estado = getValue("estado");
  const bairro = getValue("bairro");
  const tipoLogradouro = getValue("tipoLogradouro");
  const tipoResidencia = getValue("tipoResidencia");
  const logradouro = getValue("logradouro");
  const numero = getValue("numero");
  const cidade = getValue("cidade");
  const pais = getValue("pais");

  if (
    !cep ||
    !estado ||
    !bairro ||
    !tipoLogradouro ||
    !tipoResidencia ||
    !logradouro ||
    !numero ||
    !cidade ||
    !pais
  ) {
    return "Preencha todos os campos de endereco.";
  }

  if (!cepRegex.test(cep)) {
    return "CEP invalido. Use o formato 00000-000.";
  }

  return null;
}

async function carregarMetadata() {
  try {
    const data = await obterMetadataCadastro();
    const tiposTelefone = data?.tipoTelefones || [];
    const tiposResidencia = data?.tipoResidencias || [];
    const tiposLogradouro = data?.tipoLogradouros || [];

    const telefoneSelect = document.getElementById("telefoneTipo");
    const residenciaSelect = document.getElementById("tipoResidencia");
    const logradouroSelect = document.getElementById("tipoLogradouro");

    tiposTelefone.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.nome;
      telefoneSelect.appendChild(option);
    });

    tiposResidencia.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.nome;
      residenciaSelect.appendChild(option);
    });

    tiposLogradouro.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.sigla ? `${item.nome} (${item.sigla})` : item.nome;
      logradouroSelect.appendChild(option);
    });
  } catch (error) {
    setMessage(error?.message || "Erro ao carregar dados do cadastro.");
  }
}

const cpfInput = document.getElementById("cpf");
const cepInput = document.getElementById("cep");
const telefoneDddInput = document.getElementById("telefoneDdd");
const telefoneNumeroInput = document.getElementById("telefoneNumero");
const numeroEnderecoInput = document.getElementById("numero");
const emailInput = document.getElementById("email");

cpfInput.addEventListener("input", (event) => {
  event.target.value = formatCpf(event.target.value);
});

cepInput.addEventListener("input", (event) => {
  event.target.value = formatCep(event.target.value);
});

telefoneDddInput.addEventListener("input", (event) => {
  event.target.value = formatPhoneNumber(event.target.value, 2);
});

telefoneNumeroInput.addEventListener("input", (event) => {
  event.target.value = formatPhoneNumber(event.target.value, 9);
});

numeroEnderecoInput.addEventListener("input", (event) => {
  event.target.value = formatPhoneNumber(event.target.value, 8);
});

emailInput.addEventListener("input", (event) => {
  event.target.value = enforceSingleAt(event.target.value);
});

btnNext.addEventListener("click", async () => {
  setMessage("");
  const error = validateStep1();
  if (error) {
    setMessage(error);
    return;
  }

  setLoading(btnNext, true, "PROXIMO");
  try {
    const email = getValue("email");
    const cpf = getValue("cpf");
    const validation = await validarEmailECpf(email, cpf);

    if (validation.emailExists) {
      setMessage("Email ja cadastrado.");
      return;
    }
    if (validation.cpfExists) {
      setMessage("CPF ja cadastrado.");
      return;
    }

    showStep(2);
  } catch (error) {
    setMessage(error?.message || "Erro ao validar email e CPF.");
  } finally {
    setLoading(btnNext, false, "PROXIMO");
  }
});

btnBack.addEventListener("click", () => {
  setMessage("");
  showStep(1);
});

btnSubmit.addEventListener("click", async () => {
  setMessage("");
  const error = validateStep2();
  if (error) {
    setMessage(error);
    return;
  }

  setLoading(btnSubmit, true, "CADASTRAR");
  try {
    const payload = {
      email: getValue("email"),
      senha: getValue("senha"),
      usuario: {
        nome: getValue("nome"),
        cpf: getValue("cpf"),
        dataNascimento: getValue("dataNascimento"),
        genero: getValue("genero"),
        email: getValue("email")
      },
      telefone: {
        tipoId: getValue("telefoneTipo"),
        ddd: getValue("telefoneDdd"),
        numero: getValue("telefoneNumero")
      },
      endereco: {
        tipoLogradouroId: getValue("tipoLogradouro"),
        tipoResidenciaId: getValue("tipoResidencia"),
        logradouro: getValue("logradouro"),
        numero: getValue("numero"),
        bairro: getValue("bairro"),
        cep: getValue("cep"),
        cidade: getValue("cidade"),
        estado: getValue("estado"),
        pais: getValue("pais"),
        observacoes: getValue("observacoes")
      }
    };

    await registrarNovoUsuario(payload);
    setMessage("Cadastro concluido com sucesso.");
    setTimeout(() => {
      window.location.href = "../index.html";
    }, 1200);
  } catch (error) {
    setMessage(error?.message || "Erro ao cadastrar usuario.");
  } finally {
    setLoading(btnSubmit, false, "CADASTRAR");
  }
});

carregarMetadata();
