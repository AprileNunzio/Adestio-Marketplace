'use strict';

const host = require('./backend/kernel/host');
const authz = require('./backend/kernel/authz');
const registry = require('./backend/kernel/registry');
const trasporto = require('./backend/rete/trasporto');
const sorveglianza = require('./backend/rete/sorveglianza');
const rilancio = require('./backend/rete/rilancio');
const protocollo = require('./backend/rete/protocollo');

const handlers = {
    pazienti: require('./backend/handlers/pazienti'),
    anamnesi: require('./backend/handlers/anamnesi'),
    odontogramma: require('./backend/handlers/odontogramma'),
    trattamenti: require('./backend/handlers/trattamenti'),
    prescrizioni: require('./backend/handlers/prescrizioni'),
    allegati: require('./backend/handlers/allegati'),
    agenda: require('./backend/handlers/agenda'),
    struttura: require('./backend/handlers/struttura'),
    prestazioni: require('./backend/handlers/prestazioni'),
    staff: require('./backend/handlers/staff'),
    compensi: require('./backend/handlers/compensi'),
    preventivi: require('./backend/handlers/preventivi'),
    incassi: require('./backend/handlers/incassi'),
    spese: require('./backend/handlers/spese'),
    rate: require('./backend/handlers/rate'),
    notifiche: require('./backend/handlers/notifiche'),
    statistiche: require('./backend/handlers/statistiche'),
    consensi: require('./backend/handlers/consensi'),
    audit: require('./backend/handlers/audit'),
    firme: require('./backend/handlers/firme'),
    privacy: require('./backend/handlers/privacy'),
    accordi: require('./backend/handlers/accordi'),
    postazioni: require('./backend/handlers/postazioni'),
    trasmissioni: require('./backend/handlers/trasmissioni'),
    atti: require('./backend/handlers/atti'),
    turni: require('./backend/handlers/turni'),
    disponibilita: require('./backend/handlers/disponibilita'),
    economia: require('./backend/handlers/economia'),
    collegamenti: require('./backend/handlers/collegamenti')
};

function instradaMessaggioDiRete(messaggio) {
    if (messaggio.origine === protocollo.RUOLO_RIUNITO) {
        return handlers.atti.accogli(messaggio);
    }
    return handlers.trasmissioni.accogli(messaggio);
}

function avviaReteDiStudio() {
    trasporto.ascolta(instradaMessaggioDiRete);
    sorveglianza.avvia();
    rilancio.avvia();
    setTimeout(() => {
        handlers.trasmissioni.ripristinaSeduta()
            .then(esito => {
                if (esito.ripristinata) console.log('[DentalSuite] Seduta ripristinata dalla segreteria dopo il riavvio.');
            })
            .catch(errore => console.error('[DentalSuite] Ripristino seduta non riuscito:', errore.message));
    }, 4000).unref();
    trasporto
        .avvia()
        .then(esito => {
            if (esito.avviato) console.log(`[DentalSuite] Rete di studio attiva in ruolo "${esito.ruolo}".`);
            else console.log(`[DentalSuite] Rete di studio non avviata: ${esito.motivo}`);
        })
        .catch(errore => console.error('[DentalSuite] Avvio della rete di studio fallito:', errore.message));
}

function registerBackendHandlers(registerApi, app, adestioDb) {
    try {
        host.configure(adestioDb, app);
        authz.invalidate();
        const registrate = registry.registerAll(registerApi, handlers);
        console.log(`[DentalSuite] ${registrate} azioni registrate, controllo accessi in modalità "${authz.mode()}".`);
        avviaReteDiStudio();
        return true;
    } catch (errore) {
        console.error('[DentalSuite] Registrazione backend fallita:', errore);
        return false;
    }
}

module.exports = { registerBackendHandlers };
