import { signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth } from "../../model/firebaseApp.js";
import { buscarClientes, atualizarStatus } from "../../controller/AdminClientesController.js";

const searchInput = document.getElementById("searchInput");
const clientesList = document.getElementById("clientesList");
const logoutButton = document.getElementById("btn-logout");

const statusCheckboxes = Array.from(document.querySelectorAll(".filter-status"));
const generoCheckboxes = Array.from(document.querySelectorAll(".filter-genero"));
const sortButtons = Array.from(document.querySelectorAll(".sort-button"));

const state = {
  search: "",
  status: new Set(),
  genero: new Set(),
  sortField: "",
  sortDir: ""
};

let debounceTimer = null;

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

function updateSortUI() {
  sortButtons.forEach((button) => {
    const icon = button.querySelector(".sort-icon");
    if (button.dataset.field !== state.sortField || !state.sortDir) {
      icon.innerHTML = "";
      return;
    }
    icon.innerHTML = state.sortDir === "down" ? "&darr;" : "&uarr;";
  });
}

async function carregarClientes() {
  const params = {
    q: state.search,
    status: Array.from(state.status).join(","),
    genero: Array.from(state.genero).join(","),
    sortField: state.sortField,
    sortOrder: computeSortOrder(state.sortField, state.sortDir)
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

  state.search = event.target.value.trim();
  scheduleSearch();
});

statusCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      state.status.add(checkbox.value);
    } else {
      state.status.delete(checkbox.value);
    }
    scheduleSearch();
  });
});

generoCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      state.genero.add(checkbox.value);
    } else {
      state.genero.delete(checkbox.value);
    }
    scheduleSearch();
  });
});

sortButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const field = button.dataset.field;
    if (state.sortField !== field) {
      state.sortField = field;
      state.sortDir = "down";
    } else if (state.sortDir === "down") {
      state.sortDir = "up";
    } else {
      state.sortField = "";
      state.sortDir = "";
    }

    updateSortUI();
    scheduleSearch();
  });
});

logoutButton.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } finally {
    window.location.href = "../index.html";
  }
});

updateSortUI();
carregarClientes().catch((error) => {
  clientesList.innerHTML = `<div class="empty-state">${error.message}</div>`;
});
