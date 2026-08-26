import { el, rimpiazza, icona } from '../../components/dom.js';
import { distintivo } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { esito, errore } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import * as fmt from '../../kernel/format.js';
import { oggetto, pagina } from '../shared/vista.js';
import { selettorePaziente } from '../shared/selettore_paziente.js';
import { apriDiagnosticaRete } from './diagnostica_modal.js';

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
    let inAggiornamento = false;
    let ultimoStatoPostazioni = [];
    let ultimoStorico = [];
    let ultimaImprontaSchermi = '';
    let ultimaImprontaStorico = '';

    const statOnlineVal = el('div', { style: 'font-size: 1.3rem; font-weight: 800; color: #0f172a;' }, '0');
    const statSelVal = el('div', { style: 'font-size: 1.3rem; font-weight: 800; color: #0f172a;' }, '0');
    const statLiveVal = el('div', { style: 'font-size: 1.3rem; font-weight: 800; color: #0f172a;' }, '0');
    const badgeSchermiCount = el('span', { class: 'ds-tx-badge-count' }, '0 Attivi');
    const badgePazienteStato = el('span', { class: 'ds-tx-badge-count', style: 'background: #dcfce7; color: #15803d; display: none;' }, 'Pronto');

    const nodoSchermi = el('div', {});
    const nodoPaziente = el('div', {});
    const nodoTabella = el('div', {});
    const btnInvio = el('button', {
        class: 'ds-tx-send-btn',
        type: 'button',
        disabled: true
    }, [icona('send'), 'Seleziona un monitor e un paziente per abilitare la trasmissione']);

    const caricaPaziente = async (id) => {
        try {
            if (!id) {
                pazienteSelezionatoDati = null;
                return;
            }
            pazienteSelezionatoDati = oggetto(await call('pazienti.get', { id }), null);
        } catch (_) {
            pazienteSelezionatoDati = null;
        }
    };

    const chiudi = async riga => {
        try {
            const rispostaChiusura = await call('trasmissioni.chiudi', { id: riga.id });
            if (esito(rispostaChiusura, 'Scheda chiusa sul monitor')) {
                await aggiornaDati(true);
            }
        } catch (e) {
            errore(e.message || 'Errore nella chiusura della scheda');
        }
    };

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
                pazienteSelezionatoId = null;
                pazienteSelezionatoDati = null;
                renderPannelloPaziente();
                await aggiornaDati(true);
            }
        } catch (e) {
            errore(e.message || 'Errore durante la trasmissione');
        }
    };

    btnInvio.onclick = eseguiInvio;

    const renderPannelloPaziente = () => {
        try {
            const apriScelta = async () => {
                try {
                    const scelto = await selettorePaziente();
                    if (scelto) {
                        pazienteSelezionatoId = scelto;
                        await caricaPaziente(scelto);
                        renderPannelloPaziente();
                        renderBottoneInvio();
                    }
                } catch (_) {}
            };

            badgePazienteStato.style.display = pazienteSelezionatoDati ? 'inline-block' : 'none';

            if (pazienteSelezionatoDati) {
                rimpiazza(nodoPaziente, el('div', { class: 'ds-trasmetti-paziente-wrap' }, [
                    el('div', {
                        style: 'display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; background: #f0fdfa; border: 2px solid #0d9488; border-radius: 16px; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.12); cursor: pointer;',
                        onClick: apriScelta
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
                            onClick: (e) => {
                                e.stopPropagation();
                                pazienteSelezionatoId = null;
                                pazienteSelezionatoDati = null;
                                renderPannelloPaziente();
                                renderBottoneInvio();
                            }
                        }, [icona('swap_horiz'), 'Cambia Paziente'])
                    ])
                ]));
            } else {
                rimpiazza(nodoPaziente, el('div', { class: 'ds-trasmetti-paziente-wrap' }, [
                    el('div', {
                        style: 'padding: 24px; background: #ffffff; border: 2px dashed #0d9488; border-radius: 16px; text-align: center; cursor: pointer; transition: all 0.2s ease;',
                        onClick: apriScelta
                    }, [
                        el('div', { style: 'margin-bottom: 10px; color: #0d9488; font-size: 32px;' }, icona('person_search')),
                        el('div', { style: 'font-weight: 700; color: #0f172a; font-size: 1.05rem; margin-bottom: 4px;' }, 'Clicca qui per selezionare il paziente'),
                        el('div', { style: 'color: #64748b; font-size: 0.88rem; margin-bottom: 14px;' }, 'Puoi scegliere dai pazienti in agenda oggi oppure cercare in tutta la rubrica.'),
                        el('button', {
                            class: 'ds-btn ds-btn--primary ds-btn--tocco',
                            style: 'padding: 10px 22px; font-weight: 700; border-radius: 10px; pointer-events: none;',
                            type: 'button'
                        }, [icona('search'), 'Sfoglia Pazienti'])
                    ])
                ]));
            }
        } catch (_) {}
    };

    const renderBottoneInvio = () => {
        try {
            const abilitato = Boolean(pazienteSelezionatoId && postazioniSelezionate.size > 0);
            btnInvio.disabled = !abilitato;
            rimpiazza(btnInvio, [
                icona('send'),
                abilitato
                    ? `Trasmetti Scheda Clinica a ${postazioniSelezionate.size} Monitor`
                    : 'Seleziona un monitor e un paziente per abilitare la trasmissione'
            ]);
        } catch (_) {}
    };

    const renderSchermi = (collegate) => {
        try {
            badgeSchermiCount.textContent = `${collegate.length} Attivi`;
            if (collegate.length === 1 && postazioniSelezionate.size === 0) {
                postazioniSelezionate.add(collegate[0].sessione_id);
            }

            if (collegate.length === 0) {
                rimpiazza(nodoSchermi, el('div', {
                    style: 'padding: 32px 20px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1.5px dashed #cbd5e1; border-radius: 14px; text-align: center;'
                }, [
                    el('div', { style: 'width: 52px; height: 52px; border-radius: 50%; background: #e0f2fe; color: #0284c7; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;' }, icona('desktop_windows')),
                    el('div', { style: 'font-weight: 700; font-size: 1.05rem; color: #1e293b; margin-bottom: 4px;' }, 'In attesa di monitor online nello studio...'),
                    el('div', { style: 'color: #64748b; font-size: 0.9rem; max-width: 480px; margin: 0 auto 16px auto; line-height: 1.5;' }, 'Apri DentalSuite sul PC del medico e clicca su "Ricevi (Monitor del Medico)".'),
                    el('div', { style: 'display: flex; justify-content: center; gap: 10px;' }, [
                        el('button', {
                            class: 'ds-btn ds-btn--ghost ds-btn--piccolo',
                            type: 'button',
                            onClick: apriDiagnosticaRete
                        }, [icona('radar'), 'Diagnostica Rete LAN'])
                    ])
                ]));
                return;
            }

            rimpiazza(nodoSchermi, el('div', { class: 'ds-schermi-grid', style: 'display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px;' }, collegate.map(voce => {
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
                        statSelVal.textContent = String(postazioniSelezionate.size);
                        renderSchermi(ultimoStatoPostazioni);
                        renderBottoneInvio();
                    }
                }, [
                    el('div', { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;' }, [
                        el('div', { style: `width: 40px; height: 40px; border-radius: 10px; background: ${selezionato ? '#ccfbf1' : '#f1f5f9'}; color: ${selezionato ? '#0f766e' : '#475569'}; display: flex; align-items: center; justify-content: center;'` }, icona('monitor')),
                        el('div', { style: `color: ${selezionato ? '#0d9488' : '#cbd5e1'}; font-size: 24px;'` }, icona(selezionato ? 'check_circle' : 'radio_button_unchecked'))
                    ]),
                    el('div', { style: 'font-weight: 700; font-size: 1.05rem; color: #0f172a; margin-bottom: 3px;' }, voce.nome || 'Monitor dello studio'),
                    el('div', { style: 'font-size: 0.82rem; color: #64748b; font-family: monospace; margin-bottom: 12px;' }, voce.indirizzo || 'Rete locale LAN'),
                    el('div', { style: 'margin-top: auto; display: flex; align-items: center; gap: 7px; font-size: 0.82rem;' }, [
                        el('span', { style: `width: 9px; height: 9px; border-radius: 50%; background: ${voce.in_seduta ? '#0284c7' : '#16a34a'}; box-shadow: 0 0 6px ${voce.in_seduta ? 'rgba(2,132,199,0.5)' : 'rgba(22,163,74,0.5)'};` }),
                        el('span', { style: `font-weight: 600; color: ${voce.in_seduta ? '#0369a1' : '#15803d'};` }, voce.in_seduta ? `In seduta: ${voce.paziente_nome || 'Paziente'}` : 'Pronto a ricevere')
                    ])
                ]);
            })));
        } catch (_) {}
    };

    const renderTabellaStorico = (righe) => {
        try {
            rimpiazza(nodoTabella, tabella({
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
                righe,
                vuotoTitolo: 'Nessuna seduta clinica attiva al momento',
                vuotoTesto: 'Quando trasmetti una cartella a un monitor dello studio, la seduta attiva compare qui in tempo reale.',
                vuotoSimbolo: 'cast'
            }));
        } catch (_) {}
    };

    const aggiornaDati = async (forza = false) => {
        if (inAggiornamento) return;
        inAggiornamento = true;

        try {
            const [statoPostazioni, storico] = await Promise.all([
                call('trasmissioni.postazioni', {}).then(risultato => oggetto(risultato, { collegate: [], rete: null })),
                call('trasmissioni.elenco', { dimensione: 15 }).then(pagina)
            ]);

            const collegate = statoPostazioni.collegate || [];
            ultimoStatoPostazioni = collegate;
            ultimoStorico = storico.righe || [];

            const aperte = ultimoStorico.filter(riga => riga.stato === 'aperta');

            statOnlineVal.textContent = String(collegate.length);
            statSelVal.textContent = String(postazioniSelezionate.size);
            statLiveVal.textContent = String(aperte.length);

            const improntaSchermi = JSON.stringify(collegate.map(c => [c.sessione_id, c.online, c.in_seduta, c.paziente_nome, c.nome, postazioniSelezionate.has(c.sessione_id)]));
            if (forza || improntaSchermi !== ultimaImprontaSchermi) {
                ultimaImprontaSchermi = improntaSchermi;
                renderSchermi(collegate);
            }

            const improntaStorico = JSON.stringify(ultimoStorico.map(r => [r.id, r.stato, r.paziente_nome, r.postazione_nome, r.aperta_il]));
            if (forza || improntaStorico !== ultimaImprontaStorico) {
                ultimaImprontaStorico = improntaStorico;
                renderTabellaStorico(ultimoStorico);
            }

            renderBottoneInvio();

            if (pazienteIniziale && !inviatoIniziale && collegate.length > 0) {
                inviatoIniziale = true;
                postazioniSelezionate.add(collegate[0].sessione_id);
                await eseguiInvio();
            }
        } catch (_) {} finally {
            inAggiornamento = false;
        }
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
                    onClick: () => aggiornaDati(true)
                }, [icona('refresh'), 'Ricarica'])
            ])
        ]),

        el('div', { class: 'ds-tx-stats-row' }, [
            el('div', { class: 'ds-tx-stat-pill' }, [
                el('div', { class: 'ds-tx-stat-pill__icon', style: 'background: #f0fdf4; color: #16a34a;' }, icona('desktop_windows')),
                el('div', {}, [
                    el('div', { style: 'font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase;' }, 'Monitor Online'),
                    statOnlineVal
                ])
            ]),
            el('div', { class: 'ds-tx-stat-pill' }, [
                el('div', { class: 'ds-tx-stat-pill__icon', style: 'background: #f0f9ff; color: #0284c7;' }, icona('radio_button_checked')),
                el('div', {}, [
                    el('div', { style: 'font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase;' }, 'Monitor Selezionati'),
                    statSelVal
                ])
            ]),
            el('div', { class: 'ds-tx-stat-pill' }, [
                el('div', { class: 'ds-tx-stat-pill__icon', style: 'background: #faf5ff; color: #9333ea;' }, icona('assignment_turned_in')),
                el('div', {}, [
                    el('div', { style: 'font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase;' }, 'Sedute Live Attive'),
                    statLiveVal
                ])
            ])
        ]),

        el('div', { class: 'ds-tx-card-box' }, [
            el('div', { class: 'ds-tx-card-box__head' }, [
                el('div', { class: 'ds-tx-card-box__title' }, [
                    icona('tune'),
                    el('span', {}, '1. Seleziona i Monitor Online di destinazione'),
                    badgeSchermiCount
                ])
            ]),
            nodoSchermi
        ]),

        el('div', { class: 'ds-tx-card-box' }, [
            el('div', { class: 'ds-tx-card-box__head' }, [
                el('div', { class: 'ds-tx-card-box__title' }, [
                    icona('person'),
                    el('span', {}, '2. Seleziona la cartella clinica del paziente'),
                    badgePazienteStato
                ])
            ]),
            nodoPaziente
        ]),

        el('div', {}, [btnInvio]),

        el('div', { class: 'ds-tx-card-box' }, [
            el('div', { class: 'ds-tx-card-box__head' }, [
                el('div', { class: 'ds-tx-card-box__title' }, [
                    icona('history'),
                    el('span', {}, 'Sedute cliniche in corso nello studio')
                ])
            ]),
            nodoTabella
        ])
    ]);

    if (pazienteSelezionatoId) {
        caricaPaziente(pazienteSelezionatoId).then(() => renderPannelloPaziente());
    } else {
        renderPannelloPaziente();
    }

    aggiornaDati(true);
    intervalloAggiornamento = setInterval(() => {
        try {
            if (contenitore.isConnected) {
                aggiornaDati();
            } else {
                clearInterval(intervalloAggiornamento);
            }
        } catch (_) {}
    }, 4000);

    return contenitore;
}
