# Come creare un'app perfetta per Adestio

Questa guida spiega, in dettaglio e senza teoria astratta, come costruire un'applicazione di terze parti per Adestio che funzioni davvero al primo avvio — sulla base di errori reali commessi e corretti nella pratica. Se segui questi passi nell'ordine, eviti tutte le trappole che ci hanno fatto perdere tempo.

## 0. Prima regola: dove vive l'app

L'app va creata **qui**, in `Adestio-Marketplace/App-<Nome>/`. **Mai** dentro il repository `Adestio` (`src/apps/`) — quella cartella è riservata alle app "core" cablate a mano nel codice del container. Un'app di terze parti deve poter essere installata/disinstallata/aggiornata dallo Store senza che il codice di Adestio sappia nulla di lei in anticipo.

## 1. Struttura della cartella

```
App-Nome/
├── manifest.json          # obbligatorio
├── app.js                 # entry point frontend (hub + dispatch ai moduli)
├── backend.js             # entry point backend (registerBackendHandlers)
├── migrations.js           # schema SQL del database isolato dell'app
├── package.json            # SOLO se servono librerie pure-JS (pdfkit, xlsx, ...)
├── css/
│   └── style.css          # unica fonte di stile per tutte le schermate dell'app
├── modules/                # una schermata per file, caricate a runtime
│   ├── dashboard.js
│   └── ...
├── shared/                  # kit UI/API condiviso tra i moduli
│   ├── api.js              # ponte verso il backend (vedi §5)
│   ├── ui_kit.js
│   └── crud_kit.js
└── backend/                 # logica di dominio, un file per entità
    ├── db_utils.js
    ├── calc.js
    └── ...
```

## 2. Il `manifest.json`

```json
{
    "id": "nome_univoco_app",
    "name": "Nome Leggibile",
    "description": "Una riga per la card dello Store.",
    "icon": "business_center",
    "main": "app.js",
    "color": "#2563eb",
    "version": "1.0.0",
    "author": "Nome Sviluppatore",
    "category": "erp",
    "backend": "backend.js",
    "db": {
        "namespace": "nome_univoco_app",
        "migrations": "./migrations.js"
    },
    "ipc": { "namespace": "nomeUnivoco" },
    "permissions": ["nomeUnivoco:*"]
}
```

Punti da non sbagliare:
- `"icon"`: se non contiene un punto (niente estensione), viene trattato come nome di icona Material Symbols (`business_center`, `request_quote`, ...) — non serve un file immagine.
- `"db.migrations"` è **relativo alla cartella dell'app**, non a `Adestio/backend/migrations/`. Il file `migrations.js` va messo alla radice della cartella dell'app.
- **Non** aggiungere mai `"bundled": true` al manifest reale — è una scorciatoia di solo-test (vedi §8) che rompe il caricamento del frontend se lasciata per sbaglio.
- **`"permissions"` non è per il sistema RBAC**: è l'elenco di scope-string che il `capabilityBroker` mette dentro il token dell'app (`generateAppToken`, `backend/security/capabilityBroker.js`) — stringhe semplici tipo `"nomeUnivoco:*"`, mai oggetti. Se la tua app vuole invece dei toggle per-funzionalità nella schermata Amministratore → RBAC (visibili/gestibili da un admin per utente o gruppo), usa un campo **separato** `"rbacPermissions"`, formato `[{ "id": "view", "label": "Visualizza", "default": true }, ...]` — è opzionale e va aggiunto solo se ti serve davvero quel livello di granularità; `syncPermissionsFromManifests` (`Adestio/backend/handlers/rbac.js`) lo legge sia dalle app core sia da quelle di terze parti installate. Non confondere i due campi: mescolarli produceva in passato voci fantasma tipo `"<tuoId>:undefined"` nella tabella permessi.

## 3. Il database — isolato, cifrato, senza driver nativi

Adestio inietta un database dedicato alla tua app tramite `AppDbManager`: al primo avvio crea (o apre) un file cifrato `app_<namespace>.enc` eseguendo `migrations.js` (array di `{version, sql}`, solo `CREATE TABLE IF NOT EXISTS`/`CREATE INDEX IF NOT EXISTS` — **mai** `INSERT` di dati demo: il database di una nuova installazione deve partire vuoto).

**Non usare `sqlite3` o `better-sqlite3` nella tua app.** Non funzionerebbe: quando Adestio carica il tuo `backend.js`, lo fa da `installed_apps/<id>/backend.js`, una cartella completamente estranea all'albero `node_modules` di Adestio — la risoluzione di `require()` di Node parte dalla cartella del file che fa la `require`, quindi un pacchetto nativo dovrebbe essere incluso nel tuo zip, compilato per l'esatta versione/ABI di Electron in uso: fragile, e si rompe silenziosamente a ogni aggiornamento di Electron.

Il database ti arriva già pronto, iniettato nella firma di `registerBackendHandlers` (vedi §4). Nel tuo `backend/db_utils.js`:

