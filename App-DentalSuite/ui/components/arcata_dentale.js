import { svg } from './dom.js';
import { profiloCorona, cuspidiDi, solcoDi } from './forme_dente.js';

const LARGHEZZA = 560;
const ALTEZZA = 700;
const CENTRO_X = 280;
const RAGGIO_X = 196;
const RAGGIO_Y = 198;
const CENTRO_SUPERIORE = 268;
const CENTRO_INFERIORE = 432;
const ANGOLO_INIZIO = 197;
const ANGOLO_FINE = -17;
const TOCCO_MINIMO = 46;

function inRadianti(gradi) {
    return (gradi * Math.PI) / 180;
}

function posizioni(denti, superiore) {
    const totale = denti.reduce((somma, dente) => somma + dente.larghezza, 0);
    const centroY = superiore ? CENTRO_SUPERIORE : CENTRO_INFERIORE;
    let percorso = 0;

    return denti.map(dente => {
        const frazione = (percorso + dente.larghezza / 2) / totale;
        percorso += dente.larghezza;
        const angolo = ANGOLO_INIZIO + (ANGOLO_FINE - ANGOLO_INIZIO) * frazione;
        const seno = Math.sin(inRadianti(angolo));
        const coseno = Math.cos(inRadianti(angolo));
        return {
            dente,
            angolo,
            x: CENTRO_X + RAGGIO_X * coseno,
            y: superiore ? centroY - RAGGIO_Y * seno : centroY + RAGGIO_Y * seno,
            rotazione: superiore ? 90 - angolo : angolo + 90,
            etichettaX: CENTRO_X + (RAGGIO_X + 62) * coseno,
            etichettaY: superiore
                ? centroY - (RAGGIO_Y + 58) * seno
                : centroY + (RAGGIO_Y + 58) * seno
        };
    });
}

function tracciaGengiva(superiore) {
    const centroY = superiore ? CENTRO_SUPERIORE : CENTRO_INFERIORE;
    const punti = [];
    for (let passo = 0; passo <= 60; passo += 1) {
        const angolo = ANGOLO_INIZIO + ((ANGOLO_FINE - ANGOLO_INIZIO) * passo) / 60;
        const seno = Math.sin(inRadianti(angolo));
        const coseno = Math.cos(inRadianti(angolo));
        const x = CENTRO_X + RAGGIO_X * coseno;
        const y = superiore ? centroY - RAGGIO_Y * seno : centroY + RAGGIO_Y * seno;
        punti.push(`${passo === 0 ? 'M' : 'L'} ${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`);
    }
    return punti.join(' ');
}

function coloreStato(stati, idStato) {
    const trovato = stati.find(voce => voce.id === idStato);
    return trovato ? trovato.colore : '#e2e8f0';
}

function etichettaStato(stati, idStato) {
    const trovato = stati.find(voce => voce.id === idStato);
    return trovato ? trovato.label : idStato;
}

