import { el, icona } from './dom.js';

export function navigatoreGiorno({ giorno, onCambia, etichettaOggi = 'Oggi', oggi }) {
    const passo = (base, giorni) => {
        const parti = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(base || ''));
        if (!parti) return base;
        const data = new Date(Number(parti[1]), Number(parti[2]) - 1, Number(parti[3]) + giorni);
        const mese = String(data.getMonth() + 1).padStart(2, '0');
        const numero = String(data.getDate()).padStart(2, '0');
        return `${data.getFullYear()}-${mese}-${numero}`;
    };

    const campo = el('input', {
        class: 'ds-input ds-daynav__data',
        type: 'date',
        value: giorno,
        'aria-label': 'Giorno visualizzato',
        onChange: evento => onCambia(evento.target.value || oggi)
    });

    return el('div', { class: 'ds-daynav', role: 'group', 'aria-label': 'Navigazione giorno' }, [
        el('button', {
            class: 'ds-btn ds-btn--ghost ds-btn--icon',
            type: 'button',
            title: 'Giorno precedente',
            onClick: () => onCambia(passo(giorno, -1))
        }, icona('chevron_left')),
        campo,
        el('button', {
            class: 'ds-btn ds-btn--ghost ds-btn--icon',
            type: 'button',
            title: 'Giorno successivo',
            onClick: () => onCambia(passo(giorno, 1))
        }, icona('chevron_right')),
        el('button', {
            class: 'ds-btn ds-btn--ghost ds-daynav__oggi',
            type: 'button',
            title: 'Torna a oggi',
            disabled: giorno === oggi,
            onClick: () => onCambia(oggi)
        }, etichettaOggi)
    ]);
}
