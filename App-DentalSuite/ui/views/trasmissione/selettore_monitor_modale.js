import { el, rimpiazza, icona } from '../../components/dom.js';
import { apriModale } from '../../components/modale.js';
import { esito, errore } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import { oggetto } from '../shared/vista.js';
import { apriDiagnosticaRete } from './diagnostica_modal.js';

function normalizzaTesto(t) {
    return String(t || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function corrispondePoltrona(monitor, poltronaId, poltronaNome) {
    try {
        if (!monitor) return false;
        if (poltronaId && (monitor.sessione_id === poltronaId || monitor.id === poltronaId)) {
            return true;
        }
        if (!poltronaNome) return false;
        const normPoltrona = normalizzaTesto(poltronaNome);
        const normMonitor = normalizzaTesto(monitor.nome);
        if (!normPoltrona || !normMonitor) return false;
        return normMonitor.includes(normPoltrona) || normPoltrona.includes(normMonitor);
    } catch (_) {
        return false;
    }
}

export async function selezionaMonitorETrasmetti({ pazienteId, pazienteNome = '', poltronaId = null, poltronaNome = '' }) {
    try {
        if (!pazienteId) {
            errore('Paziente non specificato per la trasmissione');
            return false;
        }

        let postazioni = [];
        let modalControllerTermina = null;
        const nodoElenco = el('div', { style: 'display: flex; flex-direction: column; gap: 10px; max-height: 340px; overflow-y: auto;' });

        const caricaPostazioni = async () => {
            try {
                const dest = await call('trasmissioni.postazioni', {});
                const postazioniDati = oggetto(dest, { collegate: [] });
                postazioni = postazioniDati.collegate || [];
                return postazioni;
            } catch (_) {
                postazioni = [];
                return [];
            }
        };

        await caricaPostazioni();

        if (postazioni.length === 0) {
            const corpoVuoto = el('div', { style: 'padding: 16px 8px; text-align: center;' }, [
                el('div', {
                    style: 'width: 56px; height: 56px; border-radius: 50%; background: #fef3c7; color: #d97706; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 14px;'
                }, icona('desktop_windows')),
                el('h3', { style: 'margin: 0 0 8px 0; font-size: 1.15rem; color: #0f172a; font-weight: 700;' }, 'Nessun monitor online rilevato'),
                el('p', { style: 'margin: 0 0 20px 0; font-size: 0.9rem; color: #64748b; line-height: 1.5;' },
                    'Non ci sono postazioni impostate come "Monitor del Medico" attualmente attive sulla rete locale.'
                ),
                el('div', { style: 'padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 0.85rem; color: #475569; text-align: left; line-height: 1.5; margin-bottom: 10px;' }, [
                    el('strong', { style: 'display: block; margin-bottom: 4px; color: #0f172a;' }, 'Come attivare un monitor:'),
                    el('div', {}, '1. Apri DentalSuite sul PC della poltrona o del medico.'),
                    el('div', {}, '2. Clicca su "Monitor del Medico" -> "Ricevi".'),
                    el('div', {}, '3. Il monitor comparira istantaneamente in questa lista.')
                ])
            ]);

            await apriModale({
                titolo: 'Trasmetti Scheda Clinica al Monitor',
                corpo: corpoVuoto,
                azioni: [
                    { etichetta: 'Chiudi', variante: 'ghost', esito: null },
                    {
                        etichetta: 'Diagnostica Rete LAN',
                        variante: 'secondary',
                        simbolo: 'radar',
                        onAzione: () => {
                            try {
                                apriDiagnosticaRete();
                            } catch (_) {}
                        }
                    }
                ]
            });
            return false;
        }

        const inviaASessioni = async (sessioneIds) => {
            try {
                const res = await call('trasmissioni.invia', {
                    paziente_id: pazienteId,
                    sessione_ids: sessioneIds
                });
                if (esito(res, 'Cartella clinica trasmessa al monitor dello studio')) {
                    if (typeof modalControllerTermina === 'function') {
                        modalControllerTermina(true);
                    }
                    return true;
                }
                return false;
            } catch (e) {
                errore(e.message || 'Errore durante la trasmissione al monitor');
                return false;
            }
        };

        const chiudiMonitor = async (voce) => {
            try {
                const risposta = await call('trasmissioni.chiudi', {
                    id: voce.trasmissione_id || null,
                    sessione_id: voce.sessione_id
                });
                if (esito(risposta, `Seduta chiusa su ${voce.nome || 'Monitor'}`)) {
                    await caricaPostazioni();
                    renderLista();
                }
            } catch (e) {
                errore(e.message || 'Errore durante la chiusura della seduta');
            }
        };

        const renderLista = () => {
            try {
                const monitorOrdinati = [...postazioni].sort((a, b) => {
                    const matchA = corrispondePoltrona(a, poltronaId, poltronaNome) ? 1 : 0;
                    const matchB = corrispondePoltrona(b, poltronaId, poltronaNome) ? 1 : 0;
                    return matchB - matchA;
                });

                const monitorPredefinito = monitorOrdinati.find(m => corrispondePoltrona(m, poltronaId, poltronaNome));

                const carte = monitorOrdinati.map(voce => {
                    const inSeduta = Boolean(voce.in_seduta);
                    const isDefault = monitorPredefinito && (voce.sessione_id === monitorPredefinito.sessione_id);

                    const badgeStato = inSeduta
                        ? el('span', {
                            style: 'display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; background: #e0f2fe; color: #0369a1; border-radius: 9999px; font-size: 0.75rem; font-weight: 700;'
                        }, [
                            el('span', { style: 'width: 7px; height: 7px; border-radius: 50%; background: #0284c7;' }),
                            `Inviato: ${voce.paziente_nome || 'In Seduta'}`
                        ])
                        : el('span', {
                            style: 'display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; background: #dcfce7; color: #15803d; border-radius: 9999px; font-size: 0.75rem; font-weight: 700;'
                        }, [
                            el('span', { style: 'width: 7px; height: 7px; border-radius: 50%; background: #16a34a;' }),
                            'Libero'
                        ]);

                    const bottoniAzione = inSeduta
                        ? [
                            el('button', {
                                class: 'ds-btn ds-btn--ghost ds-btn--piccolo',
                                style: 'color: #e11d48;',
                                type: 'button',
                                title: 'Chiudi la seduta attualmente aperta su questo monitor',
                                onClick: () => chiudiMonitor(voce)
                            }, [icona('logout'), 'Chiudi seduta']),
                            el('button', {
                                class: 'ds-btn ds-btn--primary ds-btn--piccolo',
                                type: 'button',
                                title: 'Sovrascrivi e trasmetti comunque la nuova scheda a questo monitor',
                                onClick: () => inviaASessioni([voce.sessione_id])
                            }, [icona('bolt'), 'Forza invio'])
                        ]
                        : [
                            el('button', {
                                class: `ds-btn ${isDefault ? 'ds-btn--primary' : 'ds-btn--secondary'} ds-btn--piccolo`,
                                type: 'button',
                                onClick: () => inviaASessioni([voce.sessione_id])
                            }, [icona('send'), 'Invia'])
                        ];

                    return el('div', {
                        style: `display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: ${isDefault ? '#f0fdfa' : '#ffffff'}; border: 2px solid ${isDefault ? '#0d9488' : '#e2e8f0'}; border-radius: 14px; gap: 12px; box-shadow: ${isDefault ? '0 4px 12px rgba(13, 148, 136, 0.12)' : 'none'};`
                    }, [
                        el('div', { style: 'display: flex; align-items: center; gap: 12px;' }, [
                            el('div', {
                                style: `width: 42px; height: 42px; border-radius: 10px; background: ${isDefault ? '#ccfbf1' : '#f0fdf4'}; color: ${isDefault ? '#0f766e' : '#16a34a'}; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;`
                            }, icona(isDefault ? 'star' : 'desktop_windows')),
                            el('div', {}, [
                                el('div', { style: 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap;' }, [
                                    el('span', { style: 'font-weight: 700; font-size: 1rem; color: #0f172a;' }, voce.nome || 'Monitor Studio'),
                                    isDefault ? el('span', {
                                        style: 'font-size: 0.72rem; font-weight: 800; background: #0d9488; color: #ffffff; padding: 2px 8px; border-radius: 6px;'
                                    }, 'Poltrona Prenotata') : null
                                ].filter(Boolean)),
                                el('div', { style: 'margin-top: 4px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;' }, [
                                    badgeStato,
                                    el('span', { style: 'font-size: 0.78rem; color: #64748b; font-family: monospace;' }, voce.indirizzo || 'LAN')
                                ])
                            ])
                        ]),
                        el('div', { style: 'display: flex; align-items: center; gap: 8px; flex-shrink: 0;' }, bottoniAzione)
                    ]);
                });

                rimpiazza(nodoElenco, carte);
            } catch (_) {}
        };

        renderLista();

        const corpo = el('div', { style: 'display: flex; flex-direction: column; gap: 14px;' }, [
            el('div', { style: 'padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; display: flex; align-items: center; justify-content: space-between;' }, [
                el('div', {}, [
                    el('div', { style: 'font-size: 0.78rem; color: #64748b; font-weight: 700; text-transform: uppercase;' }, 'Paziente da trasmettere'),
                    el('div', { style: 'font-size: 1.05rem; font-weight: 800; color: #0f172a;' }, pazienteNome || `ID: ${pazienteId}`),
                    poltronaNome ? el('div', { style: 'font-size: 0.82rem; color: #0d9488; font-weight: 600; margin-top: 2px;' }, `Prenotato su: ${poltronaNome}`) : null
                ].filter(Boolean)),
                el('span', {
                    style: 'display: inline-block; padding: 4px 10px; background: #dcfce7; color: #15803d; border-radius: 9999px; font-size: 0.75rem; font-weight: 700;'
                }, `${postazioni.length} Monitor Online`)
            ]),
            el('div', { style: 'font-size: 0.9rem; font-weight: 600; color: #334155;' }, 'Seleziona la postazione di destinazione:'),
            nodoElenco
        ]);

        const azioni = [
            {
                etichetta: 'Annulla',
                variante: 'ghost',
                esito: null,
                onAzione: (termina) => {
                    modalControllerTermina = termina;
                    termina(null);
                }
            }
        ];

        if (postazioni.length > 1) {
            azioni.push({
                etichetta: `Trasmetti a tutti (${postazioni.length} Monitor)`,
                variante: 'secondary',
                simbolo: 'cast_connected',
                onAzione: async (termina) => {
                    modalControllerTermina = termina;
                    await inviaASessioni(postazioni.map(m => m.sessione_id));
                }
            });
        }

        return await apriModale({
            titolo: 'Trasmetti Scheda Clinica al Monitor',
            corpo,
            ampia: true,
            azioni,
            suChiusura: () => {}
        });
    } catch (_) {
        return false;
    }
}
