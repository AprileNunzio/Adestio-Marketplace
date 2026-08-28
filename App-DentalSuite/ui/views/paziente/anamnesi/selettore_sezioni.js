import { el, icona } from '../../../components/dom.js';
import { bottone } from '../../../components/layout.js';

export function creaSelettoreSezioni({
    titoloSezione,
    descrizioneSezione,
    simboloSezione,
    categorie,
    statoSelezioni,
    puoModificare = true,
    onModifica
}) {
    let filtroTesto = '';
    const contenitore = el('div', { class: 'ds-anamnesi-sezione' });

    const ridisegna = () => {
        const nodiCategorie = [];
        let conteggioTotaleSelezionate = 0;

        categorie.forEach(categoria => {
            const vociFiltrate = categoria.voci.filter(voce => {
                if (!filtroTesto) return true;
                const termine = filtroTesto.toLowerCase().trim();
                return voce.etichetta.toLowerCase().includes(termine) || categoria.titolo.toLowerCase().includes(termine);
            });

            const vociSelezionate = categoria.voci.filter(voce => Boolean(statoSelezioni[voce.id]));
            conteggioTotaleSelezionate += vociSelezionate.length;

            if (filtroTesto && vociFiltrate.length === 0) return;

            const chips = vociFiltrate.map(voce => {
                const attivo = Boolean(statoSelezioni[voce.id]);
                const datiVoce = typeof statoSelezioni[voce.id] === 'object' ? statoSelezioni[voce.id] : { attivo: true, dettagli: '' };
                const dettagli = datiVoce.dettagli || '';

                const chipBtn = el('button', {
                    type: 'button',
                    class: `ds-chip ds-chip--${voce.livello || 'nota'} ${attivo ? 'ds-chip--active' : ''}`,
                    disabled: !puoModificare,
                    onClick: () => {
                        if (!puoModificare) return;
                        if (attivo) {
                            delete statoSelezioni[voce.id];
                        } else {
                            statoSelezioni[voce.id] = { attivo: true, dettagli: '' };
                        }
                        onModifica(statoSelezioni);
                        ridisegna();
                    }
                }, [
                    icona(attivo ? 'check_circle' : (voce.livello === 'critica' ? 'warning' : 'add_circle_outline')),
                    el('span', { class: 'ds-chip__label' }, voce.etichetta)
                ]);

                let inputDettagli = null;
                if (attivo && puoModificare) {
                    inputDettagli = el('input', {
                        type: 'text',
                        class: 'ds-input ds-input--sm ds-chip__details',
                        placeholder: 'Note specifiche / valori / data...',
                        value: dettagli,
                        onInput: e => {
                            statoSelezioni[voce.id] = {
                                attivo: true,
                                dettagli: e.target.value
                            };
                            onModifica(statoSelezioni);
                        }
                    });
                } else if (attivo && !puoModificare && dettagli) {
                    inputDettagli = el('span', { class: 'ds-chip__details-text' }, `(${dettagli})`);
                }

                return el('div', { class: 'ds-chip-wrapper' }, [chipBtn, inputDettagli].filter(Boolean));
            });

            const customEntries = Object.keys(statoSelezioni)
                .filter(k => k.startsWith(`custom_${categoria.id}_`))
                .map(k => {
                    const datiVoce = typeof statoSelezioni[k] === 'object' ? statoSelezioni[k] : { attivo: true, dettagli: '' };
                    const etichettaCustom = datiVoce.dettagli || k.replace(`custom_${categoria.id}_`, '').replace(/_/g, ' ');

                    const customChip = el('div', { class: 'ds-chip-wrapper' }, [
                        el('button', {
                            type: 'button',
                            class: 'ds-chip ds-chip--custom ds-chip--active',
                            disabled: !puoModificare,
                            onClick: () => {
                                if (!puoModificare) return;
                                delete statoSelezioni[k];
                                onModifica(statoSelezioni);
                                ridisegna();
                            }
                        }, [
                            icona('close'),
                            el('span', { class: 'ds-chip__label' }, etichettaCustom)
                        ])
                    ]);
                    return customChip;
                });

            let bloccoCustom = null;
            if (puoModificare) {
                const inputCustom = el('input', {
                    type: 'text',
                    class: 'ds-input ds-input--sm',
                    placeholder: '+ Aggiungi voce personalizzata...'
                });

                const btnAggiungi = bottone({
                    simbolo: 'add',
                    variante: 'ghost',
                    piccolo: true,
                    titolo: 'Aggiungi',
                    onClick: () => {
                        const testo = inputCustom.value.trim();
                        if (!testo) return;
                        const chiave = `custom_${categoria.id}_${Date.now()}`;
                        statoSelezioni[chiave] = { attivo: true, dettagli: testo };
                        inputCustom.value = '';
                        onModifica(statoSelezioni);
                        ridisegna();
                    }
                });

                inputCustom.addEventListener('keydown', e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        btnAggiungi.click();
                    }
                });

                bloccoCustom = el('div', { class: 'ds-custom-adder' }, [inputCustom, btnAggiungi]);
            }

            const intestazioneCategoria = el('div', { class: 'ds-category-head' }, [
                el('div', { class: 'ds-category-title' }, [
                    icona(categoria.simbolo || 'category'),
                    el('strong', {}, categoria.titolo),
                    vociSelezionate.length > 0
                        ? el('span', { class: 'ds-badge ds-badge--danger' }, `${vociSelezionate.length} attive`)
                        : null
                ].filter(Boolean))
            ]);

            nodiCategorie.push(el('div', { class: 'ds-category-card' }, [
                intestazioneCategoria,
                el('div', { class: 'ds-chips-container' }, [...chips, ...customEntries]),
                bloccoCustom
            ].filter(Boolean)));
        });

        const barraRicerca = el('div', { class: 'ds-anamnesi-filter-bar' }, [
            el('div', { class: 'ds-search-field' }, [
                icona('search'),
                el('input', {
                    type: 'text',
                    class: 'ds-input ds-search-input',
                    placeholder: `Cerca in ${titoloSezione.toLowerCase()}...`,
                    value: filtroTesto,
                    onInput: e => {
                        filtroTesto = e.target.value;
                        ridisegna();
                    }
                }),
                filtroTesto ? el('button', {
                    type: 'button',
                    class: 'ds-btn ds-btn--ghost ds-btn--icon ds-btn--sm',
                    onClick: () => { filtroTesto = ''; ridisegna(); }
                }, icona('close')) : null
            ].filter(Boolean)),
            el('div', { class: 'ds-counter-badge' }, [
                el('span', { class: 'ds-muted' }, 'Selezionate:'),
                el('strong', { class: 'ds-badge ds-badge--info' }, String(conteggioTotaleSelezionate))
            ])
        ]);

        const intestazione = el('div', { class: 'ds-section-intro' }, [
            el('div', { class: 'ds-section-intro__text' }, [
                el('h3', { class: 'ds-section-title' }, [icona(simboloSezione || 'medical_information'), titoloSezione]),
                descrizioneSezione ? el('p', { class: 'ds-muted' }, descrizioneSezione) : null
            ])
        ]);

        contenitore.innerHTML = '';
        contenitore.appendChild(intestazione);
        contenitore.appendChild(barraRicerca);
        nodiCategorie.forEach(nodo => contenitore.appendChild(nodo));
    };

    ridisegna();
    return contenitore;
}
