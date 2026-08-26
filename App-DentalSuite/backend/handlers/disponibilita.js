'use strict';

const { appuntamenti } = require('../repositories/facility');
const { staff } = require('../repositories/organization');
const { decora } = require('../repositories/agenda_vista');
const { validationError } = require('../kernel/errors');
const dominio = require('../domain/disponibilita');
const identita = require('../domain/identita');
const turni = require('./turni');

const GIORNO_MS = 24 * 60 * 60 * 1000;
const GIORNI_SETTIMANA = 7;

function assertData(valore) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(valore || ''))) {
        throw validationError('Data non valida: usare il formato AAAA-MM-GG');
    }
    return String(valore);
}

function impegniDi(staffId, inizioGiornataMs) {
    return decora(appuntamenti.findAll({
        where: { medico_id: staffId },
        filtri: [{
            colonna: 'data_ora_inizio',
            operatore: 'fra',
            valore: [inizioGiornataMs, inizioGiornataMs + GIORNO_MS - 1]
        }],
        ordina: 'data_ora_inizio ASC'
    }));
}

function quadroDi(staffId, isoDate, opzioni = {}) {
    const inizioGiornataMs = dominio.inizioGiornataDi(isoDate);
    return dominio.giornata({
        orari: turni.orariDi(staffId),
        assenze: turni.assenzeDi(staffId, { dal: isoDate, al: isoDate }),
        appuntamenti: impegniDi(staffId, inizioGiornataMs),
        isoDate,
        inizioGiornataMs,
        escludiId: opzioni.escludiId,
        durataMinuti: opzioni.durataMinuti,
        passo: opzioni.passo
    });
}

function giorno(payload = {}) {
    if (!payload.staff_id) throw validationError('Selezionare il collaboratore');
    const collaboratore = staff.requireById(payload.staff_id, { includeArchived: true });
    const data = assertData(payload.data);
    const quadro = quadroDi(payload.staff_id, data, {
        escludiId: payload.escludi_id,
        durataMinuti: Number(payload.durata_minuti) || 30,
        passo: payload.passo
    });
    return {
        collaboratore: { id: collaboratore.id, nominativo: identita.nominativo(collaboratore) },
        ...quadro
    };
}

function settimana(payload = {}) {
    if (!payload.staff_id) throw validationError('Selezionare il collaboratore');
    const collaboratore = staff.requireById(payload.staff_id, { includeArchived: true });
    const dal = assertData(payload.dal);
    const giorni = Array.from({ length: Number(payload.giorni) || GIORNI_SETTIMANA }, (unused, indice) =>
        quadroDi(payload.staff_id, dominio.giorniDopo(dal, indice), {
            durataMinuti: Number(payload.durata_minuti) || 0
        }));

    return {
        collaboratore: { id: collaboratore.id, nominativo: identita.nominativo(collaboratore) },
        dal,
        giorni,
        minuti_disponibili: giorni.reduce((somma, voce) => somma + voce.minuti_disponibili, 0),
        minuti_liberi: giorni.reduce((somma, voce) => somma + voce.minuti_liberi, 0)
    };
}

function verifica(payload = {}) {
    if (!payload.staff_id) return { ammissibile: true, motivi: [], senza_medico: true };
    const inizio = Number(payload.data_ora_inizio);
    if (!Number.isFinite(inizio)) throw validationError('Data e ora di inizio non valide');

    const durata = Math.max(1, Number(payload.durata_minuti) || 30);
    const data = dominio.isoDaTimestamp(inizio);
    const quadro = quadroDi(payload.staff_id, data, {
        escludiId: payload.escludi_id,
        durataMinuti: durata
    });
    const minuti = dominio.minutiDalTimestamp(inizio, dominio.inizioGiornataDi(data));
    const esito = dominio.valuta(quadro, minuti, durata);

    return {
        ...esito,
        orari_dichiarati: quadro.orari_dichiarati,
        data,
        ora: dominio.oraDa(minuti),
        fasce_lavoro: quadro.fasce_lavoro,
        fasce_libere: quadro.fasce_libere,
        slot: quadro.slot
    };
}

function panoramica(payload = {}) {
    const data = assertData(payload.data);
    const collaboratori = staff.findAll({
        filtri: payload.ruolo
            ? [{ colonna: 'ruolo', operatore: 'eq', valore: payload.ruolo }]
            : []
    });

    return collaboratori
        .map(collaboratore => {
            const quadro = quadroDi(collaboratore.id, data, { durataMinuti: Number(payload.durata_minuti) || 30 });
            return {
                staff_id: collaboratore.id,
                nominativo: identita.nominativo(collaboratore),
                ruolo: collaboratore.ruolo,
                colore: collaboratore.colore_agenda || '',
                ...quadro
            };
        })
        .filter(voce => payload.solo_disponibili !== true || voce.minuti_liberi > 0);
}

module.exports = { giorno, settimana, verifica, panoramica, quadroDi };
