'use strict';

const crypto = require('crypto');
const protocollo = require('./protocollo');

function messaggioAvvio(dati) {
    return [
        'avvio',
        protocollo.VERSIONE,
        String(dati.impronta || ''),
        String(dati.effimera || ''),
        String(dati.nonce || '')
    ].join('|');
}

function messaggioRisposta(dati) {
    return [
        'risposta',
        protocollo.VERSIONE,
        String(dati.impronta || ''),
        String(dati.effimera || ''),
        String(dati.nonce || ''),
        String(dati.nonce_cliente || ''),
        String(dati.sessione || '')
    ].join('|');
}

function saleDa(nonceCliente, nonceServitore) {
    return crypto
        .createHash('sha256')
        .update(`${String(nonceCliente)}|${String(nonceServitore)}`, 'utf8')
        .digest('base64');
}

module.exports = { messaggioAvvio, messaggioRisposta, saleDa };
