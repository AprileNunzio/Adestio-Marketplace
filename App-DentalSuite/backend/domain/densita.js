'use strict';

const LIVELLI = [
    {
        id: 'compatta',
        etichetta: 'Compatta',
        larghezza_minima: 0,
        altezza_minima: 0,
        limiti: { trattamenti: 5, prescrizioni: 2, referti: 3, rilevazioni: 6, allerte: 4 },
        zone: ['identita', 'allerte', 'odontogramma', 'galleria', 'azioni']
    },
    {
        id: 'standard',
        etichetta: 'Standard',
        larghezza_minima: 1200,
        altezza_minima: 680,
        limiti: { trattamenti: 8, prescrizioni: 3, referti: 5, rilevazioni: 12, allerte: 6 },
        zone: ['identita', 'allerte', 'odontogramma', 'storia', 'galleria', 'azioni']
    },
    {
        id: 'ampia',
        etichetta: 'Ampia',
        larghezza_minima: 1900,
        altezza_minima: 900,
        limiti: { trattamenti: 14, prescrizioni: 6, referti: 8, rilevazioni: 20, allerte: 8 },
        zone: ['identita', 'allerte', 'odontogramma', 'storia', 'prescrizioni', 'galleria', 'seduta', 'azioni']
    },
    {
        id: 'massima',
        etichetta: 'Massima',
        larghezza_minima: 2500,
        altezza_minima: 1200,
        limiti: { trattamenti: 22, prescrizioni: 10, referti: 12, rilevazioni: 32, allerte: 10 },
        zone: ['identita', 'allerte', 'odontogramma', 'storia', 'prescrizioni', 'galleria', 'rilevazioni', 'seduta', 'azioni']
    }
];

const PREDEFINITO = 'standard';

function normalizzaSchermo(schermo) {
    const larghezza = Number(schermo && schermo.larghezza) || 0;
    const altezza = Number(schermo && schermo.altezza) || 0;
    return {
        larghezza: larghezza > 0 ? Math.round(larghezza) : 0,
        altezza: altezza > 0 ? Math.round(altezza) : 0
    };
}

function livelloDa(schermo) {
    const misure = normalizzaSchermo(schermo);
    if (misure.larghezza === 0 || misure.altezza === 0) return trova(PREDEFINITO);
    return LIVELLI.reduce((scelto, livello) => (
        misure.larghezza >= livello.larghezza_minima && misure.altezza >= livello.altezza_minima
            ? livello
            : scelto
    ), LIVELLI[0]);
}

function trova(id) {
    return LIVELLI.find(livello => livello.id === id) || LIVELLI[1];
}

function limitiDa(schermo) {
    return livelloDa(schermo).limiti;
}

function descrivi(schermo) {
    const misure = normalizzaSchermo(schermo);
    const livello = livelloDa(schermo);
    return {
        id: livello.id,
        etichetta: livello.etichetta,
        zone: livello.zone,
        limiti: livello.limiti,
        schermo: misure,
        misurato: misure.larghezza > 0 && misure.altezza > 0
    };
}

function mostra(livelloId, zona) {
    return trova(livelloId).zone.includes(zona);
}

module.exports = { LIVELLI, PREDEFINITO, livelloDa, limitiDa, descrivi, trova, mostra, normalizzaSchermo };
