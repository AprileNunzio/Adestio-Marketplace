import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, distintivo, statistica, griglia, spaziatore } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { apriModale, conferma } from '../../components/modale.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import { can } from '../../security/permissions.js';
import * as fmt from '../../kernel/format.js';
import { elenco } from '../shared/vista.js';
import { apriPreventivo } from './preventivo_editor.js';
import { selettorePaziente } from '../shared/selettore_paziente.js';

const TONI = {
    bozza: 'neutral', inviato: 'info', accettato: 'success',
    rifiutato: 'danger', scaduto: 'warning', annullato: 'neutral'
};

const TRANSIZIONI = {
    bozza: ['inviato', 'annullato'],
    inviato: ['accettato', 'rifiutato', 'scaduto', 'annullato'],
    accettato: ['annullato'],
    rifiutato: ['bozza', 'annullato'],
    scaduto: ['bozza', 'annullato'],
    annullato: []
};

export default {
    rendi: async ({ naviga }) => {
        const permessi = {
            modifica: await can('preventivi_edit'),
            elimina: await can('preventivi_delete')
        };
        const contenitore = el('div', { class: 'ds-root' });
        let filtroStato = '';

        const disegna = async () => {
            const righe = elenco(await call('preventivi.list', {}));
            const visibili = righe.filter(riga => !filtroStato || riga.stato === filtroStato);

            const cambiaStato = async riga => {
                const possibili = TRANSIZIONI[riga.stato] || [];
                if (possibili.length === 0) return;
                const scelta = el('select', { class: 'ds-select' },
                    possibili.map(stato => el('option', { value: stato }, fmt.etichettaStato(stato))));
                const risposta = await apriModale({
                    titolo: `Preventivo ${riga.numero_preventivo}`,
                    corpo: el('div', { class: 'ds-field' }, [
                        el('span', { class: 'ds-field__label' }, `Stato attuale: ${fmt.etichettaStato(riga.stato)}`),
                        scelta
                    ]),
                    azioni: [
                        { etichetta: 'Annulla', variante: 'ghost', esito: null },
                        { etichetta: 'Aggiorna stato', simbolo: 'sync', esito: true }
                    ]
                });
                if (risposta !== true) return;
                if (esito(await call('preventivi.setStato', { id: riga.id, stato: scelta.value }), 'Stato aggiornato')) {
                    await disegna();
                }
            };

            const elimina = async riga => {
                const procedi = await conferma({
                    titolo: 'Annullare il preventivo?',
                    messaggio: `Il preventivo ${riga.numero_preventivo} verrà archiviato.`,
                    etichettaConferma: 'Archivia',
                    distruttiva: true
                });
                if (!procedi) return;
                if (esito(await call('preventivi.remove', { id: riga.id }), 'Preventivo archiviato')) await disegna();
            };

            const nuovo = async () => {
                const pazienteId = await selettorePaziente();
                if (!pazienteId) return;
                await apriPreventivo({ pazienteId });
                await disegna();
            };

            const accettati = righe.filter(riga => riga.stato === 'accettato');
            const inAttesa = righe.filter(riga => riga.stato === 'inviato');

            const filtro = el('select', {
                class: 'ds-select',
                onChange: evento => {
                    filtroStato = evento.target.value;
                    disegna();
                }
            }, [
                el('option', { value: '', selected: filtroStato === '' }, 'Tutti gli stati'),
                ...Object.keys(TONI).map(stato =>
                    el('option', { value: stato, selected: filtroStato === stato }, fmt.etichettaStato(stato)))
            ]);

            rimpiazza(contenitore, [
                griglia('stats', [
                    statistica({ etichetta: 'Preventivi emessi', valore: String(righe.length) }),
                    statistica({
                        etichetta: 'Accettati',
                        valore: fmt.euro(accettati.reduce((s, r) => s + Number(r.totale_netto || 0), 0)),
                        nota: `${accettati.length} piani di cura`,
                        tono: 'positivo'
                    }),
                    statistica({
                        etichetta: 'In attesa di risposta',
                        valore: fmt.euro(inAttesa.reduce((s, r) => s + Number(r.totale_netto || 0), 0)),
                        nota: `${inAttesa.length} preventivi`
                    }),
                    statistica({
                        etichetta: 'Tasso di accettazione',
                        valore: righe.length > 0 ? fmt.percentuale((accettati.length / righe.length) * 100) : '—'
                    })
                ]),
                pannello({
                    titolo: 'Preventivi dello studio',
                    azioni: [
                        filtro,
                        spaziatore(),
                        permessi.modifica ? bottone({ etichetta: 'Nuovo preventivo', simbolo: 'add', onClick: nuovo }) : null
                    ].filter(Boolean),
                    flush: true
                }, tabella({
                    colonne: [
                        { titolo: 'Numero', campo: 'numero_preventivo' },
                        { titolo: 'Paziente', campo: 'paziente_nome' },
                        { titolo: 'Emissione', rendi: riga => fmt.data(riga.data_emissione) },
                        { titolo: 'Stato', rendi: riga => distintivo(fmt.etichettaStato(riga.stato), TONI[riga.stato] || 'neutral') },
                        { titolo: 'Lordo', numerica: true, rendi: riga => fmt.euro(riga.totale_lordo) },
                        { titolo: 'Netto', numerica: true, rendi: riga => fmt.euro(riga.totale_netto) },
                        {
                            titolo: '',
                            rendi: riga => azioniRiga([
                                bottone({
                                    simbolo: 'person', variante: 'ghost', piccolo: true, titolo: 'Apri cartella paziente',
                                    onClick: () => naviga('paziente', { id: riga.paziente_id })
                                }),
                                permessi.modifica ? bottone({
                                    simbolo: 'edit', variante: 'ghost', piccolo: true, titolo: 'Apri preventivo',
                                    onClick: async () => {
                                        await apriPreventivo({ pazienteId: riga.paziente_id, preventivoId: riga.id });
                                        await disegna();
                                    }
                                }) : null,
                                permessi.modifica && (TRANSIZIONI[riga.stato] || []).length > 0 ? bottone({
                                    simbolo: 'sync', variante: 'ghost', piccolo: true, titolo: 'Cambia stato',
                                    onClick: () => cambiaStato(riga)
                                }) : null,
                                permessi.elimina ? bottone({
                                    simbolo: 'delete', variante: 'ghost', piccolo: true, titolo: 'Archivia',
                                    onClick: () => elimina(riga)
                                }) : null
                            ])
                        }
                    ],
                    righe: visibili,
                    vuotoTitolo: 'Nessun preventivo emesso',
                    vuotoTesto: 'I piani di cura economici proposti ai pazienti compariranno qui.',
                    vuotoSimbolo: 'receipt_long'
                }))
            ]);
        };

        await disegna();
        return contenitore;
    }
};
