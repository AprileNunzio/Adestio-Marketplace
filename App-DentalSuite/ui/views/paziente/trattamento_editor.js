import { el, rimpiazza } from '../../components/dom.js';
import { apriModale } from '../../components/modale.js';
import { bottone, distintivo, avviso } from '../../components/layout.js';
import { call } from '../../kernel/transport.js';
import * as fmt from '../../kernel/format.js';
import { oggetto } from '../shared/vista.js';

const STATI = [
    { valore: 'pianificato', etichetta: 'Pianificato' },
    { valore: 'in_corso', etichetta: 'In corso' },
    { valore: 'eseguito', etichetta: 'Eseguito' },
    { valore: 'annullato', etichetta: 'Annullato' }
];

const MACRO_CLINICHE = [
    {
        titolo: 'Otturazione',
        testo: 'Isolamento campo con diga, detersione cavitaria, mordenzatura acido ortofosforico, adesivo universale, stratificazione composito fotopolimerizzabile, rifinitura e lucidatura occlusale.'
    },
    {
        titolo: 'Igiene e Detartrasi',
        testo: 'Ablazione tartaro sopragengivale e sottogengivale ad ultrasuoni, lucidatura con pasta fluorata e coppetta profilassi, istruzioni igiene orale domiciliare.'
    },
    {
        titolo: 'Terapia canalare',
        testo: 'Apertura camera pulpare, sagomatura canalare meccanica, abbondante irrigazione con NaOCl al 5%, asciugatura con coni di carta, sigillatura canalare con guttaperca e cemento endodontico.'
    },
    {
        titolo: 'Estrazione semplice',
        testo: 'Anestesia plessica, sindesmotomia circonferenziale, lussazione con leva ed estrazione atraumatica, curettage alveolare, emostasi e applicazione spugna di fibrina.'
    },
    {
        titolo: 'Impianto',
        testo: 'Incisione crestale con scollamento a tutto spessore, preparazione sito implantare con frese graduate, inserimento fixture con torque idoneo, vite di guarigione e sutura.'
    }
];

const SUPERFICI_RAPIDE = ['M', 'O', 'D', 'V', 'L', 'P', 'C', 'R'];

