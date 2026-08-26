import { el, rimpiazza } from '../../components/dom.js';
import { bottone, distintivo, spaziatore } from '../../components/layout.js';
import { apriModale } from '../../components/modale.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import * as fmt from '../../kernel/format.js';
import { elenco, oggetto } from '../shared/vista.js';

const STATI_PREVENTIVO = [
    { valore: 'bozza', etichetta: 'Bozza (In preparazione)', colore: 'neutral' },
    { valore: 'inviato', etichetta: 'Inviato al paziente', colore: 'info' },
    { valore: 'accettato', etichetta: 'Accettato (Confermato)', colore: 'success' },
    { valore: 'rifiutato', etichetta: 'Rifiutato dal paziente', colore: 'danger' },
    { valore: 'scaduto', etichetta: 'Scaduto', colore: 'warning' },
    { valore: 'annullato', etichetta: 'Annullato', colore: 'neutral' }
];

const METODI_PAGAMENTO = [
    { valore: 'saldo_prestazione', etichetta: 'A saldo prestazione (Alla fine di ogni seduta)' },
    { valore: 'rate_studio', etichetta: 'Piano rateale interno dello studio' },
    { valore: 'contanti', etichetta: 'Contanti (Saldo unico)' },
    { valore: 'bancomat', etichetta: 'Bancomat / POS' },
    { valore: 'carta_credito', etichetta: 'Carta di credito' },
    { valore: 'bonifico', etichetta: 'Bonifico bancario' },
    { valore: 'assegno', etichetta: 'Assegno bancario' },
    { valore: 'finanziamento_compass', etichetta: 'Finanziamento Compass' },
    { valore: 'finanziamento_santander', etichetta: 'Finanziamento Santander' },
    { valore: 'finanziamento_pagodil', etichetta: 'PagoDIL (Cofidis)' },
    { valore: 'finanziamento_altro', etichetta: 'Altro finanziamento' }
];

const TIPI_RATE = [
    { valore: 'nessuna', etichetta: 'Nessuna rateizzazione (Saldo unico o acconto)' },
    { valore: 'mensile_studio', etichetta: 'Rate mensili senza interessi (Studio)' },
    { valore: 'bimestrale_studio', etichetta: 'Rate bimestrali (Studio)' },
    { valore: 'finanziamento', etichetta: 'Finanziamento con rate bancarie' },
    { valore: 'personalizzata', etichetta: 'Piano rateale personalizzato' }
];

function totaleRiga(riga) {
    try {
        const lordo = Number(riga.prezzo_unitario || 0) * Number(riga.quantita || 1);
        return Math.round((lordo - (lordo * Number(riga.sconto_percentuale || 0)) / 100) * 100) / 100;
    } catch (_) {
        return 0;
    }
}

function totali(righe, scontoTestata) {
    try {
        const lordo = righe.reduce((somma, riga) => somma + totaleRiga(riga), 0);
        const netto = lordo - (lordo * Number(scontoTestata || 0)) / 100;
        return { lordo: Math.round(lordo * 100) / 100, netto: Math.round(netto * 100) / 100 };
    } catch (_) {
        return { lordo: 0, netto: 0 };
    }
}

