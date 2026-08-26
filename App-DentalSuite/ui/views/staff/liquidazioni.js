import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, statistica, griglia, spaziatore, vuoto, distintivo, avviso } from '../../components/layout.js';
import { tabella } from '../../components/tabella.js';
import { apriModale } from '../../components/modale.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import * as fmt from '../../kernel/format.js';
import { elenco, oggetto } from '../shared/vista.js';

function inizioMese() {
    const adesso = new Date();
    return fmt.isoDa(new Date(adesso.getFullYear(), adesso.getMonth(), 1));
}

function fineMese() {
    const adesso = new Date();
    return fmt.isoDa(new Date(adesso.getFullYear(), adesso.getMonth() + 1, 0));
}

function gruppi(titolo, voci, formatta, attivo, onScegli) {
    if (voci.length === 0) return null;
    return el('div', {}, [
        el('div', { class: 'ds-field__label' }, titolo),
        el('div', { class: 'ds-scelta' }, voci.map(voce => el('button', {
            class: 'ds-scelta__voce',
            type: 'button',
            'aria-pressed': String(attivo === voce.etichetta),
            onClick: () => onScegli(attivo === voce.etichetta ? null : voce.etichetta)
        }, `${formatta(voce.etichetta)} · ${fmt.euro(voce.totale)} (${voce.voci})`)))
    ]);
}

