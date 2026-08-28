'use strict';

const SCHEMI = ['https:', 'mailto:'];

const DESTINAZIONI = [
    { id: 'donazione', schema: 'https:', host: 'paypal.me', prefisso: '/NunzioAprile' },
    { id: 'sito', schema: 'https:', host: 'nunziotech.it', prefisso: '/' },
    { id: 'contatto', schema: 'mailto:', destinatario: 'info@nunziotech.com' }
];

function interpreta(indirizzo) {
    try {
        return new URL(String(indirizzo || ''));
    } catch (errore) {
        return null;
    }
}

function corrispondeWeb(url, voce) {
    if (url.protocol !== voce.schema) return false;
    if (url.hostname.toLowerCase() !== voce.host) return false;
    return url.pathname.startsWith(voce.prefisso);
}

function corrispondePosta(url, voce) {
    if (url.protocol !== voce.schema) return false;
    const destinatario = decodeURIComponent(url.pathname).trim().toLowerCase();
    return destinatario === voce.destinatario;
}

function trova(indirizzo) {
    const url = interpreta(indirizzo);
    if (!url) return null;
    if (!SCHEMI.includes(url.protocol)) return null;

    for (const voce of DESTINAZIONI) {
        const valida = voce.schema === 'mailto:'
            ? corrispondePosta(url, voce)
            : corrispondeWeb(url, voce);
        if (valida) return { id: voce.id, indirizzo: url.href };
    }
    return null;
}

function consentito(indirizzo) {
    return trova(indirizzo) !== null;
}

module.exports = { DESTINAZIONI, SCHEMI, trova, consentito };