function disegnaDente(collocazione, stati, selezionato, interattivo, onSeleziona) {
    const { dente, x, y, rotazione } = collocazione;
    const scelto = selezionato === dente.numero_dente;
    const assente = dente.stato === 'estratto' || dente.stato === 'assente';
    const colore = coloreStato(stati, dente.stato);

    const corona = svg('path', {
        class: 'ds-dente__corona',
        d: profiloCorona(dente.tipo, dente.larghezza, dente.altezza),
        fill: assente ? 'transparent' : colore,
        stroke: assente ? colore : 'rgba(15,23,42,.32)',
        'stroke-width': assente ? 2 : 1.1,
        'stroke-dasharray': assente ? '3 3' : null
    });

    const dettagli = assente ? [] : [
        ...cuspidiDi(dente.tipo, dente.larghezza, dente.altezza).map(cuspide => svg('circle', {
            class: 'ds-dente__cuspide',
            cx: cuspide.cx,
            cy: cuspide.cy,
            r: cuspide.r,
            fill: 'rgba(15,23,42,.10)'
        })),
        solcoDi(dente.tipo, dente.larghezza, dente.altezza)
            ? svg('path', {
                class: 'ds-dente__solco',
                d: solcoDi(dente.tipo, dente.larghezza, dente.altezza),
                fill: 'none',
                stroke: 'rgba(15,23,42,.28)',
                'stroke-width': 1,
                'stroke-linecap': 'round'
            })
            : null
    ].filter(Boolean);

    const anello = scelto
        ? svg('path', {
            class: 'ds-dente__anello',
            d: profiloCorona(dente.tipo, dente.larghezza + 9, dente.altezza + 9),
            fill: 'none',
            stroke: 'currentColor',
            'stroke-width': 2.4
        })
        : null;

    const bersaglio = svg('rect', {
        class: 'ds-dente__tocco',
        x: -TOCCO_MINIMO / 2,
        y: -TOCCO_MINIMO / 2,
        width: TOCCO_MINIMO,
        height: TOCCO_MINIMO,
        rx: 10,
        fill: 'transparent'
    });

    const gruppo = svg('g', {
        class: 'ds-dente',
        transform: `translate(${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}) rotate(${Math.round(rotazione * 10) / 10})`,
        dataset: { dente: dente.numero_dente, stato: dente.stato, scelto: scelto ? 'true' : 'false' },
        role: interattivo ? 'button' : 'img',
        tabindex: interattivo ? '0' : null,
        'aria-label': `${dente.nome} ${dente.numero_dente}, ${etichettaStato(stati, dente.stato)}`,
        'aria-pressed': interattivo ? String(scelto) : null,
        onClick: interattivo ? () => onSeleziona(dente) : null,
        onKeydown: interattivo
            ? evento => {
                if (evento.key === 'Enter' || evento.key === ' ') {
                    evento.preventDefault();
                    onSeleziona(dente);
                }
            }
            : null
    }, [anello, corona, ...dettagli, bersaglio]);

    return gruppo;
}

function disegnaEtichetta(collocazione, selezionato) {
    const { dente, etichettaX, etichettaY } = collocazione;
    const scelto = selezionato === dente.numero_dente;
    return svg('g', {
        class: 'ds-dente-num',
        dataset: { scelto: scelto ? 'true' : 'false' },
        transform: `translate(${Math.round(etichettaX * 10) / 10} ${Math.round(etichettaY * 10) / 10})`
    }, [
        svg('circle', { r: 13, class: 'ds-dente-num__bolla' }),
        svg('text', {
            class: 'ds-dente-num__testo',
            'text-anchor': 'middle',
            'dominant-baseline': 'central',
            y: 0.5
        }, dente.numero_dente)
    ]);
}

function bandaCentrale() {
    return svg('g', { class: 'ds-arcata__assi' }, [
        svg('text', { class: 'ds-arcata__lato', x: 30, y: ALTEZZA / 2, 'text-anchor': 'start' }, 'DESTRA'),
        svg('text', { class: 'ds-arcata__lato', x: LARGHEZZA - 30, y: ALTEZZA / 2, 'text-anchor': 'end' }, 'SINISTRA'),
        svg('line', {
            class: 'ds-arcata__linea',
            x1: 96, y1: ALTEZZA / 2 - 4, x2: LARGHEZZA - 96, y2: ALTEZZA / 2 - 4
        }),
        svg('text', {
            class: 'ds-arcata__titolo', x: CENTRO_X, y: CENTRO_SUPERIORE + 30, 'text-anchor': 'middle'
        }, 'Arcata superiore'),
        svg('text', {
            class: 'ds-arcata__titolo', x: CENTRO_X, y: CENTRO_INFERIORE - 18, 'text-anchor': 'middle'
        }, 'Arcata inferiore')
    ]);
}

export function creaArcata({ denti, stati, selezionato, interattivo = true, onSeleziona }) {
    const superiori = denti.filter(dente => dente.arcata === 'superiore');
    const inferiori = denti.filter(dente => dente.arcata === 'inferiore');
    const collocazioni = [
        ...posizioni(superiori, true),
        ...posizioni(inferiori, false)
    ];

    const gengive = [true, false].map(superiore => svg('path', {
        class: 'ds-arcata__gengiva',
        d: tracciaGengiva(superiore),
        fill: 'none',
        'stroke-linecap': 'round'
    }));

    return svg('svg', {
        class: 'ds-arcata',
        viewBox: `0 0 ${LARGHEZZA} ${ALTEZZA}`,
        role: 'group',
        'aria-label': 'Odontogramma'
    }, [
        ...gengive,
        bandaCentrale(),
        ...collocazioni.map(voce => disegnaEtichetta(voce, selezionato)),
        ...collocazioni.map(voce => disegnaDente(voce, stati, selezionato, interattivo, onSeleziona))
    ]);
}
