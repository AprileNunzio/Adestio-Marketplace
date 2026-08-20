'use strict';

const { appuntamenti, poltrone } = require('../repositories/facility');
const { pazienti } = require('../repositories/clinical');
const { staff, prestazioni } = require('../repositories/organization');
const { db } = require('../kernel/database');
const { validationError, conflictError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const regole = require('../domain/agenda_rules');

const STATI = ['programmato', 'confermato', 'in_sala', 'concluso', 'annullato', 'non_presentato'];

function finestra(payload) {
    const dal = Number(payload.dal);
    const al = Number(payload.al);
    if (!Number.isFinite(dal) || !Number.isFinite(al)) {
        throw validationError('Intervallo temporale non valido');
    }
    if (al < dal) throw validationError('La fine intervallo precede l\'inizio');
    return { dal, al };
}

function caricaIntervallo(dal, al) {
    return db().query(
        `SELECT * FROM appuntamenti
         WHERE is_deleted = 0 AND data_ora_inizio >= ? AND data_ora_inizio <= ?
         ORDER BY data_ora_inizio ASC`,
        [dal, al]
    ) || [];
}

function decora(righe) {
    const anagrafiche = new Map(pazienti.findAll({ includeArchived: true }).map(p => [p.id, p]));
    const collaboratori = new Map(staff.findAll({ includeArchived: true }).map(s => [s.id, s]));
    const unita = new Map(poltrone.findAll({ includeArchived: true }).map(p => [p.id, p]));
    const catalogo = new Map(prestazioni.findAll({ includeArchived: true }).map(p => [p.id, p]));

    return righe.map(riga => {
        const paziente = anagrafiche.get(riga.paziente_id);
        const medico = collaboratori.get(riga.medico_id);
        return {
            ...riga,
            paziente_nome: paziente ? `${paziente.cognome} ${paziente.nome}`.trim() : '',
            paziente_telefono: paziente ? paziente.telefono : '',
            medico_nome: medico ? `${medico.cognome} ${medico.nome}`.trim() : '',
            medico_colore: medico ? medico.colore_agenda : '',
            poltrona_nome: unita.has(riga.poltrona_id) ? unita.get(riga.poltrona_id).nome : '',
            prestazione_nome: catalogo.has(riga.prestazione_id) ? catalogo.get(riga.prestazione_id).nome : ''
        };
    });
}

function listByRange(payload = {}) {
    const { dal, al } = finestra(payload);
    return decora(caricaIntervallo(dal, al));
}

function assertLibero(candidato) {
    const giorno = 24 * 60 * 60 * 1000;
    const vicini = caricaIntervallo(
        Number(candidato.data_ora_inizio) - giorno,
        Number(candidato.data_ora_inizio) + giorno
    );
    const sovrapposti = regole.conflitti(candidato, vicini);
    if (sovrapposti.length > 0) {
        throw conflictError(`Sovrapposizione rilevata: ${sovrapposti[0].motivo}`);
    }
}

function prepara(payload) {
    const errori = regole.validaAppuntamento(payload);
    if (errori.length > 0) throw validationError(errori.join('. '));
    if (payload.stato && !STATI.includes(payload.stato)) {
        throw validationError(`Stato appuntamento non valido: ${payload.stato}`);
    }
    return { ...payload, data_ora_inizio: Number(payload.data_ora_inizio) };
}

async function create(payload = {}) {
    const dati = prepara(payload);
    assertLibero(dati);
    const id = await appuntamenti.insert(dati, actor.stamp());
    return { id };
}

async function update(payload = {}) {
    if (!payload.id) throw validationError('Identificativo appuntamento mancante');
    const corrente = appuntamenti.requireById(payload.id, { includeArchived: true });
    const dati = prepara({ ...corrente, ...payload });
    assertLibero({ ...dati, id: payload.id });
    await appuntamenti.update(payload.id, dati, actor.stamp());
    return { id: payload.id };
}

async function updateStato(payload = {}) {
    if (!STATI.includes(payload.stato)) throw validationError(`Stato non valido: ${payload.stato}`);
    appuntamenti.requireById(payload.id, { includeArchived: true });
    await appuntamenti.update(payload.id, { stato: payload.stato }, actor.stamp());
    return { id: payload.id, stato: payload.stato };
}

async function remove(payload = {}) {
    await appuntamenti.archive(payload.id);
    return { id: payload.id };
}

module.exports = { listByRange, create, update, updateStato, remove, STATI };
