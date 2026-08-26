import { el, icona } from './dom.js';
import { bottone } from './layout.js';
import { adattaAlTelaio } from '../kernel/telaio.js';

function chiudi(fondale, risolvi, esito) {
    if (!fondale.isConnected) return;
    fondale.remove();
    document.removeEventListener('keydown', fondale.gestoreTasti);
    risolvi(esito);
}

export function apriModale({ titolo, corpo, azioni = [], ampia = false, suChiusura }) {
    return new Promise(risolvi => {
        const fondale = el('div', { class: 'ds-modal-backdrop ds-root' });
        const termina = esito => {
            if (suChiusura) suChiusura(esito);
            chiudi(fondale, risolvi, esito);
        };

        const pulsanti = azioni.map(azione => bottone({
            etichetta: azione.etichetta,
            simbolo: azione.simbolo,
            variante: azione.variante,
            onClick: async () => {
                const esito = azione.onAzione ? await azione.onAzione(termina) : undefined;
                if (azione.chiude !== false && esito !== false) termina(azione.esito);
            }
        }));

        const finestra = el('div', { class: ampia ? 'ds-modal ds-modal--wide' : 'ds-modal' }, [
            el('div', { class: 'ds-modal__head' }, [
                el('h3', { class: 'ds-modal__title' }, titolo),
                el('button', {
                    class: 'ds-btn ds-btn--ghost ds-btn--icon',
                    type: 'button',
                    title: 'Chiudi',
                    onClick: () => termina(null)
                }, icona('close'))
            ]),
            el('div', { class: 'ds-modal__body' }, corpo),
            pulsanti.length > 0 ? el('div', { class: 'ds-modal__foot' }, pulsanti) : null
        ]);

        fondale.appendChild(finestra);
        fondale.addEventListener('click', evento => {
            if (evento.target === fondale) termina(null);
        });
        fondale.gestoreTasti = evento => {
            if (evento.key === 'Escape') termina(null);
        };
        document.addEventListener('keydown', fondale.gestoreTasti);
        adattaAlTelaio(fondale);
        document.body.appendChild(fondale);

        const primo = finestra.querySelector('input, select, textarea, button');
        if (primo) primo.focus();
    });
}

export function conferma({ titolo, messaggio, etichettaConferma = 'Conferma', distruttiva = false }) {
    return apriModale({
        titolo,
        corpo: el('p', { class: 'ds-muted' }, messaggio),
        azioni: [
            { etichetta: 'Annulla', variante: 'ghost', esito: false },
            {
                etichetta: etichettaConferma,
                variante: distruttiva ? 'danger' : 'primario',
                simbolo: distruttiva ? 'delete' : 'check',
                esito: true
            }
        ]
    }).then(esito => esito === true);
}
