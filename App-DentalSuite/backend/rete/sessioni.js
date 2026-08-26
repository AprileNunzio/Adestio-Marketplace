'use strict';

const crypto = require('crypto');

const DURATA_MS = 12 * 60 * 60 * 1000;

const aperte = new Map();

function nuovaChiave() {
    return crypto.randomBytes(16).toString('hex');
}

function apri({ chiave, pariId, impronta, nome, ruolo, indirizzo }) {
    const id = nuovaChiave();
    aperte.set(id, {
        id,
        chiave,
        pariId,
        impronta,
        nome,
        ruolo,
        indirizzo,
        schermo: null,
        sequenzaInvio: 0,
        sequenzaRisposta: 0,
        ultimaRicevuta: -1,
        apertaIl: Date.now(),
        scadeIl: Date.now() + DURATA_MS
    });
    return id;
}

function trova(id) {
    const sessione = aperte.get(String(id || ''));
    if (!sessione) return null;
    if (Date.now() > sessione.scadeIl) {
        aperte.delete(sessione.id);
        return null;
    }
    return sessione;
}

function prossimaSequenza(sessione) {
    sessione.sequenzaInvio += 1;
    return sessione.sequenzaInvio;
}

function prossimaSequenzaRisposta(sessione) {
    sessione.sequenzaRisposta += 1;
    return sessione.sequenzaRisposta;
}

function accettaSequenza(sessione, sequenza) {
    const valore = Number(sequenza);
    if (!Number.isFinite(valore) || valore <= sessione.ultimaRicevuta) return false;
    sessione.ultimaRicevuta = valore;
    return true;
}

function aggiornaSchermo(id, schermo) {
    const sessione = trova(id);
    if (!sessione) return false;
    sessione.schermo = schermo;
    return true;
}

function chiudi(id) {
    return aperte.delete(String(id || ''));
}

function chiudiTutte() {
    aperte.clear();
}

function elenco() {
    return [...aperte.values()].map(sessione => ({
        id: sessione.id,
        nome: sessione.nome,
        ruolo: sessione.ruolo,
        impronta: sessione.impronta,
        indirizzo: sessione.indirizzo,
        schermo: sessione.schermo,
        aperta_il: sessione.apertaIl
    }));
}

module.exports = {
    apri,
    trova,
    chiudi,
    chiudiTutte,
    elenco,
    aggiornaSchermo,
    prossimaSequenza,
    prossimaSequenzaRisposta,
    accettaSequenza
};
