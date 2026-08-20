'use strict';

const money = require('./money');

function meseDi(isoDate) {
    return String(isoDate || '').slice(0, 7);
}

function nellIntervallo(isoDate, dal, al) {
    if (!isoDate) return false;
    if (dal && isoDate < dal) return false;
    if (al && isoDate > al) return false;
    return true;
}

function raggruppa(righe, chiave, valore) {
    const mappa = new Map();
    righe.forEach(riga => {
        const gruppo = chiave(riga) || 'non assegnato';
        mappa.set(gruppo, money.round((mappa.get(gruppo) || 0) + Number(valore(riga) || 0)));
    });
    return [...mappa.entries()]
        .map(([etichetta, totale]) => ({ etichetta, totale }))
        .sort((a, b) => b.totale - a.totale);
}

function produzione(trattamenti, intervallo = {}) {
    const inclusi = trattamenti.filter(t => nellIntervallo(t.data_trattamento, intervallo.dal, intervallo.al));
    const eseguiti = inclusi.filter(t => t.stato === 'eseguito');
    return {
        trattamenti_totali: inclusi.length,
        trattamenti_eseguiti: eseguiti.length,
        valore_pianificato: money.sum(inclusi.map(t => t.importo)),
        valore_eseguito: money.sum(eseguiti.map(t => t.importo)),
        per_mese: raggruppa(eseguiti, t => meseDi(t.data_trattamento), t => t.importo)
    };
}

function economia(dati, intervallo = {}) {
    const incassi = (dati.incassi || []).filter(i => nellIntervallo(i.data_pagamento, intervallo.dal, intervallo.al));
    const spese = (dati.spese || []).filter(s => nellIntervallo(s.data_spesa, intervallo.dal, intervallo.al));
    const trattamenti = (dati.trattamenti || []).filter(t =>
        t.stato === 'eseguito' && nellIntervallo(t.data_trattamento, intervallo.dal, intervallo.al));

    const totaleIncassi = money.sum(incassi.map(i => i.importo));
    const totaleSpese = money.sum(spese.map(s => s.importo));
    const compensiStaff = money.sum([
        ...trattamenti.map(t => t.quota_medico || 0),
        ...trattamenti.map(t => t.quota_segretaria || 0)
    ]);
    const materiali = money.sum(trattamenti.map(t => t.costo_materiali || 0));

    return {
        totale_incassi: totaleIncassi,
        totale_spese: totaleSpese,
        compensi_staff: compensiStaff,
        costo_materiali: materiali,
        margine_lordo: money.round(totaleIncassi - totaleSpese),
        margine_netto: money.round(totaleIncassi - totaleSpese - compensiStaff - materiali),
        incassi_per_mese: raggruppa(incassi, i => meseDi(i.data_pagamento), i => i.importo),
        spese_per_categoria: raggruppa(spese, s => s.categoria, s => s.importo),
        incassi_per_metodo: raggruppa(incassi, i => i.metodo_pagamento, i => i.importo)
    };
}

function perCollaboratore(trattamenti, staff, intervallo = {}) {
    const inclusi = trattamenti.filter(t =>
        t.stato === 'eseguito' && nellIntervallo(t.data_trattamento, intervallo.dal, intervallo.al));
    const nomi = new Map(staff.map(s => [s.id, `${s.cognome} ${s.nome}`.trim()]));
    return raggruppa(inclusi, t => nomi.get(t.medico_id), t => t.importo);
}

function perBranca(trattamenti, prestazioni, intervallo = {}) {
    const inclusi = trattamenti.filter(t =>
        t.stato === 'eseguito' && nellIntervallo(t.data_trattamento, intervallo.dal, intervallo.al));
    const branche = new Map(prestazioni.map(p => [p.id, p.branca || p.categoria]));
    return raggruppa(inclusi, t => branche.get(t.prestazione_id), t => t.importo);
}

function esposizioneRate(rate, oggi) {
    const aperte = rate.filter(r => r.stato !== 'pagata');
    const scadute = aperte.filter(r => r.data_scadenza && r.data_scadenza < oggi);
    return {
        rate_aperte: aperte.length,
        importo_aperto: money.sum(aperte.map(r => r.importo)),
        rate_scadute: scadute.length,
        importo_scaduto: money.sum(scadute.map(r => r.importo))
    };
}

module.exports = { produzione, economia, perCollaboratore, perBranca, esposizioneRate, raggruppa, nellIntervallo, meseDi };
