'use strict';

const { trattamenti, pazienti } = require('../repositories/clinical');
const { preventivi, incassi, rate } = require('../repositories/financial');
const { validationError } = require('../kernel/errors');
const dominio = require('../domain/situazione');
const identita = require('../domain/identita');
const money = require('../domain/money');
const { oggiIso } = require('../domain/rateizzazione');

function materiale(pazienteId) {
    return {
        trattamenti: trattamenti.findAll({ where: { paziente_id: pazienteId } }),
        preventivi: preventivi.findAll({ where: { paziente_id: pazienteId } }),
        incassi: incassi.findAll({ where: { paziente_id: pazienteId }, ordina: 'data_pagamento DESC' }),
        rate: rate.findAll({
            where: { paziente_id: pazienteId },
            filtri: [{ colonna: 'stato', operatore: 'ne', valore: 'pagata' }],
            ordina: 'data_scadenza ASC'
        })
    };
}

function paziente(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    const anagrafica = pazienti.requireById(payload.paziente_id, { includeArchived: true });
    const dati = materiale(payload.paziente_id);
    const situazione = dominio.componi({ ...dati, oggi: payload.oggi || oggiIso() });

    return {
        paziente: { id: anagrafica.id, nominativo: identita.nominativo(anagrafica) },
        ...situazione,
        etichetta_saldo: dominio.etichettaSaldo(situazione),
        valore_saldo: dominio.valoreSaldo(situazione),
        incassi: dati.incassi
    };
}

function saldiPazienti(payload = {}) {
    try {
        const tuttiPazienti = pazienti.findAll({ includeArchived: true });
        const tuttiTrattamenti = trattamenti.findAll({ where: { stato: 'eseguito' } });
        const tuttiIncassi = incassi.findAll({});

        const trattamentiPerPaziente = new Map();
        for (const t of tuttiTrattamenti) {
            if (!t.paziente_id) continue;
            const lista = trattamentiPerPaziente.get(t.paziente_id) || [];
            lista.push(t);
            trattamentiPerPaziente.set(t.paziente_id, lista);
        }

        const incassiPerPaziente = new Map();
        for (const inc of tuttiIncassi) {
            if (!inc.paziente_id) continue;
            const lista = incassiPerPaziente.get(inc.paziente_id) || [];
            lista.push(inc);
            incassiPerPaziente.set(inc.paziente_id, lista);
        }

        let totaleDaRiscuotere = 0;
        let pazientiADebito = 0;
        let totaleCrediti = 0;
        let pazientiACredito = 0;
        let totaleEseguitoGlobale = 0;
        let totaleIncassatoGlobale = 0;

        const elencoSaldi = [];

        for (const p of tuttiPazienti) {
            const tratt = trattamentiPerPaziente.get(p.id) || [];
            const inc = incassiPerPaziente.get(p.id) || [];

            const eseguito = money.sum(tratt.map(r => r.importo || 0));
            const incassato = money.sum(inc.map(r => r.importo || 0));
            const saldo = money.round(eseguito - incassato);

            totaleEseguitoGlobale = money.round(totaleEseguitoGlobale + eseguito);
            totaleIncassatoGlobale = money.round(totaleIncassatoGlobale + incassato);

            const aDebito = saldo > 0 ? saldo : 0;
            const aCredito = saldo < 0 ? money.round(-saldo) : 0;

            if (aDebito > 0) {
                totaleDaRiscuotere = money.round(totaleDaRiscuotere + aDebito);
                pazientiADebito++;
            }
            if (aCredito > 0) {
                totaleCrediti = money.round(totaleCrediti + aCredito);
                pazientiACredito++;
            }

            if (eseguito === 0 && incassato === 0 && payload.includi_vuoti !== true) {
                continue;
            }

            const dateTrattamenti = tratt.map(r => r.data_trattamento).filter(Boolean);
            const dateIncassi = inc.map(r => r.data_pagamento).filter(Boolean);
            const tutteDate = [...dateTrattamenti, ...dateIncassi].sort().reverse();
            const ultimoMovimento = tutteDate[0] || '';

            const nominativo = identita.nominativo(p);

            elencoSaldi.push({
                paziente_id: p.id,
                nominativo,
                cognome: p.cognome || '',
                nome: p.nome || '',
                codice_fiscale: p.codice_fiscale || '',
                telefono: p.telefono || '',
                eseguito,
                incassato,
                saldo,
                a_debito: aDebito,
                a_credito: aCredito,
                stato: aDebito > 0 ? 'debito' : (aCredito > 0 ? 'credito' : 'in_pari'),
                trattamenti_conteggio: tratt.length,
                incassi_conteggio: inc.length,
                ultimo_movimento: ultimoMovimento
            });
        }

        let filtrati = elencoSaldi;
        const filtroStato = payload.stato || 'debito';

        if (filtroStato === 'debito') {
            filtrati = filtrati.filter(v => v.a_debito > 0);
        } else if (filtroStato === 'credito') {
            filtrati = filtrati.filter(v => v.a_credito > 0);
        } else if (filtroStato === 'in_pari') {
            filtrati = filtrati.filter(v => v.saldo === 0);
        } else if (filtroStato === 'movimenti') {
            filtrati = filtrati.filter(v => v.eseguito > 0 || v.incassato > 0);
        }

        if (payload.termine) {
            const t = String(payload.termine).toLowerCase().trim();
            filtrati = filtrati.filter(v =>
                (v.nominativo && v.nominativo.toLowerCase().includes(t))
                || (v.codice_fiscale && v.codice_fiscale.toLowerCase().includes(t))
                || (v.telefono && v.telefono.includes(t))
            );
        }

        const ordina = payload.ordina || 'debito_desc';
        if (ordina === 'debito_desc') {
            filtrati.sort((a, b) => b.a_debito - a.a_debito || a.nominativo.localeCompare(b.nominativo));
        } else if (ordina === 'credito_desc') {
            filtrati.sort((a, b) => b.a_credito - a.a_credito || a.nominativo.localeCompare(b.nominativo));
        } else if (ordina === 'saldo_desc') {
            filtrati.sort((a, b) => b.saldo - a.saldo);
        } else if (ordina === 'data_desc') {
            filtrati.sort((a, b) => (b.ultimo_movimento || '').localeCompare(a.ultimo_movimento || ''));
        } else if (ordina === 'nominativo_asc') {
            filtrati.sort((a, b) => a.nominativo.localeCompare(b.nominativo));
        }

        return {
            righe: filtrati,
            totale_filtrati: filtrati.length,
            totale_pazienti_con_movimenti: elencoSaldi.length,
            totale_da_riscuotere: totaleDaRiscuotere,
            pazienti_a_debito: pazientiADebito,
            totale_crediti: totaleCrediti,
            pazienti_a_credito: pazientiACredito,
            totale_eseguito_globale: totaleEseguitoGlobale,
            totale_incassato_globale: totaleIncassatoGlobale,
            saldo_globale: money.round(totaleEseguitoGlobale - totaleIncassatoGlobale)
        };
    } catch (e) {
        return {
            righe: [],
            totale_filtrati: 0,
            totale_pazienti_con_movimenti: 0,
            totale_da_riscuotere: 0,
            pazienti_a_debito: 0,
            totale_crediti: 0,
            pazienti_a_credito: 0,
            totale_eseguito_globale: 0,
            totale_incassato_globale: 0,
            saldo_globale: 0
        };
    }
}

module.exports = { paziente, materiale, saldiPazienti };