export async function rendiLiquidazioni({ collaboratori, permessi }) {
    const contenitore = el('div', { class: 'ds-root' });
    if (collaboratori.length === 0) {
        return vuoto({
            titolo: 'Nessun collaboratore attivo',
            testo: 'Registra i collaboratori prima di liquidare i compensi.',
            simbolo: 'payments'
        });
    }

    const filtro = {
        staff_id: collaboratori[0].id,
        periodo_dal: inizioMese(),
        periodo_al: fineMese()
    };
    let selezionati = new Set();
    let categoriaAttiva = null;
    let giornoAttivo = null;

    const disegna = async () => {
        const [maturato, storico] = await Promise.all([
            call('compensi.maturato', filtro).then(risultato => oggetto(risultato, null)),
            call('compensi.listLiquidazioni', { staff_id: filtro.staff_id }).then(elenco)
        ]);

        if (!maturato) {
            rimpiazza(contenitore, vuoto({ titolo: 'Maturato non calcolabile', simbolo: 'payments' }));
            return;
        }

        const visibili = maturato.voci
            .filter(voce => !categoriaAttiva || voce.categoria === categoriaAttiva)
            .filter(voce => !giornoAttivo || voce.data === giornoAttivo);

        const sceltiVisibili = visibili.filter(voce => selezionati.has(voce.id));
        const totaleScelto = sceltiVisibili.reduce((somma, voce) => somma + voce.quota, 0);

        const paga = async (richiesta, descrizione) => {
            const anteprima = oggetto(await call('compensi.calcola', { ...filtro, ...richiesta }), null);
            if (!anteprima) return;
            const procedi = await apriModale({
                titolo: `Liquidare ${descrizione}?`,
                corpo: [
                    el('p', {}, `${maturato.collaboratore} · ${fmt.data(filtro.periodo_dal)} — ${fmt.data(filtro.periodo_al)}`),
                    griglia('stats', [
                        statistica({ etichetta: 'Fisso', valore: fmt.euro(anteprima.totale_mensilita) }),
                        statistica({ etichetta: 'Variabile', valore: fmt.euro(anteprima.totale_variabile), nota: `${anteprima.numero_trattamenti} voci` }),
                        statistica({ etichetta: 'Ritenuta', valore: fmt.euro(anteprima.ritenuta_acconto) }),
                        statistica({ etichetta: 'Netto', valore: fmt.euro(anteprima.totale_liquidato), tono: 'positivo' })
                    ])
                ],
                azioni: [
                    { etichetta: 'Annulla', variante: 'ghost', esito: false },
                    { etichetta: 'Liquida', simbolo: 'payments', esito: true }
                ]
            });
            if (procedi !== true) return;
            if (esito(await call('compensi.liquida', { ...filtro, ...richiesta }), 'Liquidazione emessa')) {
                selezionati = new Set();
                await disegna();
            }
        };

        const campoStaff = el('select', {
            class: 'ds-select',
            onChange: evento => {
                filtro.staff_id = evento.target.value;
                selezionati = new Set();
                categoriaAttiva = null;
                giornoAttivo = null;
                disegna();
            }
        }, collaboratori.map(voce => el('option', {
            value: voce.id, selected: voce.id === filtro.staff_id
        }, voce.nominativo)));

        const campoData = (chiave) => el('input', {
            class: 'ds-input', type: 'date', value: filtro[chiave],
            onChange: evento => { filtro[chiave] = evento.target.value; disegna(); }
        });

        rimpiazza(contenitore, [
            griglia('stats', [
                statistica({
                    etichetta: 'Fisso mensile maturato',
                    valore: fmt.euro(maturato.totale_mensilita_aperto),
                    nota: maturato.compenso_mensile > 0 ? `${fmt.euro(maturato.compenso_mensile)} al mese` : 'nessun fisso'
                }),
                statistica({ etichetta: 'Variabile maturato', valore: fmt.euro(maturato.totale_variabile), nota: `${maturato.voci.length} voci` }),
                statistica({ etichetta: 'Totale da liquidare', valore: fmt.euro(maturato.totale_maturato), tono: 'positivo' }),
                statistica({ etichetta: 'Selezionato', valore: fmt.euro(totaleScelto), nota: `${sceltiVisibili.length} voci` })
            ]),
            maturato.mensilita_aperte.length > 0
                ? avviso({
                    tono: 'info',
                    simbolo: 'event_repeat',
                    titolo: 'Mensilità ancora aperte',
                    voci: maturato.mensilita_aperte.map(voce =>
                        `${voce.periodo}: ${fmt.euro(voce.importo)} (${voce.giorni_coperti} giorni su ${voce.giorni_mese})`)
                })
                : null,
            pannello({
                titolo: 'Compensi maturati e non liquidati',
                azioni: [campoStaff, campoData('periodo_dal'), campoData('periodo_al')]
            }, [
                gruppi('Per categoria', maturato.per_categoria, fmt.etichettaStato, categoriaAttiva, valore => {
                    categoriaAttiva = valore;
                    disegna();
                }),
                gruppi('Per giornata', maturato.per_giorno, fmt.data, giornoAttivo, valore => {
                    giornoAttivo = valore;
                    disegna();
                }),
                el('div', { class: 'ds-toolbar' }, [
                    permessi.liquida && maturato.totale_mensilita_aperto > 0
                        ? bottone({
                            etichetta: 'Liquida solo il fisso',
                            simbolo: 'event_available',
                            variante: 'ghost',
                            onClick: () => paga({ mensilita: maturato.mensilita_aperte.map(voce => voce.periodo) }, 'la sola mensilità')
                        })
                        : null,
                    permessi.liquida && sceltiVisibili.length > 0
                        ? bottone({
                            etichetta: `Liquida ${sceltiVisibili.length} voci selezionate`,
                            simbolo: 'playlist_add_check',
                            variante: 'ghost',
                            onClick: () => paga({ trattamenti: sceltiVisibili.map(voce => voce.id) }, 'le voci selezionate')
                        })
                        : null,
                    spaziatore(),
                    permessi.liquida && maturato.totale_maturato > 0
                        ? bottone({
                            etichetta: 'Liquida tutto il maturato',
                            simbolo: 'payments',
                            onClick: () => paga({}, 'l\'intero maturato del periodo')
                        })
                        : null
                ].filter(Boolean))
            ]),
            pannello({ titolo: `Voci variabili · ${visibili.length}`, flush: true }, tabella({
                colonne: [
                    {
                        titolo: '',
                        rendi: voce => el('input', {
                            type: 'checkbox',
                            checked: selezionati.has(voce.id),
                            onChange: evento => {
                                if (evento.target.checked) selezionati.add(voce.id);
                                else selezionati.delete(voce.id);
                                disegna();
                            }
                        })
                    },
                    { titolo: 'Data', rendi: voce => fmt.data(voce.data) },
                    { titolo: 'Prestazione', campo: 'descrizione' },
                    { titolo: 'Categoria', rendi: voce => (voce.categoria ? distintivo(fmt.etichettaStato(voce.categoria), 'info') : '—') },
                    { titolo: 'Ruolo', rendi: voce => (voce.ruolo === 'medico' ? 'Esecutore' : 'Assistente') },
                    { titolo: 'Importo', numerica: true, rendi: voce => fmt.euro(voce.importo) },
                    { titolo: 'Quota', numerica: true, rendi: voce => fmt.euro(voce.quota) }
                ],
                righe: visibili,
                vuotoTitolo: 'Nessuna voce variabile da liquidare',
                vuotoTesto: 'Solo i trattamenti eseguiti e non ancora liquidati concorrono al compenso variabile.',
                vuotoSimbolo: 'playlist_add_check'
            })),
            pannello({ titolo: 'Storico liquidazioni', flush: true }, tabella({
                colonne: [
                    { titolo: 'Emessa il', rendi: riga => fmt.data(riga.data_liquidazione) },
                    { titolo: 'Periodo', rendi: riga => `${fmt.data(riga.periodo_dal)} — ${fmt.data(riga.periodo_al)}` },
                    { titolo: 'Fisso', numerica: true, rendi: riga => fmt.euro(riga.totale_mensilita) },
                    { titolo: 'Variabile', numerica: true, rendi: riga => fmt.euro(riga.totale_variabile) },
                    { titolo: 'Voci', numerica: true, campo: 'numero_trattamenti' },
                    { titolo: 'Ritenuta', numerica: true, rendi: riga => fmt.euro(riga.ritenuta_acconto) },
                    { titolo: 'Netto', numerica: true, rendi: riga => fmt.euro(riga.totale_liquidato) },
                    { titolo: 'Pagamento', rendi: riga => fmt.etichettaStato(riga.metodo_pagamento) }
                ],
                righe: storico,
                vuotoTitolo: 'Nessuna liquidazione emessa',
                vuotoTesto: 'Puoi liquidare l\'intero maturato, solo il fisso mensile, oppure singole voci scelte.',
                vuotoSimbolo: 'receipt'
            }))
        ]);
    };

    await disegna();
    return contenitore;
}
