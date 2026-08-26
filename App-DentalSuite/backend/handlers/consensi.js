'use strict';

const { modelliConsenso, consensiPaziente } = require('../repositories/compliance');
const { pazienti } = require('../repositories/clinical');
const { db } = require('../kernel/database');
const { validationError, conflictError, notFoundError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const dominio = require('../domain/consenso');
const { oggiIso } = require('../domain/rateizzazione');

function modelliInVigore() {
    return modelliConsenso.findAll({ where: { in_vigore: 1 } });
}

function modelli(payload = {}) {
    const filtri = [];
    if (payload.ambito) filtri.push({ colonna: 'ambito', operatore: 'eq', valore: payload.ambito });
    return modelliConsenso.findAll({ includeArchived: payload.includeArchived === true, filtri });
}

function versioneMassima(codice) {
    const righe = db().query(
        'SELECT MAX(versione) AS massima FROM consensi_modelli WHERE codice = ?',
        [String(codice)]
    ) || [];
    return righe.length > 0 && righe[0].massima ? Number(righe[0].massima) : 0;
}

async function salvaModello(payload = {}) {
    const codice = String(payload.codice || '').trim();
    if (!codice) throw validationError('Il codice del modello è obbligatorio');
    if (!String(payload.titolo || '').trim()) throw validationError('Il titolo è obbligatorio');
    if (!dominio.AMBITI.includes(payload.ambito)) {
        throw validationError(`Ambito non valido: ${payload.ambito}`);
    }

    const precedenti = modelliConsenso.findAll({ where: { codice } });
    const inVigore = precedenti.find(riga => Number(riga.in_vigore) === 1);

    if (inVigore && dominio.improntaTesto(inVigore.testo) === dominio.improntaTesto(payload.testo)) {
        await modelliConsenso.update(inVigore.id, {
            titolo: payload.titolo,
            obbligatorio: payload.obbligatorio,
            validita_mesi: payload.validita_mesi
        }, actor.stamp());
        return { id: inVigore.id, versione: Number(inVigore.versione), nuova_versione: false };
    }

    const versione = versioneMassima(codice) + 1;
    const id = await modelliConsenso.insert({
        ...payload,
        codice,
        versione,
        in_vigore: 1
    }, actor.stamp());

    if (inVigore) await modelliConsenso.update(inVigore.id, { in_vigore: 0 });

    return { id, versione, nuova_versione: true };
}

function listByPaziente(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    const oggi = payload.oggi || oggiIso();
    const raccolti = consensiPaziente.findAll({ where: { paziente_id: payload.paziente_id } });
    const catalogo = modelliInVigore();

    return {
        raccolti: raccolti.map(riga => ({ ...riga, stato_effettivo: dominio.statoEffettivo(riga, oggi) })),
        vigenti: dominio.vigenti(raccolti, oggi),
        scoperture: dominio.scoperture(catalogo, raccolti, oggi),
        modelli: catalogo
    };
}

async function registra(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    if (!payload.modello_id) throw validationError('Selezionare il modello di consenso');
    pazienti.requireById(payload.paziente_id, { includeArchived: true });

    const modello = modelliConsenso.findById(payload.modello_id, { includeArchived: true });
    if (!modello) throw notFoundError('Modello di consenso non trovato');
    if (Number(modello.in_vigore) !== 1) {
        throw conflictError('Il modello selezionato non è più in vigore: usare la versione corrente');
    }

    const dataConcessione = payload.data_concessione || oggiIso();
    const id = await consensiPaziente.insert({
        paziente_id: payload.paziente_id,
        modello_id: modello.id,
        codice: modello.codice,
        versione: modello.versione,
        ambito: modello.ambito,
        stato: dominio.STATO_CONCESSO,
        data_concessione: dataConcessione,
        data_scadenza: dominio.aggiungiMesi(dataConcessione, modello.validita_mesi),
        modalita_raccolta: payload.modalita_raccolta || 'cartaceo',
        impronta_testo: dominio.improntaTesto(modello.testo),
        note: payload.note || ''
    }, actor.stamp());

    return { id, ambito: modello.ambito, versione: modello.versione };
}

async function revoca(payload = {}) {
    const consenso = consensiPaziente.requireById(payload.id, { includeArchived: true });
    if (consenso.stato === dominio.STATO_REVOCATO) {
        throw conflictError('Consenso già revocato');
    }
    await consensiPaziente.update(payload.id, {
        stato: dominio.STATO_REVOCATO,
        data_revoca: payload.data_revoca || oggiIso(),
        note: payload.note || consenso.note
    }, actor.stamp());
    return { id: payload.id, ambito: consenso.ambito };
}

function scopertureStudio(payload = {}) {
    const oggi = payload.oggi || oggiIso();
    const catalogo = modelliInVigore();
    const obbligatori = catalogo.filter(modello => Number(modello.obbligatorio) === 1);
    if (obbligatori.length === 0) return { pazienti_scoperti: [], totale: 0, modelli_obbligatori: 0 };

    const tutti = consensiPaziente.findAll({
        filtri: [{ colonna: 'ambito', operatore: 'in', valore: obbligatori.map(modello => modello.ambito) }]
    });
    const perPaziente = new Map();
    tutti.forEach(riga => {
        if (!perPaziente.has(riga.paziente_id)) perPaziente.set(riga.paziente_id, []);
        perPaziente.get(riga.paziente_id).push(riga);
    });

    const scoperti = pazienti
        .findAll({})
        .map(paziente => ({
            paziente_id: paziente.id,
            nominativo: `${paziente.cognome} ${paziente.nome}`.trim(),
            mancanti: dominio
                .scoperture(obbligatori, perPaziente.get(paziente.id) || [], oggi)
                .filter(voce => voce.obbligatorio)
        }))
        .filter(voce => voce.mancanti.length > 0);

    return { pazienti_scoperti: scoperti, totale: scoperti.length, modelli_obbligatori: obbligatori.length };
}

module.exports = { modelli, salvaModello, listByPaziente, registra, revoca, scopertureStudio };
