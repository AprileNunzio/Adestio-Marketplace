import { el, icona, rimpiazza } from '../../../components/dom.js';
import { bottone } from '../../../components/layout.js';
import { apriModale } from '../../../components/modale.js';
import { call } from '../../../kernel/transport.js';
import { esito } from '../../../components/notifica.js';
import { dataOr } from '../../../kernel/result.js';
import { valutaCompatibilitaFarmaco } from './controllo_compatibilita.js';
import { CATEGORIE_PRONTUARIO, FARMACI_PREDEFINITI } from './catalogo_farmaci.js';

export async function apriSelettoreProntuario({ onSeleziona, anamnesi = {}, paziente = {} }) {
    let predefiniti = FARMACI_PREDEFINITI;
    let personalizzati = [];
    let categorie = CATEGORIE_PRONTUARIO;

    try {
        const res = await call('prescrizioni.prontuario', {});
        const datiProntuario = dataOr(res, (res && res.data) || (res && res.payload) || res || {});
        if (datiProntuario && Array.isArray(datiProntuario.predefiniti) && datiProntuario.predefiniti.length > 0) {
            predefiniti = datiProntuario.predefiniti;
        }
        if (datiProntuario && Array.isArray(datiProntuario.personalizzati)) {
            personalizzati = datiProntuario.personalizzati;
        }
        if (datiProntuario && Array.isArray(datiProntuario.categorie) && datiProntuario.categorie.length > 0) {
            categorie = datiProntuario.categorie;
        }
    } catch {}

    let filtroTesto = '';
    let categoriaSelezionata = 'tutti';

    const tuttiFarmaci = () => [
        ...personalizzati.map(f => ({ ...f, isStudio: true })),
        ...predefiniti
    ];

    const chiudiQuestoModale = () => {
        const fondale = corpo.closest('.ds-modal-backdrop');
        if (fondale) {
            fondale.remove();
        }
    };

    const contaPerCategoria = catId => {
        const lista = tuttiFarmaci();
        if (catId === 'tutti') return lista.length;
        if (catId === 'studio') return personalizzati.length;
        return lista.filter(f => f.categoria === catId).length;
    };

    const corpo = el('div', { class: 'ds-prontuario-modal' });
    const grigliaFarmaci = el('div', { class: 'ds-prontuario-grid' });
    const labelContatore = el('span', { class: 'ds-muted', style: 'font-size: 0.85rem; font-weight: 560;' });

    const pulsantiCategoria = [];

    const aggiornaGriglia = () => {
        const tutti = tuttiFarmaci();
        const farmaciFiltrati = tutti.filter(f => {
            if (categoriaSelezionata === 'studio' && !f.isStudio) return false;
            if (categoriaSelezionata !== 'tutti' && categoriaSelezionata !== 'studio' && f.categoria !== categoriaSelezionata) return false;

            if (!filtroTesto) return true;
            const query = filtroTesto.toLowerCase().trim();
            return (f.farmaco && f.farmaco.toLowerCase().includes(query)) ||
                (f.principio_attivo && f.principio_attivo.toLowerCase().includes(query)) ||
                (f.note && f.note.toLowerCase().includes(query)) ||
                (f.dosaggio && f.dosaggio.toLowerCase().includes(query));
        });

        labelContatore.textContent = `${farmaciFiltrati.length} farmaci visualizzati (su ${tutti.length} totali)`;

        pulsantiCategoria.forEach(btn => {
            const isAttivo = btn.dataset.cat === categoriaSelezionata;
            btn.className = `ds-cat-chip ${isAttivo ? 'ds-cat-chip--active' : ''}`;
            const countElem = btn.querySelector('.ds-cat-chip__count');
            if (countElem) {
                countElem.textContent = String(contaPerCategoria(btn.dataset.cat));
            }
        });

        const cards = farmaciFiltrati.length === 0
            ? [el('div', { class: 'ds-empty-box' }, [
                icona('search_off'),
                el('strong', {}, 'Nessun farmaco corrispondente ai criteri di ricerca'),
                el('p', { class: 'ds-muted' }, 'Puoi inserire manualmente il farmaco oppure aggiungerlo al prontuario dello studio.')
            ])]
            : farmaciFiltrati.map(f => {
                const allerte = valutaCompatibilitaFarmaco({
                    farmaco: f.farmaco,
                    principioAttivo: f.principio_attivo,
                    anamnesi,
                    paziente
                });
                const haCritica = allerte.some(a => a.livello === 'critica');
                const haAttenzione = allerte.some(a => a.livello === 'attenzione');

                let cardClass = 'ds-drug-card';
                if (f.isStudio) cardClass += ' ds-drug-card--studio';
                if (haCritica) cardClass += ' ds-drug-card--danger';
                else if (haAttenzione) cardClass += ' ds-drug-card--warning';

                return el('div', {
                    class: cardClass,
                    onClick: () => {
                        chiudiQuestoModale();
                        onSeleziona(f);
                    }
                }, [
                    el('div', { class: 'ds-drug-card__header' }, [
                        el('div', { class: 'ds-drug-card__title-box' }, [
                            el('strong', { class: 'ds-drug-name' }, f.farmaco),
                            f.isStudio ? el('span', { class: 'ds-badge ds-badge--info' }, 'Studio') : null
                        ].filter(Boolean)),
                        el('div', { class: 'ds-drug-card__meta-row' }, [
                            el('div', { class: 'ds-drug-card__active' }, [
                                icona('science'),
                                el('span', {}, f.principio_attivo || 'Principio attivo')
                            ]),
                            f.dosaggio ? el('span', { class: 'ds-drug-card__dosage-badge' }, f.dosaggio) : null
                        ].filter(Boolean))
                    ]),
                    allerte.length > 0 ? el('div', {
                        class: `ds-drug-card__alert-banner ${haCritica ? 'ds-drug-card__alert-banner--critica' : 'ds-drug-card__alert-banner--attenzione'}`
                    }, [
                        icona(haCritica ? 'warning' : 'info'),
                        el('span', {}, allerte[0].titolo)
                    ]) : null,
                    el('div', { class: 'ds-drug-card__body' }, [
                        f.posologia ? el('div', { class: 'ds-drug-card__poso' }, [
                            icona('schedule'),
                            el('span', {}, f.posologia)
                        ]) : null,
                        f.durata_giorni ? el('div', { class: 'ds-drug-card__durata' }, [
                            icona('timelapse'),
                            el('span', {}, `Durata consigliata: ${f.durata_giorni} giorni`)
                        ]) : null,
                        f.note ? el('div', { class: 'ds-drug-card__note' }, f.note) : null
                    ].filter(Boolean))
                ]);
            });

        rimpiazza(grigliaFarmaci, cards);
    };

    const inputRicerca = el('input', {
        type: 'text',
        class: 'ds-input ds-search-input',
        placeholder: 'Cerca per nome commerciale (es. Augmentin, Oki, Brufen, Bentelan, Toradol), principio attivo o indicazione...',
        value: filtroTesto,
        onInput: e => {
            filtroTesto = e.target.value;
            aggiornaGriglia();
        }
    });

    const btnPulisci = el('button', {
        type: 'button',
        class: 'ds-btn ds-btn--ghost ds-btn--icon ds-btn--sm',
        style: 'display: none;',
        onClick: () => {
            filtroTesto = '';
            inputRicerca.value = '';
            btnPulisci.style.display = 'none';
            inputRicerca.focus();
            aggiornaGriglia();
        }
    }, icona('close'));

    inputRicerca.addEventListener('input', () => {
        btnPulisci.style.display = inputRicerca.value ? 'inline-flex' : 'none';
    });

    const barraRicerca = el('div', { class: 'ds-prontuario-search' }, [
        icona('search'),
        inputRicerca,
        btnPulisci
    ]);

    const chipsCategorie = el('div', { class: 'ds-prontuario-cats' }, [
        ...categorie.map(c => {
            const btn = el('button', {
                type: 'button',
                class: `ds-cat-chip ${categoriaSelezionata === c.id ? 'ds-cat-chip--active' : ''}`,
                onClick: () => {
                    categoriaSelezionata = c.id;
                    aggiornaGriglia();
                }
            }, [
                icona(c.simbolo || 'medication'),
                el('span', {}, c.etichetta),
                el('span', { class: 'ds-cat-chip__count' }, String(contaPerCategoria(c.id)))
            ]);
            btn.dataset.cat = c.id;
            pulsantiCategoria.push(btn);
            return btn;
        }),
        (() => {
            const btnStudio = el('button', {
                type: 'button',
                class: `ds-cat-chip ${categoriaSelezionata === 'studio' ? 'ds-cat-chip--active' : ''}`,
                onClick: () => {
                    categoriaSelezionata = 'studio';
                    aggiornaGriglia();
                }
            }, [
                icona('bookmark'),
                el('span', {}, 'Personalizzati Studio'),
                el('span', { class: 'ds-cat-chip__count' }, String(personalizzati.length))
            ]);
            btnStudio.dataset.cat = 'studio';
            pulsantiCategoria.push(btnStudio);
            return btnStudio;
        })()
    ]);

    const headbar = el('div', { class: 'ds-prontuario-headbar' }, [
        barraRicerca,
        chipsCategorie
    ]);

    const barraAggiunta = el('div', { class: 'ds-prontuario-footer-actions' }, [
        labelContatore,
        bottone({
            etichetta: 'Aggiungi nuovo farmaco personalizzato allo studio',
            simbolo: 'add',
            variante: 'ghost',
            piccolo: true,
            onClick: async () => {
                await apriFormNuovoFarmaco(async () => {
                    const ricaricatoRes = await call('prescrizioni.prontuario', {});
                    const ricaricato = dataOr(ricaricatoRes, (ricaricatoRes && ricaricatoRes.data) || (ricaricatoRes && ricaricatoRes.payload) || ricaricatoRes || {});
                    if (ricaricato && Array.isArray(ricaricato.personalizzati)) {
                        personalizzati.length = 0;
                        personalizzati.push(...ricaricato.personalizzati);
                        aggiornaGriglia();
                    }
                });
            }
        })
    ]);

    rimpiazza(corpo, [
        headbar,
        grigliaFarmaci,
        barraAggiunta
    ]);

    aggiornaGriglia();

    await apriModale({
        titolo: 'Prontuario Farmaceutico Odontoiatrico (100+ Farmaci)',
        corpo,
        extraAmpia: true,
        azioni: [
            {
                etichetta: 'Chiudi',
                variante: 'ghost',
                onAzione: chiudi => chiudi(true)
            }
        ]
    });
}

