'use strict';

const cifratura = require('./cifratura');
const identita = require('./identita');

const VITA_CHIAVE_MS = 120000;
const CAPIENZA_CHIAVI = 64;
const ETICHETTA = 'sigillo-dossier-v1';

const effimereLocali = new Map();

function potaEffimere(adesso = Date.now()) {
    for (const [pubblica, voce] of effimereLocali) {
        if (adesso - voce.creataIl > VITA_CHIAVE_MS) effimereLocali.delete(pubblica);
    }
    while (effimereLocali.size > CAPIENZA_CHIAVI) {
        const primo = effimereLocali.keys().next();
        if (primo.done) break;
        effimereLocali.delete(primo.value);
    }
}

function messaggioChiave(pubblica, istante) {
    return [ETICHETTA, String(pubblica), String(istante)].join('|');
}

function offriChiave() {
    const locale = identita.riga();
    if (!locale) return null;

    potaEffimere();
    const coppia = cifratura.coppiaEffimera();
    const istante = Date.now();
    effimereLocali.set(coppia.pubblica, { privata: coppia.privata, creataIl: istante });

    return {
        effimera: coppia.pubblica,
        istante,
        impronta: locale.impronta,
        firma: cifratura.firma(locale.chiave_privata, messaggioChiave(coppia.pubblica, istante))
    };
}

function chiaveVerificata(offerta, chiavePubblicaPari) {
    if (!offerta || !offerta.effimera || !offerta.firma) return false;
    if (!chiavePubblicaPari) return false;
    if (Date.now() - Number(offerta.istante || 0) > VITA_CHIAVE_MS) return false;
    return cifratura.verificaFirma(
        chiavePubblicaPari,
        messaggioChiave(offerta.effimera, offerta.istante),
        offerta.firma
    );
}

function sigilla(effimeraDestinatario, contenuto) {
    const mia = cifratura.coppiaEffimera();
    const segreto = cifratura.segretoCondiviso(mia.privata, effimeraDestinatario);
    const chiave = cifratura.chiaveDiSessione(segreto, Buffer.from(effimeraDestinatario, 'base64').toString('base64'));
    const pacchetto = cifratura.cifra(chiave, mia.pubblica, contenuto);
    return {
        versione: 1,
        mittente_effimera: mia.pubblica,
        destinatario_effimera: effimeraDestinatario,
        iv: pacchetto.iv,
        dato: pacchetto.dato,
        sigillo: pacchetto.sigillo
    };
}

function apri(bustaSigillata) {
    if (!bustaSigillata || !bustaSigillata.destinatario_effimera) {
        throw new Error('Busta sigillata incompleta');
    }
    const voce = effimereLocali.get(bustaSigillata.destinatario_effimera);
    if (!voce) throw new Error('Chiave effimera scaduta o sconosciuta');

    const segreto = cifratura.segretoCondiviso(voce.privata, bustaSigillata.mittente_effimera);
    const chiave = cifratura.chiaveDiSessione(
        segreto,
        Buffer.from(bustaSigillata.destinatario_effimera, 'base64').toString('base64')
    );

    const contenuto = cifratura.decifra(chiave, {
        sequenza: bustaSigillata.mittente_effimera,
        iv: bustaSigillata.iv,
        dato: bustaSigillata.dato,
        sigillo: bustaSigillata.sigillo
    });

    effimereLocali.delete(bustaSigillata.destinatario_effimera);
    return contenuto;
}

function chiaviAperte() {
    return effimereLocali.size;
}

module.exports = { VITA_CHIAVE_MS, offriChiave, chiaveVerificata, sigilla, apri, chiaviAperte };
