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

        const dest = await call('trasmissioni.postazioni', {});
        const postazioniDati = oggetto(dest, { collegate: [] });
        const collegate = postazioniDati.collegate || [];

        if (collegate.length === 0) {
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

        let modalControllerTermina = null;

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

        const monitorOrdinati = [...collegate].sort((a, b) => {
            const matchA = corrispondePoltrona(a, poltronaId, poltronaNome) ? 1 : 0;
            const matchB = corrispondePoltrona(b, poltronaId, poltronaNome) ? 1 : 0;
            return matchB - matchA;
        });

        const monitorPredefinito = monitorOrdinati.find(m => corrispondePoltrona(m, poltronaId, poltronaNome));

        const listaMonitor = monitorOrdinati.map(voce => {
            const inSeduta = Boolean(voce.in_seduta);
            const isDefault = monitorPredefinito && (voce.sessione_id === monitorPredefinito.sessione_id);

            return el('div', {
                style: `display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: ${isDefault ? '#f0fdfa' : '#ffffff'}; border: 2px solid ${isDefault ? '#0d9488' : '#e2e8f0'}; border-radius: 14px; transition: all 0.15s ease; gap: 14px; box-shadow: ${isDefault ? '0 4px 12px rgba(13, 148, 136, 0.12)' : 'none'};`
            }, [
                el('div', { style: 'display: flex; align-items: center; gap: 12px;' }, [
                    el('div', {
                        style: `width: 42px; height: 42px; border-radius: 10px; background: ${isDefault ? '#ccfbf1' : '#f0fdf4'}; color: ${isDefault ? '#0f766e' : '#16a34a'}; display: flex; align-items: center; justify-content: center; font-size: 20px;`
                    }, icona(isDefault ? 'star' : 'desktop_windows')),
                    el('div', {}, [
                        el('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
                            el('span', { style: 'font-weight: 700; font-size: 1rem; color: #0f172a;' }, voce.nome || 'Monitor Studio'),
                            isDefault ? el('span', {
                                style: 'font-size: 0.72rem; font-weight: 800; background: #0d9488; color: #ffffff; padding: 2px 8px; border-radius: 6px;'
                            }, 'Poltrona Prenotata') : null
                        ].filter(Boolean)),
                        el('div', { style: 'font-size: 0.8rem; color: #64748b; font-family: monospace; margin-top: 1px;' }, voce.indirizzo || 'Rete LAN'),
                        el('div', { style: 'margin-top: 4px; display: flex; align-items: center; gap: 6px; font-size: 0.78rem;' }, [
                            el('span', { style: `width: 8px; height: 8px; border-radius: 50%; background: ${inSeduta ? '#0284c7' : '#16a34a'};` }),
                            el('span', { style: `font-weight: 600; color: ${inSeduta ? '#0369a1' : '#15803d'};` },
                                inSeduta ? `In seduta: ${voce.paziente_nome || 'Paziente'}` : 'Pronto a ricevere'
                            )
                        ])
                    ])
                ]),
                el('button', {
                    class: `ds-btn ${isDefault ? 'ds-btn--primary' : 'ds-btn--secondary'} ds-btn--piccolo`,
                    type: 'button',
                    onClick: () => inviaASessioni([voce.sessione_id])
                }, [icona('send'), isDefault ? 'Invia a questa Poltrona' : 'Invia a questo Monitor'])
            ]);
        });

        const corpo = el('div', { style: 'display: flex; flex-direction: column; gap: 14px;' }, [
            el('div', { style: 'padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; display: flex; align-items: center; justify-content: space-between;' }, [
                el('div', {}, [
                    el('div', { style: 'font-size: 0.78rem; color: #64748b; font-weight: 700; text-transform: uppercase;' }, 'Paziente da trasmettere'),
                    el('div', { style: 'font-size: 1.05rem; font-weight: 800; color: #0f172a;' }, pazienteNome || `ID: ${pazienteId}`),
                    poltronaNome ? el('div', { style: 'font-size: 0.82rem; color: #0d9488; font-weight: 600; margin-top: 2px;' }, `Prenotato su: ${poltronaNome}`) : null
                ].filter(Boolean)),
                el('span', {
                    style: 'display: inline-block; padding: 4px 10px; background: #dcfce7; color: #15803d; border-radius: 9999px; font-size: 0.75rem; font-weight: 700;'
                }, `${collegate.length} Monitor Online`)
            ]),
            el('div', { style: 'font-size: 0.9rem; font-weight: 600; color: #334155;' }, 'Seleziona il monitor a cui inviare la cartella clinica in tempo reale:'),
            el('div', { style: 'display: flex; flex-direction: column; gap: 10px; max-height: 320px; overflow-y: auto;' }, listaMonitor)
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

        if (collegate.length > 1) {
            azioni.push({
                etichetta: `Trasmetti a tutti (${collegate.length} Monitor)`,
                variante: 'secondary',
                simbolo: 'cast_connected',
                onAzione: async (termina) => {
                    modalControllerTermina = termina;
                    await inviaASessioni(collegate.map(m => m.sessione_id));
                }
            });
        }

        return await apriModale({
            titolo: 'Trasmetti Scheda Clinica al Monitor',
            corpo,
            ampia: true,
            azioni
        });
    } catch (_) {
        return false;
    }
}
