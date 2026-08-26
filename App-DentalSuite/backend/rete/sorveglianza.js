'use strict';

const seduta = require('../repositories/seduta_volatile');
const consegna = require('./consegna');

const CADENZA_MS = 5000;
const SILENZIO_MASSIMO_MS = 15000;

let battito = null;
let inCorso = false;
let ultimoEsito = { verificataIl: 0, raggiunta: false, motivo: '' };

function stato() {
    return {
        attiva: Boolean(battito),
        silenzio_ms: seduta.silenzioDa(),
        silenzio_massimo_ms: SILENZIO_MASSIMO_MS,
        ...ultimoEsito
    };
}

async function controlla() {
    if (inCorso) return;
    inCorso = true;
    try {
        if (!seduta.presente()) return;

        const mittente = seduta.mittente();
        const istantanea = seduta.istantanea();

        if (!mittente || !mittente.ip || !istantanea.trasmissione_id) {
            ultimoEsito = { verificataIl: Date.now(), raggiunta: false, motivo: 'origine della scheda sconosciuta' };
            return;
        }

        const risposta = await consegna.interroga(mittente.ip, mittente.porta, '/seduta-stato', {
            trasmissione_id: istantanea.trasmissione_id
        });

        if (risposta.raggiunto) {
            seduta.segnaContatto();
            ultimoEsito = { verificataIl: Date.now(), raggiunta: true, motivo: '' };

            if (risposta.dati && risposta.dati.conosciuta && risposta.dati.aperta === false) {
                seduta.svuota(risposta.dati.motivo || 'seduta chiusa dalla segreteria');
                console.log('[DentalSuite] Scheda rimossa dal monitor: la segreteria ha chiuso la seduta.');
            }
            return;
        }

        ultimoEsito = { verificataIl: Date.now(), raggiunta: false, motivo: 'segreteria non raggiungibile' };

        const silenzio = seduta.silenzioDa();
        if (silenzio >= SILENZIO_MASSIMO_MS) {
            seduta.svuota('collegamento con la segreteria interrotto');
            console.log(`[DentalSuite] Scheda rimossa dal monitor per tutela della privacy: segreteria irraggiungibile da ${Math.round(silenzio / 1000)} secondi.`);
        }
    } catch (e) {
        ultimoEsito = { verificataIl: Date.now(), raggiunta: false, motivo: e.message };
    } finally {
        inCorso = false;
    }
}

function avvia() {
    if (battito) return true;
    battito = setInterval(() => {
        controlla().catch(() => {});
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

module.exports = { avvia, ferma, controlla, stato, CADENZA_MS, SILENZIO_MASSIMO_MS };
