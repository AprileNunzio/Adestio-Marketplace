'use strict';

const { orari, assenze } = require('../repositories/personale');
const { staff } = require('../repositories/organization');
const { validationError, conflictError, notFoundError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const riferimenti = require('../kernel/riferimenti');
const dominio = require('../domain/disponibilita');
const identita = require('../domain/identita');

function assertOra(valore, etichetta) {
    const minuti = dominio.minutiDa(valore);
    if (minuti === null) throw validationError(`${etichetta} non valida: usare il formato HH:MM`);
    return minuti;
}

function assertData(valore, etichetta) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(valore || ''))) {
        throw validationError(`${etichetta} non valida`);
    }
    return String(valore);
}

function orariDi(staffId) {
    return orari.findAll({ where: { staff_id: staffId } });
}

function assenzeDi(staffId, criteri = {}) {
    const filtri = [];
    if (criteri.dal) filtri.push({ colonna: 'data_fine', operatore: 'gte', valore: criteri.dal });
    if (criteri.al) filtri.push({ colonna: 'data_inizio', operatore: 'lte', valore: criteri.al });
    if (criteri.stato) filtri.push({ colonna: 'stato', operatore: 'eq', valore: criteri.stato });
    return assenze.findAll({ where: { staff_id: staffId }, filtri });
}

function listByStaff(payload = {}) {
    if (!payload.staff_id) throw validationError('Selezionare il collaboratore');
    const collaboratore = staff.requireById(payload.staff_id, { includeArchived: true });
    const righe = orariDi(payload.staff_id);
    return {
        collaboratore: { id: collaboratore.id, nominativo: identita.nominativo(collaboratore) },
        righe,
        settimana: dominio.riepilogoSettimanale(righe),
        descrizione: dominio.descriviSettimana(righe),
        giorni: dominio.GIORNI
    };
}

function validaTurno(payload) {
    if (!payload.staff_id) throw validationError('Selezionare il collaboratore');
    const inizio = assertOra(payload.ora_inizio, 'Ora di inizio');
    const fine = assertOra(payload.ora_fine, 'Ora di fine');
    if (fine <= inizio) throw validationError('L\'ora di fine deve seguire quella di inizio');

    const specifica = String(payload.data_specifica || '').trim();
    const giorno = Number(payload.giorno_settimana || 0);
    if (specifica) {
        assertData(specifica, 'Data del turno straordinario');
    } else if (!dominio.GIORNI.some(voce => voce.numero === giorno)) {
        throw validationError('Indicare il giorno della settimana oppure una data specifica');
    }
    if (payload.valido_dal) assertData(payload.valido_dal, 'Inizio validità');
    if (payload.valido_al) assertData(payload.valido_al, 'Fine validità');
    if (payload.valido_dal && payload.valido_al && payload.valido_al < payload.valido_dal) {
        throw validationError('La fine validità precede l\'inizio');
    }
    return { inizio, fine, specifica, giorno };
}

function sovrapposti(payload, controllo) {
    return orariDi(payload.staff_id)
        .filter(riga => riga.id !== payload.id)
        .filter(riga => (controllo.specifica
            ? riga.data_specifica === controllo.specifica
            : !riga.data_specifica && Number(riga.giorno_settimana) === controllo.giorno))
        .filter(riga => {
            const altroInizio = dominio.minutiDa(riga.ora_inizio);
            const altroFine = dominio.minutiDa(riga.ora_fine);
            return altroInizio < controllo.fine && controllo.inizio < altroFine;
        });
}

async function salva(payload = {}) {
    const controllo = validaTurno(payload);
    staff.requireById(payload.staff_id, { includeArchived: true });

    if (sovrapposti(payload, controllo).length > 0) {
        throw conflictError('Esiste già un turno che si sovrappone a questo orario');
    }

    const dati = {
        staff_id: payload.staff_id,
        giorno_settimana: controllo.specifica ? 0 : controllo.giorno,
        data_specifica: controllo.specifica,
        ora_inizio: dominio.oraDa(controllo.inizio),
        ora_fine: dominio.oraDa(controllo.fine),
        sede_id: payload.sede_id || '',
        poltrona_id: payload.poltrona_id || '',
        valido_dal: payload.valido_dal || '',
        valido_al: payload.valido_al || '',
        note: payload.note || ''
    };

    const id = payload.id
        ? await orari.update(payload.id, dati, actor.stamp())
        : await orari.insert(dati, actor.stamp());
    return { id };
}

async function rimuovi(payload = {}) {
    const riga = orari.findById(payload.id, { includeArchived: true });
    if (!riga) throw notFoundError('Turno non trovato');
    await orari.archive(payload.id);
    return { id: payload.id };
}

async function copiaSettimana(payload = {}) {
    if (!payload.staff_id || !payload.origine_id) {
        throw validationError('Indicare il collaboratore di partenza e quello di destinazione');
    }
    if (payload.staff_id === payload.origine_id) {
        throw validationError('Origine e destinazione coincidono');
    }
    staff.requireById(payload.staff_id, { includeArchived: true });
    const modello = orariDi(payload.origine_id).filter(riga => !riga.data_specifica);
    if (modello.length === 0) throw conflictError('Il collaboratore di partenza non ha turni settimanali');

    const esistenti = orariDi(payload.staff_id).filter(riga => !riga.data_specifica);
    for (const riga of esistenti) {
        await orari.archive(riga.id);
    }
    for (const riga of modello) {
        await orari.insert({
            staff_id: payload.staff_id,
            giorno_settimana: riga.giorno_settimana,
            data_specifica: '',
            ora_inizio: riga.ora_inizio,
            ora_fine: riga.ora_fine,
            sede_id: riga.sede_id,
            poltrona_id: riga.poltrona_id,
            valido_dal: riga.valido_dal,
            valido_al: riga.valido_al,
            note: riga.note
        }, actor.stamp());
    }
    return { id: payload.staff_id, turni_copiati: modello.length };
}

