'use strict';

const catalogo = require('../catalogo_clinico');
const allerte = require('../allerte');
const vocabolario = require('./vocabolario');

const TOLLERANZE = {
    consentito: { etichetta: 'Vasocostrittore consentito', livello: 'nota' },
    cautela: { etichetta: 'Vasocostrittore con cautela', livello: 'attenzione' },
    controindicato: { etichetta: 'Vasocostrittore controindicato', livello: 'critica' }
};

const GRADI = {
    basso: { etichetta: 'Basso', livello: 'nota' },
    medio: { etichetta: 'Medio', livello: 'attenzione' },
    alto: { etichetta: 'Alto', livello: 'critica' }
};

function testo(valore) {
    return String(valore === null || valore === undefined ? '' : valore).trim();
}

function grado(valore) {
    return GRADI[valore] || GRADI.basso;
}

function quadroVuoto(paziente) {
    return {
        compilata: false,
        data_compilazione: '',
        data_revisione: '',
        rischio: null,
        patologie: [],
        allergie: [],
        intolleranze: [],
        stile_vita: [],
        allergie_farmaci: '',
        allergie_materiali: '',
        intolleranze_testo: '',
        farmaci_abituali: '',
        terapie_in_corso: '',
        altre_patologie: '',
        note: '',
        allerte: allerte.elencoDettagliato({}, paziente),
        conteggi: { patologie: 0, allergie: 0, intolleranze: 0, stile_vita: 0 }
    };
}

function valutazione(scheda, paziente) {
    const calcolo = catalogo.calcolaRischioComplessivo(scheda, paziente);
    const emorragico = grado(calcolo.rischio_emorragico);
    const mronj = grado(calcolo.rischio_mronj);
    const tolleranza = TOLLERANZE[calcolo.tolleranza_vasocostrittore] || TOLLERANZE.consentito;

    return {
        asa: calcolo.asa,
        asa_descrizione: vocabolario.descrizioneAsa(calcolo.asa),
        emorragico: { grado: calcolo.rischio_emorragico, ...emorragico },
        mronj: { grado: calcolo.rischio_mronj, ...mronj },
        vasocostrittore: { grado: calcolo.tolleranza_vasocostrittore, ...tolleranza },
        profilassi_antibiotica: Boolean(calcolo.profilassi_antibiotica)
    };
}

function componi(scheda, paziente) {
    if (!scheda) return quadroVuoto(paziente);

    const patologie = vocabolario.risolvi('patologie', catalogo.parseJson(scheda.patologie_strutturate));
    const allergieStrutturate = vocabolario.risolvi('allergie', catalogo.parseJson(scheda.allergie_strutturate));
    const intolleranzeStrutturate = vocabolario.risolvi('intolleranze', catalogo.parseJson(scheda.intolleranze_strutturate));
    const stileVita = vocabolario.risolvi('stile_vita', catalogo.parseJson(scheda.stile_vita_strutturato));

    return {
        compilata: true,
        data_compilazione: testo(scheda.data_compilazione),
        data_revisione: testo(scheda.data_revisione),
        rischio: valutazione(scheda, paziente),
        patologie: vocabolario.raggruppa(patologie),
        allergie: allergieStrutturate,
        intolleranze: intolleranzeStrutturate,
        stile_vita: stileVita,
        allergie_farmaci: testo(scheda.allergie_farmaci),
        allergie_materiali: testo(scheda.allergie_materiali),
        intolleranze_testo: testo(scheda.intolleranze),
        farmaci_abituali: testo(scheda.farmaci_abituali),
        terapie_in_corso: testo(scheda.terapie_in_corso),
        altre_patologie: testo(scheda.altre_patologie),
        note: testo(scheda.note_mediche),
        allerte: allerte.elencoDettagliato(scheda, paziente),
        conteggi: {
            patologie: patologie.length,
            allergie: allergieStrutturate.length,
            intolleranze: intolleranzeStrutturate.length,
            stile_vita: stileVita.length
        }
    };
}

module.exports = { componi };
