'use strict';

const crypto = require('crypto');
const busta = require('../domain/rete/busta');
const cifratura = require('./cifratura');
const identita = require('./identita');
const accoppiamento = require('./accoppiamento');
const antiripetizione = require('./antiripetizione');

const MODO_STRETTO = 'stretto';
const MODO_APPRENDIMENTO = 'apprendimento';

const ROTTE_PUBBLICHE = new Set(['/stato', '/accoppia', '/chiave-effimera']);

let modo = MODO_APPRENDIMENTO;

function impostaModo(nuovo) {
    modo = nuovo === MODO_STRETTO ? MODO_STRETTO : MODO_APPRENDIMENTO;
    return modo;
}

function modoCorrente() {
    return modo;
}

function pubblica(percorso) {
    return ROTTE_PUBBLICHE.has(String(percorso || ''));
}

function nonce() {
    return crypto.randomBytes(18).toString('base64');
}

function firma(metodo, percorso, corpo) {
    const locale = identita.riga();
    if (!locale) return null;

    const intestazione = busta.componi({
        metodo,
        percorso,
        corpo,
        mittente: locale.impronta,
        nonce: nonce(),
        istante: Date.now()
    });

    const messaggio = busta.messaggioCanonico({
        metodo,
        percorso,
        improntaCorpo: intestazione.impronta_corpo,
        istante: intestazione.istante,
        nonce: intestazione.nonce,
        mittente: intestazione.mittente
    });

    return { ...intestazione, firma: cifratura.firma(locale.chiave_privata, messaggio) };
}

function imbusta(metodo, percorso, corpo) {
    const intestazione = firma(metodo, percorso, corpo);
    if (!intestazione) return corpo;
    return { ...(corpo || {}), [busta.CAMPO_BUSTA]: intestazione };
}

function rifiuto(motivo, codice = 403) {
    return { valida: false, motivo, codice, pari: null };
}

function verifica(metodo, percorso, corpoCompleto, indirizzo) {
    if (pubblica(percorso)) {
        return { valida: true, pari: null, contenuto: busta.separa(corpoCompleto).contenuto, pubblica: true };
    }

    const { busta: intestazione, contenuto } = busta.separa(corpoCompleto);
    if (!intestazione) return rifiuto('Richiesta priva di firma');
    if (!busta.entroFinestra(intestazione.istante)) return rifiuto('Richiesta scaduta o con orologio disallineato');
    if (!busta.corpoIntegro(intestazione, contenuto)) return rifiuto('Corpo della richiesta alterato dopo la firma');

    const pari = accoppiamento.pariPerImpronta(String(intestazione.mittente || ''));
    if (!pari || !pari.chiave_pubblica) {
        if (modo === MODO_STRETTO) return rifiuto('Nodo non riconosciuto: autorizzalo dalla segreteria');
        return {
            valida: true,
            pari: null,
            contenuto,
            sconosciuto: true,
            impronta: String(intestazione.mittente || ''),
            indirizzo
        };
    }

    const messaggio = busta.messaggioCanonico({
        metodo,
        percorso,
        improntaCorpo: intestazione.impronta_corpo,
        istante: intestazione.istante,
        nonce: intestazione.nonce,
        mittente: intestazione.mittente
    });

    if (!cifratura.verificaFirma(pari.chiave_pubblica, messaggio, intestazione.firma)) {
        return rifiuto('Firma non valida');
    }

    if (!antiripetizione.registra(busta.chiaveRipetizione(intestazione), busta.FINESTRA_MS * 2)) {
        return rifiuto('Richiesta già ricevuta', 409);
    }

    return { valida: true, pari, contenuto, sconosciuto: false };
}

module.exports = {
    MODO_STRETTO,
    MODO_APPRENDIMENTO,
    ROTTE_PUBBLICHE,
    impostaModo,
    modoCorrente,
    pubblica,
    firma,
    imbusta,
    verifica
};
