'use strict';

const { staff } = require('../repositories/organization');
const { trattamenti } = require('../repositories/clinical');
const { appuntamenti } = require('../repositories/facility');
const { validationError, conflictError, notFoundError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const { decora: decoraAgenda } = require('../repositories/agenda_vista');
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
    const filtri = [];
    if (payload.ruolo) filtri.push({ colonna: 'ruolo', operatore: 'eq', valore: payload.ruolo });
    return staff
        .findAll({ includeArchived: payload.includeArchived === true, filtri })
        .map(decora);
}

function get(payload = {}) {
    return decora(staff.requireById(payload.id, { includeArchived: true }));
}

function schedaDiUtente(utenteId) {
    if (!utenteId) return null;
    const righe = staff.findAll({
        includeArchived: true,
        filtri: [{ colonna: 'utente_adestio_id', operatore: 'eq', valore: utenteId }]
    });
    return righe.length > 0 ? righe[0] : null;
}

function mio() {
    const utenteId = actor.currentActorId();
    const riga = schedaDiUtente(utenteId);
    if (!riga) {
        return { collegato: false, utente_id: utenteId, scheda: null };
    }

    const adesso = Date.now();
    const impegni = decoraAgenda(appuntamenti.findAll({
        where: { medico_id: riga.id },
        filtri: [{ colonna: 'data_ora_inizio', operatore: 'gte', valore: adesso }],
        ordina: 'data_ora_inizio ASC'
    }).slice(0, 20));

    const attivita = trattamenti.findPage({
        where: { medico_id: riga.id },
        ordina: 'data_trattamento DESC',
        dimensione: 20
    });

    const eseguiti = trattamenti.aggregate({
        numero: 'COUNT(*)',
        prodotto: 'SUM(importo)',
        competenze: 'SUM(quota_medico)'
    }, { where: { medico_id: riga.id, stato: 'eseguito' } });

    return {
        collegato: true,
        utente_id: utenteId,
        scheda: decora(riga),
        prossimi_appuntamenti: impegni,
        ultimi_trattamenti: attivita.righe,
        produzione: {
            trattamenti_eseguiti: Number(eseguiti.numero) || 0,
            valore_prodotto: Number(eseguiti.prodotto) || 0,
            competenze_maturate: Number(eseguiti.competenze) || 0
        }
    };
}

async function collega(payload = {}) {
    if (!payload.id) throw validationError('Selezionare il collaboratore da collegare');
    const utenteId = String(payload.utente_adestio_id || actor.currentActorId() || '').trim();
    if (!utenteId) throw validationError('Nessun utente Adestio da collegare');

    const riga = staff.findById(payload.id, { includeArchived: true });
    if (!riga) throw notFoundError('Collaboratore non trovato');

    const occupato = schedaDiUtente(utenteId);
    if (occupato && occupato.id !== payload.id) {
        throw conflictError(`L'utente è già collegato alla scheda di ${identita.nominativo(occupato)}`);
    }

    await staff.update(payload.id, { utente_adestio_id: utenteId });
    return { id: payload.id, utente_adestio_id: utenteId };
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
    const aperti = trattamenti.findAll({
        where: { medico_id: payload.id },
        filtri: [
            { colonna: 'stato', operatore: 'ne', valore: 'eseguito' },
            { colonna: 'stato', operatore: 'ne', valore: 'annullato' }
        ]
    });
    const inAgenda = appuntamenti.findAll({
        where: { medico_id: payload.id },
        filtri: [
            { colonna: 'stato', operatore: 'ne', valore: 'annullato' },
            { colonna: 'stato', operatore: 'ne', valore: 'concluso' }
        ]
    });
    if (aperti.length > 0 || inAgenda.length > 0) {
        throw conflictError('Collaboratore con trattamenti o appuntamenti ancora aperti');
    }
    await staff.archive(payload.id);
    return { id: payload.id };
}

module.exports = { list, get, mio, collega, create, update, remove, RUOLI, RAPPORTI };
