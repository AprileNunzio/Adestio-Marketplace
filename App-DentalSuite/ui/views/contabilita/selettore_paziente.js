import { el, rimpiazza } from '../../components/dom.js';
import { apriModale } from '../../components/modale.js';
import { call } from '../../kernel/transport.js';
import { elenco } from '../shared/vista.js';

const MASSIMO_RISULTATI = 40;

function corrisponde(riga, cercato) {
    if (!cercato) return true;
    return `${riga.nominativo} ${riga.codice_fiscale} ${riga.telefono}`.toLowerCase().includes(cercato);
}

export async function selettorePaziente() {
    const pazienti = elenco(await call('pazienti.list', {}));
    const stato = { selezionato: null };
    const risultati = el('div', { class: 'ds-table-wrap' });

    const disegnaRisultati = termine => {
        const cercato = termine.trim().toLowerCase();
        const visibili = pazienti.filter(riga => corrisponde(riga, cercato)).slice(0, MASSIMO_RISULTATI);

        if (visibili.length === 0) {
            rimpiazza(risultati, el('p', { class: 'ds-muted' }, 'Nessun paziente corrisponde alla ricerca.'));
            return;
        }

        rimpiazza(risultati, el('div', {}, visibili.map(riga => el('label', { class: 'ds-check' }, [
            el('input', {
                type: 'radio',
                name: 'ds-selettore-paziente',
                checked: stato.selezionato === riga.id,
                onChange: () => {
                    stato.selezionato = riga.id;
                }
            }),
            el('span', {}, riga.nominativo),
            el('span', { class: 'ds-muted' }, riga.codice_fiscale || riga.telefono || '')
        ]))));
    };

    const ricerca = el('input', {
        class: 'ds-input',
        type: 'search',
        placeholder: 'Cerca per cognome, codice fiscale o telefono…',
        onInput: evento => disegnaRisultati(evento.target.value)
    });

    disegnaRisultati('');

    const conferma = await apriModale({
        titolo: 'Seleziona il paziente',
        corpo: el('div', { class: 'ds-root' }, [ricerca, risultati]),
        azioni: [
            { etichetta: 'Annulla', variante: 'ghost', esito: null },
            { etichetta: 'Conferma', simbolo: 'check', esito: true }
        ]
    });

    return conferma === true ? stato.selezionato : null;
}
