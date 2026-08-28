'use strict';

const { trattamenti, pazienti } = require('../repositories/clinical');
const { prestazioni } = require('../repositories/organization');
const { validationError, conflictError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const compensi = require('../domain/compensi');
const accordiDominio = require('../domain/accordi');
const { accordi } = require('../repositories/compensi');
const { staff } = require('../repositories/organization');
const riferimenti = require('../kernel/riferimenti');
const money = require('../domain/money');

const STATI = ['pianificato', 'in_corso', 'eseguito', 'annullato'];

function quotaDaAccordo(staffId, prestazione, ruolo, data, importo) {
    if (!staffId) return null;
    const attivi = accordi.findAll({ where: { staff_id: staffId } });
    const accordo = accordiDominio.risolvi(attivi, prestazione, ruolo, data);
    if (accordo) return accordiDominio.applica(accordo, importo);

    const collaboratore = staff.findById(staffId, { includeArchived: true });
    if (collaboratore && Number(collaboratore.percentuale_default) > 0) {
        return money.percentOf(importo, collaboratore.percentuale_default);
    }
    return null;
}

function arricchisci(payload) {
    const prestazione = payload.prestazione_id ? prestazioni.findById(payload.prestazione_id) : null;
    const importo = payload.importo !== undefined && payload.importo !== ''
        ? money.round(payload.importo)
        : money.round(prestazione ? prestazione.prezzo_paziente : 0);

    const data = payload.data_trattamento || '';
    const sovrascritture = { ...payload };
    if (sovrascritture.quota_medico === undefined) {
        const quota = quotaDaAccordo(payload.medico_id, prestazione, 'medico', data, importo);
        if (quota !== null) sovrascritture.quota_medico = quota;
    }
    if (sovrascritture.quota_segretaria === undefined) {
        const quota = quotaDaAccordo(payload.segretaria_id, prestazione, 'assistente', data, importo);
        if (quota !== null) sovrascritture.quota_segretaria = quota;
    }

    const ripartizione = compensi.ripartisci(prestazione || {}, importo, sovrascritture);
    return {
        ...payload,
        descrizione: payload.descrizione || (prestazione ? prestazione.nome : ''),
        importo: ripartizione.importo,
        quota_medico: ripartizione.quota_medico,
        quota_segretaria: ripartizione.quota_segretaria,
        costo_materiali: ripartizione.costo_materiali,
        anestesia: payload.anestesia || '',
        lotto_materiali: payload.lotto_materiali || ''
    };
}

function valida(payload) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    if (payload.stato && !STATI.includes(payload.stato)) {
        throw validationError(`Stato trattamento non valido: ${payload.stato}`);
    }
    if (Number(payload.importo) < 0) throw validationError("L'importo non può essere negativo");
}

