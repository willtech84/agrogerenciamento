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

## Rodar com um bloco único (Git Bash no Windows)

Se você estiver no Windows/Git Bash e quiser evitar processos antigos e conflitos de porta, use:

```bash
cd /c/agro
./start-local.sh
```

Esse script:
- mata processos `node.exe` antigos,
- instala dependências de backend/frontend,
- sobe backend (`4000`) e frontend (`3001`),
- faz validações rápidas com `curl` e mostra diagnóstico automático se `/` não retornar 200.

Para parar tudo:

```bash
cd /c/agro
./stop-local.sh
```


### Hotfix rápido se ainda ficar 404 na raiz

Se você estiver numa branch/cópia antiga e continuar com `Not Found` em `/`, aplique a correção do servidor estático com:

```bash
cd /c/agro
./apply-hotfix-frontend-404.sh
./start-local.sh
```

## Instalação como app

No navegador compatível (Chrome/Edge Android/Desktop), abra o frontend e use o botão **Instalar aplicativo** quando aparecer.

## Workflows

- `build-android-debug.yml`: build de APK debug e upload de artefato
- `build-android-release.yml`: build de APK release com assinatura via secrets

## Troubleshooting (quando aparecer "Not Found")

Se o frontend subir mas a raiz ainda mostrar "Not Found", confirme no terminal do frontend as linhas de startup:

- `[agro-frontend] Frontend running on port 3001`
- `[agro-frontend] Serving static files from: .../frontend/public`

Comandos rápidos:

```bash
cd /c/agro
./start-local.sh
```

Se quiser parar e limpar portas/processos:

```bash
cd /c/agro
./stop-local.sh
```


Se ainda retornar 404 em `/`, consulte `frontend.log` e confirme se o arquivo em execução é o `frontend/server.js` com logs `[agro-frontend]` e faça `git pull` na branch correta.
