import { el } from './dom.js';
import { vuoto } from './layout.js';

export function barreOrizzontali(voci, formatta) {
    if (!voci || voci.length === 0) {
        return vuoto({ titolo: 'Nessun dato nel periodo', simbolo: 'bar_chart' });
    }
    const massimo = Math.max(...voci.map(voce => Math.abs(Number(voce.totale) || 0)), 1);

    return el('div', { class: 'ds-bars' }, voci.map(voce => {
        const riempimento = el('div', { class: 'ds-bar__fill' });
        riempimento.style.width = `${Math.max(2, (Math.abs(Number(voce.totale)) / massimo) * 100)}%`;
        return el('div', { class: 'ds-bar' }, [
            el('span', { class: 'ds-bar__label', title: voce.etichetta }, voce.etichetta),
            el('div', { class: 'ds-bar__track' }, riempimento),
            el('span', { class: 'ds-bar__value' }, formatta(voce.totale))
        ]);
    }));
}
