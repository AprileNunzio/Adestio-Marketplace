'use strict';

const crypto = require('crypto');

const ALGORITMO = 'aes-256-gcm';
const LUNGHEZZA_CHIAVE = 32;
const LUNGHEZZA_IV = 12;
const INFO_SESSIONE = 'adestio-dental-suite-sessione-v1';
const PARAMETRI_SCRYPT = { N: 16384, r: 8, p: 1 };

function base64(buffer) {
    return Buffer.from(buffer).toString('base64');
}

function daBase64(testo) {
    return Buffer.from(String(testo || ''), 'base64');
}

function chiavePubblica(derBase64, tipo) {
    return crypto.createPublicKey({ key: daBase64(derBase64), format: 'der', type: 'spki', asymmetricKeyType: tipo });
}

function chiavePrivata(derBase64) {
    return crypto.createPrivateKey({ key: daBase64(derBase64), format: 'der', type: 'pkcs8' });
}

function generaIdentita() {
    const coppia = crypto.generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'der' },
        privateKeyEncoding: { type: 'pkcs8', format: 'der' }
    });
    const pubblica = base64(coppia.publicKey);
    return { pubblica, privata: base64(coppia.privateKey), impronta: improntaDi(pubblica) };
}

function improntaDi(pubblicaBase64) {
    const digesto = crypto.createHash('sha256').update(daBase64(pubblicaBase64)).digest('hex');
    return digesto.slice(0, 32).toUpperCase().match(/.{4}/g).join(' ');
}

function coppiaEffimera() {
    const coppia = crypto.generateKeyPairSync('x25519', {
        publicKeyEncoding: { type: 'spki', format: 'der' },
        privateKeyEncoding: { type: 'pkcs8', format: 'der' }
    });
    return { pubblica: base64(coppia.publicKey), privata: base64(coppia.privateKey) };
}

function segretoCondiviso(privataBase64, pubblicaBase64) {
    return crypto.diffieHellman({
        privateKey: chiavePrivata(privataBase64),
        publicKey: chiavePubblica(pubblicaBase64, 'x25519')
    });
}

function chiaveDiSessione(segreto, saleBase64) {
    return Buffer.from(crypto.hkdfSync('sha256', segreto, daBase64(saleBase64), INFO_SESSIONE, LUNGHEZZA_CHIAVE));
}

function firma(privataBase64, messaggio) {
    return base64(crypto.sign(null, Buffer.from(messaggio, 'utf8'), chiavePrivata(privataBase64)));
}

function verificaFirma(pubblicaBase64, messaggio, firmaBase64) {
    try {
        return crypto.verify(
            null,
            Buffer.from(messaggio, 'utf8'),
            chiavePubblica(pubblicaBase64, 'ed25519'),
            daBase64(firmaBase64)
        );
    } catch (e) {
        return false;
    }
}

function nonce() {
    return base64(crypto.randomBytes(16));
}

function codiceAccoppiamento() {
    return String(crypto.randomInt(10000000, 100000000));
}

function sale() {
    return base64(crypto.randomBytes(16));
}

function chiaveDaCodice(codice, saleBase64) {
    return crypto.scryptSync(String(codice), daBase64(saleBase64), LUNGHEZZA_CHIAVE, PARAMETRI_SCRYPT);
}

function improntaCodice(codice, saleBase64) {
    return crypto.createHash('sha256').update(chiaveDaCodice(codice, saleBase64)).digest('hex');
}

function prova(chiave, messaggio) {
    return crypto.createHmac('sha256', chiave).update(String(messaggio), 'utf8').digest('hex');
}

function provaValida(chiave, messaggio, attesa) {
    const calcolata = Buffer.from(prova(chiave, messaggio), 'utf8');
    const fornita = Buffer.from(String(attesa || ''), 'utf8');
    if (calcolata.length !== fornita.length) return false;
    return crypto.timingSafeEqual(calcolata, fornita);
}

function confrontaImpronte(prima, seconda) {
    const a = Buffer.from(String(prima || ''), 'utf8');
    const b = Buffer.from(String(seconda || ''), 'utf8');
    if (a.length !== b.length || a.length === 0) return false;
    return crypto.timingSafeEqual(a, b);
}

function cifra(chiave, sequenza, contenuto) {
    const iv = crypto.randomBytes(LUNGHEZZA_IV);
    const cifratore = crypto.createCipheriv(ALGORITMO, chiave, iv);
    cifratore.setAAD(Buffer.from(String(sequenza), 'utf8'));
    const testo = Buffer.from(JSON.stringify(contenuto), 'utf8');
    const cifrato = Buffer.concat([cifratore.update(testo), cifratore.final()]);
    return {
        sequenza,
        iv: base64(iv),
        dato: base64(cifrato),
        sigillo: base64(cifratore.getAuthTag())
    };
}

function decifra(chiave, pacchetto) {
    const decifratore = crypto.createDecipheriv(ALGORITMO, chiave, daBase64(pacchetto.iv));
    decifratore.setAAD(Buffer.from(String(pacchetto.sequenza), 'utf8'));
    decifratore.setAuthTag(daBase64(pacchetto.sigillo));
    const chiaro = Buffer.concat([decifratore.update(daBase64(pacchetto.dato)), decifratore.final()]);
    return JSON.parse(chiaro.toString('utf8'));
}

module.exports = {
    generaIdentita,
    improntaDi,
    coppiaEffimera,
    segretoCondiviso,
    chiaveDiSessione,
    firma,
    verificaFirma,
    nonce,
    sale,
    codiceAccoppiamento,
    chiaveDaCodice,
    improntaCodice,
    prova,
    provaValida,
    confrontaImpronte,
    cifra,
    decifra
};
