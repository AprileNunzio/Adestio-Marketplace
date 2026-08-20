'use strict';

const { creaHost, creaBroker } = require('./host_stub');
const { verifica, assertOk, assertKo, riepiloga } = require('./verifiche');

const PERMESSI = require('../core/permissions.json')
    .map(voce => voce.id)
    .filter(voce => voce !== 'direzione_economics');

const SCENARI = [
    require('./scenari/clinico'),
    require('./scenari/economico'),
    require('./scenari/conformita')
];

async function main() {
    const host = creaHost({ utenteId: 'dott-rossi' });
    const broker = creaBroker();
    const backend = require('../backend.js');

    host.concedi(PERMESSI);
    const caricato = backend.registerBackendHandlers(broker.registerApi, host.electronApp, host.adestioDb);
    verifica('registerBackendHandlers ritorna true', caricato === true);

    const azioni = Object.keys(require('../core/contract.json').actions).length;
    verifica(`${azioni} canali registrati`, broker.conteggio() === azioni, `registrati: ${broker.conteggio()}`);

    const chiama = (azione, payload) => broker.invoca(azione, payload);
    const contesto = {};

    for (const scenario of SCENARI) {
        await scenario({ chiama, verifica, assertOk, assertKo, host, contesto });
    }

    host.revocaTutto();
    require('../backend/kernel/authz').invalidate();
    assertKo('Fail-closed: lettura pazienti negata dopo revoca',
        await chiama('pazienti.list'), 'FORBIDDEN');
    assertKo('Fail-closed: scrittura negata dopo revoca',
        await chiama('pazienti.create', { nome: 'A', cognome: 'B' }), 'FORBIDDEN');

    host.pulisci();
    process.exit(riepiloga() === 0 ? 0 : 1);
}

main().catch(errore => {
    console.error('Smoke test interrotto:', errore);
    process.exit(1);
});
