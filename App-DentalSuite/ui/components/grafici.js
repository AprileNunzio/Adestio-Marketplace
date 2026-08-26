import { el, svg } from './dom.js';
import { vuoto } from './layout.js';
import { assicuraFoglio } from '../kernel/stili.js';

const LARGHEZZA = 720;
const ALTEZZA = 260;
const MARGINE = { alto: 18, destro: 14, basso: 34, sinistro: 58 };

function areaUtile() {
    return {
        larghezza: LARGHEZZA - MARGINE.sinistro - MARGINE.destro,
        altezza: ALTEZZA - MARGINE.alto - MARGINE.basso
    };
}

function scalaMassima(valori) {
    const massimo = Math.max(...valori.map(valore => Math.abs(Number(valore) || 0)), 1);
    const potenza = Math.pow(10, Math.floor(Math.log10(massimo)));
    return Math.ceil(massimo / potenza) * potenza;
}

function etichettaMese(chiave) {
    const parti = /^(\d{4})-(\d{2})$/.exec(String(chiave || ''));
    if (!parti) return String(chiave || '');
    return `${parti[2]}/${parti[1].slice(2)}`;
}

function griglia(massimo, formatta) {
    const area = areaUtile();
    const passi = 4;
    const linee = [];
    for (let indice = 0; indice <= passi; indice += 1) {
        const valore = (massimo / passi) * indice;
        const y = MARGINE.alto + area.altezza - (area.altezza / passi) * indice;
        linee.push(svg('line', {
            class: 'ds-chart__griglia',
            x1: MARGINE.sinistro,
            y1: y,
            x2: MARGINE.sinistro + area.larghezza,
            y2: y
        }));
        linee.push(svg('text', {
            class: 'ds-chart__scala',
            x: MARGINE.sinistro - 8,
            y: y + 4,
            'text-anchor': 'end'
        }, formatta(valore)));
    }
    return linee;
}

function legenda(voci) {
    return el('div', { class: 'ds-chart__legenda' }, voci.map(voce => {
        const segno = el('span', { class: 'ds-chart__segno' });
        segno.style.backgroundColor = voce.colore;
        return el('span', { class: 'ds-chart__voce' }, [segno, voce.etichetta]);
    }));
}

function barra(x, y, larghezza, altezza, colore, titolo) {
    return svg('rect', {
        class: 'ds-chart__barra',
        x,
        y,
        width: larghezza,
        height: Math.max(altezza, 0),
        rx: 3,
        fill: colore
    }, svg('title', {}, titolo));
}

