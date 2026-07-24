# Adestio Marketplace Registry

Questo è il repository centrale del Marketplace di Adestio. Contiene:
- il codice sorgente di ogni applicazione di terze parti (una cartella per app, es. `App-BusinessSuite/`, `App-PresaDiServizio/`);
- `marketplace.json`, l'indice che Adestio legge per mostrare l'elenco delle app disponibili nello Store, gestire installazioni e aggiornamenti;
- `pack_and_deploy.js`, lo script che impacchetta un'app, la installa in locale per il test, oppure la pubblica davvero (FTP + release).

**Prima di creare una nuova app, leggi [`COME_CREARE_UNA_APP_PERFETTA.md`](./COME_CREARE_UNA_APP_PERFETTA.md)** — spiega in dettaglio manifest, database isolato, il ponte IPC verso il frontend (`window.adestioNative.callAppApi`), generazione documenti (PDF/Excel/XML) e gli errori da non ripetere.

## Struttura di un'app

Ogni app è una cartella con il proprio `manifest.json`, `app.js` (frontend), `backend.js` (entry point backend) ed eventuali `shared/`, `modules/`, `backend/`. Non serve un repository separato per app: tutto vive qui.

## Flusso di lavoro

1. Sviluppi l'app in una cartella `App-<Nome>/` di questo repository (vedi la guida per la struttura raccomandata).
2. Testi in locale:
   ```bash
   node pack_and_deploy.js App-<Nome> --test
   ```
   Impacchetta l'app e la installa direttamente nella cartella `installed_apps` di Adestio (percorso reale: `%APPDATA%/NunzioTech/Adestio/installed_apps/<id>` su Windows), pronta per essere avviata da Adestio in locale senza toccare FTP o `marketplace.json`.
3. Quando è pronta, pubblichi davvero:
   ```bash
   node pack_and_deploy.js App-<Nome> --prod
   ```
   Questo **incrementa la versione della patch nel manifest, crea lo zip, lo carica via FTP, aggiorna `marketplace.json` e fa commit+tag+push su GitHub** — è un'azione di rilascio reale verso gli utenti finali, non va lanciata senza essere sicuri che l'app sia stata provata.

## Regole importanti

- **Non committare i file `.zip`** — sono build artifact rigenerabili, già esclusi da `.gitignore`. Vivono solo su FTP (distribuzione) e localmente durante il test.
- **Nessun modulo nativo (sqlite3, better-sqlite3, ecc.) nelle dipendenze di un'app**: gira nel processo main di Adestio ma non nel suo albero di `node_modules`, quindi un binario nativo compilato per un'altra versione/ABI di Electron romperebbe l'app in modo silenzioso e difficile da diagnosticare. Per il database usa sempre quello iniettato da Adestio (vedi guida). Librerie pure JS (pdfkit, xlsx, ecc.) invece vanno benissimo: bastano un `package.json` proprio nella cartella dell'app e `npm install` — `node_modules` verrà incluso nello zip.
- **Mai eseguire `--prod` senza conferma esplicita dell'utente**: modifica FTP di produzione, `marketplace.json`, e fa push su un repository condiviso.

## Struttura del Manifest (`marketplace.json`)

Ogni app pubblicata ha una voce con questa struttura minima:
```json
{
  "id": "nome_univoco_app",
  "name": "Nome App",
  "version": "1.0.0",
  "author": "Nome Sviluppatore",
  "description": "Descrizione breve",
  "long_description": "Descrizione estesa per la pagina dettagli.",
  "category": "utility",
  "icon": "icon.png",
  "folder": "cartella_estrazione",
  "main": "app.js",
  "backend": "backend.js",
  "downloadUrl": "URL_AL_FILE_ZIP",
  "ipc": {
    "namespace": "nome_univoco"
  }
}
```

Buon coding per l'ecosistema Adestio!
