const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:4000";

async function expectOk(path) {
  const response = await fetch(`${baseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`Falha em ${path}: HTTP ${response.status}`);
  }

  const body = await response.json();
  return body;
}

async function main() {
  const health = await expectOk("/health");
  const docs = await expectOk("/docs");

  if (health.status !== "ok") {
    throw new Error("/health não retornou status=ok");
  }

  if (!Array.isArray(docs.auth) || !Array.isArray(docs.farms) || !Array.isArray(docs.activities)) {
    throw new Error("/docs não retornou estrutura esperada");
  }

  console.log("Smoke test OK", { baseUrl });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