function rigaEditor(riga, prestazioni, onValoriCambiati, onRimuovi) {
    try {
        const nodoTotale = el('strong', { class: 'ds-numeric', style: 'color: #0f172a; font-size: 1rem;' }, fmt.euro(totaleRiga(riga)));

        const inputDescrizione = el('input', {
            class: 'ds-input',
            type: 'text',
            value: riga.descrizione || '',
            placeholder: 'Descrizione trattamento...',
            onInput: e => {
                riga.descrizione = e.target.value;
                onValoriCambiati();
            }
        });

        const inputDente = el('input', {
            class: 'ds-input',
            type: 'text',
            maxlength: 4,
            style: 'text-align: center; font-weight: 700;',
            placeholder: 'Es. 16, 21',
            value: riga.dente || '',
            onInput: e => {
                riga.dente = e.target.value;
                onValoriCambiati();
            }
        });

        const inputQuantita = el('input', {
            class: 'ds-input',
            type: 'number',
            step: '1',
            min: 1,
            style: 'text-align: center;',
            value: riga.quantita !== undefined ? riga.quantita : 1,
            onInput: e => {
                riga.quantita = e.target.value === '' ? '' : Number(e.target.value);
                nodoTotale.textContent = fmt.euro(totaleRiga(riga));
                onValoriCambiati();
            }
        });

        const inputPrezzo = el('input', {
            class: 'ds-input',
            type: 'number',
            step: '0.01',
            min: 0,
            value: riga.prezzo_unitario !== undefined ? riga.prezzo_unitario : 0,
            onInput: e => {
                riga.prezzo_unitario = e.target.value === '' ? '' : Number(e.target.value);
                nodoTotale.textContent = fmt.euro(totaleRiga(riga));
                onValoriCambiati();
            }
        });

        const inputSconto = el('input', {
            class: 'ds-input',
            type: 'number',
            step: '0.01',
            min: 0,
            max: 100,
            value: riga.sconto_percentuale !== undefined ? riga.sconto_percentuale : 0,
            onInput: e => {
                riga.sconto_percentuale = e.target.value === '' ? '' : Number(e.target.value);
                nodoTotale.textContent = fmt.euro(totaleRiga(riga));
                onValoriCambiati();
            }
        });

        const selectPrestazione = el('select', {
            class: 'ds-select',
            onChange: e => {
                const val = e.target.value;
                riga.prestazione_id = val;
                const scelta = prestazioni.find(voce => voce.id === val);
                if (scelta) {
                    riga.descrizione = scelta.nome || '';
                    riga.prezzo_unitario = scelta.prezzo_paziente || 0;
                    inputDescrizione.value = riga.descrizione;
                    inputPrezzo.value = riga.prezzo_unitario;
                }
                nodoTotale.textContent = fmt.euro(totaleRiga(riga));
                onValoriCambiati();
            }
        }, [
            el('option', { value: '', selected: !riga.prestazione_id }, '— Voce libera —'),
            ...prestazioni.map(p => el('option', {
                value: p.id,
                selected: String(p.id) === String(riga.prestazione_id || '')
            }, p.nome))
        ]);

        const grigliaCampi = el('div', { class: 'ds-grid ds-grid--form', style: 'grid-template-columns: 2fr 3fr 1fr 1fr 1.5fr 1.2fr;' }, [
            el('label', { class: 'ds-field' }, [el('span', { class: 'ds-field__label' }, 'Prestazione listino'), selectPrestazione]),
            el('label', { class: 'ds-field' }, [el('span', { class: 'ds-field__label' }, 'Descrizione riga'), inputDescrizione]),
            el('label', { class: 'ds-field' }, [el('span', { class: 'ds-field__label' }, 'Dente/El.'), inputDente]),
            el('label', { class: 'ds-field' }, [el('span', { class: 'ds-field__label' }, 'Q.tà'), inputQuantita]),
            el('label', { class: 'ds-field' }, [el('span', { class: 'ds-field__label' }, 'Prezzo cad. (€)'), inputPrezzo]),
            el('label', { class: 'ds-field' }, [el('span', { class: 'ds-field__label' }, 'Sconto (%)'), inputSconto])
        ]);

        return el('div', { class: 'ds-panel', style: 'margin-bottom: 8px; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff;' }, el('div', { class: 'ds-panel__body', style: 'padding: 12px 16px;' }, [
            grigliaCampi,
            el('div', { class: 'ds-toolbar', style: 'margin-top: 8px; padding-top: 6px; border-top: 1px solid #f1f5f9;' }, [
                el('span', { style: 'font-size: 0.85rem; color: #64748b;' }, 'Totale riga:'),
                nodoTotale,
                spaziatore(),
                bottone({ simbolo: 'delete', variante: 'ghost', piccolo: true, titolo: 'Elimina voce', onClick: onRimuovi })
            ])
        ]));
    } catch (_) {
        return el('div', {});
    }
}

