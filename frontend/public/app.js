const qs = (id) => document.getElementById(id);

const statusEl = qs("status");
const detailsEl = qs("details");
const refreshButton = qs("refresh");
const installButton = qs("install");

const authDetailsEl = qs("auth-details");
const farmDetailsEl = qs("farm-details");
const farmListEl = qs("farm-list");
const plotDetailsEl = qs("plot-details");
const plotListEl = qs("plot-list");
const cropDetailsEl = qs("crop-details");
const cropListEl = qs("crop-list");
const activityDetailsEl = qs("activity-details");
const activityListEl = qs("activity-list");
const reportDetailsEl = qs("report-details");

let authToken = localStorage.getItem("agro_token") || "";
let deferredInstallPrompt;
let editingFarmId = null;
let editingPlotId = null;
let editingCropId = null;
let farmsCache = [];
let plotsCache = [];
let cropsCache = [];

function setText(el, value) {
  el.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
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

function fillSelect(selectEl, items, labelFn, includeEmpty = true) {
  selectEl.innerHTML = "";

  if (includeEmpty) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "--";
    selectEl.appendChild(opt);
  }

  items.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = labelFn(item);
    selectEl.appendChild(opt);
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
    setText(detailsEl, data);
  } catch (error) {
    statusEl.textContent = "Erro";
    statusEl.classList.add("error");
    setText(detailsEl, error.message);
  }
}

function clearFarmForm() {
  editingFarmId = null;
  qs("farm-name").value = "";
  qs("farm-location").value = "";
  qs("farm-area").value = "";
  qs("btn-farm-save").textContent = "Salvar fazenda";
}

function clearPlotForm() {
  editingPlotId = null;
  qs("plot-name").value = "";
  qs("plot-area").value = "";
  qs("btn-plot-save").textContent = "Salvar talhão";
}

function clearCropForm() {
  editingCropId = null;
  qs("crop-name").value = "";
  qs("crop-scientific").value = "";
  qs("crop-cycle").value = "";
  qs("btn-crop-save").textContent = "Salvar cultura";
}

function clearActivityForm() {
  qs("activity-type").value = "PLANTIO";
  qs("activity-date").value = "";
  qs("activity-quantity").value = "";
  qs("activity-unit").value = "";
  qs("activity-notes").value = "";
}

function renderList(target, items, renderItem) {
  target.innerHTML = "";

  if (!items.length) {
    target.innerHTML = '<p class="muted">Nenhum item.</p>';
    return;
  }

  items.forEach((item) => target.appendChild(renderItem(item)));
}

async function loadFarms() {
  if (!authToken) {
    farmsCache = [];
    fillSelect(qs("plot-farm"), [], (v) => v.name);
    fillSelect(qs("activity-farm"), [], (v) => v.name);
    renderList(farmListEl, [], () => document.createElement("div"));
    setText(farmDetailsEl, "Faça login para gerenciar fazendas.");
    return;
  }

  try {
    const data = await apiRequest("/api/farms");
    farmsCache = data.items || [];
    fillSelect(qs("plot-farm"), farmsCache, (farm) => farm.name, false);
    fillSelect(qs("activity-farm"), farmsCache, (farm) => farm.name, false);
    setText(farmDetailsEl, data);

    renderList(farmListEl, farmsCache, (item) => {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `<strong>${item.name}</strong><br><span class="muted">${item.location || "-"} | ${item.areaHectare ?? "-"} ha</span>`;

      const actions = document.createElement("div");
      actions.className = "actions";

      const edit = document.createElement("button");
      edit.textContent = "Editar";
      edit.onclick = () => {
        editingFarmId = item.id;
        qs("farm-name").value = item.name || "";
        qs("farm-location").value = item.location || "";
        qs("farm-area").value = item.areaHectare ?? "";
        qs("btn-farm-save").textContent = "Atualizar fazenda";
      };

      const del = document.createElement("button");
      del.className = "danger";
      del.textContent = "Excluir";
      del.onclick = async () => {
        try {
          await apiRequest(`/api/farms/${item.id}`, { method: "DELETE" });
          await loadFarms();
          await loadPlots();
          await loadActivities();
        } catch (error) {
          setText(farmDetailsEl, error.message);
        }
      };

      actions.append(edit, del);
      el.appendChild(actions);
      return el;
    });

    await loadPlots();
    await loadActivities();
  } catch (error) {
    setText(farmDetailsEl, error.message);
  }
}

