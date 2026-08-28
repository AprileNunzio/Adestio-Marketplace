'use strict';

const CAPIENZA = 4096;

const visti = new Map();

function potaScaduti(adesso, vitaMs) {
    for (const [chiave, istante] of visti) {
        if (adesso - istante > vitaMs) visti.delete(chiave);
    }
}

function potaEccedenza() {
    while (visti.size > CAPIENZA) {
        const primo = visti.keys().next();
        if (primo.done) return;
        visti.delete(primo.value);
    }
}

function registra(chiave, vitaMs, adesso = Date.now()) {
    if (!chiave) return false;
    potaScaduti(adesso, vitaMs);
    if (visti.has(chiave)) return false;
    visti.set(chiave, adesso);
    potaEccedenza();
    return true;
}

function conosciuta(chiave) {
    return visti.has(chiave);
}

function svuota() {
    visti.clear();
}

function dimensione() {
    return visti.size;
}

module.exports = { registra, conosciuta, svuota, dimensione, CAPIENZA };
