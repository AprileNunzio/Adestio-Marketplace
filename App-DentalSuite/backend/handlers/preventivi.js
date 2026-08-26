'use strict';

const { preventivi, righePreventivo, incassi, pianiRateali } = require('../repositories/financial');
const { pazienti } = require('../repositories/clinical');
const { db } = require('../kernel/database');
const { validationError, conflictError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const riferimenti = require('../kernel/riferimenti');
const dominio = require('../domain/preventivo');
const money = require('../domain/money');
const { oggiIso } = require('../domain/rateizzazione');
const rateHandler = require('./rate');

function prossimoNumero() {
    const anno = oggiIso().slice(0, 4);
    const righe = db().query(
        'SELECT numero_preventivo FROM preventivi WHERE numero_preventivo LIKE ?',
        [`${anno}/%`]
    ) || [];
    const progressivi = righe
        .map(riga => Number(String(riga.numero_preventivo).split('/')[1]))
        .filter(Number.isFinite);
    const successivo = progressivi.length > 0 ? Math.max(...progressivi) + 1 : 1;
    return `${anno}/${String(successivo).padStart(4, '0')}`;
}

function righeDi(preventivoId) {
    return righePreventivo.findAll({ where: { preventivo_id: preventivoId } });
}

function decora(riga) {
    const pagamenti = incassi.findAll({ where: { preventivo_id: riga.id } });
    return {
        ...riga,
        righe: righeDi(riga.id),
        incassato: money.sum(pagamenti.map(pagamento => pagamento.importo)),
        residuo: dominio.residuoDaIncassare(riga, pagamenti)
    };
}

function list(payload = {}) {
    const filtri = [];
    if (payload.paziente_id) filtri.push({ colonna: 'paziente_id', operatore: 'eq', valore: payload.paziente_id });
    if (payload.stato) filtri.push({ colonna: 'stato', operatore: 'eq', valore: payload.stato });
    if (payload.dal) filtri.push({ colonna: 'data_emissione', operatore: 'gte', valore: payload.dal });
    if (payload.al) filtri.push({ colonna: 'data_emissione', operatore: 'lte', valore: payload.al });
    const righe = preventivi.findAll({ filtri });
    const anagrafiche = riferimenti.mappaPerId(pazienti, riferimenti.raccogli(righe, 'paziente_id'));
    return righe.map(riga => ({
        ...riga,
        paziente_nome: anagrafiche.has(riga.paziente_id)
            ? `${anagrafiche.get(riga.paziente_id).cognome} ${anagrafiche.get(riga.paziente_id).nome}`.trim()
            : ''
    }));
}

function get(payload = {}) {
    return decora(preventivi.requireById(payload.id, { includeArchived: true }));
}

async function scriviRighe(preventivoId, righe) {
    await righePreventivo.removeWhere('preventivo_id', preventivoId);
    for (const riga of righe) {
        await righePreventivo.insert({ ...riga, preventivo_id: preventivoId });
    }
}

async function sincronizzaPianoRateale(preventivoId, pazienteId, totaleNetto, payload) {
    try {
        const numRate = Number(payload.numero_rate || 0);
        if (numRate <= 1) return;
        const esistenti = pianiRateali.findAll({ where: { preventivo_id: preventivoId } });
        if (esistenti.length === 0) {
            await rateHandler.creaPiano({
                paziente_id: pazienteId,
                preventivo_id: preventivoId,
                totale_piano: totaleNetto,
                acconto_iniziale: Number(payload.acconto_richiesto || 0),
                numero_rate: numRate,
                cadenza_mesi: Number(payload.cadenza_mesi || 1),
                prima_scadenza: payload.prima_scadenza || oggiIso(),
                note: `Piano rateale preventivo (${numRate} rate)`
            });
        }
    } catch (_) {}
}

async function create(payload = {}) {
    if (!payload.paziente_id) throw validationError('Selezionare il paziente');
    pazienti.requireById(payload.paziente_id, { includeArchived: true });
    const calcolo = dominio.calcolaTotali(payload.righe || [], payload.sconto_percentuale || 0);

    const statoIniziale = payload.stato && dominio.STATI.includes(payload.stato) ? payload.stato : 'bozza';

    const id = await preventivi.insert({
        ...payload,
        numero_preventivo: payload.numero_preventivo || prossimoNumero(),
        data_emissione: payload.data_emissione || oggiIso(),
        stato: statoIniziale,
        totale_lordo: calcolo.totale_lordo,
        totale_netto: calcolo.totale_netto,
        metodo_pagamento: payload.metodo_pagamento || '',
        tipo_rateizzazione: payload.tipo_rateizzazione || '',
        numero_rate: Number(payload.numero_rate) || 0,
        cadenza_mesi: Number(payload.cadenza_mesi) || 1,
        prima_scadenza: payload.prima_scadenza || '',
        acconto_richiesto: Number(payload.acconto_richiesto) || 0
    }, actor.stamp());

    await scriviRighe(id, calcolo.righe);

    if (statoIniziale === 'accettato') {
        await sincronizzaPianoRateale(id, payload.paziente_id, calcolo.totale_netto, payload);
    }

    return { id, totale_netto: calcolo.totale_netto };
}

async function update(payload = {}) {
    if (!payload.id) throw validationError('Identificativo preventivo mancante');
    const corrente = preventivi.requireById(payload.id, { includeArchived: true });
    if (corrente.stato === 'annullato' && payload.stato === 'annullato') {
        throw conflictError(`Un preventivo annullato non è modificabile`);
    }
    const calcolo = dominio.calcolaTotali(payload.righe || righeDi(payload.id), payload.sconto_percentuale !== undefined ? payload.sconto_percentuale : corrente.sconto_percentuale);

    const nuovoStato = payload.stato && dominio.STATI.includes(payload.stato) ? payload.stato : corrente.stato;

    await preventivi.update(payload.id, {
        ...payload,
        stato: nuovoStato,
        totale_lordo: calcolo.totale_lordo,
        totale_netto: calcolo.totale_netto,
        metodo_pagamento: payload.metodo_pagamento !== undefined ? payload.metodo_pagamento : corrente.metodo_pagamento,
        tipo_rateizzazione: payload.tipo_rateizzazione !== undefined ? payload.tipo_rateizzazione : corrente.tipo_rateizzazione,
        numero_rate: payload.numero_rate !== undefined ? Number(payload.numero_rate) : corrente.numero_rate,
        cadenza_mesi: payload.cadenza_mesi !== undefined ? Number(payload.cadenza_mesi) : corrente.cadenza_mesi,
        prima_scadenza: payload.prima_scadenza !== undefined ? payload.prima_scadenza : corrente.prima_scadenza,
        acconto_richiesto: payload.acconto_richiesto !== undefined ? Number(payload.acconto_richiesto) : corrente.acconto_richiesto
    }, actor.stamp());

    if (payload.righe) await scriviRighe(payload.id, calcolo.righe);

    if (nuovoStato === 'accettato') {
        await sincronizzaPianoRateale(payload.id, corrente.paziente_id, calcolo.totale_netto, payload);
    }

    return { id: payload.id, totale_netto: calcolo.totale_netto };
}

async function setStato(payload = {}) {
    const corrente = preventivi.requireById(payload.id, { includeArchived: true });
    if (!dominio.STATI.includes(payload.stato)) {
        throw validationError(`Stato non valido: ${payload.stato}`);
    }
    if (!dominio.puoTransitare(corrente.stato, payload.stato)) {
        throw conflictError(`Transizione non ammessa: da "${corrente.stato}" a "${payload.stato}"`);
    }
    await preventivi.update(payload.id, { stato: payload.stato }, actor.stamp());

    if (payload.stato === 'accettato') {
        await sincronizzaPianoRateale(payload.id, corrente.paziente_id, corrente.totale_netto, corrente);
    }

    return { id: payload.id, stato: payload.stato };
}

async function remove(payload = {}) {
    const pagamenti = incassi.findAll({ where: { preventivo_id: payload.id } });
    if (pagamenti.length > 0) {
        throw conflictError('Preventivo con incassi registrati: stornare prima i pagamenti');
    }
    await preventivi.archive(payload.id);
    return { id: payload.id };
}

module.exports = { list, get, create, update, setStato, remove };
