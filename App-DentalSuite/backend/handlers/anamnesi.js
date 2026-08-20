'use strict';

const { anamnesi, pazienti } = require('../repositories/clinical');
const { validationError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const { oggiIso } = require('../domain/rateizzazione');

const VUOTA = {
    allergie_farmaci: '',
    allergie_materiali: '',
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
    data_compilazione: ''
};

const FLAG_CRITICI = [
    ['terapia_anticoagulanti', 'Terapia anticoagulante in corso'],
    ['patologie_cardiovascolari', 'Patologie cardiovascolari'],
    ['epatiti_hiv', 'Rischio infettivo dichiarato'],
    ['osteoporosi_bifosfonati', 'Terapia con bifosfonati'],
    ['diabete', 'Paziente diabetico'],
    ['gravidanza', 'Stato di gravidanza']
];

function esistente(pazienteId) {
    const righe = anamnesi.findAll({ where: { paziente_id: pazienteId } });
    return righe.length > 0 ? righe[0] : null;
}

function allerte(scheda, paziente) {
    const elenco = FLAG_CRITICI
        .filter(([campo]) => Number(scheda[campo]) === 1)
        .map(([, etichetta]) => etichetta);
    if (String(scheda.allergie_farmaci || '').trim()) {
        elenco.unshift(`Allergie farmacologiche: ${scheda.allergie_farmaci}`);
    }
    if (paziente && Number(paziente.pacemaker) === 1) elenco.push('Portatore di pacemaker');
    return elenco;
}

function get(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    const paziente = pazienti.requireById(payload.paziente_id, { includeArchived: true });
    const scheda = esistente(payload.paziente_id) || { ...VUOTA, paziente_id: payload.paziente_id, id: null };
    return { scheda, allerte: allerte(scheda, paziente) };
}

async function save(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    pazienti.requireById(payload.paziente_id, { includeArchived: true });
    const dati = { ...payload, data_compilazione: payload.data_compilazione || oggiIso() };
    const corrente = esistente(payload.paziente_id);
    const id = corrente
        ? await anamnesi.update(corrente.id, dati, actor.stamp())
        : await anamnesi.insert(dati, actor.stamp());
    return { id };
}

module.exports = { get, save };
