import { el, icona } from '../../../components/dom.js';
import { CLASSIFICAZIONI_ASA } from './catalogo.js';

export function creaQuadroRischi({
    valutazioneRischio = {},
    puoModificare = true,
    onModifica
}) {
    const stato = {
        asa: String(valutazioneRischio.asa || '1'),
        rischio_emorragico: valutazioneRischio.rischio_emorragico || 'basso',
        rischio_mronj: valutazioneRischio.rischio_mronj || 'basso',
        profilassi_antibiotica: Boolean(valutazioneRischio.profilassi_antibiotica),
        tolleranza_vasocostrittore: valutazioneRischio.tolleranza_vasocostrittore || 'consentito',
        note_rischio: valutazioneRischio.note_rischio || ''
    };

    const contenitore = el('div', { class: 'ds-risk-matrix' });

    const aggiorna = () => {
        onModifica({ ...stato });
        ridisegna();
    };

    const ridisegna = () => {
        const cardsAsa = CLASSIFICAZIONI_ASA.map(livello => {
            const selezionato = String(stato.asa) === String(livello.valore);
            return el('button', {
                type: 'button',
                class: `ds-asa-card ds-asa-card--${livello.colore} ${selezionato ? 'ds-asa-card--active' : ''}`,
                disabled: !puoModificare,
                onClick: () => {
                    if (!puoModificare) return;
                    stato.asa = String(livello.valore);
                    aggiorna();
                }
            }, [
                el('div', { class: 'ds-asa-card__head' }, [
                    icona(livello.simbolo),
                    el('strong', { class: 'ds-asa-card__title' }, livello.titolo),
                    selezionato ? el('span', { class: 'ds-badge ds-badge--success' }, 'ATTIVO') : null
                ].filter(Boolean)),
                el('p', { class: 'ds-asa-card__desc' }, livello.descrizione)
            ]);
        });

        const opzioniEmorragico = [
            { valore: 'basso', etichetta: 'Basso', tono: 'success' },
            { valore: 'medio', etichetta: 'Medio (antiaggreganti / coagulopatia lieve)', tono: 'warning' },
            { valore: 'alto', etichetta: 'Alto (TAO / NAO / Coagulopatia severa)', tono: 'danger' }
        ];

        const opzioniMronj = [
            { valore: 'basso', etichetta: 'Basso / Nullo', tono: 'success' },
            { valore: 'medio', etichetta: 'Medio (Bifosfonati orali)', tono: 'warning' },
            { valore: 'alto', etichetta: 'Alto (Bifosfonati E.V. / Denosumab / Radioterapia)', tono: 'danger' }
        ];

        const opzioniVasocostrittore = [
            { valore: 'consentito', etichetta: 'Consentito (Articaina / Lidocaina con adrenalina)', tono: 'success' },
            { valore: 'cautela', etichetta: 'Cautela (Cardiopatici / Pacemaker / Ipertesi)', tono: 'warning' },
            { valore: 'controindicato', etichetta: 'Controindicato (Solo Mepivacaina pura senza vasocostrittore)', tono: 'danger' }
        ];

        const selettoreEmorragico = el('div', { class: 'ds-field' }, [
            el('span', { class: 'ds-field__label' }, 'Rischio Emorragico Operatorio'),
            el('div', { class: 'ds-segmented-control' }, opzioniEmorragico.map(opz => el('button', {
                type: 'button',
                class: `ds-seg-btn ds-seg-btn--${opz.tono} ${stato.rischio_emorragico === opz.valore ? 'ds-seg-btn--active' : ''}`,
                disabled: !puoModificare,
                onClick: () => { stato.rischio_emorragico = opz.valore; aggiorna(); }
            }, opz.etichetta)))
        ]);

        const selettoreMronj = el('div', { class: 'ds-field' }, [
            el('span', { class: 'ds-field__label' }, 'Rischio Osteonecrosi Mascellare (MRONJ / BRONJ)'),
            el('div', { class: 'ds-segmented-control' }, opzioniMronj.map(opz => el('button', {
                type: 'button',
                class: `ds-seg-btn ds-seg-btn--${opz.tono} ${stato.rischio_mronj === opz.valore ? 'ds-seg-btn--active' : ''}`,
                disabled: !puoModificare,
                onClick: () => { stato.rischio_mronj = opz.valore; aggiorna(); }
            }, opz.etichetta)))
        ]);

        const selettoreVasocostrittore = el('div', { class: 'ds-field' }, [
            el('span', { class: 'ds-field__label' }, 'Tolleranza Vasocostrittori Anestetici'),
            el('div', { class: 'ds-segmented-control' }, opzioniVasocostrittore.map(opz => el('button', {
                type: 'button',
                class: `ds-seg-btn ds-seg-btn--${opz.tono} ${stato.tolleranza_vasocostrittore === opz.valore ? 'ds-seg-btn--active' : ''}`,
                disabled: !puoModificare,
                onClick: () => { stato.tolleranza_vasocostrittore = opz.valore; aggiorna(); }
            }, opz.etichetta)))
        ]);

        const toggleProfilassi = el('label', { class: 'ds-check ds-check--banner' }, [
            el('input', {
                type: 'checkbox',
                checked: stato.profilassi_antibiotica,
                disabled: !puoModificare,
                onChange: e => { stato.profilassi_antibiotica = e.target.checked; aggiorna(); }
            }),
            el('div', {}, [
                el('strong', {}, 'Profilassi Antibiotica Pre-Operatoria Raccomandata (Linee Guida AHA / NICE)'),
                el('p', { class: 'ds-muted' }, 'Per pazienti a rischio endocardite batterica, portatori di protesi valvolari o grave immunodeficienza prima di manovre cruente.')
            ])
        ]);

        const inputNote = el('div', { class: 'ds-field ds-field--wide' }, [
            el('span', { class: 'ds-field__label' }, 'Note integrative sulla valutazione del rischio anestesiologico e chirurgico'),
            el('textarea', {
                class: 'ds-textarea',
                rows: 2,
                placeholder: 'Es. Contattare cardiologo curante prima di chirurgia estrattiva multipla...',
                disabled: !puoModificare,
                value: stato.note_rischio,
                onInput: e => { stato.note_rischio = e.target.value; onModifica({ ...stato }); }
            })
        ]);

        contenitore.innerHTML = '';
        contenitore.appendChild(el('div', { class: 'ds-section-intro' }, [
            el('div', { class: 'ds-section-intro__text' }, [
                el('h3', { class: 'ds-section-title' }, [icona('speed'), 'Classificazione Stato Fisico ASA (American Society of Anesthesiologists)']),
                el('p', { class: 'ds-muted' }, 'Standard internazionale di valutazione del rischio anestesiologico e delle complicanze sistemiche peri-operatorie.')
            ])
        ]));
        contenitore.appendChild(el('div', { class: 'ds-asa-grid' }, cardsAsa));
        contenitore.appendChild(el('div', { class: 'ds-risk-factors-grid' }, [
            selettoreEmorragico,
            selettoreMronj,
            selettoreVasocostrittore,
            toggleProfilassi,
            inputNote
        ]));
    };

    ridisegna();
    return contenitore;
}
