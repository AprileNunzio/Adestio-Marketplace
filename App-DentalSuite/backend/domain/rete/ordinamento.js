'use strict';

const crypto = require('crypto');

function improntaDossier(dossier) {
    return crypto.createHash('sha256').update(JSON.stringify(dossier), 'utf8').digest('hex');
}

function marca(contatore, istante = Date.now()) {
    return { istante: Number(istante) || 0, contatore: Number(contatore) || 0 };
}

function confronta(prima, seconda) {
    const a = prima || { istante: 0, contatore: 0 };
    const b = seconda || { istante: 0, contatore: 0 };
    if (a.istante !== b.istante) return a.istante < b.istante ? -1 : 1;
    if (a.contatore !== b.contatore) return a.contatore < b.contatore ? -1 : 1;
    return 0;
}

function piuRecente(candidata, corrente) {
    return confronta(candidata, corrente) > 0;
}

function integro(dossier, improntaAttesa) {
    if (!improntaAttesa) return true;
    return improntaDossier(dossier) === String(improntaAttesa);
}

function valuta({ dossier, marca: candidata, impronta, marcaCorrente }) {
    if (!dossier) {
        return { accettabile: false, motivo: 'dossier assente' };
    }
    if (!integro(dossier, impronta)) {
        return { accettabile: false, motivo: 'impronta del dossier non corrispondente' };
    }
    if (candidata && marcaCorrente && !piuRecente(candidata, marcaCorrente)) {
        return { accettabile: false, motivo: 'dossier più vecchio di quello già a schermo' };
    }
    return { accettabile: true, motivo: '' };
}

function creaContatore() {
    let valore = 0;
    return () => {
        valore += 1;
        return valore;
    };
}

module.exports = {
    improntaDossier,
    marca,
    confronta,
    piuRecente,
    integro,
    valuta,
    creaContatore
};
