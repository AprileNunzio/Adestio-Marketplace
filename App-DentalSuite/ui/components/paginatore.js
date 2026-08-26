import { el } from './dom.js';
import { bottone, spaziatore } from './layout.js';

function riepilogo({ totale, pagina, dimensione, righe }) {
    if (totale === 0) return 'Nessun risultato';
    const primo = (pagina - 1) * dimensione + 1;
    const ultimo = primo + righe - 1;
    return `${primo}–${ultimo} di ${totale}`;
}

export function paginatore({ stato, onVai }) {
    const corrente = Math.min(stato.pagina, stato.pagine);
    return el('div', { class: 'ds-paginatore' }, [
        el('span', { class: 'ds-paginatore__conteggio ds-numeric' }, riepilogo({
            totale: stato.totale,
            pagina: corrente,
            dimensione: stato.dimensione,
            righe: stato.righe.length
        })),
        spaziatore(),
        bottone({
            simbolo: 'first_page',
            variante: 'ghost',
            piccolo: true,
            titolo: 'Prima pagina',
            disabilitato: corrente <= 1,
            onClick: () => onVai(1)
        }),
        bottone({
            simbolo: 'chevron_left',
            variante: 'ghost',
            piccolo: true,
            titolo: 'Pagina precedente',
            disabilitato: corrente <= 1,
            onClick: () => onVai(corrente - 1)
        }),
        el('span', { class: 'ds-paginatore__posizione ds-numeric' }, `${corrente} / ${stato.pagine}`),
        bottone({
            simbolo: 'chevron_right',
            variante: 'ghost',
            piccolo: true,
            titolo: 'Pagina successiva',
            disabilitato: corrente >= stato.pagine,
            onClick: () => onVai(corrente + 1)
        }),
        bottone({
            simbolo: 'last_page',
            variante: 'ghost',
            piccolo: true,
            titolo: 'Ultima pagina',
            disabilitato: corrente >= stato.pagine,
            onClick: () => onVai(stato.pagine)
        })
    ]);
}
