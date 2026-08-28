'use strict';

const consegna = require('./consegna');
const sigillo = require('./sigillo');
const accoppiamento = require('./accoppiamento');

const ROTTA_CHIAVE = '/chiave-effimera';

function chiavePubblicaDi(impronta) {
    if (!impronta) return '';
    const pari = accoppiamento.pariPerImpronta(String(impronta));
    return pari && pari.chiave_pubblica ? pari.chiave_pubblica : '';
}

async function ottieniChiave(ip, porta) {
    const risposta = await consegna.interroga(ip, porta, ROTTA_CHIAVE, {});
    if (!risposta.raggiunto || !risposta.dati || !risposta.dati.effimera) {
        return { ottenuta: false, motivo: 'il monitor non ha fornito una chiave di cifratura' };
    }

    const offerta = risposta.dati;
    const pubblicaPari = chiavePubblicaDi(offerta.impronta);

    if (pubblicaPari && !sigillo.chiaveVerificata(offerta, pubblicaPari)) {
        return { ottenuta: false, motivo: 'la chiave di cifratura del monitor non supera la verifica di firma' };
    }

    return { ottenuta: true, effimera: offerta.effimera, verificata: Boolean(pubblicaPari) };
}

async function inviaSigillato(ip, porta, rotta, contenuto, extra = {}) {
    const chiave = await ottieniChiave(ip, porta);
    if (!chiave.ottenuta) {
        return { consegnato: false, motivo: chiave.motivo, cifrato: false };
    }

    const esito = await consegna.conRitentativo(ip, porta, rotta, {
        ...extra,
        sigillo: sigillo.sigilla(chiave.effimera, contenuto)
    });

    return { ...esito, cifrato: true, firma_verificata: chiave.verificata };
}

function trasmettiDossier(ip, porta, busta) {
    const { dossier, marca, impronta_dossier: improntaDossier, ...resto } = busta;
    return inviaSigillato(
        ip,
        porta,
        '/trasmetti-diretto',
        { dossier, marca, impronta_dossier: improntaDossier },
        resto
    );
}

module.exports = { ottieniChiave, inviaSigillato, trasmettiDossier, ROTTA_CHIAVE };