async function apriFormNuovoFarmaco(onSalvato) {
    const stato = {
        farmaco: '',
        principio_attivo: '',
        categoria: 'antibiotici',
        dosaggio: '',
        posologia: '',
        durata_giorni: 5,
        note: ''
    };

    const form = el('div', { class: 'ds-grid ds-grid--form' }, [
        el('div', { class: 'ds-field ds-field--wide' }, [
            el('label', { class: 'ds-field__label' }, 'Nome Commerciale Farmaco *'),
            el('input', {
                type: 'text',
                class: 'ds-input',
                placeholder: 'Es. Zimox / Moment / Pantorc...',
                onInput: e => { stato.farmaco = e.target.value; }
            })
        ]),
        el('div', { class: 'ds-field' }, [
            el('label', { class: 'ds-field__label' }, 'Principio Attivo'),
            el('input', {
                type: 'text',
                class: 'ds-input',
                placeholder: 'Es. Amoxicillina / Ibuprofene...',
                onInput: e => { stato.principio_attivo = e.target.value; }
            })
        ]),
        el('div', { class: 'ds-field' }, [
            el('label', { class: 'ds-field__label' }, 'Categoria'),
            el('select', {
                class: 'ds-select',
                onChange: e => { stato.categoria = e.target.value; }
            }, [
                el('option', { value: 'antibiotici' }, 'Antibiotici'),
                el('option', { value: 'fans_analgesici' }, 'FANS & Analgesici'),
                el('option', { value: 'cortisonici' }, 'Corticosteroidi'),
                el('option', { value: 'collutori_antisettici' }, 'Collutori & Antisettici'),
                el('option', { value: 'miorilassanti' }, 'Miorilassanti & ATM'),
                el('option', { value: 'antimicotici_antivirali' }, 'Antimicotici & Antivirali'),
                el('option', { value: 'gastroprotettori' }, 'Gastroprotettori'),
                el('option', { value: 'emostatici_altri' }, 'Emostatici & Altri')
            ])
        ]),
        el('div', { class: 'ds-field' }, [
            el('label', { class: 'ds-field__label' }, 'Dosaggio Tipico'),
            el('input', {
                type: 'text',
                class: 'ds-input',
                placeholder: 'Es. 1 g / 600 mg / 0.20%...',
                onInput: e => { stato.dosaggio = e.target.value; }
            })
        ]),
        el('div', { class: 'ds-field' }, [
            el('label', { class: 'ds-field__label' }, 'Durata consigliata (giorni)'),
            el('input', {
                type: 'number',
                class: 'ds-input',
                value: '5',
                min: '1',
                max: '90',
                onInput: e => { stato.durata_giorni = Number(e.target.value); }
            })
        ]),
        el('div', { class: 'ds-field ds-field--wide' }, [
            el('label', { class: 'ds-field__label' }, 'Posologia e Modalità di Assunzione'),
            el('input', {
                type: 'text',
                class: 'ds-input',
                placeholder: 'Es. 1 compressa ogni 12 ore a stomaco pieno...',
                onInput: e => { stato.posologia = e.target.value; }
            })
        ]),
        el('div', { class: 'ds-field ds-field--wide' }, [
            el('label', { class: 'ds-field__label' }, 'Note ed Avvertenze Cliniche'),
            el('textarea', {
                class: 'ds-textarea',
                rows: 2,
                placeholder: 'Precauzioni d\'uso, interazioni o raccomandazioni al paziente...',
                onInput: e => { stato.note = e.target.value; }
            })
        ])
    ]);

    await apriModale({
        titolo: 'Nuovo Farmaco nel Prontuario dello Studio',
        corpo: form,
        ampia: true,
        azioni: [
            {
                etichetta: 'Salva nel prontuario',
                simbolo: 'save',
                variante: 'primary',
                onAzione: async chiudi => {
                    if (!String(stato.farmaco || '').trim()) {
                        alert('Inserire il nome del farmaco');
                        return false;
                    }
                    const ris = await call('prescrizioni.salvaFarmaco', stato);
                    if (esito(ris, 'Farmaco aggiunto al prontuario dello studio')) {
                        if (typeof onSalvato === 'function') await onSalvato();
                        chiudi(true);
                    }
                }
            }
        ]
    });
}
