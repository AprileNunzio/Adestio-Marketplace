import { el, rimpiazza, icona } from '../../components/dom.js';
import { distintivo } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { esito, errore } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import * as fmt from '../../kernel/format.js';
import { oggetto, pagina } from '../shared/vista.js';
import { selettorePaziente } from '../shared/selettore_paziente.js';

const TONI_STATO = {
    aperta: 'success',
    chiusa: 'neutral',
    fallita: 'danger'
};

export function consoleTrasmissione({ pazienteIniziale, postazione, naviga, onIndietro }) {
    const contenitore = el('div', { class: 'ds-tx-console-wrap' });
    let inviatoIniziale = false;
    let postazioniSelezionate = new Set();
    let pazienteSelezionatoId = pazienteIniziale || null;
    let pazienteSelezionatoDati = null;
    let intervalloAggiornamento = null;
    let inScansione = false;

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
            const overlay = el('div', {
                class: 'ds-modal-overlay ds-diagnostica-overlay',
                style: 'position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); display: flex; align-items: center; justify-content: center; z-index: 99999; backdrop-filter: blur(5px);'
            });
            const modal = el('div', {
                class: 'ds-modal ds-diagnostica-modal',
                style: 'max-width: 680px; width: 92%; background: #ffffff; border-radius: 18px; padding: 26px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3); border: 1px solid #e2e8f0;'
            });

            const renderCorpo = async () => {
                try {
                    rimpiazza(modal, [
                        el('div', { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;' }, [
                            el('div', { style: 'display: flex; align-items: center; gap: 10px;' }, [
                                el('div', { style: 'width: 36px; height: 36px; border-radius: 10px; background: #f0fdfa; color: #0d9488; display: flex; align-items: center; justify-content: center;' }, icona('radar')),
                                el('h3', { style: 'margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a;' }, 'Diagnostica Rete & Monitor')
                            ]),
                            el('button', {
                                class: 'ds-btn ds-btn--ghost ds-btn--piccolo',
                                type: 'button',
                                onClick: () => overlay.remove()
                            }, icona('close'))
                        ]),
                        el('div', { style: 'padding: 28px; text-align: center; color: #64748b;' }, [
                            icona('sync'),
                            el('div', { style: 'margin-top: 10px; font-weight: 500; font-size: 0.95rem;' }, 'Interrogazione nodi LAN e monitor attivi...')
                        ])
                    ]);

                    const diag = await call('trasmissioni.diagnosticaRete', {});
                    const locale = diag.postazione_locale || {};
                    const monitors = diag.monitor_rilevati || [];

                    rimpiazza(modal, [
                        el('div', { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;' }, [
                            el('div', { style: 'display: flex; align-items: center; gap: 10px;' }, [
                                el('div', { style: 'width: 36px; height: 36px; border-radius: 10px; background: #f0fdfa; color: #0d9488; display: flex; align-items: center; justify-content: center;' }, icona('radar')),
                                el('h3', { style: 'margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a;' }, 'Diagnostica Rete & Monitor')
                            ]),
                            el('button', {
                                class: 'ds-btn ds-btn--ghost ds-btn--piccolo',
                                type: 'button',
                                onClick: () => overlay.remove()
                            }, icona('close'))
                        ]),
                        el('div', { style: 'background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 18px;' }, [
                            el('div', { style: 'font-weight: 700; color: #0f172a; font-size: 1rem; margin-bottom: 6px;' }, `Postazione Locale: ${locale.nome_pc || 'Questo Computer'}`),
                            el('div', { style: 'font-size: 0.85rem; color: #475569; line-height: 1.5;' }, [
                                el('div', {}, `Nome: ${locale.nome || 'Segreteria'} · Ruolo: ${locale.ruolo === 'riunito' ? 'Monitor Medico (Poltrona)' : 'Segreteria'} · Porta HTTP: ${locale.porta || 7345}`),
                                el('div', {}, `Indirizzi IP Locali: ${(locale.interfacce || []).map(i => i.ip).join(', ') || '127.0.0.1'}`)
                            ])
                        ]),
                        el('div', { style: 'font-weight: 700; color: #0f172a; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;' }, [
                            el('span', {}, `Monitor Rilevati sulla Rete LAN (${monitors.length}):`),
                            el('span', { style: 'font-size: 0.8rem; color: #64748b; font-weight: 400;' }, 'Auto-Discovery P2P attivo')
                        ]),
                        monitors.length === 0
                            ? el('div', { style: 'padding: 20px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; color: #92400e; font-size: 0.9rem; line-height: 1.5;' }, [
                                el('div', { style: 'font-weight: 600; margin-bottom: 4px;' }, 'Nessun monitor attivo rilevato sulla subnet.'),
                                el('div', {}, 'Apri DentalSuite sull\'altro computer dello studio e seleziona "Ricevi" per renderlo immediatamente disponibile.')
                            ])
                            : el('div', { style: 'display: flex; flex-direction: column; gap: 10px; max-height: 240px; overflow-y: auto; margin-bottom: 18px;' }, monitors.map(m => el('div', {
                                style: 'display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px;'
                            }, [
                                el('div', {}, [
                                    el('div', { style: 'font-weight: 700; color: #166534; font-size: 0.95rem;' }, m.nome || 'Monitor Studio'),
                                    el('div', { style: 'font-size: 0.8rem; color: #15803d; margin-top: 2px;' }, `IP: ${m.ip}:${m.porta} · Latenza: ${m.latenza_ms}ms · ${m.in_seduta ? 'In seduta' : 'Pronto a ricevere'}`)
                                ]),
                                el('span', { style: 'display: inline-block; padding: 5px 12px; background: #16a34a; color: #ffffff; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.5px;' }, 'ONLINE')
                            ]))),
                        el('div', { style: 'display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px;' }, [
                            el('button', {
                                class: 'ds-btn ds-btn--ghost',
                                type: 'button',
                                onClick: renderCorpo
                            }, [icona('refresh'), 'Scansiona Subnet']),
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
                        errore('Seleziona almeno un monitor online di destinazione');
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

                    if (esito(risposta, 'Cartella clinica trasmessa con successo al monitor')) {
                        await disegna();
                    }
                } catch (e) {
                    errore(e.message || 'Errore durante la trasmissione');
                }
            };

            const chiudi = async riga => {
                try {
                    if (!esito(await call('trasmissioni.chiudi', { id: riga.id }), 'Scheda chiusa sul monitor')) return;
                    await disegna();
                } catch (e) {
                    errore(e.message || 'Errore nella chiusura della scheda');
                }
            };

            const selettoreSchermi = () => {
                if (collegate.length === 0) {
                    return el('div', {
                        style: 'padding: 32px 20px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1.5px dashed #cbd5e1; border-radius: 14px; text-align: center;'
                    }, [
                        el('div', { style: 'width: 52px; height: 52px; border-radius: 50%; background: #e0f2fe; color: #0284c7; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;' }, icona('desktop_windows')),
                        el('div', { style: 'font-weight: 700; font-size: 1.05rem; color: #1e293b; margin-bottom: 4px;' }, 'In attesa di monitor online nello studio...'),
                        el('div', { style: 'color: #64748b; font-size: 0.9rem; max-width: 480px; margin: 0 auto 16px auto; line-height: 1.5;' }, 'Apri DentalSuite sul PC del medico e clicca su "Ricevi (Monitor del Medico)". La postazione apparirà qui automaticamente.'),
                        el('div', { style: 'display: flex; justify-content: center; gap: 10px;' }, [
                            el('button', {
                                class: 'ds-btn ds-btn--secondary ds-btn--piccolo',
                                type: 'button',
                                onClick: async () => {
                                    inScansione = true;
                                    disegna();
                                    await call('trasmissioni.diagnosticaRete', {});
                                    inScansione = false;
                                    disegna();
                                }
                            }, [icona('refresh'), inScansione ? 'Scansione in corso...' : 'Rileva Monitor Ora']),
                            el('button', {
                                class: 'ds-btn ds-btn--ghost ds-btn--piccolo',
                                type: 'button',
                                onClick: apriDiagnosticaRete
                            }, [icona('radar'), 'Diagnostica Rete LAN'])
                        ])
                    ]);
                }

                return el('div', { class: 'ds-schermi-grid', style: 'display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px;' }, collegate.map(voce => {
                    const selezionato = postazioniSelezionate.has(voce.sessione_id);
                    return el('button', {
                        class: `ds-schermo-card ${selezionato ? 'ds-schermo-card--selezionato' : ''}`,
                        style: `display: flex; flex-direction: column; text-align: left; padding: 16px; border-radius: 14px; border: 2px solid ${selezionato ? '#0d9488' : '#e2e8f0'}; background: ${selezionato ? '#f0fdfa' : '#ffffff'}; cursor: pointer; transition: all 0.2s ease; box-shadow: ${selezionato ? '0 4px 14px rgba(13, 148, 136, 0.18)' : '0 1px 3px rgba(0,0,0,0.04)'};`,
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
                        el('div', { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;' }, [
                            el('div', { style: `width: 40px; height: 40px; border-radius: 10px; background: ${selezionato ? '#ccfbf1' : '#f1f5f9'}; color: ${selezionato ? '#0f766e' : '#475569'}; display: flex; align-items: center; justify-content: center;'` }, icona('monitor')),
                            el('div', { style: `color: ${selezionato ? '#0d9488' : '#cbd5e1'}; font-size: 24px;` }, icona(selezionato ? 'check_circle' : 'radio_button_unchecked'))
                        ]),
                        el('div', { style: 'font-weight: 700; font-size: 1.05rem; color: #0f172a; margin-bottom: 3px;' }, voce.nome || 'Monitor dello studio'),
                        el('div', { style: 'font-size: 0.82rem; color: #64748b; font-family: monospace; margin-bottom: 12px;' }, voce.indirizzo || 'Rete locale LAN'),
                        el('div', { style: 'margin-top: auto; display: flex; align-items: center; gap: 7px; font-size: 0.82rem;' }, [
                            el('span', { style: `width: 9px; height: 9px; border-radius: 50%; background: ${voce.in_seduta ? '#0284c7' : '#16a34a'}; box-shadow: 0 0 6px ${voce.in_seduta ? 'rgba(2,132,199,0.5)' : 'rgba(22,163,74,0.5)'};` }),
                            el('span', { style: `font-weight: 600; color: ${voce.in_seduta ? '#0369a1' : '#15803d'};` }, voce.in_seduta ? `In seduta: ${voce.paziente_nome || 'Paziente'}` : 'Pronto a ricevere')
                        ])
                    ]);
                }));
            };

            const pannelloSelezionePaziente = () => {
                if (postazioniSelezionate.size === 0) {
                    return el('div', { class: 'ds-trasmetti-paziente-wrap' }, [
                        el('div', {
                            style: 'padding: 22px; background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 14px; color: #64748b; font-size: 0.95rem; text-align: center; display: flex; align-items: center; justify-content: center; gap: 10px;'
                        }, [
                            icona('lock'),
                            el('span', {}, 'Seleziona prima uno o più monitor attivi sopra per abilitare la scelta del paziente.')
                        ])
                    ]);
                }

                return el('div', { class: 'ds-trasmetti-paziente-wrap' }, [
                    pazienteSelezionatoDati
                        ? el('div', {
                            style: 'display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; background: #f0fdfa; border: 2px solid #0d9488; border-radius: 16px; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.12);'
                        }, [
                            el('div', { style: 'display: flex; align-items: center; gap: 16px;' }, [
                                el('div', {
                                    style: 'width: 48px; height: 48px; border-radius: 50%; background: #0d9488; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.15rem; box-shadow: 0 4px 10px rgba(13, 148, 136, 0.3);'
                                }, `${(pazienteSelezionatoDati.cognome || 'P')[0]}${(pazienteSelezionatoDati.nome || 'P')[0]}`),
                                el('div', {}, [
                                    el('div', { style: 'font-weight: 800; font-size: 1.15rem; color: #0f172a;' },
                                        `${pazienteSelezionatoDati.cognome} ${pazienteSelezionatoDati.nome}`
                                    ),
                                    el('div', { style: 'font-size: 0.85rem; color: #475569; margin-top: 3px; display: flex; gap: 8px; flex-wrap: wrap;' }, [
                                        pazienteSelezionatoDati.codice_fiscale ? el('span', { style: 'background: #e2e8f0; padding: 2px 8px; border-radius: 6px; font-weight: 600;' }, `CF: ${pazienteSelezionatoDati.codice_fiscale}`) : null,
                                        pazienteSelezionatoDati.data_nascita ? el('span', { style: 'background: #e2e8f0; padding: 2px 8px; border-radius: 6px;' }, `Nascita: ${fmt.data(pazienteSelezionatoDati.data_nascita)}`) : null
                                    ].filter(Boolean))
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
                            }, [icona('swap_horiz'), 'Cambia Paziente'])
                        ])
                        : el('div', {
                            style: 'padding: 28px; background: #ffffff; border: 2px dashed #0d9488; border-radius: 16px; text-align: center;'
                        }, [
                            el('div', { style: 'margin-bottom: 12px; color: #0d9488; font-size: 32px;' }, icona('person_search')),
                            el('div', { style: 'font-weight: 700; color: #0f172a; font-size: 1.05rem; margin-bottom: 4px;' }, 'Scegli la cartella clinica da inviare'),
                            el('div', { style: 'color: #64748b; font-size: 0.88rem; margin-bottom: 16px;' }, 'Seleziona il paziente dalla rubrica per inviare l\'odontogramma e la storia clinica al monitor.'),
                            el('button', {
                                class: 'ds-btn ds-btn--primary ds-btn--tocco',
                                style: 'padding: 12px 24px; font-weight: 700; border-radius: 12px;',
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
                            }, [icona('search'), 'Sfoglia Pazienti dalla Rubrica'])
                        ])
                ]);
            };

            rimpiazza(contenitore, [
                el('div', { class: 'ds-tx-hero-header' }, [
                    el('div', { class: 'ds-tx-hero-left' }, [
                        onIndietro
                            ? el('button', {
                                class: 'ds-btn ds-btn--ghost ds-btn--piccolo',
                                style: 'margin-right: 6px;',
                                type: 'button',
                                onClick: () => {
                                    if (intervalloAggiornamento) clearInterval(intervalloAggiornamento);
                                    onIndietro();
                                }
                            }, icona('arrow_back'))
                            : null,
                        el('div', { class: 'ds-tx-hero-icon' }, icona('cast_connected')),
                        el('div', {}, [
                            el('h2', { class: 'ds-tx-hero-title' }, 'Trasmetti Scheda Clinica'),
                            el('div', { class: 'ds-tx-hero-sub' }, postazione ? `${postazione.nome} · Postazione di Invio Live` : 'Invio in tempo reale al Monitor dello Studio')
                        ])
                    ].filter(Boolean)),
                    el('div', { style: 'display: flex; gap: 8px; align-items: center;' }, [
                        el('button', {
                            class: 'ds-btn ds-btn--ghost ds-btn--piccolo',
                            type: 'button',
                            onClick: apriDiagnosticaRete
                        }, [icona('radar'), 'Diagnostica LAN']),
                        el('button', {
                            class: 'ds-btn ds-btn--ghost ds-btn--piccolo',
                            type: 'button',
                            onClick: () => {
                                inScansione = true;
                                disegna();
                            }
                        }, [icona('refresh'), 'Ricarica'])
                    ])
                ]),

                el('div', { class: 'ds-tx-stats-row' }, [
                    el('div', { class: 'ds-tx-stat-pill' }, [
                        el('div', { class: 'ds-tx-stat-pill__icon', style: 'background: #f0fdf4; color: #16a34a;' }, icona('desktop_windows')),
                        el('div', {}, [
                            el('div', { style: 'font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase;' }, 'Monitor Online'),
                            el('div', { style: 'font-size: 1.3rem; font-weight: 800; color: #0f172a;' }, String(collegate.length))
                        ])
                    ]),
                    el('div', { class: 'ds-tx-stat-pill' }, [
                        el('div', { class: 'ds-tx-stat-pill__icon', style: 'background: #f0f9ff; color: #0284c7;' }, icona('radio_button_checked')),
                        el('div', {}, [
                            el('div', { style: 'font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase;' }, 'Monitor Selezionati'),
                            el('div', { style: 'font-size: 1.3rem; font-weight: 800; color: #0f172a;' }, String(postazioniSelezionate.size))
                        ])
                    ]),
                    el('div', { class: 'ds-tx-stat-pill' }, [
                        el('div', { class: 'ds-tx-stat-pill__icon', style: 'background: #faf5ff; color: #9333ea;' }, icona('assignment_turned_in')),
                        el('div', {}, [
                            el('div', { style: 'font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase;' }, 'Sedute Live Attive'),
                            el('div', { style: 'font-size: 1.3rem; font-weight: 800; color: #0f172a;' }, String(aperte.length))
                        ])
                    ])
                ]),

                el('div', { class: 'ds-tx-card-box' }, [
                    el('div', { class: 'ds-tx-card-box__head' }, [
                        el('div', { class: 'ds-tx-card-box__title' }, [
                            icona('tune'),
                            el('span', {}, '1. Seleziona i Monitor Online di destinazione'),
                            el('span', { class: 'ds-tx-badge-count' }, `${collegate.length} Attivi`)
                        ])
                    ]),
                    selettoreSchermi()
                ]),

                el('div', { class: 'ds-tx-card-box' }, [
                    el('div', { class: 'ds-tx-card-box__head' }, [
                        el('div', { class: 'ds-tx-card-box__title' }, [
                            icona('person'),
                            el('span', {}, '2. Seleziona la cartella clinica del paziente'),
                            pazienteSelezionatoDati ? el('span', { class: 'ds-tx-badge-count', style: 'background: #dcfce7; color: #15803d;' }, 'Pronto') : null
                        ].filter(Boolean))
                    ]),
                    pannelloSelezionePaziente()
                ]),

                el('div', {}, [
                    el('button', {
                        class: 'ds-tx-send-btn',
                        type: 'button',
                        disabled: !pazienteSelezionatoId || postazioniSelezionate.size === 0,
                        onClick: eseguiInvio
                    }, [
                        icona('send'),
                        postazioniSelezionate.size > 0 && pazienteSelezionatoDati
                            ? `Trasmetti Scheda Clinica a ${postazioniSelezionate.size} Monitor`
                            : 'Seleziona un monitor e un paziente per abilitare la trasmissione'
                    ])
                ]),

                el('div', { class: 'ds-tx-card-box' }, [
                    el('div', { class: 'ds-tx-card-box__head' }, [
                        el('div', { class: 'ds-tx-card-box__title' }, [
                            icona('history'),
                            el('span', {}, 'Sedute cliniche in corso nello studio')
                        ])
                    ]),
                    tabella({
                        colonne: [
                            { titolo: 'Orario', rendi: riga => fmt.dataOra(riga.aperta_il) },
                            { titolo: 'Paziente', campo: 'paziente_nome' },
                            { titolo: 'Monitor Destinazione', campo: 'postazione_nome' },
                            {
                                titolo: 'Stato',
                                rendi: riga => distintivo(fmt.etichettaStato(riga.stato), TONI_STATO[riga.stato] || 'neutral')
                            },
                            {
                                titolo: '',
                                rendi: riga => azioniRiga([
                                    riga.paziente_id ? el('button', {
                                        class: 'ds-btn ds-btn--ghost ds-btn--piccolo',
                                        type: 'button',
                                        title: 'Apri cartella',
                                        onClick: () => naviga('paziente', { id: riga.paziente_id })
                                    }, icona('person')) : null,
                                    riga.stato === 'aperta' ? el('button', {
                                        class: 'ds-btn ds-btn--ghost ds-btn--piccolo',
                                        style: 'color: #e11d48;',
                                        type: 'button',
                                        title: 'Chiudi la scheda sul monitor',
                                        onClick: () => chiudi(riga)
                                    }, [icona('logout'), 'Chiudi']) : null
                                ].filter(Boolean))
                            }
                        ],
                        righe: storico.righe,
                        vuotoTitolo: 'Nessuna seduta clinica attiva al momento',
                        vuotoTesto: 'Quando trasmetti una cartella a un monitor dello studio, la seduta attiva compare qui in tempo reale.',
                        vuotoSimbolo: 'cast'
                    })
                ])
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
