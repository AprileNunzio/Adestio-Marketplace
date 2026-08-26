'use strict';

const cifratura = require('./cifratura');
const sessioni = require('./sessioni');
const protocollo = require('./protocollo');

const flussi = new Map();
let battito = null;

function scrivi(flusso, pacchetto) {
    try {
        flusso.write(`data: ${JSON.stringify(pacchetto)}\n\n`);
        return true;
    } catch (e) {
        return false;
    }
}

function invia(sessioneId, tipo, contenuto) {
    const sessione = sessioni.trova(sessioneId);
    const flusso = flussi.get(String(sessioneId));
    if (!sessione || !flusso) return false;
    const pacchetto = cifratura.cifra(
        sessione.chiave,
        sessioni.prossimaSequenza(sessione),
        { tipo, contenuto, istante: Date.now() }
    );
    return scrivi(flusso, pacchetto);
}

function diffondi(tipo, contenuto, filtro) {
    let raggiunti = 0;
    flussi.forEach((flusso, sessioneId) => {
        const sessione = sessioni.trova(sessioneId);
        if (!sessione) return;
        if (typeof filtro === 'function' && !filtro(sessione)) return;
        if (invia(sessioneId, tipo, contenuto)) raggiunti += 1;
    });
    return raggiunti;
}

function collega(sessioneId, flusso) {
    stacca(sessioneId);
    flussi.set(String(sessioneId), flusso);
    avviaBattito();
}

function stacca(sessioneId) {
    const flusso = flussi.get(String(sessioneId));
    if (!flusso) return false;
    try {
        flusso.end();
    } catch (e) {
        return flussi.delete(String(sessioneId));
    }
    return flussi.delete(String(sessioneId));
}

function collegato(sessioneId) {
    return flussi.has(String(sessioneId));
}

function attivi() {
    return [...flussi.keys()]
        .map(sessioneId => sessioni.trova(sessioneId))
        .filter(Boolean)
        .map(sessione => ({
            sessione_id: sessione.id,
            nome: sessione.nome,
            ruolo: sessione.ruolo,
            impronta: sessione.impronta,
            indirizzo: sessione.indirizzo,
            schermo: sessione.schermo,
            aperta_il: sessione.apertaIl
        }));
}

function avviaBattito() {
    if (battito) return;
    battito = setInterval(() => {
        if (flussi.size === 0) {
            fermaBattito();
            return;
        }
        diffondi(protocollo.MESSAGGI.battito, { istante: Date.now() });
    }, protocollo.BATTITO_MS);
    if (typeof battito.unref === 'function') battito.unref();
}

function fermaBattito() {
    if (!battito) return;
    clearInterval(battito);
    battito = null;
}

function chiudiTutti() {
    [...flussi.keys()].forEach(stacca);
    fermaBattito();
}

module.exports = { collega, stacca, collegato, invia, diffondi, attivi, chiudiTutti };