```js
let _adestioDb = null;
function configure(adestioDb) { _adestioDb = adestioDb; }
function db() { return _adestioDb.getDB('app_nome_univoco_app'); } // 'app_' + il namespace del manifest
async function persist() { await _adestioDb.saveDB('app_nome_univoco_app'); }
module.exports = { configure, db, persist, /* ...helper CRUD generici... */ };
```

## 4. Il `backend.js` — come viene davvero caricato

Quando l'app viene installata/caricata, Adestio richiede il tuo `backend.js` **nel processo main** (non in un processo separato/sandbox — quel percorso esiste nel codice ma non è mai stato completato end-to-end, non affidarti a `onLoad`/classi/`sendIpcCall`: non funziona). Deve esportare:

```js
function registerBackendHandlers(registerApi, app, adestioDb) {
    dbUtils.configure(adestioDb);

    function on(action, fn) {
        registerApi(`nomeUnivoco:${action}`, (event, args) => fn(event, args));
    }

    on('clienti:getAll', clientiHandler.getAll);
    // ... una riga per ogni azione che vuoi esporre al frontend ...

    return true; // fondamentale: Adestio considera il caricamento fallito se non ritorni true
}
module.exports = { registerBackendHandlers };
```

- `registerApi(action, fn)` è **iniettato da Adestio** (non è `ipcMain.handle`): registra la tua azione nel bridge generico (`capabilityBroker`), l'unico modo che il frontend ha di raggiungerla (vedi §5).
- `fn` riceve `(event, payload)` ma **`event` è sempre `null`** — non è un vero `IpcMainInvokeEvent` (la chiamata arriva tramite il bridge generico, non da un canale ipcMain diretto). Se ti serve la finestra attiva (es. per un dialogo di salvataggio file), usa `BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]`, mai `event.sender`.
- `adestioDb` è `{ getDB, saveDB, AppDbManager }` — passalo subito al tuo `db_utils.configure()`.
- Chiama sempre `on()`/`registerApi()` in modo **idempotente**: Adestio richiama `registerBackendHandlers` a ogni aggiornamento dell'app, e la registrazione va rifatta pulita ogni volta (il bridge gestisce già la sostituzione per te, ma la tua funzione deve poter essere chiamata più volte senza effetti collaterali doppi).

## 5. Il ponte frontend ↔ backend

Il `preload.js` di Adestio è fissato all'avvio e non conosce in anticicipo i canali della tua app: **l'unico modo** che il frontend ha di chiamare il tuo backend è `window.adestioNative.callAppApi({sourceApp, targetApp, action, payload})`. Crea un helper `shared/api.js` e usalo ovunque, non chiamare `callAppApi` direttamente nei moduli:

```js
const APP_ID = 'nome_univoco_app'; // uguale a manifest.id
export async function callApi(action, payload = {}) {
    const outer = await window.adestioNative.callAppApi({
        sourceApp: APP_ID, targetApp: APP_ID, action: `nomeUnivoco:${action}`, payload
    });
    if (!outer || !outer.success) return { success: false, error: (outer && outer.error) || 'Errore di comunicazione' };
    return outer.data; // qui c'e' il vero risultato del tuo handler ({success, data|error})
}
```

**Attenzione al doppio involucro**: `outer.success` riguarda solo l'infrastruttura (canale trovato, azione registrata) — è quasi sempre `true`. Il risultato reale del tuo handler (compreso un eventuale fallimento di business logic) è dentro `outer.data`. Se salti lo `unwrap`, ogni chiamata sembrerà "riuscita" anche quando in realtà è fallita.

Non tutto passa da qui: il tuo frontend gira nello **stesso renderer** di Adestio (caricato con un `import()` dinamico, come le app core), quindi `window.electronAPI.*` (es. `sendMail`, `rbac.getEffectiveUserPermissions`) è già disponibile senza bisogno del bridge — usalo direttamente per le funzioni generiche già esposte da Adestio.

## 6. Il frontend

`app.js` esporta `{ render: async (el, params) => {...} }` (o, se preferisci lo stile a hub+moduli come `App-BusinessSuite`, un array `MODULES` + `renderModule(id)` che fa `import()` dinamico del file in `modules/`). Ogni modulo esporta `{ render: async (el) => {...} }`.

Per riusare le utility core di Adestio (`toast`, `Router`, validatori) senza doverle copiare, importale con un percorso relativo che parta con `js/`, `css/` o `assets/` rispetto alla radice della tua app — es. da `modules/clienti.js` (una cartella sotto la radice):
```js
import { toast } from '../js/utils.js';
```
`CustomProtocol.js` intercetta questi percorsi e li reindirizza automaticamente al vero `src/js/...` di Adestio. Qualsiasi altro percorso resta isolato dentro la cartella della tua app.

## 7. Stile — un'unica fonte

