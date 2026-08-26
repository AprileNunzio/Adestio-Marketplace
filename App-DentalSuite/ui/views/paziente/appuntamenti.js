import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, distintivo, statistica, griglia, scheletro, avviso } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { conferma } from '../../components/modale.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import { can } from '../../security/permissions.js';
import * as fmt from '../../kernel/format.js';
import { oggetto, elenco } from '../shared/vista.js';
import { apriAppuntamento } from '../agenda/appuntamento_editor.js';

const TONI_STATO = {
    programmato: 'info',
    confermato: 'success',
    in_sala: 'warning',
    concluso: 'neutral',
    annullato: 'danger',
    non_presentato: 'danger'
};

function poltroneDa(struttura) {
    return struttura.flatMap(sede => [
        ...sede.poltrone_senza_sala,
        ...sede.sale.flatMap(sala => sala.poltrone)
    ]);
}

function prossimoAvviso(prossimo) {
    if (!prossimo) return null;
    return avviso({
        tono: 'info',
        simbolo: 'event_upcoming',
        titolo: 'Prossimo appuntamento',
        voci: [
            `${fmt.dataOra(prossimo.data_ora_inizio)} · ${prossimo.durata_minuti || 0} minuti`,
            [prossimo.medico_nome, prossimo.poltrona_nome, prossimo.prestazione_nome || prossimo.motivo_visita]
                .filter(Boolean)
                .join(' · ')
        ]
    });
}

export default {
    rendi: async ({ paziente }) => {
        const permessi = {
            modifica: await can('agenda_edit'),
            elimina: await can('agenda_delete')
        };
        const contenitore = el('div', { class: 'ds-root' }, scheletro(3));

        const disegna = async () => {
            const [dati, struttura] = await Promise.all([
                call('agenda.listByPaziente', { paziente_id: paziente.id })
                    .then(risultato => oggetto(risultato, { righe: [], futuri: 0, prossimo: null })),
                call('struttura.tree', {}).then(elenco)
            ]);

            const poltrone = poltroneDa(struttura);
            const righe = dati.righe || [];
            const conclusi = righe.filter(riga => riga.stato === 'concluso').length;
            const mancati = righe.filter(riga => riga.stato === 'non_presentato').length;

            const apri = async appuntamento => {
                await apriAppuntamento({
                    appuntamento,
                    poltrone,
                    giorno: appuntamento
                        ? fmt.isoDa(new Date(Number(appuntamento.data_ora_inizio)))
                        : fmt.oggiIso(),
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
                await disegna();
            };

            rimpiazza(contenitore, [
                griglia('stats', [
                    statistica({ etichetta: 'Appuntamenti totali', valore: String(righe.length) }),
                    statistica({ etichetta: 'In programma', valore: String(dati.futuri), tono: 'positivo' }),
                    statistica({ etichetta: 'Conclusi', valore: String(conclusi) }),
                    statistica({
                        etichetta: 'Mancate presentazioni',
                        valore: String(mancati),
                        tono: mancati > 0 ? 'negativo' : undefined
                    })
                ]),
                prossimoAvviso(dati.prossimo),
                pannello({
                    titolo: 'Storico appuntamenti',
                    azioni: permessi.modifica && poltrone.length > 0 ? [bottone({
                        etichetta: 'Fissa appuntamento',
                        simbolo: 'event_available',
                        onClick: () => apri(null)
                    })] : [],
                    flush: true
                }, tabella({
                    colonne: [
                        { titolo: 'Quando', rendi: riga => fmt.dataOra(riga.data_ora_inizio) },
                        { titolo: 'Durata', numerica: true, rendi: riga => `${riga.durata_minuti || 0}′` },
                        { titolo: 'Medico', campo: 'medico_nome' },
                        { titolo: 'Poltrona', campo: 'poltrona_nome' },
                        { titolo: 'Motivo', rendi: riga => riga.prestazione_nome || riga.motivo_visita || '—' },
                        {
                            titolo: 'Stato',
                            rendi: riga => distintivo(fmt.etichettaStato(riga.stato), TONI_STATO[riga.stato] || 'neutral')
                        },
                        {
                            titolo: '',
                            rendi: riga => azioniRiga([
                                bottone({
                                    simbolo: 'edit_calendar', variante: 'ghost', piccolo: true,
                                    titolo: 'Apri appuntamento', onClick: () => apri(riga)
                                })
                            ])
                        }
                    ],
                    righe,
                    vuotoTitolo: 'Nessun appuntamento per questo paziente',
                    vuotoTesto: 'Fissa il primo appuntamento per farlo comparire nel planning delle poltrone.',
                    vuotoSimbolo: 'event_busy'
                }))
            ].filter(Boolean));
        };

        await disegna();
        return contenitore;
    }
};
