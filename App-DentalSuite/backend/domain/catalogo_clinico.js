'use strict';

function parseJson(valore, predefinito = {}) {
    try {
        if (!valore) return predefinito;
        if (typeof valore === 'object') return valore;
        return JSON.parse(valore);
    } catch {
        return predefinito;
    }
}

function stringifyJson(valore, predefinito = '{}') {
    try {
        if (valore === null || valore === undefined) return predefinito;
        if (typeof valore === 'string') return valore;
        return JSON.stringify(valore);
    } catch {
        return predefinito;
    }
}

function estraiVociAttive(datiStrutturati) {
    const mappa = parseJson(datiStrutturati, {});
    const attive = [];
    for (const [chiave, val] of Object.entries(mappa)) {
        if (val === true || (typeof val === 'object' && val && val.attivo === true)) {
            attive.push({
                chiave,
                dettagli: typeof val === 'object' ? val.dettagli || '' : ''
            });
        }
    }
    return attive;
}

function calcolaRischioComplessivo(scheda = {}, paziente = {}) {
    const patologie = parseJson(scheda.patologie_strutturate, {});
    const allergie = parseJson(scheda.allergie_strutturate, {});
    const intolleranze = parseJson(scheda.intolleranze_strutturate, {});
    const stileVita = parseJson(scheda.stile_vita_strutturato, {});
    const rischio = parseJson(scheda.valutazione_rischio, {});

    let punteggioAsa = Number(rischio.asa) || 1;
    let rischioEmorragico = rischio.rischio_emorragico || 'basso';
    let rischioMronj = rischio.rischio_mronj || 'basso';
    let profilassiAntibiotica = Boolean(rischio.profilassi_antibiotica);
    let tolleranzaVasocostrittore = rischio.tolleranza_vasocostrittore || 'consentito';

    if (Number(scheda.terapia_anticoagulanti) === 1 || patologie.anticoagulanti_tao || patologie.anticoagulanti_nao || patologie.coagulopatie) {
        rischioEmorragico = 'alto';
        if (punteggioAsa < 3) punteggioAsa = 3;
    } else if (patologie.antiaggreganti) {
        if (rischioEmorragico === 'basso') rischioEmorragico = 'medio';
    }

    if (Number(scheda.osteoporosi_bifosfonati) === 1 || patologie.bifosfonati_ev || patologie.denosumab) {
        rischioMronj = 'alto';
        if (punteggioAsa < 3) punteggioAsa = 3;
    } else if (patologie.bifosfonati_orali) {
        if (rischioMronj === 'basso') rischioMronj = 'medio';
    }

    if (patologie.endocardite_batterica || patologie.protesi_valvolari) {
        profilassiAntibiotica = true;
        if (punteggioAsa < 3) punteggioAsa = 3;
    }

    if (Number(paziente.pacemaker) === 1 || patologie.pacemaker_icd || patologie.cardiopatia_ischemica || patologie.angina || patologie.ipertensione_grave) {
        tolleranzaVasocostrittore = 'cautela';
        if (punteggioAsa < 3) punteggioAsa = 3;
    }

    if (allergie.anestetici_adrenalina) {
        tolleranzaVasocostrittore = 'controindicato';
    }

    if (Number(scheda.diabete) === 1 || Number(scheda.ipertensione) === 1 || patologie.diabete_tipo2 || patologie.asma || Number(scheda.fumatore) === 1) {
        if (punteggioAsa < 2) punteggioAsa = 2;
    }

    if (Number(scheda.gravidanza) === 1 || stileVita.gravidanza) {
        if (punteggioAsa < 2) punteggioAsa = 2;
    }

    return {
        asa: punteggioAsa,
        rischio_emorragico: rischioEmorragico,
        rischio_mronj: rischioMronj,
        profilassi_antibiotica: profilassiAntibiotica,
        tolleranza_vasocostrittore: tolleranzaVasocostrittore
    };
}

module.exports = {
    parseJson,
    stringifyJson,
    estraiVociAttive,
    calcolaRischioComplessivo
};
