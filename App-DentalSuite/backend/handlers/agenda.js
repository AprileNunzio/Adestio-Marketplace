'use strict';

const { appuntamenti } = require('../repositories/facility');
const { pazienti } = require('../repositories/clinical');
const { db } = require('../kernel/database');
const { validationError, conflictError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const { decora } = require('../repositories/agenda_vista');
const regole = require('../domain/agenda_rules');
const disponibilita = require('./disponibilita');

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

function listByRange(payload = {}) {
    const { dal, al } = finestra(payload);
    return decora(caricaIntervallo(dal, al));
}

const COLONNE_RICERCA = ['cognome', 'nome', 'codice_fiscale', 'telefono'];

function pazientiCorrispondenti(termine) {
    return pazienti
        .findPage({
            includeArchived: true,
            filtri: [{
                oppure: COLONNE_RICERCA.map(colonna => ({ colonna, operatore: 'contiene', valore: termine }))
            }],
            dimensione: 50
        })
        .righe
        .map(riga => riga.id);
}

function filtriRicerca(payload) {
    const filtri = [];
    if (payload.paziente_id) {
        filtri.push({ colonna: 'paziente_id', operatore: 'eq', valore: payload.paziente_id });
    }
    if (payload.medico_id) filtri.push({ colonna: 'medico_id', operatore: 'eq', valore: payload.medico_id });
    if (payload.poltrona_id) filtri.push({ colonna: 'poltrona_id', operatore: 'eq', valore: payload.poltrona_id });
    if (payload.stato) filtri.push({ colonna: 'stato', operatore: 'eq', valore: payload.stato });
    if (payload.dal) filtri.push({ colonna: 'data_ora_inizio', operatore: 'gte', valore: Number(payload.dal) });
    if (payload.al) filtri.push({ colonna: 'data_ora_inizio', operatore: 'lte', valore: Number(payload.al) });
    return filtri;
}

function cerca(payload = {}) {
    const termine = String(payload.term || '').trim();
    const filtri = filtriRicerca(payload);

    if (termine.length >= 2 && !payload.paziente_id) {
        const identificativi = pazientiCorrispondenti(termine);
        if (identificativi.length === 0) {
            return { righe: [], totale: 0, pagina: 1, dimensione: 25, pagine: 1 };
        }
        filtri.push({ colonna: 'paziente_id', operatore: 'in', valore: identificativi });
    }

    const pagina = appuntamenti.findPage({
        filtri,
        ordina: payload.ordina || 'data_ora_inizio DESC',
        pagina: payload.pagina,
        dimensione: payload.dimensione || 25
    });
    return { ...pagina, righe: decora(pagina.righe) };
}

function listByPaziente(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    const adesso = Date.now();
    const righe = appuntamenti.findAll({
        where: { paziente_id: payload.paziente_id },
        ordina: 'data_ora_inizio DESC'
    });
    const decorate = decora(righe);
    return {
        righe: decorate,
        futuri: decorate.filter(riga => Number(riga.data_ora_inizio) >= adesso).length,
        prossimo: decorate
            .filter(riga => Number(riga.data_ora_inizio) >= adesso && riga.stato !== 'annullato')
            .sort((a, b) => Number(a.data_ora_inizio) - Number(b.data_ora_inizio))[0] || null
    };
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

function stessoImpegno(corrente, candidato) {
    return String(corrente.medico_id || '') === String(candidato.medico_id || '')
        && Number(corrente.data_ora_inizio) === Number(candidato.data_ora_inizio)
        && Number(corrente.durata_minuti) === Number(candidato.durata_minuti);
}

function assertDisponibile(candidato, escludiId) {
    if (!candidato.medico_id) return { forzato: 0, motivo_forzatura: '' };

    const esito = disponibilita.verifica({
        staff_id: candidato.medico_id,
        data_ora_inizio: candidato.data_ora_inizio,
        durata_minuti: candidato.durata_minuti,
        escludi_id: escludiId
    });
    if (esito.ammissibile) return { forzato: 0, motivo_forzatura: '' };

    if (candidato.forza !== true) {
        const alternative = esito.slot.slice(0, 4).map(voce => voce.ora).join(', ');
        throw conflictError(
            `${esito.motivi.join('. ')}.${alternative ? ` Orari liberi quel giorno: ${alternative}.` : ''} Confermare la forzatura per procedere comunque.`
        );
    }
    return { forzato: 1, motivo_forzatura: esito.motivi.join('. ') };
}

async function create(payload = {}) {
    const dati = prepara(payload);
    assertLibero(dati);
    const forzatura = assertDisponibile(dati, null);
    const id = await appuntamenti.insert({ ...dati, ...forzatura }, actor.stamp());
    return { id, forzato: forzatura.forzato === 1 };
}

async function update(payload = {}) {
    if (!payload.id) throw validationError('Identificativo appuntamento mancante');
    const corrente = appuntamenti.requireById(payload.id, { includeArchived: true });
    const dati = prepara({ ...corrente, ...payload });
    assertLibero({ ...dati, id: payload.id });
    const forzatura = stessoImpegno(corrente, dati)
        ? { forzato: Number(corrente.forzato) || 0, motivo_forzatura: corrente.motivo_forzatura || '' }
        : assertDisponibile(dati, payload.id);
    await appuntamenti.update(payload.id, { ...dati, ...forzatura }, actor.stamp());
    return { id: payload.id, forzato: forzatura.forzato === 1 };
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

module.exports = { listByRange, cerca, listByPaziente, create, update, updateStato, remove, STATI };
