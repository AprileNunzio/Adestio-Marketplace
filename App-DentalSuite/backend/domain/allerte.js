'use strict';

const catalogoClinico = require('./catalogo_clinico');

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

const ETICHETTE_STRUTTURATE = {
    anticoagulanti_tao: { etichetta: 'Terapia anticoagulante (TAO)', livello: 'critica' },
    anticoagulanti_nao: { etichetta: 'Nuovi anticoagulanti orali (NAO/DOAC)', livello: 'critica' },
    antiaggreganti: { etichetta: 'Terapia antiaggregante piastrinica', livello: 'attenzione' },
    coagulopatie: { etichetta: 'Coagulopatia / Diatesi emorragica', livello: 'critica' },
    bifosfonati_ev: { etichetta: 'Terapia bifosfonati E.V. (Rischio MRONJ)', livello: 'critica' },
    bifosfonati_orali: { etichetta: 'Terapia bifosfonati orali (Rischio MRONJ)', livello: 'critica' },
    denosumab: { etichetta: 'Terapia con Denosumab (Rischio MRONJ)', livello: 'critica' },
    endocardite_batterica: { etichetta: 'Pregressa endocardite (Profilassi antibiotica)', livello: 'critica' },
    protesi_valvolari: { etichetta: 'Portatore protesi valvolare cardiaca', livello: 'critica' },
    cardiopatia_ischemica: { etichetta: 'Cardiopatia ischemica / Pregresso infarto', livello: 'critica' },
    chemioterapia: { etichetta: 'Chemioterapia recente/in corso', livello: 'critica' },
    radioterapia_testa_collo: { etichetta: 'Pregressa radioterapia testa-collo', livello: 'critica' },
    emodialisi: { etichetta: 'Paziente in emodialisi', livello: 'critica' },
    insufficienza_renale: { etichetta: 'Insufficienza renale cronica', livello: 'attenzione' },
    insufficienza_epatica: { etichetta: 'Cirrosi / Insufficienza epatica', livello: 'critica' },
    terapia_cortisonica: { etichetta: 'Terapia cortisonica cronica (Rischio surrenale)', livello: 'attenzione' },
    immunodepressione: { etichetta: 'Paziente immunodepresso', livello: 'critica' },
    asma: { etichetta: 'Asma bronchiale (avere broncodilatatore)', livello: 'attenzione' },
    epilessia: { etichetta: 'Paziente epilettico', livello: 'attenzione' },
    lattice: { etichetta: 'Allergia al lattice (Protocollo Latex-Free)', livello: 'critica' },
    anestetici_adrenalina: { etichetta: 'Intolleranza / Controindicazione ad Adrenalina', livello: 'critica' },
    anestetici_locali: { etichetta: 'Allergia ad anestetici locali ammidici', livello: 'critica' },
    penicilline: { etichetta: 'Allergia a Penicilline / Beta-lattamici', livello: 'critica' },
    fans: { etichetta: 'Allergia a FANS / Aspirina', livello: 'critica' },
    glutine: { etichetta: 'Celiachia / Intolleranza al Glutine', livello: 'critica' },
    lattosio: { etichetta: 'Intolleranza al Lattosio (verificare eccipienti)', livello: 'critica' },
    favismo: { etichetta: 'Favismo (Deficit G6PD)', livello: 'critica' }
};

function attive(tabella, scheda) {
    return tabella
        .filter(([campo]) => Number(scheda[campo]) === 1)
        .map(([, etichetta, livello]) => ({ etichetta, livello }));
}

function aggiungiNonDuplicata(voci, nuovaVoce) {
    const giaPresente = voci.some(v => v.etichetta.toLowerCase() === nuovaVoce.etichetta.toLowerCase());
    if (!giaPresente) voci.push(nuovaVoce);
}

function elencoDettagliato(scheda = {}, paziente = {}) {
    const voci = [];
    try {
        const allergieFarmaci = String(scheda.allergie_farmaci || '').trim();
        const allergieMateriali = String(scheda.allergie_materiali || '').trim();
        const intolleranze = String(scheda.intolleranze || '').trim();

        if (allergieFarmaci) {
            aggiungiNonDuplicata(voci, { etichetta: `Allergie farmacologiche: ${allergieFarmaci}`, livello: 'critica' });
        }
        if (intolleranze) {
            aggiungiNonDuplicata(voci, { etichetta: `Intolleranze / Eccipienti: ${intolleranze}`, livello: 'critica' });
        }
        if (allergieMateriali) {
            aggiungiNonDuplicata(voci, { etichetta: `Allergie a materiali: ${allergieMateriali}`, livello: 'critica' });
        }

        attive(CRITICHE, scheda).forEach(v => aggiungiNonDuplicata(voci, v));

        if (Number(paziente.pacemaker) === 1) {
            aggiungiNonDuplicata(voci, { etichetta: 'Portatore di pacemaker', livello: 'critica' });
        }

        attive(SEGNALAZIONI, scheda).forEach(v => aggiungiNonDuplicata(voci, v));

        const terapie = String(scheda.terapie_in_corso || '').trim();
        if (terapie) aggiungiNonDuplicata(voci, { etichetta: `Terapie in corso: ${terapie}`, livello: 'attenzione' });

        const patologieStr = catalogoClinico.estraiVociAttive(scheda.patologie_strutturate);
        const allergieStr = catalogoClinico.estraiVociAttive(scheda.allergie_strutturate);
        const intolleranzeStr = catalogoClinico.estraiVociAttive(scheda.intolleranze_strutturate);
        const stileVitaStr = catalogoClinico.estraiVociAttive(scheda.stile_vita_strutturato);

        [...patologieStr, ...allergieStr, ...intolleranzeStr, ...stileVitaStr].forEach(item => {
            if (ETICHETTE_STRUTTURATE[item.chiave]) {
                const conf = ETICHETTE_STRUTTURATE[item.chiave];
                const etichettaCompleta = item.dettagli ? `${conf.etichetta} (${item.dettagli})` : conf.etichetta;
                aggiungiNonDuplicata(voci, { etichetta: etichettaCompleta, livello: conf.livello });
            } else if (item.chiave.startsWith('custom_')) {
                const etichettaCustom = item.dettagli || item.chiave.replace(/^custom_/, '').replace(/_/g, ' ');
                if (etichettaCustom) {
                    aggiungiNonDuplicata(voci, { etichetta: etichettaCustom, livello: 'attenzione' });
                }
            }
        });
    } catch {
        return [];
    }

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
