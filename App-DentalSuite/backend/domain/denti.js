'use strict';

const PERMANENTE = 'permanente';
const DECIDUA = 'decidua';

const QUADRANTI = {
    [PERMANENTE]: { superioreDestro: 1, superioreSinistro: 2, inferioreSinistro: 3, inferioreDestro: 4, elementi: 8 },
    [DECIDUA]: { superioreDestro: 5, superioreSinistro: 6, inferioreSinistro: 7, inferioreDestro: 8, elementi: 5 }
};

const SUPERFICI = ['M', 'D', 'V', 'L', 'O'];

const TIPI_PERMANENTI = {
    1: { id: 'incisivo_centrale', nome: 'Incisivo centrale', larghezza: 23, altezza: 30 },
    2: { id: 'incisivo_laterale', nome: 'Incisivo laterale', larghezza: 19, altezza: 28 },
    3: { id: 'canino', nome: 'Canino', larghezza: 21, altezza: 34 },
    4: { id: 'primo_premolare', nome: 'Primo premolare', larghezza: 22, altezza: 28 },
    5: { id: 'secondo_premolare', nome: 'Secondo premolare', larghezza: 22, altezza: 28 },
    6: { id: 'primo_molare', nome: 'Primo molare', larghezza: 29, altezza: 31 },
    7: { id: 'secondo_molare', nome: 'Secondo molare', larghezza: 28, altezza: 30 },
    8: { id: 'terzo_molare', nome: 'Terzo molare (dente del giudizio)', larghezza: 26, altezza: 29 }
};

const TIPI_DECIDUI = {
    1: { id: 'incisivo_centrale', nome: 'Incisivo centrale deciduo', larghezza: 21, altezza: 26 },
    2: { id: 'incisivo_laterale', nome: 'Incisivo laterale deciduo', larghezza: 18, altezza: 25 },
    3: { id: 'canino', nome: 'Canino deciduo', larghezza: 20, altezza: 30 },
    4: { id: 'primo_molare', nome: 'Primo molare deciduo', larghezza: 25, altezza: 28 },
    5: { id: 'secondo_molare', nome: 'Secondo molare deciduo', larghezza: 27, altezza: 29 }
};

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

function anatomiaDi(numero) {
    const codice = String(numero);
    const quadrante = Number(codice.charAt(0));
    const posizione = Number(codice.charAt(1));
    const tavola = quadrante >= 5 ? TIPI_DECIDUI : TIPI_PERMANENTI;
    const tipo = tavola[posizione] || tavola[1];
    return {
        ...tipo,
        quadrante,
        posizione,
        arcata: (quadrante === 1 || quadrante === 2 || quadrante === 5 || quadrante === 6)
            ? 'superiore'
            : 'inferiore',
        lato: (quadrante === 1 || quadrante === 4 || quadrante === 5 || quadrante === 8)
            ? 'destra'
            : 'sinistra'
    };
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
        const anatomia = anatomiaDi(numero);
        return {
            numero_dente: numero,
            tipo: anatomia.id,
            nome: anatomia.nome,
            arcata: anatomia.arcata,
            lato: anatomia.lato,
            larghezza: anatomia.larghezza,
            altezza: anatomia.altezza,
            stato: riga ? riga.stato : 'sano',
            superfici: riga ? riga.superfici : '',
            materiale: riga ? riga.materiale : '',
            mobilita: riga ? riga.mobilita : '',
            note: riga ? riga.note : '',
            data_rilevazione: riga ? (riga.data_rilevazione || '') : '',
            rilevazione_id: riga ? (riga.rilevazione_id || '') : '',
            registrato: Boolean(riga)
        };
    });
}

module.exports = {
    PERMANENTE, DECIDUA, SUPERFICI, STATI,
    arcate, tuttiINumeri, dentizioneDi, esiste, normalizzaSuperfici, mappaStati, anatomiaDi
};
