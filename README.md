# Adestio Marketplace Registry (v2.0)
**Catalogo Ufficiale e Registro Applicazioni per l'Ecosistema Adestio Enterprise**

---

## 🏛️ Panoramica

Questo repository è il registro centrale del **Marketplace di Adestio**. Contiene il codice sorgente, i manifest di configurazione, i database e gli strumenti di build e distribuzione per tutte le applicazioni e micro-frontend di terze parti compatibili con **Adestio v2.0 Platform**.

---

## 📦 Catalogo Applicazioni Ufficiali (v2.0.0)

| Applicazione | ID Univoco | Versione | Categoria | Descrizione |
| :--- | :--- | :--- | :--- | :--- |
| **Adestio DentalSuite** | `adestio_dental_suite` | `2.0.0` | Medical | Cartella clinica odontoiatrica, odontogramma FDI, diario clinico, agenda poltrone, monitor del medico in LAN cifrata. |
| **Adestio Business Suite** | `adestio_business_suite` | `2.0.0` | ERP & Fiscale | Preventivazione, fatturazione elettronica XML SDI, gestione magazzino, anagrafiche e POS. |
| **Presa di Servizio** | `presa_di_servizio` | `2.0.0` | School & HR | Onboarding personale scolastico ATA e Docenti, import Excel e generazione documenti ufficiali a norma. |

---

## ⚙️ Standard di Sviluppo Micro-App (v2.0 Lifecycle)

Ogni applicazione deve esporre un entry point `app.js` conforme al contratto di ciclo di vita standard:

```javascript
export default {
    mount: async (containerElement, params = {}) => {
        // Inizializzazione dell'interfaccia utente, eventi e routing interno
    },
    unmount: async () => {
        // Pulizia timer, disiscrizione eventi e rilascio risorse in memoria
    },
    render: async (containerElement, params = {}) => {
        // Retrocompatibilita per ambienti di rendering precedenti
    }
};
```

---

## 🚀 Flusso di Deploy e Pubblicazione

### Test in Locale
```bash
# Impacchetta e installa localmente in %APPDATA%\Adestio\installed_apps
node pack_and_deploy.js App-DentalSuite --test
```

### Pubblicazione di Produzione (FTP & Registry)
```bash
# Incrementa patch, crea zip, carica su FTP e aggiorna marketplace.json
node pack_and_deploy.js App-DentalSuite --prod
```

---

## 🛡️ Proprietà e Licenza
Sviluppato e distribuito da **NunzioTech**.
Repository Ufficiale: [https://github.com/AprileNunzio/Adestio-Marketplace](https://github.com/AprileNunzio/Adestio-Marketplace)