export async function apriPreventivo({ pazienteId, preventivoId }) {
    try {
        const [prestazioni, medici, esistente] = await Promise.all([
            call('prestazioni.list', {}).then(elenco),
            call('staff.list', {}).then(elenco),
            preventivoId ? call('preventivi.get', { id: preventivoId }).then(r => oggetto(r, null)) : Promise.resolve(null)
        ]);

        const testata = {
            medico_id: esistente ? esistente.medico_id : '',
            data_emissione: esistente ? esistente.data_emissione : fmt.oggiIso(),
            data_scadenza: esistente ? esistente.data_scadenza : '',
            stato: esistente ? esistente.stato : 'bozza',
            sconto_percentuale: esistente ? esistente.sconto_percentuale : 0,
            acconto_richiesto: esistente ? esistente.acconto_richiesto : 0,
            metodo_pagamento: esistente ? esistente.metodo_pagamento : 'saldo_prestazione',
            tipo_rateizzazione: esistente ? esistente.tipo_rateizzazione : 'nessuna',
            numero_rate: esistente ? (esistente.numero_rate || 0) : 0,
            cadenza_mesi: esistente ? (esistente.cadenza_mesi || 1) : 1,
            prima_scadenza: esistente ? esistente.prima_scadenza : fmt.oggiIso(),
            note: esistente ? esistente.note : ''
        };

        const righe = esistente && esistente.righe && esistente.righe.length > 0
            ? esistente.righe.map(riga => ({ ...riga }))
            : [{ prestazione_id: '', descrizione: '', dente: '', quantita: 1, prezzo_unitario: 0, sconto_percentuale: 0 }];

        const contenitoreRighe = el('div', { class: 'ds-root' });
        const nodoLordo = el('span', { style: 'font-weight: 600; color: #475569;' });
        const nodoSconto = el('span', { style: 'font-weight: 600; color: #dc2626;' });
        const nodoNetto = el('strong', { style: 'font-size: 1.15rem; color: #0f172a;' });
        const nodoSimulatore = el('div', { style: 'font-size: 0.88rem; color: #0369a1; font-weight: 600;' });

        const aggiornaTotaliGlobali = () => {
            try {
                const somme = totali(righe, testata.sconto_percentuale);
                const acconto = Number(testata.acconto_richiesto || 0);
                const residuo = Math.max(0, Math.round((somme.netto - acconto) * 100) / 100);
                const numRate = Number(testata.numero_rate || 0);

                nodoLordo.textContent = `Totale Lordo: ${fmt.euro(somme.lordo)}`;
                nodoSconto.textContent = testata.sconto_percentuale > 0 ? `Sconto (${testata.sconto_percentuale}%): -${fmt.euro(somme.lordo - somme.netto)}` : '';
                nodoNetto.textContent = `Totale Netto: ${fmt.euro(somme.netto)}`;

                if (numRate > 1 && residuo > 0) {
                    const singolaRata = Math.round((residuo / numRate) * 100) / 100;
                    nodoSimulatore.textContent = `Acconto: ${fmt.euro(acconto)} + ${numRate} rate da ${fmt.euro(singolaRata)} (Cadenza: ogni ${testata.cadenza_mesi} mesi)`;
                } else if (acconto > 0) {
                    nodoSimulatore.textContent = `Acconto concordato: ${fmt.euro(acconto)} · Saldo residuo: ${fmt.euro(residuo)}`;
                } else {
                    nodoSimulatore.textContent = '';
                }
            } catch (_) {}
        };

        const renderRigheDom = () => {
            try {
                aggiornaTotaliGlobali();
                const nodi = righe.map((riga, indice) => rigaEditor(
                    riga,
                    prestazioni,
                    aggiornaTotaliGlobali,
                    () => {
                        righe.splice(indice, 1);
                        if (righe.length === 0) {
                            righe.push({ prestazione_id: '', descrizione: '', dente: '', quantita: 1, prezzo_unitario: 0, sconto_percentuale: 0 });
                        }
                        renderRigheDom();
                    }
                ));
                rimpiazza(contenitoreRighe, nodi);
            } catch (_) {}
        };

        renderRigheDom();

        const inputStato = el('select', {
            class: 'ds-select',
            style: 'font-weight: 700;',
            onChange: e => {
                testata.stato = e.target.value;
                aggiornaTotaliGlobali();
            }
        }, STATI_PREVENTIVO.map(s => el('option', {
            value: s.valore,
            selected: s.valore === testata.stato
        }, s.etichetta)));

        const inputMedico = el('select', {
            class: 'ds-select',
            onChange: e => { testata.medico_id = e.target.value; }
        }, [
            el('option', { value: '', selected: !testata.medico_id }, 'Seleziona medico responsabile…'),
            ...medici.map(m => el('option', {
                value: m.id,
                selected: String(m.id) === String(testata.medico_id || '')
            }, m.nominativo))
        ]);

        const inputMetodo = el('select', {
            class: 'ds-select',
            onChange: e => {
                testata.metodo_pagamento = e.target.value;
                if (testata.metodo_pagamento.includes('rate') || testata.metodo_pagamento.includes('finanziamento')) {
                    if (!testata.numero_rate || testata.numero_rate < 2) {
                        testata.numero_rate = 6;
                        testata.tipo_rateizzazione = 'mensile_studio';
                        inputNumRate.value = 6;
                        inputTipoRate.value = 'mensile_studio';
                    }
                }
                aggiornaTotaliGlobali();
            }
        }, METODI_PAGAMENTO.map(m => el('option', {
            value: m.valore,
            selected: m.valore === testata.metodo_pagamento
        }, m.etichetta)));

        const inputTipoRate = el('select', {
            class: 'ds-select',
            onChange: e => {
                testata.tipo_rateizzazione = e.target.value;
                if (testata.tipo_rateizzazione === 'nessuna') {
                    testata.numero_rate = 0;
                    inputNumRate.value = 0;
                } else if (!testata.numero_rate || testata.numero_rate === 0) {
                    testata.numero_rate = 6;
                    inputNumRate.value = 6;
                }
                aggiornaTotaliGlobali();
            }
        }, TIPI_RATE.map(tr => el('option', {
            value: tr.valore,
            selected: tr.valore === testata.tipo_rateizzazione
        }, tr.etichetta)));

        const inputNumRate = el('input', {
            class: 'ds-input',
            type: 'number',
            step: '1',
            min: 0,
            max: 60,
            value: testata.numero_rate || 0,
            onInput: e => {
                testata.numero_rate = Number(e.target.value || 0);
                if (testata.numero_rate > 1 && testata.tipo_rateizzazione === 'nessuna') {
                    testata.tipo_rateizzazione = 'mensile_studio';
                    inputTipoRate.value = 'mensile_studio';
                }
                aggiornaTotaliGlobali();
            }
        });

        const inputCadenza = el('select', {
            class: 'ds-select',
            onChange: e => {
                testata.cadenza_mesi = Number(e.target.value || 1);
                aggiornaTotaliGlobali();
            }
        }, [
            el('option', { value: '1', selected: testata.cadenza_mesi === 1 }, 'Mensile (Ogni mese)'),
            el('option', { value: '2', selected: testata.cadenza_mesi === 2 }, 'Bimestrale (Ogni 2 mesi)'),
            el('option', { value: '3', selected: testata.cadenza_mesi === 3 }, 'Trimestrale (Ogni 3 mesi)'),
            el('option', { value: '6', selected: testata.cadenza_mesi === 6 }, 'Semestrale (Ogni 6 mesi)')
        ]);

        const inputPrimaScadenza = el('input', {
            class: 'ds-input',
            type: 'date',
            value: testata.prima_scadenza || fmt.oggiIso(),
            onInput: e => {
                testata.prima_scadenza = e.target.value;
                aggiornaTotaliGlobali();
            }
        });

        const inputEmissione = el('input', {
            class: 'ds-input',
            type: 'date',
            value: testata.data_emissione || fmt.oggiIso(),
            onInput: e => { testata.data_emissione = e.target.value; }
        });

        const inputScadenza = el('input', {
            class: 'ds-input',
            type: 'date',
            value: testata.data_scadenza || '',
            onInput: e => { testata.data_scadenza = e.target.value; }
        });

        const inputScontoTestata = el('input', {
            class: 'ds-input',
            type: 'number',
            step: '0.01',
            min: 0,
            max: 100,
            value: testata.sconto_percentuale || 0,
            onInput: e => {
                testata.sconto_percentuale = e.target.value === '' ? 0 : Number(e.target.value);
                aggiornaTotaliGlobali();
            }
        });

        const inputAcconto = el('input', {
            class: 'ds-input',
            type: 'number',
            step: '0.01',
            min: 0,
            value: testata.acconto_richiesto || 0,
            onInput: e => {
                testata.acconto_richiesto = e.target.value === '' ? 0 : Number(e.target.value);
                aggiornaTotaliGlobali();
            }
        });

        const inputNote = el('textarea', {
            class: 'ds-textarea',
            style: 'min-height: 55px;',
            placeholder: 'Condizioni particolari, garanzie o accordi col paziente...',
            onInput: e => { testata.note = e.target.value; }
        }, testata.note || '');

        const grigliaTestata = el('div', { class: 'ds-grid ds-grid--form', style: 'grid-template-columns: repeat(3, 1fr); margin-bottom: 12px;' }, [
            el('label', { class: 'ds-field' }, [el('span', { class: 'ds-field__label' }, 'Stato del preventivo *'), inputStato]),
            el('label', { class: 'ds-field' }, [el('span', { class: 'ds-field__label' }, 'Medico responsabile'), inputMedico]),
            el('label', { class: 'ds-field' }, [el('span', { class: 'ds-field__label' }, 'Data emissione'), inputEmissione]),
            el('label', { class: 'ds-field' }, [el('span', { class: 'ds-field__label' }, 'Validità preventivo fino al'), inputScadenza]),
            el('label', { class: 'ds-field' }, [el('span', { class: 'ds-field__label' }, 'Sconto globale (%)'), inputScontoTestata]),
            el('label', { class: 'ds-field' }, [el('span', { class: 'ds-field__label' }, 'Acconto iniziale concordato (€)'), inputAcconto])
        ]);

        const sezionePagamento = el('div', {
            style: 'background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px;'
        }, [
            el('div', { style: 'font-weight: 700; font-size: 0.95rem; color: #0f172a; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;' }, [
                el('span', {}, 'Modalità di Pagamento & Piano Rateale'),
                nodoSimulatore
            ]),
            el('div', { class: 'ds-grid ds-grid--form', style: 'grid-template-columns: repeat(4, 1fr);' }, [
                el('label', { class: 'ds-field' }, [el('span', { class: 'ds-field__label' }, 'Metodo di pagamento'), inputMetodo]),
                el('label', { class: 'ds-field' }, [el('span', { class: 'ds-field__label' }, 'Tipo rateizzazione'), inputTipoRate]),
                el('label', { class: 'ds-field' }, [el('span', { class: 'ds-field__label' }, 'Numero di rate'), inputNumRate]),
                el('label', { class: 'ds-field' }, [el('span', { class: 'ds-field__label' }, 'Cadenza rate'), inputCadenza]),
                el('label', { class: 'ds-field', style: 'grid-column: span 2;' }, [el('span', { class: 'ds-field__label' }, 'Data scadenza prima rata'), inputPrimaScadenza]),
                el('label', { class: 'ds-field ds-field--wide', style: 'grid-column: span 2;' }, [el('span', { class: 'ds-field__label' }, 'Note e condizioni'), inputNote])
            ])
        ]);

        const riepilogoFooter = el('div', {
            style: 'background: #f1f5f9; border-radius: 12px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; margin-top: 14px; gap: 16px;'
        }, [
            el('div', { style: 'display: flex; align-items: center; gap: 16px; flex-wrap: wrap;' }, [
                nodoLordo,
                nodoSconto
            ]),
            el('div', { style: 'display: flex; align-items: center; gap: 12px;' }, [
                nodoNetto
            ])
        ]);

        const corpo = [
            grigliaTestata,
            sezionePagamento,
            el('div', { class: 'ds-panel__head', style: 'margin-bottom: 8px;' }, [
                el('span', { style: 'font-weight: 700; font-size: 1rem; color: #0f172a;' }, 'Voci e Prestazioni del Piano di Cura'),
                spaziatore(),
                bottone({
                    etichetta: 'Aggiungi prestazione',
                    simbolo: 'add',
                    variante: 'primary',
                    piccolo: true,
                    onClick: () => {
                        righe.push({ prestazione_id: '', descrizione: '', dente: '', quantita: 1, prezzo_unitario: 0, sconto_percentuale: 0 });
                        renderRigheDom();
                    }
                })
            ]),
            contenitoreRighe,
            riepilogoFooter
        ];

        return apriModale({
            titolo: esistente ? `Preventivo ${esistente.numero_preventivo}` : 'Nuovo preventivo di cura',
            corpo,
            ampia: true,
            azioni: [
                { etichetta: 'Annulla', variante: 'ghost', esito: null },
                {
                    etichetta: esistente ? 'Salva modifiche' : 'Salva preventivo',
                    simbolo: 'save',
                    variante: 'primary',
                    onAzione: async () => {
                        const payload = {
                            ...testata,
                            paziente_id: pazienteId,
                            righe: righe.filter(riga => riga.descrizione || riga.prestazione_id)
                        };
                        const risultato = esistente
                            ? await call('preventivi.update', { ...payload, id: esistente.id })
                            : await call('preventivi.create', payload);
                        if (!esito(risultato, esistente ? 'Preventivo aggiornato con successo' : 'Preventivo salvato con successo')) return false;
                        return true;
                    }
                }
            ]
        });
    } catch (_) {
        return false;
    }
}
