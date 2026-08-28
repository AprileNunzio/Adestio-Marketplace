import { el, icona, rimpiazza } from '../../../components/dom.js';
import { bottone } from '../../../components/layout.js';
import { apriModale } from '../../../components/modale.js';
import * as fmt from '../../../kernel/format.js';
import { apriSelettoreProntuario } from './selettore_prontuario.js';
import { valutaCompatibilitaFarmaco } from './controllo_compatibilita.js';

const SCORCIATOIE_POSOLOGIA = [
    '1 compressa ogni 12 ore dopo i pasti',
    '1 compressa ogni 8 ore a stomaco pieno',
    '1 bustina fino a 3 volte al giorno ai pasti',
    '1 compressa al mattino a digiuno',
    '1 sciacquo per 1 min 2 volte al giorno lontano dai pasti',
    'Applicare gel localmente sulle suture 2 volte al dì',
    '1 compressa al bisogno in caso di dolore severo'
];

const SCORCIATOIE_DURATA = [3, 5, 6, 7, 10, 14];

export async function apriEditorPrescrizione({ paziente, prescrittori = [], anamnesi = {}, onSalva }) {
    const stato = {
        paziente_id: paziente.id,
        medico_id: prescrittori.length > 0 ? prescrittori[0].id : '',
        farmaco: '',
        principio_attivo: '',
        dosaggio: '',
        posologia: '',
        durata_giorni: 6,
        data_prescrizione: fmt.oggiIso(),
        categoria: 'altri',
        note: '',
        salva_in_prontuario: false
    };

    const corpo = el('div', { class: 'ds-prescrizione-editor' });
    const bannerCompatibilita = el('div', { class: 'ds-compatibilita-box' });

    const aggiornaAllerteCompatibilita = () => {
        const allerte = valutaCompatibilitaFarmaco({
            farmaco: stato.farmaco,
            principioAttivo: stato.principio_attivo,
            anamnesi,
            paziente
        });

        if (allerte.length === 0) {
            bannerCompatibilita.innerHTML = '';
            return;
        }

        const elementi = allerte.map(a => el('div', {
            class: `ds-alert ds-alert--${a.livello === 'critica' ? 'danger' : 'warning'}`
        }, [
            icona(a.livello === 'critica' ? 'e911_emergency' : 'warning'),
            el('div', {}, [
                el('strong', {}, a.titolo),
                el('p', { class: 'ds-muted', style: 'margin: 2px 0 0 0;' }, a.descrizione)
            ])
        ]));

        rimpiazza(bannerCompatibilita, elementi);
    };

    const compilaDaProntuario = f => {
        stato.farmaco = f.farmaco || '';
        stato.principio_attivo = f.principio_attivo || '';
        stato.dosaggio = f.dosaggio || '';
        stato.posologia = f.posologia || '';
        stato.durata_giorni = Number(f.durata_giorni) || stato.durata_giorni;
        stato.categoria = f.categoria || 'altri';
        stato.note = f.note || '';

        inputFarmaco.value = stato.farmaco;
        inputPrincipio.value = stato.principio_attivo;
        inputDosaggio.value = stato.dosaggio;
        inputPosologia.value = stato.posologia;
        inputDurata.value = String(stato.durata_giorni);
        inputNote.value = stato.note;

        aggiornaAllerteCompatibilita();
    };

    const btnProntuario = bottone({
        etichetta: 'Sfoglia Prontuario Odontoiatrico (100+ Farmaci)',
        simbolo: 'menu_book',
        variante: 'primario',
        onClick: () => {
            apriSelettoreProntuario({
                onSeleziona: compilaDaProntuario,
                anamnesi,
                paziente
            });
        }
    });

    const inputMedico = el('select', {
        class: 'ds-select',
        onChange: e => { stato.medico_id = e.target.value; }
    }, [
        el('option', { value: '' }, '— Seleziona medico prescrittore —'),
        ...prescrittori.map(m => el('option', {
            value: m.id,
            selected: m.id === stato.medico_id
        }, `${m.nominativo || `${m.cognome} ${m.nome}`} (${m.ruolo})`))
    ]);

    const inputFarmaco = el('input', {
        type: 'text',
        class: 'ds-input',
        placeholder: 'Es. Augmentin / Brufen / Bentelan...',
        value: stato.farmaco,
        onInput: e => {
            stato.farmaco = e.target.value;
            aggiornaAllerteCompatibilita();
        }
    });

    const inputPrincipio = el('input', {
        type: 'text',
        class: 'ds-input',
        placeholder: 'Es. Amoxicillina + Acido Clavulanico...',
        value: stato.principio_attivo,
        onInput: e => {
            stato.principio_attivo = e.target.value;
            aggiornaAllerteCompatibilita();
        }
    });

    const inputDosaggio = el('input', {
        type: 'text',
        class: 'ds-input',
        placeholder: 'Es. 875mg + 125mg / 600mg / 1g...',
        value: stato.dosaggio,
        onInput: e => { stato.dosaggio = e.target.value; }
    });

    const inputPosologia = el('input', {
        type: 'text',
        class: 'ds-input',
        placeholder: 'Es. 1 compressa ogni 12 ore a stomaco pieno...',
        value: stato.posologia,
        onInput: e => { stato.posologia = e.target.value; }
    });

    const chipPosologie = el('div', { class: 'ds-quick-chips' }, SCORCIATOIE_POSOLOGIA.map(testo => {
        return el('button', {
            type: 'button',
            class: 'ds-chip ds-chip--sm',
            onClick: () => {
                stato.posologia = testo;
                inputPosologia.value = testo;
            }
        }, testo);
    }));

    const inputDurata = el('input', {
        type: 'number',
        class: 'ds-input',
        style: 'max-width: 120px;',
        value: String(stato.durata_giorni),
        min: '1',
        max: '365',
        onInput: e => { stato.durata_giorni = Number(e.target.value); }
    });

    const chipDurate = el('div', { class: 'ds-quick-chips' }, SCORCIATOIE_DURATA.map(giorni => {
        return el('button', {
            type: 'button',
            class: 'ds-chip ds-chip--sm',
            onClick: () => {
                stato.durata_giorni = giorni;
                inputDurata.value = String(giorni);
            }
        }, `${giorni} gg`);
    }));

    const inputData = el('input', {
        type: 'date',
        class: 'ds-input',
        value: stato.data_prescrizione,
        onChange: e => { stato.data_prescrizione = e.target.value; }
    });

    const inputNote = el('textarea', {
        class: 'ds-textarea',
        rows: 2,
        placeholder: 'Avvertenze specifiche per il paziente, modalità d\'uso, raccomandazioni...',
        value: stato.note,
        onInput: e => { stato.note = e.target.value; }
    });

    const checkboxSalvaStudio = el('label', { class: 'ds-check' }, [
        el('input', {
            type: 'checkbox',
            checked: stato.salva_in_prontuario,
            onChange: e => { stato.salva_in_prontuario = e.target.checked; }
        }),
        el('span', {}, 'Salva questo farmaco nel prontuario personalizzato dello studio per utilizzi futuri')
    ]);

    const layout = el('div', { class: 'ds-grid ds-grid--form' }, [
        el('div', { class: 'ds-field ds-field--wide' }, [
            el('div', { style: 'display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;' }, [
                el('span', { class: 'ds-field__label' }, 'Ricerca Guidata'),
                btnProntuario
            ])
        ]),
        bannerCompatibilita,
        el('div', { class: 'ds-field ds-field--wide' }, [
            el('label', { class: 'ds-field__label' }, 'Medico Odontoiatra Prescrittore *'),
            inputMedico
        ]),
        el('div', { class: 'ds-field' }, [
            el('label', { class: 'ds-field__label' }, 'Nome Commerciale Farmaco *'),
            inputFarmaco
        ]),
        el('div', { class: 'ds-field' }, [
            el('label', { class: 'ds-field__label' }, 'Principio Attivo'),
            inputPrincipio
        ]),
        el('div', { class: 'ds-field' }, [
            el('label', { class: 'ds-field__label' }, 'Dosaggio / Formulazione'),
            inputDosaggio
        ]),
        el('div', { class: 'ds-field' }, [
            el('label', { class: 'ds-field__label' }, 'Data Emissione'),
            inputData
        ]),
        el('div', { class: 'ds-field ds-field--wide' }, [
            el('label', { class: 'ds-field__label' }, 'Posologia e Frequenza di Assunzione *'),
            inputPosologia,
            chipPosologie
        ]),
        el('div', { class: 'ds-field ds-field--wide' }, [
            el('label', { class: 'ds-field__label' }, 'Durata Terapia'),
            el('div', { style: 'display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;' }, [
                inputDurata,
                chipDurate
            ])
        ]),
        el('div', { class: 'ds-field ds-field--wide' }, [
            el('label', { class: 'ds-field__label' }, 'Note ed Avvertenze Cliniche'),
            inputNote
        ]),
        el('div', { class: 'ds-field ds-field--wide' }, [
            checkboxSalvaStudio
        ])
    ]);

    rimpiazza(corpo, layout);
    aggiornaAllerteCompatibilita();

    await apriModale({
        titolo: 'Emissione Prescrizione Farmacologica Guidata',
        corpo,
        ampia: true,
        azioni: [
            {
                etichetta: 'Annulla',
                variante: 'ghost',
                onAzione: chiudi => chiudi(false)
            },
            {
                etichetta: 'Emetti Prescrizione',
                simbolo: 'done',
                variante: 'primary',
                onAzione: async chiudi => {
                    if (!String(stato.farmaco || '').trim()) {
                        alert('Il nome del farmaco è obbligatorio');
                        return false;
                    }
                    if (!stato.medico_id) {
                        alert('Selezionare il medico prescrittore');
                        return false;
                    }
                    await onSalva(stato);
                    chiudi(true);
                }
            }
        ]
    });
}
