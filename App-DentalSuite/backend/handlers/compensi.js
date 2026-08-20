'use strict';

const { staff, liquidazioni } = require('../repositories/organization');
const { trattamenti } = require('../repositories/clinical');
const { db, persist, now } = require('../kernel/database');
const { validationError, conflictError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const calcolo = require('../domain/compensi');
const { oggiIso } = require('../domain/rateizzazione');

function periodo(payload) {
    const dal = String(payload.periodo_dal || '').trim();
    const al = String(payload.periodo_al || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dal) || !/^\d{4}-\d{2}-\d{2}$/.test(al)) {
        throw validationError('Periodo di riferimento non valido');
    }
    if (al < dal) throw validationError('La data finale precede quella iniziale');
    return { dal, al };
}

function trattamentiLiquidabili(staffId, dal, al) {
    return trattamenti
        .findAll({})
        .filter(riga => riga.stato === 'eseguito')
        .filter(riga => !riga.liquidazione_id)
        .filter(riga => riga.data_trattamento >= dal && riga.data_trattamento <= al)
        .filter(riga => riga.medico_id === staffId || riga.segretaria_id === staffId);
}

function listLiquidazioni(payload = {}) {
    const righe = payload.staff_id
        ? liquidazioni.findAll({ where: { staff_id: payload.staff_id } })
        : liquidazioni.findAll({});
    const collaboratori = new Map(staff.findAll({ includeArchived: true }).map(s => [s.id, s]));
    return righe.map(riga => ({
        ...riga,
        collaboratore: collaboratori.has(riga.staff_id)
            ? `${collaboratori.get(riga.staff_id).cognome} ${collaboratori.get(riga.staff_id).nome}`.trim()
            : ''
    }));
}

function calcola(payload = {}) {
    if (!payload.staff_id) throw validationError('Selezionare il collaboratore');
    const collaboratore = staff.requireById(payload.staff_id, { includeArchived: true });
    const { dal, al } = periodo(payload);
    const righe = trattamentiLiquidabili(payload.staff_id, dal, al);
    const competenze = calcolo.competenzeCollaboratore(righe, payload.staff_id);
    const netto = calcolo.nettoLiquidazione(
        competenze.totale_competenze,
        collaboratore.ritenuta_acconto_percentuale
    );

    return {
        staff_id: payload.staff_id,
        collaboratore: `${collaboratore.cognome} ${collaboratore.nome}`.trim(),
        periodo_dal: dal,
        periodo_al: al,
        numero_trattamenti: competenze.numero_trattamenti,
        ...netto,
        dettaglio: righe.map(riga => ({
            id: riga.id,
            data_trattamento: riga.data_trattamento,
            descrizione: riga.descrizione,
            importo: riga.importo,
            quota: riga.medico_id === payload.staff_id ? riga.quota_medico : riga.quota_segretaria,
            ruolo: riga.medico_id === payload.staff_id ? 'medico' : 'segreteria'
        }))
    };
}

async function liquida(payload = {}) {
    const bozza = calcola(payload);
    if (bozza.numero_trattamenti === 0) {
        throw conflictError('Nessun trattamento liquidabile nel periodo indicato');
    }

    const id = await liquidazioni.insert({
        staff_id: bozza.staff_id,
        periodo_dal: bozza.periodo_dal,
        periodo_al: bozza.periodo_al,
        totale_competenze: bozza.totale_competenze,
        ritenuta_acconto: bozza.ritenuta_acconto,
        totale_liquidato: bozza.totale_liquidato,
        numero_trattamenti: bozza.numero_trattamenti,
        data_liquidazione: payload.data_liquidazione || oggiIso(),
        metodo_pagamento: payload.metodo_pagamento || '',
        note: payload.note || ''
    }, actor.stamp());

    const timestamp = now();
    bozza.dettaglio.forEach(voce => {
        db().run(
            'UPDATE trattamenti_paziente SET liquidazione_id = ?, last_modified = ? WHERE id = ?',
            [id, timestamp, voce.id]
        );
    });
    await persist();

    return { id, totale_liquidato: bozza.totale_liquidato, trattamenti_chiusi: bozza.numero_trattamenti };
}

module.exports = { listLiquidazioni, calcola, liquida };
