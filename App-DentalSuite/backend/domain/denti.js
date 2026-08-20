'use strict';

const PERMANENTE = 'permanente';
const DECIDUA = 'decidua';

const QUADRANTI = {
    [PERMANENTE]: { superioreDestro: 1, superioreSinistro: 2, inferioreSinistro: 3, inferioreDestro: 4, elementi: 8 },
    [DECIDUA]: { superioreDestro: 5, superioreSinistro: 6, inferioreSinistro: 7, inferioreDestro: 8, elementi: 5 }
};

const SUPERFICI = ['M', 'D', 'V', 'L', 'O'];

const STATI = [
    { id: 'sano', label: 'Sano', colore: '#e2e8f0' },
    { id: 'cariato', label: 'Carie', colore: '#dc2626' },
    { id: 'otturato', label: 'Otturazione', colore: '#2563eb' },
    { id: 'devitalizzato', label: 'Devitalizzato', colore: '#7c3aed' },
    { id: 'corona', label: 'Corona protesica', colore: '#f59e0b' },
    { id: 'ponte', label: 'Elemento di ponte', colore: '#d97706' },
    { id: 'faccetta', label: 'Faccetta estetica', colore: '#0ea5e9' },
    { id: 'impianto', label: 'Impianto', colore: '#0d9488' },
    { id: 'sigillatura', label: 'Sigillatura', colore: '#22c55e' },
    { id: 'da_estrarre', label: 'Da estrarre', colore: '#f97316' },
    { id: 'estratto', label: 'Estratto', colore: '#64748b' },
    { id: 'assente', label: 'Agenesia', colore: '#94a3b8' }
];

function serie(quadrante, elementi, discendente) {
    const numeri = Array.from({ length: elementi }, (unused, indice) => `${quadrante}${indice + 1}`);
    return discendente ? numeri.reverse() : numeri;
}

function arcate(dentizione = PERMANENTE) {
    const mappa = QUADRANTI[dentizione] || QUADRANTI[PERMANENTE];
    return {
        superiore: [
            ...serie(mappa.superioreDestro, mappa.elementi, true),
            ...serie(mappa.superioreSinistro, mappa.elementi, false)
        ],
        inferiore: [
            ...serie(mappa.inferioreDestro, mappa.elementi, true),
            ...serie(mappa.inferioreSinistro, mappa.elementi, false)
        ]
    };
}

function tuttiINumeri(dentizione) {
    const insieme = arcate(dentizione);
    return [...insieme.superiore, ...insieme.inferiore];
}

function dentizioneDi(numero) {
    const quadrante = Number(String(numero).charAt(0));
    return quadrante >= 5 ? DECIDUA : PERMANENTE;
}

function esiste(numero) {
    const codice = String(numero || '').trim();
    if (!/^[1-8][1-8]$/.test(codice)) return false;
    return tuttiINumeri(dentizioneDi(codice)).includes(codice);
}

function normalizzaSuperfici(valore) {
    const grezze = Array.isArray(valore) ? valore : String(valore || '').split(/[\s,]+/);
    const filtrate = grezze
        .map(voce => String(voce).trim().toUpperCase())
        .filter(voce => SUPERFICI.includes(voce));
    return [...new Set(filtrate)].join(',');
}

function mappaStati(dentizione, righeRegistrate) {
    const registrati = new Map(righeRegistrate.map(riga => [riga.numero_dente, riga]));
    return tuttiINumeri(dentizione).map(numero => {
        const riga = registrati.get(numero);
        return {
            numero_dente: numero,
            stato: riga ? riga.stato : 'sano',
            superfici: riga ? riga.superfici : '',
            materiale: riga ? riga.materiale : '',
            mobilita: riga ? riga.mobilita : '',
            note: riga ? riga.note : '',
            registrato: Boolean(riga)
        };
    });
}

module.exports = {
    PERMANENTE, DECIDUA, SUPERFICI, STATI,
    arcate, tuttiINumeri, dentizioneDi, esiste, normalizzaSuperfici, mappaStati
};