async function loadPlots() {
  if (!authToken) {
    plotsCache = [];
    fillSelect(qs("activity-plot"), [], (plot) => plot.name);
    renderList(plotListEl, [], () => document.createElement("div"));
    setText(plotDetailsEl, "Faça login para gerenciar talhões.");
    return;
  }

  const farmId = qs("plot-farm").value || qs("activity-farm").value;
  if (!farmId) {
    plotsCache = [];
    fillSelect(qs("activity-plot"), [], (plot) => plot.name);
    setText(plotDetailsEl, "Selecione uma fazenda para listar talhões.");
    renderList(plotListEl, [], () => document.createElement("div"));
    return;
  }

  try {
    const data = await apiRequest(`/api/plots?farmId=${encodeURIComponent(farmId)}`);
    plotsCache = data.items || [];
    fillSelect(qs("activity-plot"), plotsCache, (plot) => plot.name);
    setText(plotDetailsEl, data);

    renderList(plotListEl, plotsCache, (item) => {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `<strong>${item.name}</strong><br><span class="muted">Área: ${item.areaHectare ?? "-"} ha</span>`;
      const actions = document.createElement("div");
      actions.className = "actions";

      const edit = document.createElement("button");
      edit.textContent = "Editar";
      edit.onclick = () => {
        editingPlotId = item.id;
        qs("plot-name").value = item.name || "";
        qs("plot-area").value = item.areaHectare ?? "";
        qs("plot-farm").value = item.farmId;
        qs("btn-plot-save").textContent = "Atualizar talhão";
      };

      const del = document.createElement("button");
      del.className = "danger";
      del.textContent = "Excluir";
      del.onclick = async () => {
        try {
          await apiRequest(`/api/plots/${item.id}`, { method: "DELETE" });
          await loadPlots();
          await loadActivities();
        } catch (error) {
          setText(plotDetailsEl, error.message);
        }
      };

      actions.append(edit, del);
      el.appendChild(actions);
      return el;
    });
  } catch (error) {
    setText(plotDetailsEl, error.message);
  }
}

async function loadCrops() {
  if (!authToken) {
    cropsCache = [];
    fillSelect(qs("activity-crop"), [], (crop) => crop.name);
    renderList(cropListEl, [], () => document.createElement("div"));
    setText(cropDetailsEl, "Faça login para gerenciar culturas.");
    return;
  }

  try {
    const data = await apiRequest("/api/crops");
    cropsCache = data.items || [];
    fillSelect(qs("activity-crop"), cropsCache, (crop) => crop.name);
    setText(cropDetailsEl, data);

    renderList(cropListEl, cropsCache, (item) => {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `<strong>${item.name}</strong><br><span class="muted">${item.scientificName || "-"} | ciclo: ${item.cycleDays ?? "-"} dias</span>`;
      const actions = document.createElement("div");
      actions.className = "actions";

      const edit = document.createElement("button");
      edit.textContent = "Editar";
      edit.onclick = () => {
        editingCropId = item.id;
        qs("crop-name").value = item.name || "";
        qs("crop-scientific").value = item.scientificName || "";
        qs("crop-cycle").value = item.cycleDays ?? "";
        qs("btn-crop-save").textContent = "Atualizar cultura";
      };

      const del = document.createElement("button");
      del.className = "danger";
      del.textContent = "Excluir";
      del.onclick = async () => {
        try {
          await apiRequest(`/api/crops/${item.id}`, { method: "DELETE" });
          await loadCrops();
        } catch (error) {
          setText(cropDetailsEl, error.message);
        }
      };

      actions.append(edit, del);
      el.appendChild(actions);
      return el;
    });
  } catch (error) {
    setText(cropDetailsEl, error.message);
  }
}

