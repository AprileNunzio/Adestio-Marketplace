'use strict';

const host = require('./backend/kernel/host');
const authz = require('./backend/kernel/authz');
const registry = require('./backend/kernel/registry');

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
    privacy: require('./backend/handlers/privacy')
};

function registerBackendHandlers(registerApi, app, adestioDb) {
    try {
        host.configure(adestioDb, app);
        authz.invalidate();
        const registrate = registry.registerAll(registerApi, handlers);
        console.log(`[DentalSuite] ${registrate} azioni registrate, controllo accessi in modalità "${authz.mode()}".`);
        return true;
    } catch (errore) {
        console.error('[DentalSuite] Registrazione backend fallita:', errore);
        return false;
    }
}

module.exports = { registerBackendHandlers };
