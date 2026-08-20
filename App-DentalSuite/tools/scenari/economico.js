'use strict';

module.exports = async function scenario({ chiama, verifica, assertOk, assertKo, host, contesto }) {
    const paziente = contesto.paziente;
    const medico = contesto.medico;
    const prestazione = contesto.prestazione;
    const poltrona = contesto.poltrona;
    const trattamento = contesto.trattamento;
    const sede = contesto.sede;
    const preventivo = assertOk('Preventivo creato', await chiama('preventivi.create', {
        paziente_id: paziente.id, medico_id: medico.id, sconto_percentuale: 10,
        righe: [
            { prestazione_id: prestazione.id, descrizione: 'Otturazione', quantita: 2, prezzo_unitario: 150 },
            { descrizione: 'Igiene', quantita: 1, prezzo_unitario: 80 }
        ]
    }));
    verifica('Totale netto 342 (380 - 10%)', preventivo.totale_netto === 342, `${preventivo.totale_netto}`);
    const dettaglioPreventivo = assertOk('Preventivo riletto', await chiama('preventivi.get', { id: preventivo.id }));
    verifica('Numerazione progressiva', /^\d{4}\/0001$/.test(dettaglioPreventivo.numero_preventivo),
        dettaglioPreventivo.numero_preventivo);
    assertKo('Transizione bozza→accettato vietata',
        await chiama('preventivi.setStato', { id: preventivo.id, stato: 'accettato' }), 'CONFLICT');
    assertOk('Transizione bozza→inviato ammessa',
        await chiama('preventivi.setStato', { id: preventivo.id, stato: 'inviato' }));
    assertOk('Transizione inviato→accettato ammessa',
        await chiama('preventivi.setStato', { id: preventivo.id, stato: 'accettato' }));

    const piano = assertOk('Piano rateale creato', await chiama('rate.creaPiano', {
        paziente_id: paziente.id, preventivo_id: preventivo.id,
        totale_piano: 342, acconto_iniziale: 42, numero_rate: 4,
        cadenza_mesi: 1, prima_scadenza: '2026-09-30'
    }));
    verifica('4 rate generate', piano.rate_generate === 4);
    const piani = assertOk('Piani letti', await chiama('rate.listByPaziente', { paziente_id: paziente.id }));
    verifica('Residuo piano = 300', piani[0].residuo === 300, `${piani[0].residuo}`);
    verifica('Scadenze fine mese corrette',
        piani[0].rate.map(r => r.data_scadenza).join(',') === '2026-09-30,2026-10-30,2026-11-30,2026-12-30',
        piani[0].rate.map(r => r.data_scadenza).join(','));

    const primaRata = piani[0].rate[0];
    assertOk('Rata saldata', await chiama('rate.pagaRata', {
        id: primaRata.id, metodo_pagamento: 'bonifico'
    }));
    assertKo('Doppio pagamento rata bloccato',
        await chiama('rate.pagaRata', { id: primaRata.id }), 'CONFLICT');
    const incassi = assertOk('Incassi letti', await chiama('incassi.list'));
    verifica('Incasso automatico da rata = 75', incassi.totale === 75, `${incassi.totale}`);

    assertOk('Spesa registrata', await chiama('spese.registra', {
        categoria: 'laboratorio_odontotecnico', descrizione: 'Corone', importo: 200, data_spesa: '2026-08-05'
    }));
    assertKo('Spesa con importo nullo rifiutata',
        await chiama('spese.registra', { descrizione: 'Nulla', importo: 0 }), 'VALIDATION');

    const bozzaLiquidazione = assertOk('Liquidazione calcolata', await chiama('compensi.calcola', {
        staff_id: medico.id, periodo_dal: '2026-08-01', periodo_al: '2026-08-31'
    }));
    verifica('Competenze 60, ritenuta 12, netto 48',
        bozzaLiquidazione.totale_competenze === 60
        && bozzaLiquidazione.ritenuta_acconto === 12
        && bozzaLiquidazione.totale_liquidato === 48,
        JSON.stringify(bozzaLiquidazione.totale_liquidato));
    assertOk('Liquidazione emessa', await chiama('compensi.liquida', {
        staff_id: medico.id, periodo_dal: '2026-08-01', periodo_al: '2026-08-31'
    }));
    assertKo('Trattamento liquidato non modificabile',
        await chiama('trattamenti.update', { id: trattamento.id, importo: 999 }), 'CONFLICT');
    assertKo('Seconda liquidazione senza capienza',
        await chiama('compensi.liquida', {
            staff_id: medico.id, periodo_dal: '2026-08-01', periodo_al: '2026-08-31'
        }), 'CONFLICT');

    const produzione = assertOk('Statistiche produzione', await chiama('statistiche.produzione', {}));
    verifica('1 trattamento eseguito, valore 150',
        produzione.trattamenti_eseguiti === 1 && produzione.valore_eseguito === 150);
    assertKo('Economia direzionale negata senza permesso',
        await chiama('statistiche.economia', {}), 'FORBIDDEN');

    host.concedi(['direzione_economics']);
    require('../../backend/kernel/authz').invalidate();
    const economia = assertOk('Economia direzionale concessa dopo grant', await chiama('statistiche.economia', {}));
    verifica('Margine lordo = 75 - 200 = -125', economia.margine_lordo === -125, `${economia.margine_lordo}`);

    assertKo('Eliminazione prestazione usata bloccata',
        await chiama('prestazioni.remove', { id: prestazione.id }), 'CONFLICT');
    assertKo('Eliminazione sede con poltrone bloccata',
        await chiama('struttura.removeSede', { id: sede.id }), 'CONFLICT');

    contesto.preventivo = preventivo;
};
