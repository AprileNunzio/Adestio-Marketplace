'use strict';

const { pazienti, anamnesi, odontogramma, trattamenti, prescrizioni, allegati } = require('./clinical');
const { appuntamenti } = require('./facility');
const { staff, prestazioni } = require('./organization');
const { consensiPaziente, modelliConsenso } = require('./compliance');
const { rilevazioniDente } = require('./storico');
const riferimenti = require('../kernel/riferimenti');

const TRATTAMENTI_RECENTI = 14;
const PRESCRIZIONI_RECENTI = 8;
const REFERTI_RECENTI = 8;
const RILEVAZIONI_RECENTI = 20;

function prima(righe) {
    return righe.length > 0 ? righe[0] : null;
}

function schedaPaziente(pazienteId) {
    return pazienti.requireById(pazienteId, { includeArchived: true });
}

function schedaAnamnesi(pazienteId) {
    return prima(anamnesi.findAll({ where: { paziente_id: pazienteId } }));
}

function dentiRegistrati(pazienteId, dentizione) {
    return odontogramma.findAll({ where: { paziente_id: pazienteId, dentizione } });
}

function rilevazioniRecenti(pazienteId, quante) {
    return rilevazioniDente.findPage({
        where: { paziente_id: pazienteId },
        ordina: 'data_rilevazione DESC, created_at DESC',
        dimensione: Number(quante) || RILEVAZIONI_RECENTI
    }).righe;
}

function trattamentiRecenti(pazienteId, quanti) {
    return trattamenti.findPage({
        where: { paziente_id: pazienteId },
        ordina: 'data_trattamento DESC, created_at DESC',
        dimensione: Number(quanti) || TRATTAMENTI_RECENTI
    }).righe;
}

function prescrizioniRecenti(pazienteId, quante) {
    return prescrizioni.findPage({
        where: { paziente_id: pazienteId },
        ordina: 'data_prescrizione DESC',
        dimensione: Number(quante) || PRESCRIZIONI_RECENTI
    }).righe;
}

function refertiRecenti(pazienteId, quanti) {
    return allegati.findPage({
        where: { paziente_id: pazienteId },
        ordina: 'data_esame DESC',
        dimensione: Number(quanti) || REFERTI_RECENTI
    }).righe;
}

function appuntamentiDelGiorno(pazienteId, inizio, fine) {
    return appuntamenti.findAll({
        where: { paziente_id: pazienteId },
        filtri: [{ colonna: 'data_ora_inizio', operatore: 'fra', valore: [inizio, fine] }],
        ordina: 'data_ora_inizio ASC'
    });
}

function consensiDi(pazienteId) {
    return {
        raccolti: consensiPaziente.findAll({ where: { paziente_id: pazienteId } }),
        modelli: modelliConsenso.findAll({ where: { in_vigore: 1 } })
    };
}

function nominativiStaff(righe) {
    return riferimenti.mappaPerId(staff, riferimenti.raccogli(righe, 'medico_id', 'segretaria_id'));
}

function catalogoPrestazioni(righe) {
    return riferimenti.mappaPerId(prestazioni, riferimenti.raccogli(righe, 'prestazione_id'));
}

module.exports = {
    schedaPaziente,
    schedaAnamnesi,
    dentiRegistrati,
    rilevazioniRecenti,
    trattamentiRecenti,
    prescrizioniRecenti,
    refertiRecenti,
    appuntamentiDelGiorno,
    consensiDi,
    nominativiStaff,
    catalogoPrestazioni
};
