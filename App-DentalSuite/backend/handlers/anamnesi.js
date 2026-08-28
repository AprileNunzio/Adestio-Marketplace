'use strict';

const { anamnesi, pazienti } = require('../repositories/clinical');
const { validationError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const allerteDominio = require('../domain/allerte');
const catalogoClinico = require('../domain/catalogo_clinico');
const { oggiIso } = require('../domain/rateizzazione');

const VUOTA = {
    allergie_farmaci: '',
    allergie_materiali: '',
    intolleranze: '',
    patologie_cardiovascolari: 0,
    terapia_anticoagulanti: 0,
    diabete: 0,
    ipertensione: 0,
    epatiti_hiv: 0,
    osteoporosi_bifosfonati: 0,
    fumatore: 0,
    gravidanza: 0,
    ansia_odontoiatrica: 0,
    bruxismo: 0,
    altre_patologie: '',
    terapie_in_corso: '',
    note_mediche: '',
    data_compilazione: '',
    patologie_strutturate: '{}',
    allergie_strutturate: '{}',
    intolleranze_strutturate: '{}',
    valutazione_rischio: '{}',
    stile_vita_strutturato: '{}',
    farmaci_abituali: '',
    data_revisione: '',
    medico_revisore_id: ''
};

function esistente(pazienteId) {
    const righe = anamnesi.findAll({ where: { paziente_id: pazienteId } });
    return righe.length > 0 ? righe[0] : null;
}

function sincronizzaCampiLegacy(dati) {
    const patologie = catalogoClinico.parseJson(dati.patologie_strutturate, {});
    const allergie = catalogoClinico.parseJson(dati.allergie_strutturate, {});
    const intolleranze = catalogoClinico.parseJson(dati.intolleranze_strutturate, {});
    const stileVita = catalogoClinico.parseJson(dati.stile_vita_strutturato, {});

    if (patologie.anticoagulanti_tao || patologie.anticoagulanti_nao || patologie.coagulopatie) {
        dati.terapia_anticoagulanti = 1;
    }
    if (patologie.cardiopatia_ischemica || patologie.angina || patologie.aritmie || patologie.valvulopatie || patologie.pacemaker_icd || patologie.scompenso_cardiaco || patologie.bypass_stent || patologie.endocardite_batterica) {
        dati.patologie_cardiovascolari = 1;
    }
    if (patologie.ipertensione || patologie.ipertensione_grave) {
        dati.ipertensione = 1;
    }
    if (patologie.diabete_tipo1 || patologie.diabete_tipo2) {
        dati.diabete = 1;
    }
    if (patologie.epatite_b || patologie.epatite_c || patologie.hiv_aids) {
        dati.epatiti_hiv = 1;
    }
    if (patologie.bifosfonati_orali || patologie.bifosfonati_ev || patologie.denosumab || patologie.osteoporosi) {
        dati.osteoporosi_bifosfonati = 1;
    }
    if (stileVita.fumo_attivo || stileVita.iqos_svapo) {
        dati.fumatore = 1;
    }
    if (stileVita.gravidanza) {
        dati.gravidanza = 1;
    }
    if (stileVita.bruxismo || stileVita.serramento) {
        dati.bruxismo = 1;
    }
    if (stileVita.odontofobia) {
        dati.ansia_odontoiatrica = 1;
    }

    return dati;
}

function get(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    const paziente = pazienti.requireById(payload.paziente_id, { includeArchived: true });
    const riga = esistente(payload.paziente_id);
    const scheda = riga ? { ...VUOTA, ...riga } : { ...VUOTA, paziente_id: payload.paziente_id, id: null };
    const allerte = allerteDominio.elenco(scheda, paziente);
    const allerteDettagliate = allerteDominio.elencoDettagliato(scheda, paziente);
    const rischio = catalogoClinico.calcolaRischioComplessivo(scheda, paziente);

    return {
        scheda,
        allerte,
        allerteDettagliate,
        rischio
    };
}

async function save(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    pazienti.requireById(payload.paziente_id, { includeArchived: true });

    const sanitized = {
        ...payload,
        data_compilazione: payload.data_compilazione || oggiIso(),
        patologie_strutturate: catalogoClinico.stringifyJson(payload.patologie_strutturate),
        allergie_strutturate: catalogoClinico.stringifyJson(payload.allergie_strutturate),
        intolleranze_strutturate: catalogoClinico.stringifyJson(payload.intolleranze_strutturate),
        valutazione_rischio: catalogoClinico.stringifyJson(payload.valutazione_rischio),
        stile_vita_strutturato: catalogoClinico.stringifyJson(payload.stile_vita_strutturato)
    };

    const dati = sincronizzaCampiLegacy(sanitized);
    const corrente = esistente(payload.paziente_id);
    const id = corrente
        ? await anamnesi.update(corrente.id, dati, actor.stamp())
        : await anamnesi.insert(dati, actor.stamp());

    return { id };
}

module.exports = { get, save };
