'use strict';

const crypto = require('crypto');

const CAMPO_BUSTA = '_busta';
const FINESTRA_MS = 30000;
const VERSIONE = 1;

function ordinaProfondamente(valore) {
    if (Array.isArray(valore)) return valore.map(ordinaProfondamente);
    if (!valore || typeof valore !== 'object') return valore;
    const ordinato = {};
    for (const chiave of Object.keys(valore).sort()) {
        if (chiave === CAMPO_BUSTA) continue;
        ordinato[chiave] = ordinaProfondamente(valore[chiave]);
    }
    return ordinato;
}

function improntaCorpo(corpo) {
    const canonico = JSON.stringify(ordinaProfondamente(corpo === undefined ? {} : corpo));
    return crypto.createHash('sha256').update(canonico, 'utf8').digest('hex');
}

function messaggioCanonico({ metodo, percorso, improntaCorpo: impronta, istante, nonce, mittente }) {
    return [
        'busta',
        VERSIONE,
        String(metodo || '').toUpperCase(),
        String(percorso || ''),
        String(impronta || ''),
        String(istante || ''),
        String(nonce || ''),
        String(mittente || '')
    ].join('|');
}

function componi({ metodo, percorso, corpo, mittente, nonce, istante }) {
    return {
        versione: VERSIONE,
        mittente: String(mittente || ''),
        istante: Number(istante) || Date.now(),
        nonce: String(nonce || ''),
        impronta_corpo: improntaCorpo(corpo)
    };
}

function entroFinestra(istante, adesso = Date.now(), finestraMs = FINESTRA_MS) {
    const valore = Number(istante);
    if (!Number.isFinite(valore)) return false;
    return Math.abs(adesso - valore) <= finestraMs;
}

function corpoIntegro(busta, corpo) {
    if (!busta) return false;
    return String(busta.impronta_corpo || '') === improntaCorpo(corpo);
}

function chiaveRipetizione(busta) {
    if (!busta) return '';
    return `${String(busta.mittente || '')}|${String(busta.nonce || '')}`;
}

function separa(corpo) {
    if (!corpo || typeof corpo !== 'object') return { busta: null, contenuto: corpo };
    const busta = corpo[CAMPO_BUSTA] || null;
    const contenuto = { ...corpo };
    delete contenuto[CAMPO_BUSTA];
    return { busta, contenuto };
}

module.exports = {
    CAMPO_BUSTA,
    FINESTRA_MS,
    VERSIONE,
    improntaCorpo,
    messaggioCanonico,
    componi,
    entroFinestra,
    corpoIntegro,
    chiaveRipetizione,
    separa
};
