'use strict';

const diario = require('../rete/diario');

const { trasmissioni } = require('../repositories/trasmissione');
const actor = require('../kernel/actor');
const seduta = require('../repositories/seduta_volatile');
const identita = require('../rete/identita');

function righeDiQuestaPostazione() {
    const locale = identita.scheda();
    if (!locale) return [];
    return trasmissioni.findAll({ where: { stato: 'aperta' } }).filter(riga =>
        riga.impronta_postazione && riga.impronta_postazione === locale.impronta
    );
}

async function chiudiPerRete(payload = {}) {
    const motivo = payload.motivo || 'seduta chiusa dalla segreteria';
    const versione = seduta.svuota(motivo);

    for (const riga of righeDiQuestaPostazione()) {
        if (payload.trasmissione_id && riga.id !== payload.trasmissione_id) continue;
        try {
            await trasmissioni.update(riga.id, {
                stato: 'chiusa',
                chiusa_il: Date.now(),
                motivo_chiusura: motivo
            }, actor.stamp());
        } catch (errore) { diario.annota('riscontri:1', errore); }
    }

    return { chiusa: true, versione };
}

async function segnalaChiusuraRemota(payload = {}) {
    try {
        if (!payload.trasmissione_id) return { aggiornata: false };
        const riga = trasmissioni.findById(payload.trasmissione_id, { includeArchived: true });
        if (!riga || riga.stato !== 'aperta') return { aggiornata: false };
        await trasmissioni.update(riga.id, {
            stato: 'chiusa',
            chiusa_il: Date.now(),
            motivo_chiusura: payload.motivo || 'seduta chiusa dal medico'
        }, actor.stamp());
        return { aggiornata: true };
    } catch (e) {
        return { aggiornata: false, errore: e.message };
    }
}

async function segnalaCambioPaziente(payload = {}) {
    try {
        if (!payload.trasmissione_id || !payload.paziente_id) return { aggiornata: false };
        const riga = trasmissioni.findById(payload.trasmissione_id, { includeArchived: true });
        if (!riga || riga.stato !== 'aperta') return { aggiornata: false };
        await trasmissioni.update(riga.id, { paziente_id: payload.paziente_id }, actor.stamp());
        return { aggiornata: true };
    } catch (e) {
        return { aggiornata: false, errore: e.message };
    }
}

function statoSeduta(payload = {}) {
    try {
        if (!payload.trasmissione_id) return { conosciuta: false, aperta: false };
        const riga = trasmissioni.findById(payload.trasmissione_id, { includeArchived: true });
        if (!riga) return { conosciuta: false, aperta: false };
        return { conosciuta: true, aperta: riga.stato === 'aperta', motivo: riga.motivo_chiusura || '' };
    } catch (e) {
        return { conosciuta: false, aperta: false, errore: e.message };
    }
}

module.exports = { segnalaChiusuraRemota, segnalaCambioPaziente, chiudiPerRete, righeDiQuestaPostazione, statoSeduta };
