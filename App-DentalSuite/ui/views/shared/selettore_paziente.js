import { el, rimpiazza } from '../../components/dom.js';
import { apriModale } from '../../components/modale.js';
import { call } from '../../kernel/transport.js';
import { elenco, pagina } from './vista.js';
import { assicuraFoglio } from '../../kernel/stili.js';

const MASSIMO_RISULTATI = 40;
const ATTESA_DIGITAZIONE = 220;

async function cerca(termine) {
    const cercato = String(termine || '').trim();
    if (cercato.length < 2) {
        return pagina(await call('pazienti.list', { dimensione: MASSIMO_RISULTATI })).righe;
    }
    return elenco(await call('pazienti.search', { term: cercato, limit: MASSIMO_RISULTATI }));
}

export async function selettorePaziente() {
    assicuraFoglio('selettore');
    const stato = { selezionato: null };
    const risultati = el('div', { class: 'ds-table-wrap' });
    let attesa = null;

    const disegnaRisultati = async termine => {
        const visibili = await cerca(termine);

        if (visibili.length === 0) {
            rimpiazza(risultati, el('p', { class: 'ds-muted' }, 'Nessun paziente corrisponde alla ricerca.'));
            return;
        }

        const contenitore = el('div', { class: 'ds-sp__elenco' }, visibili.map(riga => {
            const voce = el('button', {
                class: 'ds-sp__voce',
                type: 'button',
                dataset: { scelto: stato.selezionato === riga.id ? 'true' : 'false' },
                onClick: () => {
                    stato.selezionato = riga.id;
                    contenitore.querySelectorAll('.ds-sp__voce').forEach(altro => {
                        altro.dataset.scelto = 'false';
                    });
                    voce.dataset.scelto = 'true';
                },
                onDblClick: () => {
                    stato.selezionato = riga.id;
                    stato.conferma = true;
                    if (typeof stato.chiudi === 'function') stato.chiudi();
                }
            }, [
                el('span', { class: 'ds-sp__nome' }, riga.nominativo),
                el('span', { class: 'ds-sp__meta' }, riga.codice_fiscale || riga.telefono || '')
            ]);
            return voce;
        }));

        rimpiazza(risultati, contenitore);
    };

    const ricerca = el('input', {
        class: 'ds-input ds-sp__ricerca',
        type: 'search',
        placeholder: 'Cerca per cognome, codice fiscale o telefono…',
        onInput: evento => {
            const termine = evento.target.value;
            if (attesa) clearTimeout(attesa);
            attesa = setTimeout(() => disegnaRisultati(termine), ATTESA_DIGITAZIONE);
        }
    });

    await disegnaRisultati('');

    const conferma = await apriModale({
        titolo: 'Seleziona il paziente',
        corpo: el('div', { class: 'ds-root ds-sp' }, [ricerca, risultati]),
        azioni: [
            { etichetta: 'Annulla', variante: 'ghost', esito: null },
            { etichetta: 'Conferma', simbolo: 'check', esito: true }
        ]
    });

    return conferma === true ? stato.selezionato : null;
}
