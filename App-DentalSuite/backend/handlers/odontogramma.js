'use strict';

const { odontogramma, pazienti } = require('../repositories/clinical');
const { rilevazioniDente } = require('../repositories/storico');
const { validationError, notFoundError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const denti = require('../domain/denti');
const { oggiIso } = require('../domain/rateizzazione');

function assertDente(numero) {
    const codice = String(numero || '').trim();
    if (!denti.esiste(codice)) throw validationError(`Numero dente FDI non valido: ${numero}`);
    return codice;
}

function assertStato(stato) {
    if (stato && !denti.STATI.some(voce => voce.id === stato)) {
        throw validationError(`Stato clinico non riconosciuto: ${stato}`);
    }
}

function correnteDi(pazienteId, numero) {
    const righe = odontogramma.findAll({ where: { paziente_id: pazienteId, numero_dente: numero } });
    return righe.length > 0 ? righe[0] : null;
}

function get(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    pazienti.requireById(payload.paziente_id, { includeArchived: true });
    const registrati = odontogramma.findAll({ where: { paziente_id: payload.paziente_id } });
    const dentizione = payload.dentizione === denti.DECIDUA ? denti.DECIDUA : denti.PERMANENTE;
    return {
        dentizione,
        arcate: denti.arcate(dentizione),
        stati: denti.STATI,
        superfici: denti.SUPERFICI,
        denti: denti.mappaStati(dentizione, registrati)
    };
}

function storico(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    const criterio = payload.numero_dente
        ? { paziente_id: payload.paziente_id, numero_dente: String(payload.numero_dente) }
        : { paziente_id: payload.paziente_id };

    const etichette = new Map(denti.STATI.map(voce => [voce.id, voce]));
    return rilevazioniDente
        .findAll({ where: criterio })
        .map(riga => {
            const anatomia = denti.anatomiaDi(riga.numero_dente);
            const stato = etichette.get(riga.stato);
            return {
                ...riga,
                nome_dente: anatomia.nome,
                arcata: anatomia.arcata,
                lato: anatomia.lato,
                stato_label: stato ? stato.label : riga.stato,
                stato_colore: stato ? stato.colore : '#e2e8f0'
            };
        });
}

async function proiettaCorrente(pazienteId, numero) {
    const rilevazioni = rilevazioniDente.findAll({
        where: { paziente_id: pazienteId, numero_dente: numero }
    });
    const corrente = correnteDi(pazienteId, numero);

    if (rilevazioni.length === 0) {
        if (corrente) await odontogramma.hardRemove(corrente.id);
        return null;
    }

    const ultima = rilevazioni[0];
    const proiezione = {
        paziente_id: pazienteId,
        numero_dente: numero,
        dentizione: ultima.dentizione,
        stato: ultima.stato,
        superfici: ultima.superfici,
        materiale: ultima.materiale,
        mobilita: ultima.mobilita,
        note: ultima.note,
        data_rilevazione: ultima.data_rilevazione,
        rilevazione_id: ultima.id
    };

    if (corrente) await odontogramma.update(corrente.id, proiezione, { autore_id: ultima.autore_id });
    else await odontogramma.insert(proiezione, { autore_id: ultima.autore_id });
    return ultima;
}

async function saveDente(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    const numero = assertDente(payload.numero_dente);
    assertStato(payload.stato);
    pazienti.requireById(payload.paziente_id, { includeArchived: true });

    const corrente = correnteDi(payload.paziente_id, numero);
    const id = await rilevazioniDente.insert({
        paziente_id: payload.paziente_id,
        numero_dente: numero,
        dentizione: denti.dentizioneDi(numero),
        stato: payload.stato || 'sano',
        stato_precedente: corrente ? corrente.stato : '',
        superfici: denti.normalizzaSuperfici(payload.superfici),
        materiale: payload.materiale || '',
        mobilita: payload.mobilita || '',
        note: payload.note || '',
        trattamento_id: payload.trattamento_id || '',
        data_rilevazione: payload.data_rilevazione || oggiIso()
    }, actor.stamp());

    await proiettaCorrente(payload.paziente_id, numero);
    return { id, numero_dente: numero };
}

async function modificaRilevazione(payload = {}) {
    if (!payload.id) throw validationError('Identificativo rilevazione mancante');
    const rilevazione = rilevazioniDente.findById(payload.id);
    if (!rilevazione) throw notFoundError('Rilevazione non trovata');
    assertStato(payload.stato);

    await rilevazioniDente.update(payload.id, {
        stato: payload.stato || rilevazione.stato,
        superfici: payload.superfici !== undefined
            ? denti.normalizzaSuperfici(payload.superfici)
            : rilevazione.superfici,
        materiale: payload.materiale !== undefined ? payload.materiale : rilevazione.materiale,
        mobilita: payload.mobilita !== undefined ? payload.mobilita : rilevazione.mobilita,
        note: payload.note !== undefined ? payload.note : rilevazione.note,
        data_rilevazione: payload.data_rilevazione || rilevazione.data_rilevazione
    }, actor.stamp());

    await proiettaCorrente(rilevazione.paziente_id, rilevazione.numero_dente);
    return { id: payload.id, numero_dente: rilevazione.numero_dente };
}

async function eliminaRilevazione(payload = {}) {
    const rilevazione = rilevazioniDente.findById(payload.id);
    if (!rilevazione) throw notFoundError('Rilevazione non trovata');
    await rilevazioniDente.archive(payload.id);
    await proiettaCorrente(rilevazione.paziente_id, rilevazione.numero_dente);
    return { id: payload.id, numero_dente: rilevazione.numero_dente };
}

module.exports = { get, storico, saveDente, modificaRilevazione, eliminaRilevazione };
