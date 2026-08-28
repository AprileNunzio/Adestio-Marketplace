'use strict';

const coda = require('./coda');
const consegna = require('./consegna');

const TIPO_CHIUSURA = 'chiusura_monitor';
const CADENZA_MS = 45000;

let battito = null;
let ultimoEsito = { eseguitoIl: 0, consegnati: 0, residui: 0, ultimoErrore: '' };

async function accodaChiusura(recapito, motivo, trasmissioneId) {
    return coda.accoda(`${recapito.ip}:${recapito.porta}`, TIPO_CHIUSURA, {
        ip: recapito.ip,
        porta: recapito.porta,
        motivo,
        trasmissione_id: trasmissioneId || ''
    });
}

async function consegnaVoce(riga) {
    if (riga.tipo !== TIPO_CHIUSURA) {
        throw new Error(`Tipo in coda non gestito: ${riga.tipo}`);
    }
    const dati = riga.contenuto || {};
    const esito = await consegna.conRitentativo(dati.ip, dati.porta, '/chiudi-diretto', {
        motivo: dati.motivo,
        trasmissione_id: dati.trasmissione_id
    });
    if (!esito.consegnato) throw new Error(esito.motivo || 'monitor non raggiungibile');
    return esito;
}

async function svuota() {
    const risultato = await coda.svuota(consegnaVoce);
    ultimoEsito = {
        eseguitoIl: Date.now(),
        consegnati: risultato.consegnati,
        residui: risultato.residui,
        ultimoErrore: ''
    };
    return ultimoEsito;
}

function stato() {
    return { attivo: Boolean(battito), cadenza_ms: CADENZA_MS, ...ultimoEsito, ...coda.riepilogo() };
}

function avvia() {
    if (battito) return true;
    battito = setInterval(() => {
        svuota().catch(errore => {
            ultimoEsito = { ...ultimoEsito, eseguitoIl: Date.now(), ultimoErrore: errore.message };
        });
    }, CADENZA_MS);
    if (typeof battito.unref === 'function') battito.unref();
    return true;
}

function ferma() {
    if (battito) {
        clearInterval(battito);
        battito = null;
    }
    return true;
}

module.exports = { accodaChiusura, svuota, stato, avvia, ferma, TIPO_CHIUSURA, CADENZA_MS };
