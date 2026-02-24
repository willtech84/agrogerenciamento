const statusEl = document.getElementById("status");
const detailsEl = document.getElementById("details");
const refreshButton = document.getElementById("refresh");
const installButton = document.getElementById("install");

const authDetailsEl = document.getElementById("auth-details");
const farmDetailsEl = document.getElementById("farm-details");
const farmListEl = document.getElementById("farm-list");

const loginEmailEl = document.getElementById("login-email");
const loginPasswordEl = document.getElementById("login-password");
const registerNameEl = document.getElementById("register-name");
const registerEmailEl = document.getElementById("register-email");
const registerPasswordEl = document.getElementById("register-password");
const registerRoleEl = document.getElementById("register-role");

const farmNameEl = document.getElementById("farm-name");
const farmLocationEl = document.getElementById("farm-location");
const farmAreaEl = document.getElementById("farm-area");

const btnLogin = document.getElementById("btn-login");
const btnMe = document.getElementById("btn-me");
const btnLogout = document.getElementById("btn-logout");
const btnRegister = document.getElementById("btn-register");
const btnFarmSave = document.getElementById("btn-farm-save");
const btnFarmClear = document.getElementById("btn-farm-clear");
const btnFarmsRefresh = document.getElementById("btn-farms-refresh");

let deferredInstallPrompt;
let editingFarmId = null;
let authToken = localStorage.getItem("agro_token") || "";

function setAuthDetails(payload) {
  authDetailsEl.textContent = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
}

function setFarmDetails(payload) {
  farmDetailsEl.textContent = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
}

function authHeaders() {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error || `Erro ${response.status}`);
  }

  return data;
}

function clearFarmForm() {
  editingFarmId = null;
  farmNameEl.value = "";
  farmLocationEl.value = "";
  farmAreaEl.value = "";
  btnFarmSave.textContent = "Salvar fazenda";
}

function startFarmEdit(item) {
  editingFarmId = item.id;
  farmNameEl.value = item.name || "";
  farmLocationEl.value = item.location || "";
  farmAreaEl.value = item.areaHectare ?? "";
  btnFarmSave.textContent = "Atualizar fazenda";
}

function renderFarmList(items = []) {
  farmListEl.innerHTML = "";

  if (!items.length) {
    farmListEl.innerHTML = '<p class="muted">Nenhuma fazenda cadastrada.</p>';
    return;
  }

  items.forEach((item) => {
    const el = document.createElement("div");
    el.className = "farm-item";
    el.innerHTML = `
      <strong>${item.name}</strong><br />
      <span class="muted">Local: ${item.location || "-"} | Área: ${item.areaHectare ?? "-"} ha</span><br />
      <span class="muted">Proprietário: ${item.owner?.name || "-"} (${item.owner?.email || "-"})</span>
      <div class="actions">
        <button data-action="edit">Editar</button>
        <button data-action="delete" class="danger">Excluir</button>
      </div>
    `;

    el.querySelector('[data-action="edit"]').addEventListener("click", () => startFarmEdit(item));
    el.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      if (!confirm(`Excluir a fazenda ${item.name}?`)) {
        return;
      }

      try {
        await apiRequest(`/api/farms/${item.id}`, { method: "DELETE" });
        setFarmDetails("Fazenda removida com sucesso.");
        await loadFarms();
      } catch (error) {
        setFarmDetails(error.message);
      }
    });

    farmListEl.appendChild(el);
  });
}

async function loadStatus() {
  statusEl.textContent = "Consultando...";
  statusEl.className = "status";
  detailsEl.textContent = "";

  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    const ok = response.ok && data.status === "ok";

    statusEl.textContent = ok ? "Online" : "Erro";
    statusEl.classList.add(ok ? "ok" : "error");
    detailsEl.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    statusEl.textContent = "Erro";
    statusEl.classList.add("error");
    detailsEl.textContent = error.message;
  }
}

async function loadFarms() {
  if (!authToken) {
    renderFarmList([]);
    setFarmDetails("Faça login para listar fazendas.");
    return;
  }

  try {
    const data = await apiRequest("/api/farms", { method: "GET" });
    renderFarmList(data.items || []);
    setFarmDetails(data);
  } catch (error) {
    setFarmDetails(error.message);
  }
}

async function setupServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);

  if (isLocalhost) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }

    return;
  }

  try {
    await navigator.serviceWorker.register("/service-worker.js");
  } catch (error) {
    console.error("Falha ao registrar service worker", error);
  }
}

refreshButton.addEventListener("click", loadStatus);

btnRegister.addEventListener("click", async () => {
  try {
    const data = await apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: registerNameEl.value,
        email: registerEmailEl.value,
        password: registerPasswordEl.value,
        role: registerRoleEl.value
      })
    });

    authToken = data.token;
    localStorage.setItem("agro_token", authToken);
    setAuthDetails(data);
    await loadFarms();
  } catch (error) {
    setAuthDetails(error.message);
  }
});

btnLogin.addEventListener("click", async () => {
  try {
    const data = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: loginEmailEl.value,
        password: loginPasswordEl.value
      })
    });

    authToken = data.token;
    localStorage.setItem("agro_token", authToken);
    setAuthDetails(data);
    await loadFarms();
  } catch (error) {
    setAuthDetails(error.message);
  }
});

btnMe.addEventListener("click", async () => {
  try {
    const data = await apiRequest("/api/auth/me", { method: "GET" });
    setAuthDetails(data);
  } catch (error) {
    setAuthDetails(error.message);
  }
});

btnLogout.addEventListener("click", () => {
  authToken = "";
  localStorage.removeItem("agro_token");
  setAuthDetails("Sessão encerrada.");
  clearFarmForm();
  renderFarmList([]);
  setFarmDetails("Faça login para gerenciar fazendas.");
});

btnFarmSave.addEventListener("click", async () => {
  if (!authToken) {
    setFarmDetails("Faça login primeiro.");
    return;
  }

  const payload = {
    name: farmNameEl.value,
    location: farmLocationEl.value,
    areaHectare: farmAreaEl.value
  };

  try {
    if (editingFarmId) {
      const data = await apiRequest(`/api/farms/${editingFarmId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      setFarmDetails(data);
    } else {
      const data = await apiRequest("/api/farms", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setFarmDetails(data);
    }

    clearFarmForm();
    await loadFarms();
  } catch (error) {
    setFarmDetails(error.message);
  }
});

btnFarmClear.addEventListener("click", clearFarmForm);
btnFarmsRefresh.addEventListener("click", loadFarms);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) {
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
  installButton.hidden = true;
});

setupServiceWorker();
loadStatus();
loadFarms();
setAuthDetails(authToken ? "Token carregado do navegador. Use 'Meu perfil'." : "Sem sessão. Faça login ou cadastro.");
setFarmDetails("Faça login para gerenciar fazendas.");