function suggerisci(payload = {}) {
    const prestazione = payload.prestazione_id ? prestazioni.findById(payload.prestazione_id) : null;
    const importo = payload.importo !== undefined && payload.importo !== ''
        ? money.round(payload.importo)
        : money.round(prestazione ? prestazione.prezzo_paziente : 0);
    const data = payload.data_trattamento || '';

    const tuttiAccordi = accordi.findAll({ where: { attivo: 1 } });
    const tuttiStaff = staff.findAll({ includeArchived: false });

    let suggeritoSegretariaId = payload.segretaria_id || '';
    let suggeritoMedicoId = payload.medico_id || '';
    let motivoSegretaria = '';
    let motivoMedico = '';

    if (prestazione && !suggeritoSegretariaId) {
        for (const s of tuttiStaff) {
            if (s.ruolo === 'aso' || s.ruolo === 'segreteria' || s.ruolo === 'amministrazione') {
                const accordiStaff = tuttiAccordi.filter(a => a.staff_id === s.id && a.ruolo === 'assistente');
                const accordo = accordiDominio.risolvi(accordiStaff, prestazione, 'assistente', data);
                if (accordo) {
                    suggeritoSegretariaId = s.id;
                    motivoSegretaria = `Accordo economico (${s.cognome} ${s.nome})`;
                    break;
                }
            }
        }
        if (!suggeritoSegretariaId) {
            const assistenti = tuttiStaff.filter(s => s.ruolo === 'aso' || s.ruolo === 'segreteria');
            if (assistenti.length === 1) {
                suggeritoSegretariaId = assistenti[0].id;
                motivoSegretaria = 'Unico assistente in organico';
            }
        }
    }

    if (prestazione && !suggeritoMedicoId) {
        for (const s of tuttiStaff) {
            if (s.ruolo === 'medico' || s.ruolo === 'odontoiatra' || s.ruolo === 'igienista') {
                const accordiStaff = tuttiAccordi.filter(a => a.staff_id === s.id && a.ruolo === 'medico');
                const accordo = accordiDominio.risolvi(accordiStaff, prestazione, 'medico', data);
                if (accordo && (accordo.ambito === 'prestazione' || accordo.ambito === 'categoria' || accordo.ambito === 'branca')) {
                    suggeritoMedicoId = s.id;
                    motivoMedico = `Accordo economico (${s.cognome} ${s.nome})`;
                    break;
                }
            }
        }
        if (!suggeritoMedicoId) {
            const medici = tuttiStaff.filter(s => s.ruolo === 'medico' || s.ruolo === 'odontoiatra' || s.ruolo === 'igienista');
            if (medici.length === 1) {
                suggeritoMedicoId = medici[0].id;
                motivoMedico = 'Unico operatore in organico';
            }
        }
    }

    const qMed = quotaDaAccordo(suggeritoMedicoId, prestazione, 'medico', data, importo);
    const qSeg = quotaDaAccordo(suggeritoSegretariaId, prestazione, 'assistente', data, importo);
    const sovrascritture = {};
    if (qMed !== null) sovrascritture.quota_medico = qMed;
    if (qSeg !== null) sovrascritture.quota_segretaria = qSeg;

    const ripartizione = compensi.ripartisci(prestazione || {}, importo, sovrascritture);
    const margineStudio = money.round(importo - ripartizione.quota_medico - ripartizione.quota_segretaria - ripartizione.costo_materiali);

    return {
        descrizione: prestazione ? prestazione.nome : '',
        importo: ripartizione.importo,
        costo_materiali: ripartizione.costo_materiali,
        suggerito_medico_id: suggeritoMedicoId,
        suggerito_segretaria_id: suggeritoSegretariaId,
        motivo_medico: motivoMedico,
        motivo_segretaria: motivoSegretaria,
        quota_medico_stimata: ripartizione.quota_medico,
        quota_segretaria_stimata: ripartizione.quota_segretaria,
        margine_studio_stimato: margineStudio
    };
}

function listByPaziente(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    const righe = trattamenti.findAll({ where: { paziente_id: payload.paziente_id } });
    const catalogo = riferimenti.mappaPerId(prestazioni, riferimenti.raccogli(righe, 'prestazione_id'));
    return righe.map(riga => ({
        ...riga,
        prestazione: catalogo.get(riga.prestazione_id) || null,
        margine_studio: money.round(
            riga.importo - riga.quota_medico - riga.quota_segretaria - riga.costo_materiali
        )
    }));
}

async function add(payload = {}) {
    valida(payload);
    pazienti.requireById(payload.paziente_id, { includeArchived: true });
    const dati = arricchisci(payload);
    const id = await trattamenti.insert(dati, actor.stamp());
    return { id };
}

async function update(payload = {}) {
    if (!payload.id) throw validationError('Identificativo trattamento mancante');
    const corrente = trattamenti.requireById(payload.id, { includeArchived: true });
    if (corrente.liquidazione_id) {
        throw conflictError('Trattamento già liquidato: non è più modificabile');
    }
    valida({ ...corrente, ...payload });
    const dati = arricchisci({ ...corrente, ...payload });
    await trattamenti.update(payload.id, dati, actor.stamp());
    return { id: payload.id };
}

async function remove(payload = {}) {
    const corrente = trattamenti.requireById(payload.id, { includeArchived: true });
    if (corrente.liquidazione_id) {
        throw conflictError('Trattamento già liquidato: non è eliminabile');
    }
    await trattamenti.archive(payload.id);
    return { id: payload.id };
}

module.exports = { listByPaziente, add, update, remove, suggerisci, STATI };
