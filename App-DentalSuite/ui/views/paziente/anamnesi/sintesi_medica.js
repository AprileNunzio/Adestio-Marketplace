import { el, icona } from '../../../components/dom.js';
import * as fmt from '../../../kernel/format.js';

export function creaSintesiMedica({
    stato = {},
    staff = [],
    puoModificare = true,
    onModifica
}) {
    const contenitore = el('div', { class: 'ds-sintesi-medica' });

    const aggiorna = () => {
        onModifica({ ...stato });
    };

    const medici = staff.filter(s => ['medico', 'odontoiatra', 'direttore_sanitario'].includes(s.ruolo));

    const campoTerapie = el('div', { class: 'ds-field ds-field--wide' }, [
        el('label', { class: 'ds-field__label' }, 'Terapie farmacologiche croniche in corso'),
        el('textarea', {
            class: 'ds-textarea',
            rows: 3,
            placeholder: 'Elencare i farmaci assunti regolarmente con dosaggio e posologia (es. Cardioaspirina 100mg 1 cp/die ore 12, Metformina 850mg 2 cp/die)...',
            disabled: !puoModificare,
            value: stato.terapie_in_corso || '',
            onInput: e => { stato.terapie_in_corso = e.target.value; aggiorna(); }
        })
    ]);

    const campoAltrePatologie = el('div', { class: 'ds-field ds-field--wide' }, [
        el('label', { class: 'ds-field__label' }, 'Altre patologie o condizioni cliniche rilevanti'),
        el('textarea', {
            class: 'ds-textarea',
            rows: 2,
            placeholder: 'Specificare eventuali interventi chirurgici pregressi, patologie rare o dettagli anamnestici non inclusi nelle categorie...',
            disabled: !puoModificare,
            value: stato.altre_patologie || '',
            onInput: e => { stato.altre_patologie = e.target.value; aggiorna(); }
        })
    ]);

    const campoNoteMediche = el('div', { class: 'ds-field ds-field--wide' }, [
        el('label', { class: 'ds-field__label' }, 'Note riservate del medico odontoiatra'),
        el('textarea', {
            class: 'ds-textarea',
            rows: 3,
            placeholder: 'Annotazioni cliniche interne, cautele procedurali, raccomandazioni per gli assistenti di studio...',
            disabled: !puoModificare,
            value: stato.note_mediche || '',
            onInput: e => { stato.note_mediche = e.target.value; aggiorna(); }
        })
    ]);

    const inputDataCompilazione = el('input', {
        type: 'date',
        class: 'ds-input',
        disabled: !puoModificare,
        value: stato.data_compilazione || fmt.oggiIso(),
        onChange: e => { stato.data_compilazione = e.target.value; aggiorna(); }
    });

    const inputDataRevisione = el('input', {
        type: 'date',
        class: 'ds-input',
        disabled: !puoModificare,
        value: stato.data_revisione || fmt.oggiIso(),
        onChange: e => { stato.data_revisione = e.target.value; aggiorna(); }
    });

    const selectMedico = el('select', {
        class: 'ds-select',
        disabled: !puoModificare,
        onChange: e => { stato.medico_revisore_id = e.target.value; aggiorna(); }
    }, [
        el('option', { value: '' }, '— Seleziona medico esaminatore —'),
        ...medici.map(m => el('option', {
            value: m.id,
            selected: m.id === stato.medico_revisore_id
        }, `${m.nominativo || `${m.nome} ${m.cognome}`} (${m.ruolo})`))
    ]);

    const grigliaMetadati = el('div', { class: 'ds-grid ds-grid--form', style: 'margin-top: 1rem;' }, [
        el('div', { class: 'ds-field' }, [
            el('label', { class: 'ds-field__label' }, 'Data prima compilazione anamnestica'),
            inputDataCompilazione
        ]),
        el('div', { class: 'ds-field' }, [
            el('label', { class: 'ds-field__label' }, 'Data ultima revisione / aggiornamento'),
            inputDataRevisione
        ]),
        el('div', { class: 'ds-field' }, [
            el('label', { class: 'ds-field__label' }, 'Medico esaminatore / Odontoiatra'),
            selectMedico
        ])
    ]);

    contenitore.appendChild(el('div', { class: 'ds-section-intro' }, [
        el('div', { class: 'ds-section-intro__text' }, [
            el('h3', { class: 'ds-section-title' }, [icona('clinical_notes'), 'Terapie Farmacologiche Croniche & Note Cliniche']),
            el('p', { class: 'ds-muted' }, 'Documentazione dei farmaci assunti a domicilio, terapie continuative e osservazioni diagnostiche del medico.')
        ])
    ]));

    contenitore.appendChild(el('div', { class: 'ds-sintesi-grid' }, [
        campoTerapie,
        campoAltrePatologie,
        campoNoteMediche,
        grigliaMetadati
    ]));

    return contenitore;
}
