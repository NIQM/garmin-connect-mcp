# Guía de despliegue — Garmin MCP en Railway

Estado actual: el código local en `C:\Users\Nico\Desktop\Claude\garmin-mcp-remote` ya tiene:
- Transporte HTTP (Streamable HTTP del MCP SDK) además del stdio original
- Dockerfile y railway.json listos
- Build verificado, end-to-end probado contra Garmin real en localhost:3333

**Lo que falta es la parte que no puedo clickear por ti:**

---

## Paso 1 — Forkear el repo en GitHub

1. Abre https://github.com/Nicolasvegam/garmin-connect-mcp
2. Esquina superior derecha → **Fork**
3. Confirma. Te queda en `https://github.com/<tu-usuario>/garmin-connect-mcp`

---

## Paso 2 — Apuntar el repo local a tu fork

En la terminal, en `C:\Users\Nico\Desktop\Claude\garmin-mcp-remote`:

```bash
git remote set-url origin https://github.com/<tu-usuario>/garmin-connect-mcp.git
git remote -v
```

Reemplaza `<tu-usuario>` por tu username de GitHub.

---

## Paso 3 — Commit y push

```bash
git add Dockerfile .dockerignore railway.json package.json package-lock.json src/index.ts DEPLOY.md
git commit -m "Add HTTP transport and Railway deploy config"
git push origin main
```

Si GitHub te pide credenciales, usa un Personal Access Token (Settings → Developer settings → PAT → "repo" scope).

---

## Paso 4 — Cuenta en Railway

1. https://railway.com → **Login** → "Login with GitHub"
2. Autoriza Railway en tu cuenta de GitHub
3. Te encuentras en el dashboard. El plan gratis ("Trial") te da $5 USD de crédito una vez, después es ~$5/mes mínimo (Hobby plan). Para este MCP de uso personal te dura.

---

## Paso 5 — Crear proyecto desde tu repo

1. Dashboard de Railway → **+ New Project** → **Deploy from GitHub repo**
2. Si no aparece tu fork, click **Configure GitHub App** → da acceso a `garmin-connect-mcp`
3. Selecciona tu fork
4. Railway detecta el `railway.json` → empieza a buildear con el Dockerfile automáticamente

---

## Paso 6 — Variables de entorno

Antes que termine el primer build (o después, da igual):

1. Click en el servicio → tab **Variables**
2. Agrega:
   - `GARMIN_EMAIL` = `nquirozmartinez@gmail.com`
   - `GARMIN_PASSWORD` = `Benitox1!`
   - **NO** definas `PORT` — Railway la inyecta automáticamente
3. Railway redeploya solo al guardar.

---

## Paso 7 — Generar dominio público

1. Servicio → **Settings** → **Networking** → **Generate Domain**
2. Te da algo como `garmin-connect-mcp-production-XXXX.up.railway.app`
3. **Esa URL es tu secreto.** No la pegues en chats, repos públicos, ni screenshots. Es lo único que separa tus datos médicos de internet.

---

## Paso 8 — Verificar que está vivo

```bash
curl https://<tu-dominio>.up.railway.app/healthz
```

Debe responder `{"status":"ok"}`.

Test del MCP (la primera llamada despierta el container y reautentica con Garmin, puede tardar 10-30s):

```bash
curl -X POST https://<tu-dominio>.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Deberías ver una lista enorme de tools.

---

## Paso 9 — Registrar Custom Connector en Claude.ai

1. https://claude.ai → click tu avatar → **Settings**
2. **Connectors** (sidebar)
3. Scroll abajo → **Add custom connector**
4. **Name:** `Garmin`
5. **Remote MCP server URL:** `https://<tu-dominio>.up.railway.app/mcp`
6. **Authentication:** deja **None** (sin auth, URL secreta)
7. **Add**
8. Activa el toggle del connector
9. En cualquier chat, abre el menú de tools (🔧) y verás Garmin con sus ~90 tools. Prueba: *"¿cómo dormí anoche según Garmin?"*

> Si Claude.ai exige OAuth y no acepta "None", tienes dos rutas:
> 1. Volver al paso original "OAuth mínimo en server" (opción A que descartamos).
> 2. Usar el conector solo desde Claude Desktop/Code, donde sí acepta endpoints sin auth.

---

## Paso 10 — Limpiar el MCP local

Una vez que el remoto funciona en claude.ai:

1. Quitar de Claude Code: edita `C:\Users\Nico\.claude.json`, borra el bloque `"garmin": { ... }` dentro de `mcpServers` del proyecto `C:/Users/Nico/Desktop/Claude`.
2. Quitar de Claude Desktop: edita `%APPDATA%\Claude\claude_desktop_config.json`, borra el bloque `"garmin"` dentro de `mcpServers`. Reinicia Claude Desktop.

(O dímelo a mí y lo hago yo.)

---

## Troubleshooting

**Railway build falla con "tsup not found":** revisa que `npm ci` en el Dockerfile no esté con `--omit=dev` en la etapa builder. El Dockerfile que dejé está bien.

**Garmin login falla en Railway con 403 / "Login failed":** Garmin a veces bloquea logins desde IPs de datacenter. Si pasa, opciones: (a) usar Garmin con MFA y subir tokens pre-generados (más feo), (b) probar otra región de Railway, (c) pivotar a Fly.io que tiene menos reputación de bot.

**Container se duerme y la primera consulta tarda 30s:** normal en Railway free. Pagar Hobby ($5/mes) o aceptarlo.

**Claude.ai dice "Failed to add connector":** revisa que la URL termine en `/mcp` y que el `curl` del paso 8 funcione desde fuera (no localhost).

**Tu password se cambió en Garmin:** edita la env var en Railway → redeploy automático.