async function loadActivities() {
  if (!authToken) {
    renderList(activityListEl, [], () => document.createElement("div"));
    setText(activityDetailsEl, "Faça login para gerenciar atividades.");
    return;
  }

  try {
    const farmId = qs("activity-farm").value;
    const params = new URLSearchParams();
    if (farmId) params.set("farmId", farmId);

    const data = await apiRequest(`/api/activities${params.toString() ? `?${params}` : ""}`);
    setText(activityDetailsEl, data);

    renderList(activityListEl, data.items || [], (item) => {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `<strong>${item.type}</strong> - ${new Date(item.date).toLocaleDateString("pt-BR")}<br>
      <span class="muted">Fazenda: ${item.farm?.name || "-"} | Talhão: ${item.plot?.name || "-"} | Cultura: ${item.crop?.name || "-"}</span><br>
      <span class="muted">Qtd: ${item.quantity ?? "-"} ${item.unit || ""}</span><br>
      <span class="muted">Obs: ${item.notes || "-"}</span>`;

      const actions = document.createElement("div");
      actions.className = "actions";
      const del = document.createElement("button");
      del.className = "danger";
      del.textContent = "Excluir";
      del.onclick = async () => {
        try {
          await apiRequest(`/api/activities/${item.id}`, { method: "DELETE" });
          await loadActivities();
        } catch (error) {
          setText(activityDetailsEl, error.message);
        }
      };
      actions.append(del);
      el.appendChild(actions);
      return el;
    });
  } catch (error) {
    setText(activityDetailsEl, error.message);
  }
}

async function setupServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (isLocalhost) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    }
    return;
  }

  try {
    await navigator.serviceWorker.register("/service-worker.js");
  } catch (error) {
    console.error("Falha ao registrar service worker", error);
  }
}

qs("btn-register").addEventListener("click", async () => {
  try {
    const data = await apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: qs("register-name").value,
        email: qs("register-email").value,
        password: qs("register-password").value,
        role: qs("register-role").value
      })
    });

    authToken = data.token;
    localStorage.setItem("agro_token", authToken);
    setText(authDetailsEl, data);
    await loadFarms();
    await loadCrops();
  } catch (error) {
    setText(authDetailsEl, error.message);
  }
});

qs("btn-login").addEventListener("click", async () => {
  try {
    const data = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: qs("login-email").value, password: qs("login-password").value })
    });

    authToken = data.token;
    localStorage.setItem("agro_token", authToken);
    setText(authDetailsEl, data);
    await loadFarms();
    await loadCrops();
  } catch (error) {
    setText(authDetailsEl, error.message);
  }
});

qs("btn-me").addEventListener("click", async () => {
  try {
    const data = await apiRequest("/api/auth/me");
    setText(authDetailsEl, data);
  } catch (error) {
    setText(authDetailsEl, error.message);
  }
});

qs("btn-logout").addEventListener("click", () => {
  authToken = "";
  localStorage.removeItem("agro_token");
  farmsCache = [];
  plotsCache = [];
  cropsCache = [];
  fillSelect(qs("plot-farm"), [], (v) => v.name);
  fillSelect(qs("activity-farm"), [], (v) => v.name);
  fillSelect(qs("activity-plot"), [], (v) => v.name);
  fillSelect(qs("activity-crop"), [], (v) => v.name);
  clearFarmForm();
  clearPlotForm();
  clearCropForm();
  clearActivityForm();
  setText(authDetailsEl, "Sessão encerrada.");
});

