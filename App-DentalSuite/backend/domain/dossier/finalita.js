'use strict';

const SEZIONI_COMPLETE = [
    'paziente', 'anamnesi', 'odontogramma', 'rilevazioni',
    'trattamenti', 'prescrizioni', 'referti', 'consensi', 'seduta'
];

const PROFILI = {
    visita: {
        etichetta: 'Visita e diagnosi',
        sezioni: SEZIONI_COMPLETE
    },
    chirurgia: {
        etichetta: 'Chirurgia',
        sezioni: SEZIONI_COMPLETE
    },
    igiene: {
        etichetta: 'Igiene',
        sezioni: ['paziente', 'anamnesi', 'odontogramma', 'rilevazioni', 'trattamenti', 'seduta']
    },
    consulto: {
        etichetta: 'Consulto',
        sezioni: ['paziente', 'anamnesi', 'odontogramma', 'referti', 'seduta']
    }
};

const PREDEFINITA = 'visita';

function normalizza(finalita) {
    const chiave = String(finalita || '').trim().toLowerCase();
    return PROFILI[chiave] ? chiave : PREDEFINITA;
}

function profilo(finalita) {
    const chiave = normalizza(finalita);
    return { id: chiave, ...PROFILI[chiave] };
}

function includeSezione(finalita, sezione) {
    return profilo(finalita).sezioni.includes(sezione);
}

function proietta(dossier, finalita) {
    const scelto = profilo(finalita);
    const proiettato = {
        versione: dossier.versione,
        generato_il: dossier.generato_il,
        origine: dossier.origine,
        densita: dossier.densita,
        finalita: { id: scelto.id, etichetta: scelto.etichetta, sezioni: scelto.sezioni }
    };

    for (const sezione of SEZIONI_COMPLETE) {
        if (!scelto.sezioni.includes(sezione)) continue;
        if (dossier[sezione] === undefined) continue;
        proiettato[sezione] = dossier[sezione];
    }

    return proiettato;
}

module.exports = { PROFILI, PREDEFINITA, SEZIONI_COMPLETE, normalizza, profilo, includeSezione, proietta };
