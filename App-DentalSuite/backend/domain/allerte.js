'use strict';

const CRITICHE = [
    ['terapia_anticoagulanti', 'Terapia anticoagulante in corso', 'critica'],
    ['patologie_cardiovascolari', 'Patologie cardiovascolari', 'critica'],
    ['epatiti_hiv', 'Rischio infettivo dichiarato', 'critica'],
    ['osteoporosi_bifosfonati', 'Terapia con bifosfonati', 'critica'],
    ['diabete', 'Paziente diabetico', 'attenzione'],
    ['gravidanza', 'Stato di gravidanza', 'critica']
];

const SEGNALAZIONI = [
    ['ipertensione', 'Ipertensione', 'attenzione'],
    ['fumatore', 'Fumatore', 'nota'],
    ['ansia_odontoiatrica', 'Ansia odontoiatrica', 'nota'],
    ['bruxismo', 'Bruxismo', 'nota']
];

function attive(tabella, scheda) {
    return tabella
        .filter(([campo]) => Number(scheda[campo]) === 1)
        .map(([, etichetta, livello]) => ({ etichetta, livello }));
}

function elencoDettagliato(scheda = {}, paziente = {}) {
    const voci = [];
    const allergieFarmaci = String(scheda.allergie_farmaci || '').trim();
    const allergieMateriali = String(scheda.allergie_materiali || '').trim();

    if (allergieFarmaci) {
        voci.push({ etichetta: `Allergie farmacologiche: ${allergieFarmaci}`, livello: 'critica' });
    }
    if (allergieMateriali) {
        voci.push({ etichetta: `Allergie a materiali: ${allergieMateriali}`, livello: 'critica' });
    }

    voci.push(...attive(CRITICHE, scheda));

    if (Number(paziente.pacemaker) === 1) {
        voci.push({ etichetta: 'Portatore di pacemaker', livello: 'critica' });
    }

    voci.push(...attive(SEGNALAZIONI, scheda));

    const terapie = String(scheda.terapie_in_corso || '').trim();
    if (terapie) voci.push({ etichetta: `Terapie in corso: ${terapie}`, livello: 'attenzione' });

    return voci;
}

function elenco(scheda = {}, paziente = {}) {
    return elencoDettagliato(scheda, paziente)
        .filter(voce => voce.livello !== 'nota')
        .map(voce => voce.etichetta);
}

function critiche(scheda = {}, paziente = {}) {
    return elencoDettagliato(scheda, paziente).filter(voce => voce.livello === 'critica');
}

module.exports = { elenco, elencoDettagliato, critiche };
