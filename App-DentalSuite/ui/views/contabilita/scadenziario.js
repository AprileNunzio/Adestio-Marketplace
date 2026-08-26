import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, distintivo, statistica, griglia, spaziatore, vuoto } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { call } from '../../kernel/transport.js';
import { can } from '../../security/permissions.js';
import * as fmt from '../../kernel/format.js';
import { oggetto } from '../shared/vista.js';
import { apriForm } from '../shared/form_modale.js';

const METODI = [
    { valore: 'contanti', etichetta: 'Contanti' },
    { valore: 'bancomat', etichetta: 'Bancomat / POS' },
    { valore: 'carta_credito', etichetta: 'Carta di credito' },
    { valore: 'bonifico', etichetta: 'Bonifico bancario' },
    { valore: 'assegno', etichetta: 'Assegno bancario' }
];

function meseCorrenteIso() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`;
}

function spostaMese(meseStr, delta) {
    try {
        const [anno, mese] = (meseStr || meseCorrenteIso()).split('-').map(Number);
        const d = new Date(anno, (mese - 1) + delta, 1);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return `${d.getFullYear()}-${mm}`;
    } catch (_) {
        return meseCorrenteIso();
    }
}

export default {
    rendi: async ({ naviga }) => {
        const puoIncassare = await can('rate_edit');
        const contenitore = el('div', { class: 'ds-root' });

        const statoFiltri = {
            mese: meseCorrenteIso(),
            vistaTuttiMesi: false,
            stato: 'tutti',
            termine: ''
        };

        const disegna = async () => {
            const payload = {
                mese: statoFiltri.vistaTuttiMesi ? '' : statoFiltri.mese,
                stato: statoFiltri.stato === 'tutti' ? '' : statoFiltri.stato,
                includi_pagate: true,
                termine: statoFiltri.termine
            };

            const dati = oggetto(await call('rate.scadenziario', payload), {
                righe: [],
                totale_rate: 0,
                totale_importo: 0,
                totale_aperto: 0,
                totale_scaduto: 0,
                totale_pagato: 0,
                conteggio_aperte: 0,
                conteggio_scadute: 0,
                conteggio_pagate: 0
            });

            const salda = async rata => {
                await apriForm({
                    titolo: `Incasso rata ${rata.numero_rata} · ${fmt.euro(rata.importo)} · ${rata.paziente_nome || ''}`,
                    sezioni: [{
                        titolo: null,
                        campi: [
                            { campo: 'metodo_pagamento', etichetta: 'Metodo di pagamento', genere: 'selezione', opzioni: METODI, vuoto: false },
                            { campo: 'numero_ricevuta', etichetta: 'Numero ricevuta / documento' },
                            { campo: 'data_pagamento', etichetta: 'Data incasso', tipo: 'date' }
                        ]
                    }],
                    valori: { metodo_pagamento: 'contanti', data_pagamento: fmt.oggiIso() },
                    etichettaSalva: 'Registra incasso',
                    onSalva: stato => call('rate.pagaRata', { ...stato, id: rata.id })
                });
                await disegna();
            };

            const colonne = [
                {
                    titolo: 'Scadenza',
                    rendi: riga => el('span', { style: 'font-weight: 700;' }, fmt.data(riga.data_scadenza))
                },
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
                        }, riga.paziente_nome || '—'),
                        el('div', { class: 'ds-muted', style: 'font-size: 0.8rem; margin-top: 2px;' },
                            [riga.paziente_telefono, riga.paziente_cf].filter(Boolean).join(' · ') || ''
                        )
                    ])
                },
                {
                    titolo: 'Rata',
                    numerica: true,
                    rendi: riga => el('span', { style: 'font-weight: 600;' }, `Rata ${riga.numero_rata}`)
                },
                {
                    titolo: 'Importo',
                    numerica: true,
                    rendi: riga => el('strong', { class: 'ds-numeric', style: 'font-size: 0.95rem;' }, fmt.euro(riga.importo))
                },
                {
                    titolo: 'Stato',
                    rendi: riga => {
                        if (riga.pagata) {
                            return distintivo(`Pagata (${fmt.data(riga.data_pagamento)})`, 'success');
                        }
                        if (riga.scaduta) {
                            return distintivo('Scaduta', 'danger');
                        }
                        return distintivo('In attesa', 'warning');
                    }
                },
                {
                    titolo: '',
                    rendi: riga => {
                        const bottoni = [];

                        if (puoIncassare && !riga.pagata) {
                            bottoni.push(bottone({
                                etichetta: 'Salda',
                                simbolo: 'payments',
                                variante: 'primary',
                                piccolo: true,
                                onClick: () => salda(riga)
                            }));
                        }

                        bottoni.push(bottone({
                            simbolo: 'account_balance_wallet',
                            variante: 'ghost',
                            piccolo: true,
                            titolo: 'Piano economico paziente',
                            onClick: () => naviga('paziente', { id: riga.paziente_id, scheda: 'economia' })
                        }));

                        bottoni.push(bottone({
                            simbolo: 'folder_open',
                            variante: 'ghost',
                            piccolo: true,
                            titolo: 'Apri cartella paziente',
                            onClick: () => naviga('paziente', { id: riga.paziente_id })
                        }));

                        return azioniRiga(bottoni);
                    }
                }
            ];

            const inputMese = el('input', {
                class: 'ds-input',
                type: 'month',
                value: statoFiltri.mese,
                disabled: statoFiltri.vistaTuttiMesi,
                style: 'max-width: 170px; font-weight: 700;',
                onChange: e => {
                    statoFiltri.mese = e.target.value;
                    disegna();
                }
            });

            const barraNavigazioneMese = el('div', {
                class: 'ds-toolbar',
                style: 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap;'
            }, [
                bottone({
                    simbolo: 'chevron_left',
                    variante: 'ghost',
                    piccolo: true,
                    titolo: 'Mese precedente',
                    disabilitato: statoFiltri.vistaTuttiMesi,
                    onClick: () => {
                        statoFiltri.mese = spostaMese(statoFiltri.mese, -1);
                        disegna();
                    }
                }),
                inputMese,
                bottone({
                    simbolo: 'chevron_right',
                    variante: 'ghost',
                    piccolo: true,
                    titolo: 'Mese successivo',
                    disabilitato: statoFiltri.vistaTuttiMesi,
                    onClick: () => {
                        statoFiltri.mese = spostaMese(statoFiltri.mese, 1);
                        disegna();
                    }
                }),
                bottone({
                    etichetta: 'Oggi',
                    variante: 'secondary',
                    piccolo: true,
                    titolo: 'Torna al mese corrente',
                    disabilitato: statoFiltri.vistaTuttiMesi,
                    onClick: () => {
                        statoFiltri.mese = meseCorrenteIso();
                        disegna();
                    }
                }),
                el('label', { class: 'ds-check', style: 'margin-left: 12px; font-size: 0.85rem;' }, [
                    el('input', {
                        type: 'checkbox',
                        checked: statoFiltri.vistaTuttiMesi,
                        onChange: e => {
                            statoFiltri.vistaTuttiMesi = e.target.checked;
                            disegna();
                        }
                    }),
                    el('span', {}, 'Tutti i mesi')
                ])
            ]);

            const barraFiltriStato = el('div', {
                class: 'ds-toolbar',
                style: 'margin-bottom: 14px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;'
            }, [
                el('input', {
                    class: 'ds-input',
                    type: 'search',
                    placeholder: 'Cerca paziente, telefono o CF...',
                    style: 'max-width: 260px;',
                    value: statoFiltri.termine,
                    onInput: e => {
                        statoFiltri.termine = e.target.value;
                        disegna();
                    }
                }),
                el('select', {
                    class: 'ds-select',
                    style: 'max-width: 220px;',
                    value: statoFiltri.stato,
                    onChange: e => {
                        statoFiltri.stato = e.target.value;
                        disegna();
                    }
                }, [
                    el('option', { value: 'tutti' }, 'Tutte le rate'),
                    el('option', { value: 'aperte' }, 'Solo in attesa (Aperte)'),
                    el('option', { value: 'scadute' }, 'Solo scadute'),
                    el('option', { value: 'pagate' }, 'Solo già saldate')
                ]),
                spaziatore(),
                distintivo(`${dati.righe.length} rate visualizzate`, 'info')
            ]);

            const tabellaRighe = tabella({
                colonne,
                righe: dati.righe,
                vuotoTitolo: 'Nessuna rata trovata',
                vuotoTesto: statoFiltri.vistaTuttiMesi
                    ? 'Non ci sono rate registrate per i filtri selezionati.'
                    : `Nessuna rata in scadenza o saldata nel mese di ${fmt.mese(statoFiltri.mese)}.`,
                vuotoSimbolo: 'event_available'
            });

            const titoloPannello = statoFiltri.vistaTuttiMesi
                ? 'Scadenziario Rate Generale (Tutti i mesi)'
                : `Scadenziario Rate · ${fmt.mese(statoFiltri.mese)}`;

            rimpiazza(contenitore, [
                griglia('stats', [
                    statistica({
                        etichetta: statoFiltri.vistaTuttiMesi ? 'Totale Rate Generale' : 'Totale Rate del Mese',
                        valore: fmt.euro(dati.totale_importo),
                        nota: `${dati.totale_rate} rate complessive`
                    }),
                    statistica({
                        etichetta: 'Da Incassare',
                        valore: fmt.euro(dati.totale_aperto),
                        nota: `${dati.conteggio_aperte} rate aperte`,
                        tono: dati.totale_aperto > 0 ? 'negativo' : 'positivo'
                    }),
                    statistica({
                        etichetta: 'Scadute nel Periodo',
                        valore: fmt.euro(dati.totale_scaduto),
                        nota: `${dati.conteggio_scadute} rate scadute`,
                        tono: dati.totale_scaduto > 0 ? 'negativo' : undefined
                    }),
                    statistica({
                        etichetta: 'Già Incassate',
                        valore: fmt.euro(dati.totale_pagato),
                        nota: `${dati.conteggio_pagate} rate saldate`,
                        tono: 'positivo'
                    })
                ]),
                pannello({
                    titolo: titoloPannello,
                    azioni: [barraNavigazioneMese],
                    flush: true
                }, [
                    el('div', { style: 'padding: 12px 16px 0 16px;' }, barraFiltriStato),
                    tabellaRighe
                ])
            ]);
        };

        await disegna();
        return contenitore;
    }
};
