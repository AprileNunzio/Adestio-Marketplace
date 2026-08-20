import { el } from '../components/dom.js';
import { intestazione, pannello, bottone, spaziatore, distintivo, vuoto } from '../components/layout.js';
import { conferma } from '../components/modale.js';
import { esito } from '../components/notifica.js';
import { call } from '../kernel/transport.js';
import { can } from '../security/permissions.js';
import * as fmt from '../kernel/format.js';
import { navigatoreGiorno } from '../components/navigatore_giorno.js';
import { montaVista, elenco } from './shared/vista.js';
import { apriAppuntamento } from './agenda/appuntamento_editor.js';

const ORA_INIZIO = 8;
const ORA_FINE = 20;
const PASSO_MINUTI = 30;

function slotDelGiorno(giornoIso) {
    const base = fmt.inizioGiornata(giornoIso);
    const totale = ((ORA_FINE - ORA_INIZIO) * 60) / PASSO_MINUTI;
    return Array.from({ length: totale }, (unused, indice) =>
        base + (ORA_INIZIO * 60 + indice * PASSO_MINUTI) * 60000);
}

function etichettaSlot(timestamp) {
    const data = new Date(timestamp);
    return data.getMinutes() === 0
        ? `${String(data.getHours()).padStart(2, '0')}:00`
        : '';
}

function blocco(appuntamento, onApri) {
    return el('div', {
        class: 'ds-slot',
        dataset: { stato: appuntamento.stato },
        title: `${appuntamento.paziente_nome} · ${fmt.etichettaStato(appuntamento.stato)}`,
        onClick: () => onApri(appuntamento)
    }, [
        el('span', { class: 'ds-slot__title' }, appuntamento.paziente_nome || appuntamento.motivo_visita || 'Appuntamento'),
        el('span', { class: 'ds-slot__meta' },
            `${fmt.ora(appuntamento.data_ora_inizio)} · ${appuntamento.durata_minuti}′ · ${appuntamento.medico_nome || 'senza medico'}`)
    ]);
}

function tabellone(giornoIso, poltrone, appuntamenti, onApri) {
    const slot = slotDelGiorno(giornoIso);
    const griglia = el('div', { class: 'ds-timeline' });
    griglia.style.gridTemplateColumns = `64px repeat(${poltrone.length}, minmax(160px, 1fr))`;

    griglia.appendChild(el('div', { class: 'ds-timeline__head' }, 'Ora'));
    poltrone.forEach(poltrona => {
        griglia.appendChild(el('div', { class: 'ds-timeline__head' }, poltrona.nome));
    });

    slot.forEach(inizio => {
        const fine = inizio + PASSO_MINUTI * 60000;
        griglia.appendChild(el('div', { class: 'ds-timeline__cell ds-timeline__hour' }, etichettaSlot(inizio)));
        poltrone.forEach(poltrona => {
            const dentro = appuntamenti.filter(voce =>
                voce.poltrona_id === poltrona.id
                && Number(voce.data_ora_inizio) >= inizio
                && Number(voce.data_ora_inizio) < fine);
            griglia.appendChild(el('div', { class: 'ds-timeline__cell' }, dentro.map(voce => blocco(voce, onApri))));
        });
    });

    return el('div', { class: 'ds-table-wrap' }, griglia);
}

export default {
    rendi: async ({ naviga, indietro }) => {
        const permessi = {
            modifica: await can('agenda_edit'),
            elimina: await can('agenda_delete')
        };
        let giorno = fmt.oggiIso();

        return montaVista({
            accento: 'agenda',
            carica: async () => {
                const [appuntamenti, struttura] = await Promise.all([
                    call('agenda.listByRange', {
                        dal: fmt.inizioGiornata(giorno),
                        al: fmt.fineGiornata(giorno)
                    }).then(elenco),
                    call('struttura.tree', {}).then(elenco)
                ]);
                const poltrone = struttura.flatMap(sede => [
                    ...sede.poltrone_senza_sala,
                    ...sede.sale.flatMap(sala => sala.poltrone)
                ]);
                return { appuntamenti, poltrone };
            },
            disegna: ({ appuntamenti, poltrone }, aggiorna) => {
                const apri = async appuntamento => {
                    await apriAppuntamento({
                        appuntamento,
                        poltrone,
                        giorno,
                        permessi,
                        onEliminato: async () => {
                            const procedi = await conferma({
                                titolo: 'Annullare l\'appuntamento?',
                                messaggio: 'L\'appuntamento verrà rimosso dal planning delle poltrone.',
                                etichettaConferma: 'Annulla appuntamento',
                                distruttiva: true
                            });
                            if (!procedi) return false;
                            return esito(await call('agenda.remove', { id: appuntamento.id }), 'Appuntamento rimosso');
                        }
                    });
                    await aggiorna();
                };

                const contenuto = poltrone.length === 0
                    ? vuoto({
                        titolo: 'Nessuna poltrona configurata',
                        testo: 'Configura sedi e riuniti nella sezione Struttura per poter pianificare le visite.',
                        simbolo: 'chair',
                        azione: bottone({
                            etichetta: 'Vai a Struttura',
                            simbolo: 'domain',
                            onClick: () => naviga('struttura')
                        })
                    })
                    : tabellone(giorno, poltrone, appuntamenti, apri);

                const navigatore = navigatoreGiorno({
                    giorno,
                    oggi: fmt.oggiIso(),
                    onCambia: nuovoGiorno => {
                        giorno = nuovoGiorno;
                        aggiorna();
                    }
                });

                const perStato = appuntamenti.reduce((mappa, voce) => {
                    mappa[voce.stato] = (mappa[voce.stato] || 0) + 1;
                    return mappa;
                }, {});

                return [
                    intestazione({
                        titolo: 'Agenda Poltrone & Visite',
                        sottotitolo: `${appuntamenti.length} appuntamenti su ${poltrone.length} poltrone · ${fmt.data(giorno)}`,
                        simbolo: 'calendar_month',
                        indietro,
                        azioni: permessi.modifica && poltrone.length > 0 ? [bottone({
                            etichetta: 'Nuovo appuntamento',
                            simbolo: 'add',
                            onClick: () => apri(null)
                        })] : []
                    }),
                    pannello({
                        titolo: 'Planning giornaliero',
                        azioni: [
                            navigatore,
                            spaziatore(),
                            ...Object.entries(perStato).map(([stato, quanti]) =>
                                distintivo(`${fmt.etichettaStato(stato)}: ${quanti}`, 'info'))
                        ],
                        flush: poltrone.length > 0
                    }, contenuto)
                ];
            }
        });
    }
};
