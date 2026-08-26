'use strict';

const money = require('./money');

const QUOTA_PERCENTUALE = 'percentuale';
const QUOTA_FISSA = 'fisso';

function quotaDa(tipo, valore, importo) {
    if (tipo === QUOTA_FISSA) return money.round(valore);
    if (tipo === QUOTA_PERCENTUALE) return money.percentOf(importo, valore);
    return 0;
}

function ripartisci(prestazione, importo, override = {}) {
    const base = money.round(importo);
    const quotaMedico = override.quota_medico !== undefined
        ? money.round(override.quota_medico)
        : quotaDa(prestazione.tipo_quota_medico, prestazione.valore_quota_medico, base);
    const quotaSegretaria = override.quota_segretaria !== undefined
        ? money.round(override.quota_segretaria)
        : quotaDa(prestazione.tipo_quota_segretaria, prestazione.valore_quota_segretaria, base);
    const costoMateriali = override.costo_materiali !== undefined
        ? money.round(override.costo_materiali)
        : money.round(prestazione.costo_materiale_stimato || 0);

    return {
        importo: base,
        quota_medico: quotaMedico,
        quota_segretaria: quotaSegretaria,
        costo_materiali: costoMateriali,
        margine_studio: money.round(base - quotaMedico - quotaSegretaria - costoMateriali)
    };
}

function competenzeCollaboratore(trattamenti, staffId) {
    const comeMedico = trattamenti.filter(t => t.medico_id === staffId);
    const comeSegretaria = trattamenti.filter(t => t.segretaria_id === staffId);
    const totale = money.sum([
        ...comeMedico.map(t => t.quota_medico || 0),
        ...comeSegretaria.map(t => t.quota_segretaria || 0)
    ]);
    const identificativi = new Set([...comeMedico, ...comeSegretaria].map(t => t.id));
    return { totale_competenze: totale, numero_trattamenti: identificativi.size };
}

function nettoLiquidazione(totaleCompetenze, ritenutaPercentuale) {
    const ritenuta = money.percentOf(totaleCompetenze, ritenutaPercentuale || 0);
    return {
        totale_competenze: money.round(totaleCompetenze),
        ritenuta_acconto: ritenuta,
        totale_liquidato: money.round(totaleCompetenze - ritenuta)
    };
}

module.exports = { ripartisci, competenzeCollaboratore, nettoLiquidazione, QUOTA_PERCENTUALE, QUOTA_FISSA };
