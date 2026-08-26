import { el, rimpiazza, icona } from '../../components/dom.js';
import { pannello, bottone, distintivo, spaziatore, vuoto, avviso, statistica, griglia } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { esito, errore } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import * as fmt from '../../kernel/format.js';
import { oggetto, pagina, elenco } from '../shared/vista.js';
import { selettorePaziente } from '../shared/selettore_paziente.js';

const TONI_STATO = {
    aperta: 'success',
    chiusa: 'neutral',
    fallita: 'danger'
};

export function consoleTrasmissione({ pazienteIniziale, naviga, onIndietro }) {
    const contenitore = el('div', { class: 'ds-trasmetti-console' });
    let inviatoIniziale = false;
    let postazioniSelezionate = new Set();
    let pazienteSelezionatoId = pazienteIniziale || null;
    let pazienteSelezionatoDati = null;
    let intervalloAggiornamento = null;

    const caricaPaziente = async (id) => {
        try {
            if (!id) {
                pazienteSelezionatoDati = null;
                return;
            }
            const dati = await call('pazienti.read', { id });
            if (dati && (dati.data || dati.id)) {
                pazienteSelezionatoDati = dati.data || dati;
            }
        } catch (_) {
            pazienteSelezionatoDati = null;
        }
    };

    const apriDiagnosticaRete = () => {
        try {
            const overlay = el('div', { class: 'ds-modal-overlay ds-diagnostica-overlay', style: 'position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(4px);' });
            const modal = el('div', { class: 'ds-modal ds-diagnostica-modal', style: 'max-width: 650px; width: 90%; background: #ffffff; border-radius: 16px; padding: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);' });

            const renderCorpo = async () => {
                try {
                    rimpiazza(modal, [
                        el('div', { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;' }, [
                            el('h3', { style: 'margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a;' }, 'Diagnostica Rete & Monitor DentalSuite'),
                            el('button', {
                                class: 'ds-btn ds-btn--ghost ds-btn--piccolo',
                                type: 'button',
                                onClick: () => overlay.remove()
                            }, icona('close'))
                        ]),
                        el('div', { style: 'padding: 24px; text-align: center; color: #64748b;' }, [
                            icona('radar'),
                            el('div', { style: 'margin-top: 8px; font-weight: 500;' }, 'Scansione nodi e monitor in corso...')
                        ])
                    ]);

                    const diag = await call('trasmissioni.diagnosticaRete', {});
                    const locale = diag.postazione_locale || {};
                    const monitors = diag.monitor_rilevati || [];

                    rimpiazza(modal, [
                        el('div', { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;' }, [
                            el('h3', { style: 'margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a;' }, 'Diagnostica Rete & Monitor DentalSuite'),
                            el('button', {
                                class: 'ds-btn ds-btn--ghost ds-btn--piccolo',
                                type: 'button',
                                onClick: () => overlay.remove()
                            }, icona('close'))
                        ]),
                        el('div', { style: 'background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 16px;' }, [
                            el('div', { style: 'font-weight: 700; color: #0f172a; margin-bottom: 4px;' }, `Postazione Locale: ${locale.nome_pc || 'PC Locale'}`),
                            el('div', { style: 'font-size: 0.85rem; color: #475569;' }, `Nome: ${locale.nome || '-'} · Ruolo: ${locale.ruolo === 'riunito' ? 'Monitor Studio' : 'Segreteria'} · Porta: ${locale.porta || 7345}`),
                            el('div', { style: 'font-size: 0.85rem; color: #475569;' }, `IP Locali: ${(locale.interfacce || []).map(i => i.ip).join(', ') || '127.0.0.1'}`)
                        ]),
                        el('div', { style: 'font-weight: 700; color: #0f172a; margin-bottom: 8px;' }, `Monitor Rilevati sulla Rete LAN (${monitors.length}):`),
                        monitors.length === 0
                            ? el('div', { style: 'padding: 16px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; color: #b45309; font-size: 0.9rem;' }, 'Nessun monitor rilevato in ascolto sugli altri computer. Verifica che DentalSuite sia aperto sul PC dello studio in modalità "Ricevi".')
                            : el('div', { style: 'display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto; margin-bottom: 16px;' }, monitors.map(m => el('div', {
                                style: 'display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px;'
                            }, [
                                el('div', {}, [
                                    el('div', { style: 'font-weight: 700; color: #166534;' }, m.nome || 'Monitor Studio'),
                                    el('div', { style: 'font-size: 0.8rem; color: #15803d;' }, `IP: ${m.ip}:${m.porta} · Ping: ${m.latenza_ms}ms · ${m.in_seduta ? 'In seduta' : 'Pronto a ricevere'}`)
                                ]),
                                el('span', { style: 'display: inline-block; padding: 4px 10px; background: #22c55e; color: #ffffff; border-radius: 9999px; font-size: 0.75rem; font-weight: 700;' }, 'ONLINE')
                            ]))),
                        el('div', { style: 'display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px;' }, [
                            el('button', {
                                class: 'ds-btn ds-btn--ghost',
                                type: 'button',
                                onClick: renderCorpo
                            }, [icona('refresh'), 'Scansiona di nuovo']),
                            el('button', {
                                class: 'ds-btn ds-btn--primary',
                                type: 'button',
                                onClick: () => overlay.remove()
                            }, 'Chiudi')
                        ])
                    ]);
                } catch (_) {}
            };

            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            renderCorpo();
        } catch (_) {}
    };

    const disegna = async () => {
        try {
            const [statoPostazioni, storico] = await Promise.all([
                call('trasmissioni.postazioni', {}).then(risultato => oggetto(risultato, { collegate: [], rete: null })),
                call('trasmissioni.elenco', { dimensione: 15 }).then(pagina)
            ]);

            const collegate = statoPostazioni.collegate || [];

            if (pazienteSelezionatoId && !pazienteSelezionatoDati) {
                await caricaPaziente(pazienteSelezionatoId);
            }

            const aperte = storico.righe.filter(riga => riga.stato === 'aperta');

            const eseguiInvio = async () => {
                try {
                    if (postazioniSelezionate.size === 0) {
                        errore('Seleziona prima almeno un monitor online di destinazione');
                        return;
                    }
                    if (!pazienteSelezionatoId) {
                        errore('Seleziona il paziente da trasmettere');
                        return;
                    }

                    const sessioni = Array.from(postazioniSelezionate);
                    const risposta = await call('trasmissioni.invia', {
                        paziente_id: pazienteSelezionatoId,
                        sessione_ids: sessioni
                    });

                    if (esito(risposta, 'Cartella clinica trasmessa con successo')) {
                        await disegna();
                    }
                } catch (e) {
                    errore(e.message || 'Errore durante la trasmissione');
                }
            };

            const chiudi = async riga => {
                try {
                    if (!esito(await call('trasmissioni.chiudi', { id: riga.id }), 'Scheda chiusa')) return;
                    await disegna();
                } catch (e) {
                    errore(e.message || 'Errore nella chiusura della scheda');
                }
            };

            const selettoreSchermi = () => {
                if (collegate.length === 0) {
                    return vuoto({
                        titolo: 'Nessun monitor online rilevato',
                        testo: 'Apri DentalSuite sulla postazione del medico e seleziona "Ricevi" per renderla visibile qui.',
                        simbolo: 'desktop_windows'
                    });
                }

                return el('div', { class: 'ds-schermi-grid' }, collegate.map(voce => {
                    const selezionato = postazioniSelezionate.has(voce.sessione_id);
                    return el('button', {
                        class: `ds-schermo-card ${selezionato ? 'ds-schermo-card--selezionato' : ''} ${voce.in_seduta ? 'ds-schermo-card--in-seduta' : ''}`,
                        type: 'button',
                        onClick: () => {
                            if (postazioniSelezionate.has(voce.sessione_id)) {
                                postazioniSelezionate.delete(voce.sessione_id);
                            } else {
                                postazioniSelezionate.add(voce.sessione_id);
                            }
                            disegna();
                        }
                    }, [
                        el('div', { class: 'ds-schermo-card__testa' }, [
                            el('div', { class: 'ds-schermo-card__icona' }, icona('monitor')),
                            el('div', { class: 'ds-schermo-card__check' }, [
                                icona(selezionato ? 'check_circle' : 'radio_button_unchecked')
                            ])
                        ]),
                        el('div', { class: 'ds-schermo-card__titolo' }, voce.nome || 'Monitor dello studio'),
                        el('div', { class: 'ds-schermo-card__indirizzo' }, voce.indirizzo || 'Rete locale'),
                        el('div', { class: 'ds-schermo-card__stato' }, [
                            el('span', { class: `ds-schermo-card__spia ${voce.in_seduta ? 'ds-schermo-card__spia--seduta' : 'ds-schermo-card__spia--online'}` }),
                            voce.in_seduta ? `In seduta: ${voce.paziente_nome || 'Paziente'}` : 'Pronto a ricevere'
                        ])
                    ]);
                }));
            };

            const pannelloSelezionePaziente = () => {
                if (postazioniSelezionate.size === 0) {
                    return el('div', { class: 'ds-trasmetti-paziente-wrap' }, [
                        el('div', { style: 'padding: 16px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; color: #64748b; font-size: 0.9rem; text-align: center;' }, [
                            icona('info'),
                            el('div', { style: 'margin-top: 4px;' }, 'Seleziona prima almeno un monitor sopra per poter scegliere la cartella del paziente da trasmettere.')
                        ])
                    ]);
                }

                return el('div', { class: 'ds-trasmetti-paziente-wrap' }, [
                    pazienteSelezionatoDati
                        ? el('div', { class: 'ds-paziente-selezionato-card' }, [
                            el('div', { class: 'ds-paziente-selezionato-card__info' }, [
                                el('div', { class: 'ds-paziente-selezionato-card__avatar' }, icona('person')),
                                el('div', {}, [
                                    el('div', { class: 'ds-paziente-selezionato-card__nome' },
                                        `${pazienteSelezionatoDati.cognome} ${pazienteSelezionatoDati.nome}`
                                    ),
                                    el('div', { class: 'ds-paziente-selezionato-card__meta' }, [
                                        pazienteSelezionatoDati.codice_fiscale ? `CF: ${pazienteSelezionatoDati.codice_fiscale}` : '',
                                        pazienteSelezionatoDati.data_nascita ? `Nascita: ${fmt.data(pazienteSelezionatoDati.data_nascita)}` : ''
                                    ].filter(Boolean).join(' · '))
                                ])
                            ]),
                            el('button', {
                                class: 'ds-btn ds-btn--ghost ds-btn--piccolo',
                                type: 'button',
                                onClick: () => {
                                    pazienteSelezionatoId = null;
                                    pazienteSelezionatoDati = null;
                                    disegna();
                                }
                            }, [icona('close'), 'Cambia'])
                        ])
                        : el('div', { class: 'ds-paziente-non-selezionato', style: 'padding: 12px 0;' }, [
                            el('button', {
                                class: 'ds-btn ds-btn--secondary ds-btn--tocco',
                                type: 'button',
                                onClick: async () => {
                                    try {
                                        const scelto = await selettorePaziente();
                                        if (scelto) {
                                            pazienteSelezionatoId = scelto;
                                            await caricaPaziente(scelto);
                                            disegna();
                                        }
                                    } catch (_) {}
                                }
                            }, [icona('search'), 'Cerca e Seleziona Paziente dalla Rubrica'])
                        ])
                ]);
            };

            rimpiazza(contenitore, [
                el('div', { class: 'ds-trasmetti-header' }, [
                    onIndietro
                        ? el('button', {
                            class: 'ds-btn ds-btn--ghost ds-btn--piccolo',
                            type: 'button',
                            onClick: () => {
                                if (intervalloAggiornamento) clearInterval(intervalloAggiornamento);
                                onIndietro();
                            }
                        }, [icona('arrow_back'), 'Torna alla scelta'])
                        : null
                ].filter(Boolean)),

                griglia({ colonne: 3 }, [
                    statistica({ etichetta: 'Monitor online', valore: String(collegate.length), tono: collegate.length > 0 ? 'positivo' : undefined }),
                    statistica({ etichetta: 'Sedute attive adesso', valore: String(aperte.length), tono: aperte.length > 0 ? 'positivo' : undefined }),
                    statistica({ etichetta: 'Monitor selezionati', valore: String(postazioniSelezionate.size) })
                ]),

                pannello({
                    titolo: '1. Seleziona i monitor online di destinazione',
                    azioni: [
                        spaziatore(),
                        bottone({
                            etichetta: 'Diagnostica Rete',
                            simbolo: 'radar',
                            variante: 'ghost',
                            onClick: apriDiagnosticaRete
                        }),
                        bottone({
                            etichetta: 'Aggiorna schermi',
                            simbolo: 'refresh',
                            variante: 'ghost',
                            onClick: disegna
                        })
                    ]
                }, selettoreSchermi()),

                pannello({
                    titolo: '2. Seleziona la cartella clinica del paziente'
                }, pannelloSelezionePaziente()),

                el('div', { class: 'ds-trasmetti-invio-barra' }, [
                    el('button', {
                        class: 'ds-btn ds-btn--primary ds-btn--tocco ds-trasmetti-btn-invia',
                        type: 'button',
                        disabled: !pazienteSelezionatoId || postazioniSelezionate.size === 0,
                        onClick: eseguiInvio
                    }, [
                        icona('send'),
                        `Invia Cartella Clinica a ${postazioniSelezionate.size} Monitor`
                    ])
                ]),

                pannello({ titolo: 'Sedute cliniche in corso', flush: true }, tabella({
                    colonne: [
                        { titolo: 'Quando', rendi: riga => fmt.dataOra(riga.aperta_il) },
                        { titolo: 'Paziente', campo: 'paziente_nome' },
                        { titolo: 'Monitor', campo: 'postazione_nome' },
                        {
                            titolo: 'Stato',
                            rendi: riga => distintivo(fmt.etichettaStato(riga.stato), TONI_STATO[riga.stato] || 'neutral')
                        },
                        {
                            titolo: '',
                            rendi: riga => azioniRiga([
                                riga.paziente_id ? bottone({
                                    simbolo: 'person', variante: 'ghost', piccolo: true, titolo: 'Apri cartella',
                                    onClick: () => naviga('paziente', { id: riga.paziente_id })
                                }) : null,
                                riga.stato === 'aperta' ? bottone({
                                    simbolo: 'logout', variante: 'ghost', piccolo: true, titolo: 'Chiudi la scheda sul monitor',
                                    onClick: () => chiudi(riga)
                                }) : null
                            ])
                        }
                    ],
                    righe: storico.righe,
                    vuotoTitolo: 'Nessuna seduta attiva al momento',
                    vuotoTesto: 'Quando trasmetti una cartella a un monitor dello studio, la seduta attiva compare qui.',
                    vuotoSimbolo: 'cast'
                }))
            ]);

            if (pazienteIniziale && !inviatoIniziale && collegate.length > 0) {
                inviatoIniziale = true;
                postazioniSelezionate.add(collegate[0].sessione_id);
                await eseguiInvio();
            }
        } catch (_) {}
    };

    disegna();
    intervalloAggiornamento = setInterval(() => {
        try {
            if (contenitore.isConnected) {
                disegna();
            } else {
                clearInterval(intervalloAggiornamento);
            }
        } catch (_) {}
    }, 3000);

    return contenitore;
}
