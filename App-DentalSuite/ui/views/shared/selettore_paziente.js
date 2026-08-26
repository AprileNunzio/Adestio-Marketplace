import { el, rimpiazza, icona } from '../../components/dom.js';
import { apriModale } from '../../components/modale.js';
import { call } from '../../kernel/transport.js';
import { elenco, pagina } from './vista.js';
import { assicuraFoglio } from '../../kernel/stili.js';
import * as fmt from '../../kernel/format.js';

const MASSIMO_RISULTATI = 40;
const ATTESA_DIGITAZIONE = 180;

async function caricaAppuntamentiOggi() {
    try {
        const adesso = new Date();
        const dal = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate(), 0, 0, 0).getTime();
        const al = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate(), 23, 59, 59, 999).getTime();
        const lista = await call('agenda.listByRange', { dal, al });
        return Array.isArray(lista) ? lista : [];
    } catch (_) {
        return [];
    }
}

async function cerca(termine) {
    try {
        const cercato = String(termine || '').trim();
        if (cercato.length < 2) {
            return pagina(await call('pazienti.list', { dimensione: MASSIMO_RISULTATI })).righe;
        }
        return elenco(await call('pazienti.search', { term: cercato, limit: MASSIMO_RISULTATI }));
    } catch (_) {
        return [];
    }
}

export async function selettorePaziente() {
    assicuraFoglio('selettore');
    let sceltoId = null;
    let callbackChiudi = null;
    let attesa = null;

    const contenitoreOggi = el('div', { class: 'ds-sp__sezione' });
    const contenitoreRicerca = el('div', { class: 'ds-sp__sezione' });
    const listaRisultati = el('div', { class: 'ds-sp__elenco' });

    const seleziona = (id, confermaSubito = false) => {
        sceltoId = id;
        document.querySelectorAll('.ds-sp__voce, .ds-sp__agenda-item').forEach(nodo => {
            nodo.dataset.scelto = String(nodo.dataset.id === String(id));
        });
        if (confermaSubito && typeof callbackChiudi === 'function') {
            callbackChiudi(true);
        }
    };

    const appuntamentiOggi = await caricaAppuntamentiOggi();

    if (appuntamentiOggi.length > 0) {
        const vociOggi = appuntamentiOggi.map(app => {
            const oraStr = fmt.ora(app.data_ora_inizio);
            const nomePaziente = app.paziente_nome || 'Paziente';
            const info = [app.medico_nome, app.poltrona_nome, app.motivo_visita].filter(Boolean).join(' · ');

            return el('button', {
                class: 'ds-sp__agenda-item',
                type: 'button',
                dataset: { id: app.paziente_id, scelto: 'false' },
                onClick: () => seleziona(app.paziente_id, true)
            }, [
                el('div', { class: 'ds-sp__agenda-ora' }, oraStr),
                el('div', { class: 'ds-sp__agenda-corpo' }, [
                    el('strong', { class: 'ds-sp__agenda-nome' }, nomePaziente),
                    info ? el('span', { class: 'ds-sp__agenda-info' }, info) : null
                ].filter(Boolean)),
                el('div', { class: 'ds-sp__agenda-stato' }, [
                    el('span', { class: 'ds-sp__badge-stato' }, fmt.etichettaStato(app.stato || 'in_sala')),
                    el('span', { class: 'ds-sp__seleziona-txt' }, 'Scegli')
                ])
            ]);
        });

        rimpiazza(contenitoreOggi, [
            el('div', { class: 'ds-sp__sezione-testa' }, [
                icona('calendar_today'),
                el('span', {}, `Pazienti in appuntamento oggi (${appuntamentiOggi.length})`)
            ]),
            el('div', { class: 'ds-sp__agenda-grid' }, vociOggi)
        ]);
    }

    const disegnaRisultati = async termine => {
        const visibili = await cerca(termine);
        if (visibili.length === 0) {
            rimpiazza(listaRisultati, el('p', { class: 'ds-muted ds-sp__vuoto' }, 'Nessun paziente trovato in anagrafica.'));
            return;
        }

        const nodi = visibili.map(riga => el('button', {
            class: 'ds-sp__voce',
            type: 'button',
            dataset: { id: riga.id, scelto: String(sceltoId === riga.id) },
            onClick: () => seleziona(riga.id, true)
        }, [
            el('div', { class: 'ds-sp__voce-icon' }, icona('person')),
            el('div', { class: 'ds-sp__voce-info' }, [
                el('span', { class: 'ds-sp__nome' }, riga.nominativo),
                el('span', { class: 'ds-sp__meta' }, [
                    riga.codice_fiscale ? `CF: ${riga.codice_fiscale}` : '',
                    riga.telefono ? `Tel: ${riga.telefono}` : ''
                ].filter(Boolean).join(' · '))
            ]),
            el('span', { class: 'ds-sp__voce-btn' }, 'Seleziona')
        ]));

        rimpiazza(listaRisultati, nodi);
    };

    const campoRicerca = el('input', {
        class: 'ds-input ds-sp__ricerca',
        type: 'search',
        placeholder: 'Cerca in tutta l\'anagrafica per cognome, nome, CF o telefono…',
        onInput: evento => {
            const termine = evento.target.value;
            if (attesa) clearTimeout(attesa);
            attesa = setTimeout(() => disegnaRisultati(termine), ATTESA_DIGITAZIONE);
        }
    });

    rimpiazza(contenitoreRicerca, [
        el('div', { class: 'ds-sp__sezione-testa' }, [
            icona('manage_search'),
            el('span', {}, 'Cerca nella rubrica completa dei pazienti')
        ]),
        campoRicerca,
        listaRisultati
    ]);

    await disegnaRisultati('');

    const corpoModale = el('div', { class: 'ds-root ds-sp' }, [
        appuntamentiOggi.length > 0 ? contenitoreOggi : null,
        contenitoreRicerca
    ].filter(Boolean));

    const conferma = await apriModale({
        titolo: 'Seleziona Paziente per la Trasmissione',
        ampia: true,
        corpo: corpoModale,
        suChiusura: () => {},
        azioni: [
            { etichetta: 'Annulla', variante: 'ghost', esito: null },
            {
                etichetta: 'Conferma e Invia',
                simbolo: 'check',
                variante: 'primario',
                onAzione: (termina) => {
                    callbackChiudi = termina;
                    if (sceltoId) {
                        termina(true);
                    }
                }
            }
        ]
    });

    return conferma === true ? sceltoId : null;
}
