'use strict';

const money = require('./money');
const accordi = require('./accordi');

function ruoloNel(trattamento, staffId) {
    return trattamento.medico_id === staffId ? 'medico' : 'assistente';
}

function quotaNel(trattamento, staffId) {
    return trattamento.medico_id === staffId
        ? Number(trattamento.quota_medico || 0)
        : Number(trattamento.quota_segretaria || 0);
}

function raggruppa(voci, chiave) {
    const mappa = new Map();
    voci.forEach(voce => {
        const gruppo = chiave(voce) || 'non classificato';
        const corrente = mappa.get(gruppo) || { etichetta: gruppo, totale: 0, voci: 0, ids: [] };
        corrente.totale = money.round(corrente.totale + voce.quota);
        corrente.voci += 1;
        corrente.ids.push(voce.id);
        mappa.set(gruppo, corrente);
    });
    return [...mappa.values()].sort((primo, secondo) => secondo.totale - primo.totale);
}

function componiVoci(trattamenti, staffId, catalogo, mappaPazienti) {
    return trattamenti
        .map(trattamento => {
            const prestazione = catalogo.get(trattamento.prestazione_id) || null;
            const pz = mappaPazienti ? mappaPazienti.get(trattamento.paziente_id) : null;
            const nomePaziente = pz ? `${pz.cognome} ${pz.nome}`.trim() : '';
            return {
                id: trattamento.id,
                data: trattamento.data_trattamento,
                descrizione: trattamento.descrizione,
                dente: trattamento.dente || '',
                paziente_id: trattamento.paziente_id,
                paziente: nomePaziente,
                prestazione_id: trattamento.prestazione_id,
                categoria: prestazione ? prestazione.categoria : '',
                branca: prestazione ? prestazione.branca : '',
                importo: Number(trattamento.importo || 0),
                ruolo: ruoloNel(trattamento, staffId),
                quota: money.round(quotaNel(trattamento, staffId))
            };
        })
        .filter(voce => voce.quota > 0)
        .sort((primo, secondo) => String(secondo.data).localeCompare(String(primo.data)));
}

function mensilitaAperte(compensoMensile, dal, al, periodiGiaLiquidati) {
    const chiuse = new Set(periodiGiaLiquidati || []);
    const maturate = accordi.mensilitaMaturate(compensoMensile, dal, al);
    const aperte = maturate.dettaglio.filter(voce => !chiuse.has(voce.periodo));
    return {
        aperte,
        totale_aperto: money.sum(aperte.map(voce => voce.importo)),
        gia_liquidate: maturate.dettaglio.filter(voce => chiuse.has(voce.periodo)),
        totale_maturato: maturate.totale
    };
}

function componi({ trattamenti, staffId, catalogo, mappaPazienti, compensoMensile, dal, al, periodiLiquidati }) {
    const voci = componiVoci(trattamenti, staffId, catalogo, mappaPazienti);
    const fisso = mensilitaAperte(compensoMensile, dal, al, periodiLiquidati);
    const totaleVariabile = money.sum(voci.map(voce => voce.quota));

    return {
        periodo_dal: dal,
        periodo_al: al,
        voci,
        totale_variabile: totaleVariabile,
        per_categoria: raggruppa(voci, voce => voce.categoria),
        per_branca: raggruppa(voci, voce => voce.branca),
        per_giorno: raggruppa(voci, voce => voce.data),
        per_prestazione: raggruppa(voci, voce => voce.descrizione),
        mensilita_aperte: fisso.aperte,
        mensilita_liquidate: fisso.gia_liquidate,
        totale_mensilita_aperto: fisso.totale_aperto,
        totale_maturato: money.sum([totaleVariabile, fisso.totale_aperto])
    };
}

function selezione(maturato, richiesta = {}) {
    const idRichiesti = Array.isArray(richiesta.trattamenti) ? new Set(richiesta.trattamenti) : null;
    const periodiRichiesti = Array.isArray(richiesta.mensilita) ? new Set(richiesta.mensilita) : null;

    const voci = maturato.voci.filter(voce => {
        if (idRichiesti) return idRichiesti.has(voce.id);
        if (richiesta.categoria) return voce.categoria === richiesta.categoria;
        if (richiesta.prestazione) return voce.descrizione === richiesta.prestazione;
        if (richiesta.giorno) return voce.data === richiesta.giorno;
        if (richiesta.solo_mensilita === true) return false;
        return true;
    });

    const mensilita = maturato.mensilita_aperte.filter(voce => {
        if (periodiRichiesti) return periodiRichiesti.has(voce.periodo);
        if (richiesta.escludi_mensilita === true) return false;
        if (idRichiesti || richiesta.categoria || richiesta.prestazione || richiesta.giorno) return false;
        return true;
    });

    const totaleVariabile = money.sum(voci.map(voce => voce.quota));
    const totaleMensilita = money.sum(mensilita.map(voce => voce.importo));

    return {
        voci,
        mensilita,
        totale_variabile: totaleVariabile,
        totale_mensilita: totaleMensilita,
        totale: money.sum([totaleVariabile, totaleMensilita])
    };
}

module.exports = { componi, selezione, raggruppa, mensilitaAperte };
