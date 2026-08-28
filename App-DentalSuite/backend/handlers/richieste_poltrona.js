'use strict';

const { trasmissioni } = require('../repositories/trasmissione');
const { validationError, forbiddenError, notFoundError } = require('../kernel/errors');
const audit = require('../kernel/audit');
const identita = require('../rete/identita');
const riconciliazione = require('../domain/riconciliazione');

const PERMESSO_CAMBIO = 'trasmissione_cambia_paziente';

function bersaglioDa(contenuto, contesto) {
    return {
        sessione_id: contenuto.sessione_id || '',
        impronta: contenuto.impronta || (contesto.pari ? contesto.pari.impronta : ''),
        indirizzo: contenuto.indirizzo || contesto.indirizzo || '',
        ip: contesto.indirizzo || ''
    };
}

function tracciaAccesso(azione, contenuto, contesto, esito) {
    audit.registra({
        azione,
        permesso: PERMESSO_CAMBIO,
        muta: true,
        attoreId: contenuto.medico_id || (contesto.pari ? contesto.pari.id : 'monitor'),
        payload: {
            paziente_id: contenuto.paziente_id || '',
            impronta: contesto.pari ? contesto.pari.impronta : '',
            indirizzo: contesto.indirizzo || ''
        },
        esito,
        codiceErrore: esito === 'consentito' ? '' : 'FORBIDDEN',
        messaggio: '',
        durataMs: 0
    });
}

async function destinazionePer(bersaglio, destinazioni) {
    const elenco = await destinazioni();
    const nodo = riconciliazione.risolviNodo(elenco, bersaglio);
    if (!nodo) throw notFoundError('Monitor richiedente non raggiungibile dalla segreteria');
    return nodo;
}

async function pazienteRichiesto(contenuto, contesto, deps) {
    if (!contenuto.paziente_id) throw validationError('Identificativo paziente mancante');

    const locale = identita.scheda();
    if (!locale || locale.ruolo !== 'segreteria') {
        throw forbiddenError('Questa postazione non custodisce l\'archivio pazienti');
    }

    if (contesto.sconosciuto) {
        tracciaAccesso('poltrona.richiedi_paziente', contenuto, contesto, 'negato');
        throw forbiddenError('Monitor non riconosciuto: autorizzalo dalla segreteria');
    }

    const nodo = await destinazionePer(bersaglioDa(contenuto, contesto), deps.destinazioni);
    const esito = await deps.invia({
        paziente_id: contenuto.paziente_id,
        sessione_ids: [nodo.sessione_id],
        dentizione: contenuto.dentizione
    });

    tracciaAccesso('poltrona.richiedi_paziente', contenuto, contesto, 'consentito');
    return { accettata: true, paziente: esito.paziente || '', trasmissione_id: esito.id || '' };
}

async function sedutaDaRipristinare(contenuto, contesto, deps) {
    const impronta = contenuto.impronta || (contesto.pari ? contesto.pari.impronta : '');
    if (!impronta) return { ripristinata: false, motivo: 'impronta del monitor mancante' };

    const aperte = trasmissioni.findAll({ where: { stato: 'aperta' } });
    const riga = aperte.find(voce => voce.impronta_postazione === impronta);
    if (!riga) return { ripristinata: false, motivo: 'nessuna seduta aperta per questo monitor' };

    const nodo = await destinazionePer(bersaglioDa(contenuto, contesto), deps.destinazioni);
    await deps.invia({ paziente_id: riga.paziente_id, sessione_ids: [nodo.sessione_id] });

    return { ripristinata: true, trasmissione_id: riga.id };
}

module.exports = { pazienteRichiesto, sedutaDaRipristinare, PERMESSO_CAMBIO };