function listAssenze(payload = {}) {
    if (!payload.staff_id) throw validationError('Selezionare il collaboratore');
    const righe = assenzeDi(payload.staff_id, payload);
    return {
        righe,
        tipi: dominio.TIPI_ASSENZA,
        stati: dominio.STATI_ASSENZA,
        giorni_richiesti: righe
            .filter(riga => riga.stato === 'approvata')
            .reduce((somma, riga) => somma + giorniFra(riga.data_inizio, riga.data_fine), 0)
    };
}

function giorniFra(dal, al) {
    const inizio = Date.parse(`${dal}T00:00:00`);
    const fine = Date.parse(`${al}T00:00:00`);
    if (!Number.isFinite(inizio) || !Number.isFinite(fine)) return 0;
    return Math.max(Math.round((fine - inizio) / 86400000) + 1, 0);
}

function validaAssenza(payload) {
    if (!payload.staff_id) throw validationError('Selezionare il collaboratore');
    const dal = assertData(payload.data_inizio, 'Data di inizio');
    const al = assertData(payload.data_fine || payload.data_inizio, 'Data di fine');
    if (al < dal) throw validationError('La data di fine precede quella di inizio');
    if (!dominio.TIPI_ASSENZA.some(voce => voce.id === payload.tipo)) {
        throw validationError(`Tipo di assenza non valido: ${payload.tipo}`);
    }
    const intera = payload.giornata_intera === undefined ? true : Boolean(payload.giornata_intera);
    if (!intera) {
        const inizio = assertOra(payload.ora_inizio, 'Ora di inizio');
        const fine = assertOra(payload.ora_fine, 'Ora di fine');
        if (fine <= inizio) throw validationError('L\'ora di fine deve seguire quella di inizio');
    }
    return { dal, al, intera };
}

async function salvaAssenza(payload = {}) {
    const controllo = validaAssenza(payload);
    staff.requireById(payload.staff_id, { includeArchived: true });

    const dati = {
        staff_id: payload.staff_id,
        tipo: payload.tipo,
        data_inizio: controllo.dal,
        data_fine: controllo.al,
        giornata_intera: controllo.intera ? 1 : 0,
        ora_inizio: controllo.intera ? '' : payload.ora_inizio,
        ora_fine: controllo.intera ? '' : payload.ora_fine,
        stato: dominio.STATI_ASSENZA.includes(payload.stato) ? payload.stato : 'richiesta',
        motivo: payload.motivo || '',
        note: payload.note || ''
    };

    const id = payload.id
        ? await assenze.update(payload.id, dati, actor.stamp())
        : await assenze.insert(dati, actor.stamp());
    return { id, giorni: giorniFra(controllo.dal, controllo.al) };
}

async function decidiAssenza(payload = {}) {
    const riga = assenze.findById(payload.id, { includeArchived: true });
    if (!riga) throw notFoundError('Assenza non trovata');
    const stato = payload.stato === 'approvata' || payload.stato === 'rifiutata' ? payload.stato : null;
    if (!stato) throw validationError('Indicare se l\'assenza è approvata o rifiutata');

    await assenze.update(payload.id, {
        stato,
        approvato_da: actor.currentActorId(),
        approvato_il: Date.now(),
        note: payload.note || riga.note
    }, actor.stamp());
    return { id: payload.id, stato };
}

async function rimuoviAssenza(payload = {}) {
    const riga = assenze.findById(payload.id, { includeArchived: true });
    if (!riga) throw notFoundError('Assenza non trovata');
    await assenze.archive(payload.id);
    return { id: payload.id };
}

function calendario(payload = {}) {
    const dal = assertData(payload.dal, 'Data di inizio');
    const al = assertData(payload.al || payload.dal, 'Data di fine');
    const filtri = [
        { colonna: 'data_fine', operatore: 'gte', valore: dal },
        { colonna: 'data_inizio', operatore: 'lte', valore: al },
        { colonna: 'stato', operatore: 'ne', valore: 'rifiutata' }
    ];
    const righe = assenze.findAll({ filtri, ordina: 'data_inizio ASC' });
    const collaboratori = riferimenti.mappaPerId(staff, riferimenti.raccogli(righe, 'staff_id'));
    return righe.map(riga => ({
        ...riga,
        collaboratore: collaboratori.has(riga.staff_id)
            ? identita.nominativo(collaboratori.get(riga.staff_id))
            : '',
        giorni: giorniFra(riga.data_inizio, riga.data_fine)
    }));
}

module.exports = {
    listByStaff,
    salva,
    rimuovi,
    copiaSettimana,
    listAssenze,
    salvaAssenza,
    decidiAssenza,
    rimuoviAssenza,
    calendario,
    orariDi,
    assenzeDi
};
