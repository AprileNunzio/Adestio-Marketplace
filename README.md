# Adestio Marketplace Registry

Questo è il repository centrale del Marketplace di Adestio. 
Agisce come **Registry** per tutte le applicazioni di terze parti installabili sulla piattaforma Adestio.

## Come funziona
Il backend di Adestio legge il file `marketplace.json` contenuto in questo repository per mostrare l'elenco delle applicazioni disponibili, gestire gli aggiornamenti e le installazioni.

## Architettura "OS-Style"
Per mantenere il sistema performante, **NON** committare i file `.zip` in questo repository. 
Il flusso di lavoro corretto è il seguente:

1. Lo sviluppatore pubblica il codice dell'app in un suo repository (es. `Adestio-App-GestoreFerie`).
2. Lo sviluppatore crea una **Release** su GitHub per quell'app e vi allega il file `.zip` (l'artefatto compilato).
3. Viene fatta una Pull Request a questo repository (`Adestio-Marketplace`) per aggiornare il file `marketplace.json`, aggiungendo il manifest della nuova app.
4. Il campo `"downloadUrl"` del manifest dovrà puntare al link diretto del `.zip` pubblicato nella release dello sviluppatore.

## Struttura del Manifest (`marketplace.json`)
Ogni app deve avere questa struttura minima:
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
  "main": "main.js",
  "backend": "backend.js",
  "downloadUrl": "URL_AL_FILE_ZIP_NELLA_RELEASE_GITHUB",
  "ipc": {
    "namespace": "nome_univoco",
    "handlers": ["handler1"]
  }
}
```

Buon coding per l'ecosistema Adestio!