qs("btn-farm-save").addEventListener("click", async () => {
  try {
    const payload = { name: qs("farm-name").value, location: qs("farm-location").value, areaHectare: qs("farm-area").value };
    if (editingFarmId) {
      await apiRequest(`/api/farms/${editingFarmId}`, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      await apiRequest("/api/farms", { method: "POST", body: JSON.stringify(payload) });
    }

    clearFarmForm();
    await loadFarms();
  } catch (error) {
    setText(farmDetailsEl, error.message);
  }
});

qs("btn-plot-save").addEventListener("click", async () => {
  try {
    const payload = { name: qs("plot-name").value, areaHectare: qs("plot-area").value, farmId: qs("plot-farm").value };
    if (editingPlotId) {
      await apiRequest(`/api/plots/${editingPlotId}`, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      await apiRequest("/api/plots", { method: "POST", body: JSON.stringify(payload) });
    }

    clearPlotForm();
    await loadPlots();
  } catch (error) {
    setText(plotDetailsEl, error.message);
  }
});

qs("btn-crop-save").addEventListener("click", async () => {
  try {
    const payload = {
      name: qs("crop-name").value,
      scientificName: qs("crop-scientific").value,
      cycleDays: qs("crop-cycle").value
    };

    if (editingCropId) {
      await apiRequest(`/api/crops/${editingCropId}`, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      await apiRequest("/api/crops", { method: "POST", body: JSON.stringify(payload) });
    }

    clearCropForm();
    await loadCrops();
  } catch (error) {
    setText(cropDetailsEl, error.message);
  }
});

qs("btn-activity-save").addEventListener("click", async () => {
  try {
    const payload = {
      type: qs("activity-type").value,
      date: qs("activity-date").value,
      farmId: qs("activity-farm").value,
      plotId: qs("activity-plot").value || null,
      cropId: qs("activity-crop").value || null,
      quantity: qs("activity-quantity").value,
      unit: qs("activity-unit").value,
      notes: qs("activity-notes").value
    };

    await apiRequest("/api/activities", { method: "POST", body: JSON.stringify(payload) });
    clearActivityForm();
    await loadActivities();
  } catch (error) {
    setText(activityDetailsEl, error.message);
  }
});

qs("btn-report-summary").addEventListener("click", async () => {
  try {
    const farmId = qs("activity-farm").value;
    const data = await apiRequest(`/api/reports/activities-summary${farmId ? `?farmId=${farmId}` : ""}`);
    setText(reportDetailsEl, data);
  } catch (error) {
    setText(reportDetailsEl, error.message);
  }
});

qs("btn-report-crop").addEventListener("click", async () => {
  try {
    const data = await apiRequest("/api/reports/activities-by-crop");
    setText(reportDetailsEl, data);
  } catch (error) {
    setText(reportDetailsEl, error.message);
  }
});

refreshButton.addEventListener("click", loadStatus);
qs("btn-farm-clear").addEventListener("click", clearFarmForm);
qs("btn-farms-refresh").addEventListener("click", loadFarms);
qs("btn-plot-clear").addEventListener("click", clearPlotForm);
qs("btn-plots-refresh").addEventListener("click", loadPlots);
qs("btn-crop-clear").addEventListener("click", clearCropForm);
qs("btn-crops-refresh").addEventListener("click", loadCrops);
qs("btn-activity-clear").addEventListener("click", clearActivityForm);
qs("btn-activities-refresh").addEventListener("click", loadActivities);
qs("plot-farm").addEventListener("change", loadPlots);
qs("activity-farm").addEventListener("change", async () => {
  qs("plot-farm").value = qs("activity-farm").value;
  await loadPlots();
  await loadActivities();
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
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
loadCrops();
loadActivities();
setText(authDetailsEl, authToken ? "Token carregado do navegador. Use 'Meu perfil'." : "Sem sessão. Faça login ou cadastro.");
setText(farmDetailsEl, "Faça login para gerenciar fazendas.");
setText(plotDetailsEl, "Faça login para gerenciar talhões.");
setText(cropDetailsEl, "Faça login para gerenciar culturas.");
setText(activityDetailsEl, "Faça login para gerenciar atividades.");
setText(reportDetailsEl, "Selecione uma ação de relatório.");
