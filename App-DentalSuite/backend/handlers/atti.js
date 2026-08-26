'use strict';

const crypto = require('crypto');
const { attiRicevuti, trasmissioni } = require('../repositories/trasmissione');
const seduta = require('../repositories/seduta_volatile');
const { validationError, conflictError } = require('../kernel/errors');
const audit = require('../kernel/audit');
const actor = require('../kernel/actor');
const riferimenti = require('../kernel/riferimenti');
const { pazienti } = require('../repositories/clinical');
const odontogramma = require('./odontogramma');
const trattamenti = require('./trattamenti');
const prescrizioni = require('./prescrizioni');
const agenda = require('./agenda');
const allegati = require('./allegati');
const protocollo = require('../rete/protocollo');
const trasporto = require('../rete/trasporto');

const TIPI = ['reperto', 'trattamento', 'prescrizione', 'stato_seduta'];

const ESECUTORI = {
    reperto: contenuto => odontogramma.saveDente(contenuto),
    trattamento: contenuto => trattamenti.add(contenuto),
    prescrizione: contenuto => prescrizioni.add(contenuto),
    stato_seduta: contenuto => agenda.updateStato(contenuto)
};

function nuovoIdentificativo() {
    return crypto.randomUUID();
}

function giaApplicato(attoId) {
    const righe = attiRicevuti.findAll({
        includeArchived: true,
        filtri: [{ colonna: 'atto_id', operatore: 'eq', valore: attoId }]
    });
    return righe.length > 0 ? righe[0] : null;
}

function assertTipo(tipo) {
    if (!TIPI.includes(tipo)) throw validationError(`Tipo di atto non riconosciuto: ${tipo}`);
}

function tracciaAtto(atto, esito, messaggio) {
    audit.registra({
        azione: `atti.${atto.tipo}`,
        permesso: 'trasmissione_ricevi',
        muta: true,
        attoreId: actor.currentActorId(),
        payload: { id: atto.atto_id, paziente_id: atto.paziente_id },
        esito,
        codiceErrore: esito === 'consentito' ? '' : 'CONFLICT',
        messaggio: messaggio || '',
        durataMs: 0
    });
}

async function applica(atto, contesto = {}) {
    assertTipo(atto.tipo);
    const attoId = String(atto.atto_id || '');
    if (!attoId) throw validationError('Identificativo dell\'atto mancante');

    const precedente = giaApplicato(attoId);
    if (precedente) {
        return { atto_id: attoId, ripetuto: true, esito: precedente.esito, messaggio: precedente.messaggio };
    }

    const contenuto = atto.contenuto || {};
    let esito = 'applicato';
    let messaggio = '';
    let riferimento = null;

    try {
        riferimento = await ESECUTORI[atto.tipo](contenuto);
        if (contenuto.paziente_id) {
            const trasmissioni = require('./trasmissioni');
            trasmissioni.propagaAggiornamentoDossier(contenuto.paziente_id).catch(() => {});
        }
    } catch (errore) {
        esito = 'rifiutato';
        messaggio = errore.message;
    }

    await attiRicevuti.insert({
        trasmissione_id: atto.trasmissione_id || '',
        atto_id: attoId,
        tipo: atto.tipo,
        paziente_id: contenuto.paziente_id || '',
        impronta_postazione: contesto.impronta || '',
        contenuto: JSON.stringify(contenuto),
        esito,
        messaggio,
        applicato_il: Date.now()
    }, actor.stamp());

    tracciaAtto({ ...atto, atto_id: attoId, paziente_id: contenuto.paziente_id }, esito === 'applicato' ? 'consentito' : 'fallito', messaggio);

    if (esito === 'rifiutato') {
        return { atto_id: attoId, accettato: false, esito, messaggio };
    }
    return { atto_id: attoId, accettato: true, esito, riferimento };
}

async function accogli(messaggio) {
    if (messaggio.tipo === protocollo.MESSAGGI.presenza) {
        const contenuto = messaggio.contenuto || {};
        const sessioneId = messaggio.sessione ? messaggio.sessione.id : '';
        const registrato = trasporto.registraSchermo(sessioneId, contenuto.schermo || null);
        return { accettato: registrato };
    }
    if (messaggio.tipo === protocollo.MESSAGGI.allegato) {
        const contenuto = messaggio.contenuto || {};
        try {
            return { accettato: true, porzione: allegati.porzione(contenuto) };
        } catch (errore) {
            return { accettato: false, motivo: errore.message };
        }
    }
    if (messaggio.tipo === protocollo.MESSAGGI.atto) {
        return applica(messaggio.contenuto || {}, {
            impronta: messaggio.sessione ? messaggio.sessione.impronta : ''
        });
    }
    if (messaggio.tipo === protocollo.MESSAGGI.chiusura) {
        const contenuto = messaggio.contenuto || {};
        if (contenuto.trasmissione_id) {
            const riga = trasmissioni.findById(contenuto.trasmissione_id, { includeArchived: true });
            if (riga && riga.stato === 'aperta') {
                await trasmissioni.update(riga.id, {
                    stato: 'chiusa',
                    chiusa_il: Date.now(),
                    motivo_chiusura: contenuto.motivo || 'seduta chiusa dal riunito'
                });
            }
        }
        return { accettato: true };
    }
    return { accettato: false, motivo: `Messaggio non gestito dalla segreteria: ${messaggio.tipo}` };
}

async function registra(payload = {}) {
    assertTipo(payload.tipo);
    const istantanea = seduta.istantanea();
    if (!istantanea.presente) {
        throw conflictError('Nessuna scheda paziente attiva su questa postazione');
    }

    const contenuto = {
        ...(payload.contenuto || {}),
        paziente_id: istantanea.dossier.paziente.id
    };

    const atto = {
        atto_id: payload.atto_id || nuovoIdentificativo(),
        tipo: payload.tipo,
        trasmissione_id: istantanea.trasmissione_id,
        contenuto
    };

    if (payload.tipo === 'reperto') {
        seduta.applicaReperto(contenuto);
    }

    try {
        const risposta = await trasporto.versoArchivio(protocollo.MESSAGGI.atto, atto);
        seduta.tocca();
        return { ...atto, consegnato: true, esito: risposta };
    } catch (errore) {
        return { ...atto, consegnato: false, in_coda: true, messaggio: errore.message };
    }
}

function storico(payload = {}) {
    const filtri = [];
    if (payload.paziente_id) filtri.push({ colonna: 'paziente_id', operatore: 'eq', valore: payload.paziente_id });
    if (payload.tipo) filtri.push({ colonna: 'tipo', operatore: 'eq', valore: payload.tipo });
    const pagina = attiRicevuti.findPage({
        filtri,
        pagina: payload.pagina,
        dimensione: payload.dimensione || 25
    });
    const anagrafiche = riferimenti.mappaPerId(pazienti, riferimenti.raccogli(pagina.righe, 'paziente_id'));
    return {
        ...pagina,
        righe: pagina.righe.map(riga => ({
            ...riga,
            paziente_nome: anagrafiche.has(riga.paziente_id)
                ? `${anagrafiche.get(riga.paziente_id).cognome} ${anagrafiche.get(riga.paziente_id).nome}`.trim()
                : ''
        }))
    };
}

module.exports = { applica, accogli, registra, storico, TIPI };
