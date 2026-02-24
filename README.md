# Agro Gerenciamento

Aplicação simples com frontend e backend para monitorar o status do serviço.

## O que foi corrigido

- Frontend agora consulta o backend por `GET /api/health` usando proxy interno (evita erro de CORS e o acoplamento ao `localhost:4000`).
- Inclusão de suporte a **PWA instalável** com:
  - `manifest.webmanifest`
  - `service-worker.js`
  - ícones do app
  - botão de instalação quando suportado pelo navegador

## Rodar com Docker

```bash
docker compose up --build
```

Serviços:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- PostgreSQL: `localhost:5432`

## Rodar local sem Docker

### Backend

```bash
cd backend
npm install
npm start
```

### Frontend

```bash
cd frontend
npm install
npm start
```

Abra `http://localhost:3000`.

## Instalação como app

No navegador compatível (Chrome/Edge Android/Desktop), abra o frontend e use o botão **Instalar aplicativo** quando aparecer.

## Workflows

- `build-android-debug.yml`: build de APK debug e upload de artefato
- `build-android-release.yml`: build de APK release com assinatura via secrets

## Troubleshooting (quando aparecer "Not Found")

Se o frontend subir mas a raiz ainda mostrar "Not Found", confirme no terminal do frontend as linhas de startup:

- `[agro-frontend] Frontend running on port 3000`
- `[agro-frontend] Serving static files from: .../frontend/public`

Comandos rápidos:

```bash
cd frontend
npm start
```

E em outro terminal:

```bash
curl -I http://localhost:3000/
curl http://localhost:3000/api/health
```
