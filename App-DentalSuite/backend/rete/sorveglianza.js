'use strict';

const diario = require('./diario');

const seduta = require('../repositories/seduta_volatile');
const consegna = require('./consegna');
const vigilanza = require('../domain/rete/vigilanza');

let battito = null;
let inCorso = false;
let fallimenti = 0;
let fermo = false;
let tolleranzaMs = vigilanza.SILENZIO_TOLLERATO_MS;
let ultimoEsito = { verificataIl: 0, raggiunta: false, stato: vigilanza.VERDE, motivo: '' };

function stato() {
    return {
        attiva: Boolean(battito),
        silenzio_ms: seduta.silenzioDa(),
        tolleranza_ms: tolleranzaMs,
        fermo,
        cadenza_ms: vigilanza.cadenzaDa(fallimenti),
        ...ultimoEsito
    };
}

function impostaFermo(attivo) {
    fermo = Boolean(attivo);
    return fermo;
}

function impostaTolleranza(millisecondi) {
    const valore = Number(millisecondi);
    if (Number.isFinite(valore) && valore >= 15000) tolleranzaMs = Math.round(valore);
    return tolleranzaMs;
}

async function interroga(mittente, trasmissioneId) {
    return consegna.interroga(mittente.ip, mittente.porta, '/seduta-stato', {
        trasmissione_id: trasmissioneId
    });
}

function applica(decisione) {
    ultimoEsito = {
        verificataIl: Date.now(),
        raggiunta: decisione.stato === vigilanza.VERDE,
        stato: decisione.stato,
        motivo: decisione.motivo
    };

    if (decisione.azione === 'svuota') {
        seduta.svuota(decisione.motivo);
        console.log(`[DentalSuite] Scheda rimossa dal monitor: ${decisione.motivo}.`);
    }
}

async function controlla() {
    if (inCorso) return stato();
    inCorso = true;

    try {
        if (!seduta.presente()) {
            fallimenti = 0;
            ultimoEsito = { verificataIl: Date.now(), raggiunta: true, stato: vigilanza.VERDE, motivo: '' };
            return stato();
        }

        const mittente = seduta.mittente();
        const istantanea = seduta.istantanea();

        if (!mittente || !mittente.ip || !istantanea.trasmissione_id) {
            ultimoEsito = {
                verificataIl: Date.now(),
                raggiunta: false,
                stato: vigilanza.GIALLO,
                motivo: 'origine della scheda sconosciuta'
            };
            return stato();
        }

        const risposta = await interroga(mittente, istantanea.trasmissione_id);
        if (risposta.raggiunto) {
            seduta.segnaContatto();
            fallimenti = 0;
        } else {
            fallimenti += 1;
        }

        applica(vigilanza.decidi({
            presente: true,
            raggiunta: risposta.raggiunto,
            sedutaChiusaDaSegreteria: Boolean(
                risposta.dati && risposta.dati.conosciuta && risposta.dati.aperta === false
            ),
            silenzioMs: seduta.silenzioDa(),
            fermo,
            etaSedutaMs: Date.now() - (istantanea.ricevuto_il || 0),
            tolleranzaMs
        }));

        return stato();
    } finally {
        inCorso = false;
        riprogramma();
    }
}

function riprogramma() {
    if (!battito) return;
    clearTimeout(battito);
    battito = setTimeout(() => { controlla().catch(errore => diario.annota('sorveglianza:301', errore)); }, vigilanza.cadenzaDa(fallimenti));
    if (typeof battito.unref === 'function') battito.unref();
}

function avvia() {
    if (battito) return true;
    battito = setTimeout(() => { controlla().catch(errore => diario.annota('sorveglianza:302', errore)); }, vigilanza.CADENZA_BASE_MS);
    if (typeof battito.unref === 'function') battito.unref();
    return true;
}

function ferma() {
    if (battito) {
        clearTimeout(battito);
        battito = null;
    }
    return true;
}

module.exports = {
    avvia,
    ferma,
    controlla,
    stato,
    impostaFermo,
    impostaTolleranza,
    CADENZA_MS: vigilanza.CADENZA_BASE_MS,
    SILENZIO_MASSIMO_MS: vigilanza.SILENZIO_TOLLERATO_MS
};
