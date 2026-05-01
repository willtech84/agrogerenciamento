const statusEl = document.getElementById("status");
const detailsEl = document.getElementById("details");
const refreshButton = document.getElementById("refresh");

async function loadStatus() {
  statusEl.textContent = "Consultando...";
  statusEl.className = "status";
  detailsEl.textContent = "";

  try {
    const response = await fetch("http://localhost:4000/health");
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
loadStatus();
