'use strict';

const CAPIENZA = 512;
const VITA_MS = 10 * 60 * 1000;

const applicate = new Map();

function pota(adesso = Date.now()) {
    for (const [chiave, voce] of applicate) {
        if (adesso - voce.istante > VITA_MS) applicate.delete(chiave);
    }
    while (applicate.size > CAPIENZA) {
        const primo = applicate.keys().next();
        if (primo.done) break;
        applicate.delete(primo.value);
    }
}

function chiaveDi(mittente, operazioneId) {
    return `${String(mittente || 'anonimo')}|${String(operazioneId || '')}`;
}

function precedente(mittente, operazioneId) {
    if (!operazioneId) return null;
    pota();
    const voce = applicate.get(chiaveDi(mittente, operazioneId));
    return voce ? voce.esito : null;
}

function ricorda(mittente, operazioneId, esito) {
    if (!operazioneId) return esito;
    applicate.set(chiaveDi(mittente, operazioneId), { esito, istante: Date.now() });
    pota();
    return esito;
}

function svuota() {
    applicate.clear();
}

function dimensione() {
    return applicate.size;
}

module.exports = { precedente, ricorda, svuota, dimensione, CAPIENZA, VITA_MS };
