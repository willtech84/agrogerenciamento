const statusEl = document.getElementById("status");
const detailsEl = document.getElementById("details");
const refreshButton = document.getElementById("refresh");
const installButton = document.getElementById("install");

let deferredInstallPrompt;

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

refreshButton.addEventListener("click", loadStatus);

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

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js").catch((error) => {
    console.error("Falha ao registrar service worker", error);
  });
}

loadStatus();