export async function apriTrattamentoEditor({ trattamento, paziente, prestazioni, staff, onSalva }) {
    try {
        const anamnesiScheda = oggetto(await call('anamnesi.get', { paziente_id: paziente.id }), null);
        const allerteTesto = [];
        if (anamnesiScheda) {
            if (anamnesiScheda.allergie_farmaci) allerteTesto.push(`Farmaci: ${anamnesiScheda.allergie_farmaci}`);
            if (anamnesiScheda.allergie_materiali) allerteTesto.push(`Materiali: ${anamnesiScheda.allergie_materiali}`);
            if (anamnesiScheda.intolleranze) allerteTesto.push(`Intolleranze: ${anamnesiScheda.intolleranze}`);
        }

        const stato = {
            id: trattamento ? trattamento.id : undefined,
            paziente_id: paziente.id,
            prestazione_id: trattamento ? (trattamento.prestazione_id || '') : '',
            descrizione: trattamento ? (trattamento.descrizione || '') : '',
            dente: trattamento ? (trattamento.dente || '') : '',
            superfici: trattamento ? (trattamento.superfici || '') : '',
            medico_id: trattamento ? (trattamento.medico_id || '') : '',
            segretaria_id: trattamento ? (trattamento.segretaria_id || '') : '',
            data_trattamento: trattamento && trattamento.data_trattamento ? trattamento.data_trattamento : fmt.oggiIso(),
            stato: trattamento && trattamento.stato ? trattamento.stato : 'pianificato',
            importo: trattamento && trattamento.importo !== undefined ? trattamento.importo : '',
            costo_materiali: trattamento && trattamento.costo_materiali !== undefined ? trattamento.costo_materiali : '',
            anestesia: trattamento ? (trattamento.anestesia || '') : '',
            lotto_materiali: trattamento ? (trattamento.lotto_materiali || '') : '',
            note: trattamento ? (trattamento.note || '') : ''
        };

        const corpo = el('div', { class: 'ds-form' });

        const aggiornaVista = () => {
            const inputPrestazione = el('select', {
                class: 'ds-select',
                onChange: async evento => {
                    stato.prestazione_id = evento.target.value;
                    if (stato.prestazione_id) {
                        try {
                            const sug = await call('trattamenti.suggerisci', {
                                prestazione_id: stato.prestazione_id,
                                importo: stato.importo,
                                medico_id: stato.medico_id,
                                segretaria_id: stato.segretaria_id,
                                data_trattamento: stato.data_trattamento
                            });
                            if (sug) {
                                stato.descrizione = sug.descrizione || stato.descrizione;
                                stato.importo = sug.importo;
                                stato.costo_materiali = sug.costo_materiali;
                                if (sug.suggerito_segretaria_id) {
                                    stato.segretaria_id = sug.suggerito_segretaria_id;
                                }
                                if (sug.suggerito_medico_id && !stato.medico_id) {
                                    stato.medico_id = sug.suggerito_medico_id;
                                }
                            }
                        } catch {}
                    }
                    aggiornaVista();
                }
            }, [
                el('option', { value: '' }, '— Seleziona da listino prestazioni —'),
                ...(prestazioni || []).map(p => el('option', {
                    value: p.id, selected: p.id === stato.prestazione_id
                }, `${p.nome} · ${fmt.euro(p.prezzo_paziente)}`))
            ]);

            const inputDescrizione = el('input', {
                class: 'ds-input', type: 'text', value: stato.descrizione,
                placeholder: 'Es. Ricostruzione composito dente 26',
                onChange: evento => { stato.descrizione = evento.target.value; }
            });

            const inputDente = el('input', {
                class: 'ds-input', type: 'text', value: stato.dente, style: 'max-width: 140px;',
                placeholder: 'Es. 26 o 11-21',
                onChange: evento => { stato.dente = evento.target.value; }
            });

            const tastiDenteRapidi = el('div', { class: 'ds-toolbar', style: 'gap: 4px; flex-wrap: wrap; margin-top: 4px;' }, [
                bottone({ etichetta: 'Q1 (18-11)', variante: 'ghost', piccolo: true, onClick: () => { stato.dente = 'Q1'; inputDente.value = 'Q1'; } }),
                bottone({ etichetta: 'Q2 (21-28)', variante: 'ghost', piccolo: true, onClick: () => { stato.dente = 'Q2'; inputDente.value = 'Q2'; } }),
                bottone({ etichetta: 'Q3 (31-38)', variante: 'ghost', piccolo: true, onClick: () => { stato.dente = 'Q3'; inputDente.value = 'Q3'; } }),
                bottone({ etichetta: 'Q4 (41-48)', variante: 'ghost', piccolo: true, onClick: () => { stato.dente = 'Q4'; inputDente.value = 'Q4'; } }),
                bottone({ etichetta: 'Arcata Sup.', variante: 'ghost', piccolo: true, onClick: () => { stato.dente = 'Arc. Sup.'; inputDente.value = 'Arc. Sup.'; } }),
                bottone({ etichetta: 'Arcata Inf.', variante: 'ghost', piccolo: true, onClick: () => { stato.dente = 'Arc. Inf.'; inputDente.value = 'Arc. Inf.'; } }),
                bottone({ etichetta: 'Bocca compl.', variante: 'ghost', piccolo: true, onClick: () => { stato.dente = 'Bocca'; inputDente.value = 'Bocca'; } })
            ]);

            const inputSuperfici = el('input', {
                class: 'ds-input', type: 'text', value: stato.superfici, style: 'max-width: 120px;',
                placeholder: 'Es. MOD',
                onChange: evento => { stato.superfici = evento.target.value.toUpperCase(); }
            });

            const tastiSuperfici = el('div', { class: 'ds-toolbar', style: 'gap: 3px; margin-top: 4px;' },
                SUPERFICI_RAPIDE.map(lettera => {
                    const presente = (stato.superfici || '').includes(lettera);
                    return bottone({
                        etichetta: lettera,
                        variante: presente ? 'primary' : 'ghost',
                        piccolo: true,
                        onClick: () => {
                            let curr = (stato.superfici || '').split('');
                            if (presente) curr = curr.filter(l => l !== lettera);
                            else curr.push(lettera);
                            stato.superfici = curr.join('');
                            inputSuperfici.value = stato.superfici;
                            aggiornaVista();
                        }
                    });
                })
            );

            const inputMedico = el('select', {
                class: 'ds-select',
                onChange: evento => { stato.medico_id = evento.target.value; }
            }, [
                el('option', { value: '' }, '— Nessun medico selezionato —'),
                ...(staff || []).filter(s => s.ruolo !== 'segreteria').map(m => el('option', {
                    value: m.id, selected: m.id === stato.medico_id
                }, `${m.nominativo} (${fmt.etichettaStato(m.ruolo)})`))
            ]);

            const inputSegretaria = el('select', {
                class: 'ds-select',
                onChange: evento => { stato.segretaria_id = evento.target.value; }
            }, [
                el('option', { value: '' }, '— Nessun assistente / segreteria —'),
                ...(staff || []).map(s => el('option', {
                    value: s.id, selected: s.id === stato.segretaria_id
                }, `${s.nominativo} (${fmt.etichettaStato(s.ruolo)})`))
            ]);

            const inputData = el('input', {
                class: 'ds-input', type: 'date', value: stato.data_trattamento,
                onChange: evento => { stato.data_trattamento = evento.target.value; }
            });

            const inputStato = el('select', {
                class: 'ds-select',
                onChange: evento => { stato.stato = evento.target.value; aggiornaVista(); }
            }, STATI.map(s => el('option', {
                value: s.valore, selected: s.valore === stato.stato
            }, s.etichetta)));

            const btnEseguitoOggi = bottone({
                etichetta: 'Segna eseguito oggi',
                simbolo: 'done_all',
                variante: 'ghost',
                piccolo: true,
                onClick: () => {
                    stato.stato = 'eseguito';
                    stato.data_trattamento = fmt.oggiIso();
                    aggiornaVista();
                }
            });

            const inputImporto = el('input', {
                class: 'ds-input', type: 'number', step: '0.01', min: '0', value: stato.importo,
                placeholder: '0.00',
                onChange: evento => { stato.importo = evento.target.value; }
            });

            const btnOmaggio = bottone({
                etichetta: Number(stato.importo) === 0 ? '🎁 Omaggio impostato' : '🎁 Rendi Omaggio (0 €)',
                simbolo: 'redeem',
                variante: Number(stato.importo) === 0 ? 'primary' : 'ghost',
                piccolo: true,
                onClick: () => {
                    if (Number(stato.importo) === 0) {
                        const prest = (prestazioni || []).find(p => p.id === stato.prestazione_id);
                        stato.importo = prest ? prest.prezzo_paziente : '';
                    } else {
                        stato.importo = '0';
                    }
                    aggiornaVista();
                }
            });

            const inputAnestesia = el('input', {
                class: 'ds-input', type: 'text', value: stato.anestesia,
                placeholder: 'Es. Articaina 1:100.000 con adrenalina (1.8 ml)',
                onChange: evento => { stato.anestesia = evento.target.value; }
            });

            const inputLotto = el('input', {
                class: 'ds-input', type: 'text', value: stato.lotto_materiali,
                placeholder: 'Es. Composito Filtek A2 Lotto #93821 / Impianto Straumann #8271',
                onChange: evento => { stato.lotto_materiali = evento.target.value; }
            });

            const inputNote = el('textarea', {
                class: 'ds-textarea', rows: '4', value: stato.note,
                placeholder: 'Dettagli clinici, procedura eseguita, reazioni del paziente o raccomandazioni post-operatorie...',
                onInput: evento => { stato.note = evento.target.value; }
            });

            const macroBottoni = el('div', { class: 'ds-toolbar', style: 'gap: 4px; flex-wrap: wrap; margin-bottom: 6px;' },
                MACRO_CLINICHE.map(m => bottone({
                    etichetta: `+ ${m.titolo}`,
                    variante: 'ghost',
                    piccolo: true,
                    onClick: () => {
                        stato.note = stato.note ? `${stato.note}\n${m.testo}` : m.testo;
                        inputNote.value = stato.note;
                    }
                }))
            );

            rimpiazza(corpo, [
                allerteTesto.length > 0 ? avviso({
                    titolo: 'Allerte Cliniche / Intolleranze Paziente',
                    testo: allerteTesto.join(' · '),
                    tono: 'pericolo'
                }) : null,
                el('div', { class: 'ds-field ds-field--wide' }, [
                    el('label', { class: 'ds-field__label' }, 'Prestazione a listino (auto-compilazione & accordi)'),
                    inputPrestazione
                ]),
                el('div', { class: 'ds-field ds-field--wide' }, [
                    el('label', { class: 'ds-field__label' }, 'Descrizione trattamento *'),
                    inputDescrizione
                ]),
                el('div', { class: 'ds-grid ds-grid--2' }, [
                    el('div', { class: 'ds-field' }, [
                        el('label', { class: 'ds-field__label' }, 'Elemento dentale'),
                        inputDente,
                        tastiDenteRapidi
                    ]),
                    el('div', { class: 'ds-field' }, [
                        el('label', { class: 'ds-field__label' }, 'Superfici dentali'),
                        inputSuperfici,
                        tastiSuperfici
                    ])
                ]),
                el('div', { class: 'ds-grid ds-grid--2' }, [
                    el('div', { class: 'ds-field' }, [
                        el('label', { class: 'ds-field__label' }, 'Medico operatore'),
                        inputMedico
                    ]),
                    el('div', { class: 'ds-field' }, [
                        el('label', { class: 'ds-field__label' }, 'Assistente / Segreteria (auto-selezionato da accordo)'),
                        inputSegretaria
                    ])
                ]),
                el('div', { class: 'ds-grid ds-grid--2' }, [
                    el('div', { class: 'ds-field' }, [
                        el('label', { class: 'ds-field__label' }, 'Data trattamento'),
                        inputData
                    ]),
                    el('div', { class: 'ds-field' }, [
                        el('label', { class: 'ds-field__label' }, 'Stato avanzamento'),
                        el('div', { style: 'display:flex;gap:6px;align-items:center;' }, [inputStato, btnEseguitoOggi])
                    ])
                ]),
                el('div', { class: 'ds-grid ds-grid--2' }, [
                    el('div', { class: 'ds-field' }, [
                        el('label', { class: 'ds-field__label' }, 'Importo al paziente (€)'),
                        el('div', { style: 'display:flex;gap:6px;align-items:center;' }, [inputImporto, btnOmaggio])
                    ]),
                    el('div', { class: 'ds-field' }, [
                        el('label', { class: 'ds-field__label' }, 'Anestetico e dosaggio somministrato'),
                        inputAnestesia
                    ])
                ]),
                el('div', { class: 'ds-field ds-field--wide' }, [
                    el('label', { class: 'ds-field__label' }, 'Tracciabilità Dispositivi / Materiale e Lotto (MDR EU)'),
                    inputLotto
                ]),
                el('div', { class: 'ds-field ds-field--wide' }, [
                    el('label', { class: 'ds-field__label' }, 'Diario & Note Cliniche (modelli rapidi)'),
                    macroBottoni,
                    inputNote
                ])
            ].filter(Boolean));
        };

        aggiornaVista();

        await apriModale({
            titolo: trattamento ? 'Modifica Trattamento Clinico' : 'Nuovo Trattamento Clinico',
            corpo,
            ampia: true,
            azioni: [
                {
                    etichetta: trattamento ? 'Aggiorna trattamento' : 'Registra trattamento',
                    simbolo: 'save',
                    variante: 'primary',
                    onAzione: async chiudi => {
                        if (!String(stato.descrizione || '').trim()) {
                            alert('Indicare la descrizione del trattamento');
                            return false;
                        }
                        await onSalva(stato);
                        chiudi(true);
                    }
                }
            ]
        });
    } catch (err) {
        console.error(err);
    }
}