Adestio richiede che ogni schermata (dello Store, del Dashboard, e di ogni app di terze parti) usi le stesse card e non ridefinisca da zero il proprio design system. In pratica:
- Usa `var(--md-primary)`, `var(--md-surface)`, `var(--md-on-surface-variant)`, ecc. — sono già definite globalmente da Adestio.
- Scrivi il CSS delle tue schermate **una sola volta** in `css/style.css` (caricato automaticamente da Adestio quando l'app è attiva) — non iniettare `<style>` per ogni modulo.
- Se costruisci liste/CRUD, riusa il pattern `.ak-hero`/`.ak-card`/`.ak-modal` (vedi `App-BusinessSuite/shared/ui_kit.js` e `crud_kit.js` come riferimento pronto all'uso) invece di inventarne uno nuovo.

## 8. Generazione documenti (PDF/Excel/XML) senza dipendenze fragili

- **PDF**: usa `pdfkit` (puro JS, nessun binario esterno). Evita approcci che dipendono da software installato sulla macchina dell'utente (es. conversione via LibreOffice) — non è "totalmente indipendente e funzionale" se l'utente non ce l'ha.
- **Excel**: `xlsx` (puro JS).
- **XML** (es. fatture elettroniche): per schemi rigidi come FatturaPA, un generatore a template string con una funzione di escaping dedicata è più semplice e controllabile di aggiungere una libreria XML.
- Queste librerie **pure JS** vanno benissimo bundlate: crea un `package.json` nella cartella della tua app, `npm install pdfkit xlsx`, e il loro `node_modules` verrà incluso automaticamente nello zip da `pack_and_deploy.js` (a differenza dei moduli nativi, qui non c'è nessun problema di ABI).
- Per salvare un file su disco (dialogo "Salva con nome"), usa `require('electron').dialog` **dentro il tuo backend** — `electron` è sempre risolvibile ovunque nel processo main, a differenza dei pacchetti npm normali.

## 9. Test locale

```bash
cd Adestio-Marketplace
node pack_and_deploy.js App-Nome --test
```

Impacchetta e installa l'app nella cartella reale usata da Adestio (`%APPDATA%/NunzioTech/Adestio/installed_apps/<id>` su Windows — verifica il percorso esatto guardando `app.setPath('userData', ...)` in `Adestio/main.js` se cambia in futuro).

**Trappola da conoscere**: per far caricare l'app senza passare dall'installazione reale via Store, potresti essere tentato di aggiungere `"bundled": true` al manifest installato in locale. Funziona per il *backend* (viene caricato comunque), ma **rompe il caricamento del frontend**: `app_container.js` tratta le app `bundled` come se vivessero in `Adestio/src/apps/` e prova a importarle da lì, dove ovviamente non ci sono — ottieni un 404 sul modulo. Usalo solo per un test rapido del solo backend (controlla nei log `[NomeApp] Backend registrato con successo.` e l'assenza di errori), poi togli `bundled: true` prima di considerare il lavoro finito. Per testare anche il frontend, installa l'app attraverso il vero flusso dello Store.

## 10. Pubblicazione

```bash
node pack_and_deploy.js App-Nome --prod
```

Questo **è un rilascio reale**: incrementa la versione, carica lo zip via FTP, riscrive `marketplace.json`, e fa commit+tag+push su GitHub. Non lanciarlo mai come parte di un test o senza che l'utente lo abbia chiesto esplicitamente — e solo dopo aver verificato che l'app funzioni davvero (backend **e** frontend, non solo i log di avvio).

## Checklist finale prima di dire "è pronta"

- [ ] Il manifest ha `db.namespace`/`db.migrations` e **non** ha `bundled: true`.
- [ ] `"permissions"` contiene solo stringhe di scope per il `capabilityBroker` (es. `"nomeUnivoco:*"`); eventuali toggle RBAC per-funzionalità vanno nel campo separato `"rbacPermissions"` (oggetti `{id,label,default}`), mai mescolati nello stesso array.
- [ ] `migrations.js` contiene solo `CREATE TABLE IF NOT EXISTS`/`CREATE INDEX IF NOT EXISTS`, zero `INSERT`.
- [ ] `backend.js` esporta `registerBackendHandlers(registerApi, app, adestioDb)` e ritorna `true`.
- [ ] Nessuna dipendenza nativa (sqlite3, better-sqlite3, ecc.) nel `package.json` dell'app — solo librerie pure JS.
- [ ] Il frontend chiama il backend **solo** tramite `callApi()`/`window.adestioNative.callAppApi`, con lo `unwrap` corretto (`outer.data`).
- [ ] Nessuno stile duplicato: tutto in `css/style.css`, riuso di `var(--md-*)`.
- [ ] Testata con `pack_and_deploy.js --test` (log puliti) **e** con un vero avvio/click-through dell'interfaccia, non solo controllo dei log.
- [ ] `.gitignore` del repository esclude `node_modules/` e `*.zip` — nessun binario committato per sbaglio.
