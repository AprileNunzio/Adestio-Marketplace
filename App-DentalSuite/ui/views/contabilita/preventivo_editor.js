import { el, rimpiazza } from '../../components/dom.js';
import { bottone, spaziatore } from '../../components/layout.js';
import { apriModale } from '../../components/modale.js';
import { opzioniDa } from '../../components/campi.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import * as fmt from '../../kernel/format.js';
import { elenco, oggetto } from '../shared/vista.js';

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
        const nodoTotale = el('strong', { class: 'ds-numeric' }, fmt.euro(totaleRiga(riga)));

        const inputDescrizione = el('input', {
            class: 'ds-input',
            type: 'text',
            value: riga.descrizione || '',
            onInput: e => {
                riga.descrizione = e.target.value;
                onValoriCambiati();
            }
        });

        const inputDente = el('input', {
            class: 'ds-input',
            type: 'text',
            maxlength: 2,
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
            el('option', { value: '', selected: !riga.prestazione_id }, 'Voce libera'),
            ...prestazioni.map(p => el('option', {
                value: p.id,
                selected: String(p.id) === String(riga.prestazione_id || '')
            }, p.nome))
        ]);

        const grigliaCampi = el('div', { class: 'ds-grid ds-grid--form' }, [
            el('label', { class: 'ds-field' }, [
                el('span', { class: 'ds-field__label' }, 'Prestazione'),
                selectPrestazione
            ]),
            el('label', { class: 'ds-field' }, [
                el('span', { class: 'ds-field__label' }, 'Descrizione'),
                inputDescrizione
            ]),
            el('label', { class: 'ds-field' }, [
                el('span', { class: 'ds-field__label' }, 'Elemento'),
                inputDente
            ]),
            el('label', { class: 'ds-field' }, [
                el('span', { class: 'ds-field__label' }, 'Quantità'),
                inputQuantita
            ]),
            el('label', { class: 'ds-field' }, [
                el('span', { class: 'ds-field__label' }, 'Prezzo unitario (€)'),
                inputPrezzo
            ]),
            el('label', { class: 'ds-field' }, [
                el('span', { class: 'ds-field__label' }, 'Sconto riga (%)'),
                inputSconto
            ])
        ]);

        return el('div', { class: 'ds-panel' }, el('div', { class: 'ds-panel__body' }, [
            grigliaCampi,
            el('div', { class: 'ds-toolbar' }, [
                nodoTotale,
                spaziatore(),
                bottone({ simbolo: 'delete', variante: 'ghost', piccolo: true, titolo: 'Rimuovi riga', onClick: onRimuovi })
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
            sconto_percentuale: esistente ? esistente.sconto_percentuale : 0,
            acconto_richiesto: esistente ? esistente.acconto_richiesto : 0,
            note: esistente ? esistente.note : ''
        };

        const righe = esistente && esistente.righe && esistente.righe.length > 0
            ? esistente.righe.map(riga => ({ ...riga }))
            : [{ prestazione_id: '', descrizione: '', dente: '', quantita: 1, prezzo_unitario: 0, sconto_percentuale: 0 }];

        const contenitoreRighe = el('div', { class: 'ds-root' });
        const nodoLordo = el('span', { class: 'ds-muted' });
        const nodoNetto = el('strong', { class: 'ds-numeric' });
        const riepilogo = el('div', { class: 'ds-toolbar' }, [nodoLordo, spaziatore(), nodoNetto]);

        const aggiornaTotaliGlobali = () => {
            try {
                const somme = totali(righe, testata.sconto_percentuale);
                nodoLordo.textContent = `Totale lordo ${fmt.euro(somme.lordo)}`;
                nodoNetto.textContent = `Totale netto ${fmt.euro(somme.netto)}`;
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

        const inputMedico = el('select', {
            class: 'ds-select',
            onChange: e => { testata.medico_id = e.target.value; }
        }, [
            el('option', { value: '', selected: !testata.medico_id }, 'Seleziona medico…'),
            ...medici.map(m => el('option', {
                value: m.id,
                selected: String(m.id) === String(testata.medico_id || '')
            }, m.nominativo))
        ]);

        const inputEmissione = el('input', {
            class: 'ds-input',
            type: 'date',
            value: testata.data_emissione || '',
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
            value: testata.sconto_percentuale !== undefined ? testata.sconto_percentuale : 0,
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
            value: testata.acconto_richiesto !== undefined ? testata.acconto_richiesto : 0,
            onInput: e => {
                testata.acconto_richiesto = e.target.value === '' ? 0 : Number(e.target.value);
            }
        });

        const inputNote = el('textarea', {
            class: 'ds-textarea',
            onInput: e => { testata.note = e.target.value; }
        }, testata.note || '');

        const grigliaTestata = el('div', { class: 'ds-grid ds-grid--form' }, [
            el('label', { class: 'ds-field' }, [el('span', { class: 'ds-field__label' }, 'Medico responsabile'), inputMedico]),
            el('label', { class: 'ds-field' }, [el('span', { class: 'ds-field__label' }, 'Data emissione'), inputEmissione]),
            el('label', { class: 'ds-field' }, [el('span', { class: 'ds-field__label' }, 'Valido fino al'), inputScadenza]),
            el('label', { class: 'ds-field' }, [el('span', { class: 'ds-field__label' }, 'Sconto di testata (%)'), inputScontoTestata]),
            el('label', { class: 'ds-field' }, [el('span', { class: 'ds-field__label' }, 'Acconto richiesto (€)'), inputAcconto]),
            el('label', { class: 'ds-field ds-field--wide' }, [el('span', { class: 'ds-field__label' }, 'Note e condizioni'), inputNote])
        ]);

        const corpo = [
            grigliaTestata,
            el('div', { class: 'ds-panel__head' }, [
                el('span', {}, 'Voci del piano di cura'),
                spaziatore(),
                bottone({
                    etichetta: 'Aggiungi voce',
                    simbolo: 'add',
                    variante: 'ghost',
                    piccolo: true,
                    onClick: () => {
                        righe.push({ prestazione_id: '', descrizione: '', dente: '', quantita: 1, prezzo_unitario: 0, sconto_percentuale: 0 });
                        renderRigheDom();
                    }
                })
            ]),
            contenitoreRighe,
            riepilogo
        ];

        return apriModale({
            titolo: esistente ? `Preventivo ${esistente.numero_preventivo}` : 'Nuovo preventivo',
            corpo,
            ampia: true,
            azioni: [
                { etichetta: 'Chiudi', variante: 'ghost', esito: null },
                {
                    etichetta: esistente ? 'Aggiorna preventivo' : 'Emetti preventivo',
                    simbolo: 'save',
                    onAzione: async () => {
                        const payload = {
                            ...testata,
                            paziente_id: pazienteId,
                            righe: righe.filter(riga => riga.descrizione || riga.prestazione_id)
                        };
                        const risultato = esistente
                            ? await call('preventivi.update', { ...payload, id: esistente.id })
                            : await call('preventivi.create', payload);
                        if (!esito(risultato, esistente ? 'Preventivo aggiornato' : 'Preventivo emesso')) return false;
                        return true;
                    }
                }
            ]
        });
    } catch (_) {
        return false;
    }
}
