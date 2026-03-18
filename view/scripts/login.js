import { autenticarEVerificarStatus } from "../../controller/AuthController.js";

const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const loginButton = document.getElementById("login-button");
const messageBox = document.getElementById("login-message");

function setLoading(isLoading) {
  loginButton.disabled = isLoading;
  loginButton.textContent = isLoading ? "ENTRANDO..." : "ACESSAR";
}

function showMessage(text) {
  messageBox.textContent = text;
  messageBox.classList.toggle("is-visible", Boolean(text));
}

async function handleLogin() {
  showMessage("");

  const email = emailInput.value.trim();
  const senha = senhaInput.value;

  if (!email || !senha) {
    showMessage("Informe email e senha para continuar.");
    return;
  }

  setLoading(true);
  try {
    const status = await autenticarEVerificarStatus(email, senha);

    if (status === "ATIVO") {
      window.location.href = "pages/home.html";
      return;
    }

    if (status === "ADMIN") {
      window.location.href = "admpages/homeadm.html";
      return;
    }

    if (status === "INATIVO") {
      showMessage("O usuario atual foi inativado.");
      return;
    }

    showMessage(`Status de usuario desconhecido: ${status}`);
  } catch (error) {
    showMessage(error?.message || "Erro ao autenticar.");
  } finally {
    setLoading(false);
  }
}

loginButton.addEventListener("click", handleLogin);
senhaInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleLogin();
  }
});
