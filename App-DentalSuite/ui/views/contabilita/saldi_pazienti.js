import { el } from '../../components/dom.js';
import { pannello, statistica, griglia, bottone, distintivo, spaziatore, vuoto } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { call } from '../../kernel/transport.js';
import { can } from '../../security/permissions.js';
import * as fmt from '../../kernel/format.js';
import { montaVista, oggetto } from '../shared/vista.js';
import { apriIncasso } from './pagamento_form.js';

const FILTRI_STATO = [
    { valore: 'debito', etichetta: 'Solo a Debito (Da incassare)' },
    { valore: 'credito', etichetta: 'Solo a Credito (Anticipi)' },
    { valore: 'movimenti', etichetta: 'Tutti con movimenti' },
    { valore: 'in_pari', etichetta: 'In pari' }
];

const OPZIONI_ORDINE = [
    { valore: 'debito_desc', etichetta: 'Importo debito decrescente' },
    { valore: 'credito_desc', etichetta: 'Importo credito decrescente' },
    { valore: 'nominativo_asc', etichetta: 'Nominativo A-Z' },
    { valore: 'data_desc', etichetta: 'Ultimo movimento recente' }
];

export default {
    rendi: async ({ naviga }) => {
        const permessi = {
            incassi: await can('incassi_create')
        };

        const filtri = {
            stato: 'debito',
            termine: '',
            ordina: 'debito_desc'
        };

        return montaVista({
            accento: 'contabilita',
            carica: async () => {
                const res = await call('economia.saldiPazienti', filtri);
                return oggetto(res, {
                    righe: [],
                    totale_da_riscuotere: 0,
                    pazienti_a_debito: 0,
                    totale_crediti: 0,
                    pazienti_a_credito: 0,
                    totale_eseguito_globale: 0,
                    totale_incassato_globale: 0
                });
            },
            disegna: (dati, aggiorna) => {
                const colonne = [
                    {
                        titolo: 'Paziente',
                        rendi: riga => el('div', {}, [
                            el('a', {
                                href: '#',
                                style: 'font-weight: 700; color: #0f172a; text-decoration: none;',
                                onClick: e => {
                                    e.preventDefault();
                                    naviga('paziente', { id: riga.paziente_id });
                                }
                            }, riga.nominativo || '—'),
                            el('div', { class: 'ds-muted', style: 'font-size: 0.8rem; margin-top: 2px;' },
                                [riga.telefono, riga.codice_fiscale].filter(Boolean).join(' · ') || 'Nessun recapito'
                            )
                        ])
                    },
                    {
                        titolo: 'Eseguito',
                        rendi: riga => el('div', {}, [
                            el('div', { style: 'font-weight: 600;' }, fmt.euro(riga.eseguito)),
                            el('div', { class: 'ds-muted', style: 'font-size: 0.78rem;' }, `${riga.trattamenti_conteggio || 0} trattamenti`)
                        ])
                    },
                    {
                        titolo: 'Incassato',
                        rendi: riga => el('div', {}, [
                            el('div', { style: 'font-weight: 600; color: #16a34a;' }, fmt.euro(riga.incassato)),
                            el('div', { class: 'ds-muted', style: 'font-size: 0.78rem;' }, `${riga.incassi_conteggio || 0} incassi`)
                        ])
                    },
                    {
                        titolo: 'Saldo Attuale',
                        rendi: riga => {
                            if (riga.a_debito > 0) {
                                return distintivo(`Da incassare: ${fmt.euro(riga.a_debito)}`, 'danger');
                            }
                            if (riga.a_credito > 0) {
                                return distintivo(`Credito: ${fmt.euro(riga.a_credito)}`, 'success');
                            }
                            return distintivo('In pari', 'neutral');
                        }
                    },
                    {
                        titolo: 'Ultimo Movimento',
                        rendi: riga => el('span', { class: 'ds-muted' }, riga.ultimo_movimento ? fmt.data(riga.ultimo_movimento) : '—')
                    },
                    {
                        titolo: '',
                        rendi: riga => {
                            const bottoni = [];

                            if (permessi.incassi && riga.a_debito > 0) {
                                bottoni.push(bottone({
                                    etichetta: 'Incassa',
                                    simbolo: 'payments',
                                    variante: 'primary',
                                    piccolo: true,
                                    titolo: `Registra incasso di ${fmt.euro(riga.a_debito)} per ${riga.nominativo}`,
                                    onClick: async () => {
                                        const registrato = await apriIncasso({
                                            pazienteId: riga.paziente_id,
                                            importoPredefinito: riga.a_debito,
                                            titolo: `Incasso per ${riga.nominativo}`
                                        });
                                        if (registrato) aggiorna();
                                    }
                                }));
                            }

                            bottoni.push(bottone({
                                simbolo: 'account_balance_wallet',
                                variante: 'ghost',
                                piccolo: true,
                                titolo: 'Apri Piano Economico del Paziente',
                                onClick: () => naviga('paziente', { id: riga.paziente_id, scheda: 'economia' })
                            }));

                            bottoni.push(bottone({
                                simbolo: 'folder_open',
                                variante: 'ghost',
                                piccolo: true,
                                titolo: 'Apri Cartella Clinica',
                                onClick: () => naviga('paziente', { id: riga.paziente_id })
                            }));

                            return azioniRiga(bottoni);
                        }
                    }
                ];

                const barraFiltri = el('div', { class: 'ds-toolbar', style: 'margin-bottom: 16px; flex-wrap: wrap; gap: 10px;' }, [
                    el('input', {
                        class: 'ds-input',
                        type: 'search',
                        style: 'max-width: 280px;',
                        placeholder: 'Cerca paziente, telefono o CF...',
                        value: filtri.termine,
                        onInput: e => {
                            filtri.termine = e.target.value;
                            aggiorna();
                        }
                    }),
                    el('select', {
                        class: 'ds-input',
                        style: 'max-width: 260px;',
                        value: filtri.stato,
                        onChange: e => {
                            filtri.stato = e.target.value;
                            aggiorna();
                        }
                    }, FILTRI_STATO.map(opt => el('option', { value: opt.valore }, opt.etichetta))),
                    el('select', {
                        class: 'ds-input',
                        style: 'max-width: 260px;',
                        value: filtri.ordina,
                        onChange: e => {
                            filtri.ordina = e.target.value;
                            aggiorna();
                        }
                    }, OPZIONI_ORDINE.map(opt => el('option', { value: opt.valore }, opt.etichetta))),
                    spaziatore(),
                    distintivo(`${dati.righe.length} visualizzati`, 'info')
                ]);

                const tabellaContenuto = tabella({
                    colonne,
                    righe: dati.righe,
                    vuotoTitolo: filtri.stato === 'debito' ? 'Nessun paziente a debito' : 'Nessun risultato trovato',
                    vuotoTesto: filtri.stato === 'debito'
                        ? 'Ottimo! Tutti i trattamenti eseguiti risultano interamente incassati.'
                        : 'Nessun paziente corrisponde ai filtri di ricerca selezionati.',
                    vuotoSimbolo: 'savings'
                });

                return [
                    griglia('stats', [
                        statistica({
                            etichetta: 'Totale da Incassare (Crediti)',
                            valore: fmt.euro(dati.totale_da_riscuotere),
                            nota: `${dati.pazienti_a_debito} pazienti con saldo a debito`,
                            tono: dati.totale_da_riscuotere > 0 ? 'negativo' : 'positivo'
                        }),
                        statistica({
                            etichetta: 'Anticipi (Credito Pazienti)',
                            valore: fmt.euro(dati.totale_crediti),
                            nota: `${dati.pazienti_a_credito} pazienti a credito`,
                            tono: 'positivo'
                        }),
                        statistica({
                            etichetta: 'Produzione Eseguita Totale',
                            valore: fmt.euro(dati.totale_eseguito_globale),
                            tono: 'positivo'
                        }),
                        statistica({
                            etichetta: 'Incassato Effettivo Totale',
                            valore: fmt.euro(dati.totale_incassato_globale),
                            nota: `Saldo studio: ${fmt.euro(dati.saldo_globale)}`,
                            tono: 'positivo'
                        })
                    ]),
                    pannello({
                        titolo: 'Gestione Saldi & Crediti verso Pazienti',
                        azioni: [spaziatore()]
                    }, [
                        barraFiltri,
                        tabellaContenuto
                    ])
                ];
            }
        });
    }
};
