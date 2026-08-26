'use strict';

const { pazienti } = require('../repositories/clinical');
const { db } = require('../kernel/database');
const { validationError, conflictError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const identita = require('../domain/identita');

function decora(riga) {
    return {
        ...riga,
        nominativo: identita.nominativo(riga),
        eta: identita.eta(riga.data_nascita),
        minore: identita.isMinore(riga.data_nascita)
    };
}

function validaAnagrafica(payload) {
    const errori = [];
    if (!String(payload.cognome || '').trim()) errori.push('Il cognome è obbligatorio');
    if (!String(payload.nome || '').trim()) errori.push('Il nome è obbligatorio');
    const esitoCf = identita.validaCodiceFiscale(payload.codice_fiscale);
    if (!esitoCf.valido) errori.push(esitoCf.errore);
    if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.email).trim())) {
        errori.push('Indirizzo email non valido');
    }
    if (errori.length > 0) throw validationError(errori.join('. '));
}

function assertCodiceFiscaleLibero(codiceFiscale, escludiId) {
    const codice = identita.normalizza(codiceFiscale);
    if (!codice) return;
    const righe = db().query(
        'SELECT id FROM pazienti WHERE codice_fiscale = ? AND is_deleted = 0',
        [codice]
    );
    const collisione = righe.find(riga => riga.id !== escludiId);
    if (collisione) throw conflictError('Esiste già un paziente con questo codice fiscale');
}

function normalizzaPayload(payload) {
    return {
        ...payload,
        codice_fiscale: identita.normalizza(payload.codice_fiscale),
        nome: String(payload.nome || '').trim(),
        cognome: String(payload.cognome || '').trim(),
        email: String(payload.email || '').trim()
    };
}

const COLONNE_RICERCA = ['cognome', 'nome', 'codice_fiscale', 'telefono', 'email'];

function filtroTestuale(termine) {
    return {
        oppure: COLONNE_RICERCA.map(colonna => ({
            colonna,
            operatore: 'contiene',
            valore: termine
        }))
    };
}

function filtriDi(payload) {
    const filtri = [];
    const termine = String(payload.term || '').trim();
    if (termine.length >= 2) filtri.push(filtroTestuale(termine));
    if (payload.medico_curante) {
        filtri.push({ colonna: 'medico_curante', operatore: 'eq', valore: payload.medico_curante });
    }
    return filtri;
}

function list(payload = {}) {
    const pagina = pazienti.findPage({
        includeArchived: payload.includeArchived === true,
        filtri: filtriDi(payload),
        pagina: payload.pagina,
        dimensione: payload.dimensione,
        ordina: payload.ordina
    });
    return { ...pagina, righe: pagina.righe.map(decora) };
}

function search(payload = {}) {
    const termine = String(payload.term || '').trim();
    if (termine.length < 2) return [];
    return pazienti
        .findPage({
            filtri: [filtroTestuale(termine)],
            dimensione: Number(payload.limit) || 25
        })
        .righe
        .map(decora);
}

function get(payload = {}) {
    return decora(pazienti.requireById(payload.id, { includeArchived: true }));
}

function riepilogo() {
    const totali = pazienti.aggregate({
        attivi: 'SUM(CASE WHEN is_deleted = 0 THEN 1 ELSE 0 END)',
        archiviati: 'SUM(CASE WHEN is_deleted = 1 THEN 1 ELSE 0 END)',
        senza_privacy: 'SUM(CASE WHEN is_deleted = 0 AND consenso_privacy <> 1 THEN 1 ELSE 0 END)'
    }, { includeArchived: true });
    return {
        attivi: Number(totali.attivi) || 0,
        archiviati: Number(totali.archiviati) || 0,
        senza_privacy: Number(totali.senza_privacy) || 0
    };
}

async function create(payload = {}) {
    const dati = normalizzaPayload(payload);
    validaAnagrafica(dati);
    assertCodiceFiscaleLibero(dati.codice_fiscale, null);
    const id = await pazienti.insert(dati, actor.stamp());
    return { id };
}

async function update(payload = {}) {
    if (!payload.id) throw validationError('Identificativo paziente mancante');
    const dati = normalizzaPayload(payload);
    validaAnagrafica(dati);
    assertCodiceFiscaleLibero(dati.codice_fiscale, payload.id);
    await pazienti.update(payload.id, dati, actor.stamp());
    return { id: payload.id };
}

async function archive(payload = {}) {
    await pazienti.archive(payload.id);
    return { id: payload.id };
}

async function restore(payload = {}) {
    await pazienti.restore(payload.id);
    return { id: payload.id };
}

module.exports = { list, search, get, riepilogo, create, update, archive, restore };