export function flussoMensile({ voci, formatta, compatto = false }) {
    assicuraFoglio('grafici');
    if (!voci || voci.length === 0) {
        return vuoto({ titolo: 'Nessun movimento nel periodo', simbolo: 'insights' });
    }

    const area = areaUtile();
    const massimo = scalaMassima(voci.flatMap(voce => [voce.entrate, voce.uscite]));
    const passo = area.larghezza / voci.length;
    const larghezzaBarra = Math.min(Math.max(passo / 3.2, 6), 26);

    const colonne = voci.flatMap((voce, indice) => {
        const centro = MARGINE.sinistro + passo * indice + passo / 2;
        const altezzaEntrate = (Math.abs(voce.entrate) / massimo) * area.altezza;
        const altezzaUscite = (Math.abs(voce.uscite) / massimo) * area.altezza;
        const base = MARGINE.alto + area.altezza;
        return [
            barra(
                centro - larghezzaBarra - 2, base - altezzaEntrate, larghezzaBarra, altezzaEntrate,
                'var(--ds-success)', `${etichettaMese(voce.etichetta)} · entrate ${formatta(voce.entrate)}`
            ),
            barra(
                centro + 2, base - altezzaUscite, larghezzaBarra, altezzaUscite,
                'var(--ds-danger)', `${etichettaMese(voce.etichetta)} · uscite ${formatta(voce.uscite)}`
            ),
            svg('text', {
                class: 'ds-chart__asse',
                x: centro,
                y: ALTEZZA - MARGINE.basso + 20,
                'text-anchor': 'middle'
            }, etichettaMese(voce.etichetta))
        ];
    });

    const puntiSaldo = voci.map((voce, indice) => {
        const centro = MARGINE.sinistro + passo * indice + passo / 2;
        const altezza = (Math.abs(voce.saldo) / massimo) * area.altezza;
        const y = MARGINE.alto + area.altezza - (voce.saldo >= 0 ? altezza : 0);
        return `${Math.round(centro * 10) / 10},${Math.round(y * 10) / 10}`;
    }).join(' ');

    return el('div', { class: 'ds-chart' }, [
        svg('svg', {
            class: 'ds-chart__tela',
            viewBox: `0 0 ${LARGHEZZA} ${ALTEZZA}`,
            role: 'img',
            'aria-label': 'Entrate e uscite mese per mese'
        }, [
            ...griglia(massimo, formatta),
            ...colonne,
            compatto ? null : svg('polyline', {
                class: 'ds-chart__linea',
                points: puntiSaldo,
                fill: 'none',
                stroke: 'var(--ds-accent)'
            })
        ].filter(Boolean)),
        legenda([
            { etichetta: 'Entrate', colore: 'var(--ds-success)' },
            { etichetta: 'Uscite', colore: 'var(--ds-danger)' },
            ...(compatto ? [] : [{ etichetta: 'Saldo del mese', colore: 'var(--ds-accent)' }])
        ])
    ]);
}

const TAVOLOZZA = [
    'var(--ds-accent)',
    '#6366f1',
    '#f59e0b',
    '#0ea5e9',
    '#db2777',
    '#16a34a',
    '#7c3aed',
    '#ea580c'
];

export function distribuzione({ voci, formatta, titoloVuoto }) {
    assicuraFoglio('grafici');
    if (!voci || voci.length === 0) {
        return vuoto({ titolo: titoloVuoto || 'Nessun dato da ripartire', simbolo: 'donut_small' });
    }

    const totale = voci.reduce((somma, voce) => somma + Math.abs(Number(voce.totale) || 0), 0) || 1;
    const raggio = 62;
    const spessore = 22;
    const circonferenza = 2 * Math.PI * raggio;
    let percorso = 0;

    const archi = voci.slice(0, TAVOLOZZA.length).map((voce, indice) => {
        const quota = Math.abs(Number(voce.totale) || 0) / totale;
        const cerchio = svg('circle', {
            class: 'ds-chart__arco',
            cx: 80,
            cy: 80,
            r: raggio,
            fill: 'none',
            stroke: TAVOLOZZA[indice % TAVOLOZZA.length],
            'stroke-width': spessore,
            'stroke-dasharray': `${circonferenza * quota} ${circonferenza}`,
            'stroke-dashoffset': -circonferenza * percorso,
            transform: 'rotate(-90 80 80)'
        }, svg('title', {}, `${voce.etichetta}: ${formatta(voce.totale)}`));
        percorso += quota;
        return cerchio;
    });

    const elencoVoci = el('ul', { class: 'ds-chart__elenco' }, voci.slice(0, TAVOLOZZA.length).map((voce, indice) => {
        const segno = el('span', { class: 'ds-chart__segno' });
        segno.style.backgroundColor = TAVOLOZZA[indice % TAVOLOZZA.length];
        return el('li', {}, [
            segno,
            el('span', { class: 'ds-chart__nome' }, voce.etichetta),
            el('span', { class: 'ds-chart__importo ds-numeric' }, formatta(voce.totale))
        ]);
    }));

    return el('div', { class: 'ds-chart ds-chart--anello' }, [
        svg('svg', {
            class: 'ds-chart__ciambella',
            viewBox: '0 0 160 160',
            role: 'img',
            'aria-label': 'Ripartizione per categoria'
        }, archi),
        elencoVoci
    ]);
}
