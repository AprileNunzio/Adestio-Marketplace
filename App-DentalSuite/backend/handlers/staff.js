'use strict';

const { staff } = require('../repositories/organization');
const { trattamenti } = require('../repositories/clinical');
const { appuntamenti } = require('../repositories/facility');
const { validationError, conflictError } = require('../kernel/errors');
const identita = require('../domain/identita');

const RAPPORTI = ['dipendente', 'collaboratore', 'libero_professionista', 'socio'];

const RUOLI = ['medico', 'odontoiatra', 'igienista', 'aso', 'segreteria', 'amministrazione', 'odontotecnico'];

function decora(riga) {
    return { ...riga, nominativo: identita.nominativo(riga) };
}

function valida(payload) {
    const errori = [];
    if (!String(payload.cognome || '').trim()) errori.push('Il cognome è obbligatorio');
    if (!String(payload.nome || '').trim()) errori.push('Il nome è obbligatorio');
    if (payload.ruolo && !RUOLI.includes(payload.ruolo)) errori.push(`Ruolo non valido: ${payload.ruolo}`);
    const esitoCf = identita.validaCodiceFiscale(payload.codice_fiscale);
    if (!esitoCf.valido) errori.push(esitoCf.errore);
    const percentuale = Number(payload.percentuale_default || 0);
    if (percentuale < 0 || percentuale > 100) errori.push('La percentuale di default deve essere tra 0 e 100');
    const ritenuta = Number(payload.ritenuta_acconto_percentuale || 0);
    if (ritenuta < 0 || ritenuta > 100) errori.push('La ritenuta d\'acconto deve essere tra 0 e 100');
    if (payload.compenso_mensile !== undefined && Number(payload.compenso_mensile) < 0) {
        errori.push('Il compenso fisso mensile non può essere negativo');
    }
    if (payload.tipo_rapporto && !RAPPORTI.includes(payload.tipo_rapporto)) {
        errori.push(`Tipo di rapporto non valido: ${payload.tipo_rapporto}`);
    }
    if (errori.length > 0) throw validationError(errori.join('. '));
}

function list(payload = {}) {
    return staff
        .findAll({ includeArchived: payload.includeArchived === true })
        .filter(riga => !payload.ruolo || riga.ruolo === payload.ruolo)
        .map(decora);
}

function get(payload = {}) {
    return decora(staff.requireById(payload.id, { includeArchived: true }));
}

async function create(payload = {}) {
    valida(payload);
    const dati = { ...payload, codice_fiscale: identita.normalizza(payload.codice_fiscale) };
    const id = await staff.insert(dati);
    return { id };
}

async function update(payload = {}) {
    if (!payload.id) throw validationError('Identificativo collaboratore mancante');
    const corrente = staff.requireById(payload.id, { includeArchived: true });
    valida({ ...corrente, ...payload });
    const dati = { ...payload, codice_fiscale: identita.normalizza(payload.codice_fiscale) };
    await staff.update(payload.id, dati);
    return { id: payload.id };
}

async function remove(payload = {}) {
    const aperti = trattamenti
        .findAll({ where: { medico_id: payload.id } })
        .filter(riga => riga.stato !== 'eseguito' && riga.stato !== 'annullato');
    const inAgenda = appuntamenti
        .findAll({ where: { medico_id: payload.id } })
        .filter(riga => riga.stato !== 'annullato' && riga.stato !== 'concluso');
    if (aperti.length > 0 || inAgenda.length > 0) {
        throw conflictError('Collaboratore con trattamenti o appuntamenti ancora aperti');
    }
    await staff.archive(payload.id);
    return { id: payload.id };
}

module.exports = { list, get, create, update, remove, RUOLI, RAPPORTI };
