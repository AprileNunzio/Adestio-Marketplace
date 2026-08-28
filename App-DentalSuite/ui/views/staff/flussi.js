import { el, rimpiazza, icona } from '../../components/dom.js';
import { pannello, statistica, griglia, vuoto, distintivo, avviso, bottone, spaziatore } from '../../components/layout.js';
import { flussoMensile, distribuzione } from '../../components/grafici.js';
import { barreOrizzontali } from '../../components/barre.js';
import { call } from '../../kernel/transport.js';
import * as fmt from '../../kernel/format.js';
import { oggetto } from '../shared/vista.js';

function inizioMese(offsetMesi = 0) {
    try {
        const adesso = new Date();
        return fmt.isoDa(new Date(adesso.getFullYear(), adesso.getMonth() - offsetMesi, 1));
    } catch {
        return '';
    }
}

function fineMese() {
    try {
        const adesso = new Date();
        return fmt.isoDa(new Date(adesso.getFullYear(), adesso.getMonth() + 1, 0));
    } catch {
        return '';
    }
}

function inizioAnno() {
    try {
        const adesso = new Date();
        return fmt.isoDa(new Date(adesso.getFullYear(), 0, 1));
    } catch {
        return '';
    }
}

export async function rendiFlussiStaff({ collaboratori, staffInizialeId }) {
    const contenitore = el('div', { class: 'ds-root' });
    try {
        if (!collaboratori || collaboratori.length === 0) {
            return vuoto({
                titolo: 'Nessun collaboratore disponibile',
                testo: 'Registra i collaboratori nello studio per analizzarne i flussi di rendimento.',
                simbolo: 'insights'
            });
        }

        let staffSceltoId = staffInizialeId || collaboratori[0].id;
        const filtro = {
            staff_id: staffSceltoId,
            dal: inizioMese(5),
            al: fineMese()
        };

        const disegna = async () => {
            try {
                const dati = oggetto(await call('compensi.flussiStaff', filtro), null);
                if (!dati) {
                    rimpiazza(contenitore, vuoto({ titolo: 'Dati flussi non disponibili', simbolo: 'insights' }));
                    return;
                }

                const impostaPreset = (dal, al) => {
                    filtro.dal = dal;
                    filtro.al = al;
                    disegna();
                };

                const campoStaff = el('select', {
                    class: 'ds-select',
                    onChange: evento => {
                        filtro.staff_id = evento.target.value;
                        staffSceltoId = evento.target.value;
                        disegna();
                    }
                }, collaboratori.map(voce => el('option', {
                    value: voce.id, selected: voce.id === filtro.staff_id
                }, `${voce.nominativo} (${fmt.etichettaStato(voce.ruolo)})`)));

                const campoDal = el('input', {
                    class: 'ds-input', type: 'date', value: filtro.dal,
                    onChange: evento => { filtro.dal = evento.target.value; disegna(); }
                });

                const campoAl = el('input', {
                    class: 'ds-input', type: 'date', value: filtro.al,
                    onChange: evento => { filtro.al = evento.target.value; disegna(); }
                });

                const presetBtns = el('div', { class: 'ds-toolbar', style: 'margin-bottom: 12px; gap: 6px;' }, [
                    bottone({
                        etichetta: 'Mese corrente',
                        variante: 'ghost',
                        piccolo: true,
                        onClick: () => impostaPreset(inizioMese(0), fineMese())
                    }),
                    bottone({
                        etichetta: 'Ultimi 3 mesi',
                        variante: 'ghost',
                        piccolo: true,
                        onClick: () => impostaPreset(inizioMese(2), fineMese())
                    }),
                    bottone({
                        etichetta: 'Ultimi 6 mesi',
                        variante: 'ghost',
                        piccolo: true,
                        onClick: () => impostaPreset(inizioMese(5), fineMese())
                    }),
                    bottone({
                        etichetta: 'Anno in corso',
                        variante: 'ghost',
                        piccolo: true,
                        onClick: () => impostaPreset(inizioAnno(), fineMese())
                    }),
                    bottone({
                        etichetta: 'Tutto lo storico',
                        variante: 'ghost',
                        piccolo: true,
                        onClick: () => impostaPreset('', '')
                    })
                ]);

                rimpiazza(contenitore, [
                    pannello({
                        titolo: `Analisi & Rendimento 360° · ${dati.nominativo}`,
                        azioni: [campoStaff, el('span', { class: 'ds-muted' }, 'Periodo:'), campoDal, campoAl]
                    }, [
                        presetBtns,
                        el('div', { style: 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;' }, [
                            distintivo(fmt.etichettaStato(dati.ruolo), 'primary'),
                            dati.specializzazione ? distintivo(dati.specializzazione, 'info') : null,
                            dati.compenso_mensile > 0 ? distintivo(`Fisso: ${fmt.euro(dati.compenso_mensile)}/mese`, 'success') : null,
                            dati.percentuale_default > 0 ? distintivo(`Quota base: ${dati.percentuale_default}%`, 'info') : null,
                            distintivo(`Ritenuta: ${dati.ritenuta_percentuale}%`, 'neutral')
                        ].filter(Boolean))
                    ]),
                    griglia('stats', [
                        statistica({
                            etichetta: 'Fatturato prodotto',
                            valore: fmt.euro(dati.totale_prodotto),
                            nota: `${dati.trattamenti_eseguiti} prestazioni eseguite`,
                            tono: 'positivo'
                        }),
                        statistica({
                            etichetta: 'Competenze maturate',
                            valore: fmt.euro(dati.competenze_maturate),
                            nota: `Incidenza: ${dati.incidenza_staff_percentuale}% del fatturato`
                        }),
                        statistica({
                            etichetta: 'Margine netto studio',
                            valore: fmt.euro(dati.margine_studio),
                            nota: `Marginalità studio: ${dati.marginalita_percentuale}%`,
                            tono: dati.margine_studio >= 0 ? 'positivo' : 'pericolo'
                        }),
                        statistica({
                            etichetta: 'Costo materiali stimato',
                            valore: fmt.euro(dati.costo_materiali),
                            nota: 'Incidenza materiali sul totale'
                        })
                    ]),
                    griglia('stats', [
                        statistica({
                            etichetta: 'Pazienti unici curati',
                            valore: String(dati.pazienti_unici),
                            nota: `Valore medio per paziente: ${fmt.euro(dati.valore_medio_paziente)}`
                        }),
                        statistica({
                            etichetta: 'Ticket medio prestazione',
                            valore: fmt.euro(dati.ticket_medio_trattamento),
                            nota: 'Importo medio per trattamento'
                        }),
                        statistica({
                            etichetta: 'Resa oraria produzione',
                            valore: `${fmt.euro(dati.resa_oraria)}/h`,
                            nota: `Su ${dati.presenze ? dati.presenze.ore_effettive : 0} ore lavorate stimate`,
                            tono: 'positivo'
                        }),
                        statistica({
                            etichetta: 'Guadagno orario staff',
                            valore: `${fmt.euro(dati.guadagno_orario)}/h`,
                            nota: 'Compenso maturato per ora lavorata'
                        })
                    ]),
                    pannello({
                        titolo: 'Andamento & Flusso Mensile (Fatturato vs Compensi)',
                        simbolo: 'timeline'
                    }, flussoMensile({
                        voci: dati.flusso_mensile || [],
                        formatta: fmt.euro
                    })),
                    el('div', { class: 'ds-grid ds-grid--2' }, [
                        pannello({
                            titolo: 'Ripartizione per Branca / Categoria',
                            simbolo: 'donut_large'
                        }, distribuzione({
                            voci: dati.per_categoria || [],
                            formatta: fmt.euro,
                            titoloVuoto: 'Nessun trattamento eseguito nel periodo'
                        })),
                        pannello({
                            titolo: 'Top Prestazioni per Fatturato',
                            simbolo: 'leaderboard'
                        }, barreOrizzontali(
                            dati.top_prestazioni || [],
                            fmt.euro
                        ))
                    ]),
                    el('div', { class: 'ds-grid ds-grid--2' }, [
                        pannello({
                            titolo: 'Presenze, Turni & Disponibilità',
                            simbolo: 'schedule'
                        }, griglia('stats', [
                            statistica({
                                etichetta: 'Ore settimanali turno',
                                valore: `${dati.presenze ? dati.presenze.ore_settimanali : 0} h`,
                                nota: 'Pianificate da orario'
                            }),
                            statistica({
                                etichetta: 'Ore effettive stimate',
                                valore: `${dati.presenze ? dati.presenze.ore_effettive : 0} h`,
                                nota: 'Al netto di assenze'
                            }),
                            statistica({
                                etichetta: 'Giorni di ferie',
                                valore: String(dati.presenze ? dati.presenze.giorni_ferie : 0),
                                nota: 'Nel periodo selezionato'
                            }),
                            statistica({
                                etichetta: 'Permessi e malattia',
                                valore: String(dati.presenze ? (dati.presenze.giorni_permesso + dati.presenze.giorni_malattia) : 0),
                                nota: 'Giorni registrati'
                            })
                        ])),
                        pannello({
                            titolo: 'Performance Agenda & Visite Pazienti',
                            simbolo: 'event_available'
                        }, griglia('stats', [
                            statistica({
                                etichetta: 'Appuntamenti totali',
                                valore: String(dati.agenda ? dati.agenda.totali : 0),
                                nota: `Tasso completamento: ${dati.agenda ? dati.agenda.tasso_aderenza : 100}%`
                            }),
                            statistica({
                                etichetta: 'Visite concluse',
                                valore: String(dati.agenda ? dati.agenda.conclusi : 0),
                                tono: 'positivo'
                            }),
                            statistica({
                                etichetta: 'Pazienti non presentati',
                                valore: String(dati.agenda ? dati.agenda.non_presentati : 0),
                                tono: dati.agenda && dati.agenda.non_presentati > 0 ? 'pericolo' : 'neutro'
                            }),
                            statistica({
                                etichetta: 'Appuntamenti annullati',
                                valore: String(dati.agenda ? dati.agenda.annullati : 0)
                            })
                        ]))
                    ]),
                    pannello({
                        titolo: 'Riepilogo Liquidazioni & Stato Compensi',
                        simbolo: 'account_balance_wallet'
                    }, griglia('stats', [
                        statistica({
                            etichetta: 'Totale già liquidato',
                            valore: fmt.euro(dati.totale_liquidato),
                            nota: 'Liquidazioni formalizzate nel periodo'
                        }),
                        statistica({
                            etichetta: 'Totale ancora aperto',
                            valore: fmt.euro(dati.totale_da_liquidare),
                            nota: 'Compensi maturati in attesa di liquidazione',
                            tono: dati.totale_da_liquidare > 0 ? 'avviso' : 'positivo'
                        })
                    ]))
                ]);
            } catch (err) {
                rimpiazza(contenitore, vuoto({
                    titolo: 'Errore durante l\'analisi flussi',
                    testo: String(err && err.message ? err.message : err),
                    simbolo: 'error'
                }));
            }
        };

        await disegna();
    } catch {
        return vuoto({ titolo: 'Errore inizializzazione flussi staff', simbolo: 'error' });
    }
    return contenitore;
}
