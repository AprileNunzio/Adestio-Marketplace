import { el, rimpiazza, icona } from '../../components/dom.js';
import { call } from '../../kernel/transport.js';
import { oggetto } from '../shared/vista.js';

export function apriDiagnosticaRete() {
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

                const risposta = await call('trasmissioni.diagnosticaRete', {});
                const diag = oggetto(risposta, null);
                const guasto = diag ? '' : ((risposta && risposta.error) || 'Diagnostica non disponibile');
                const locale = (diag && diag.postazione_locale) || {};
                const stazioni = (diag && diag.stazioni_rilevate) || (diag && diag.monitor_rilevati) || [];
                const attese = stazioni.filter(v => v.ruolo === 'riunito');
                const sonoMonitor = locale.ruolo === 'riunito';
                const titoloElenco = 'Monitor a cui puoi trasmettere';
                const indirizzi = (locale.interfacce || []).map(i => i.ip).filter(Boolean);

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
                    guasto
                        ? el('div', { style: 'padding: 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; color: #991b1b; font-size: 0.9rem; line-height: 1.5; margin-bottom: 18px;' }, [
                            el('div', { style: 'font-weight: 700; margin-bottom: 4px;' }, 'Diagnostica non riuscita su questo computer'),
                            el('div', {}, guasto)
                        ])
                        : el('div', { style: 'background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 18px;' }, [
                            el('div', { style: 'font-weight: 700; color: #0f172a; font-size: 1rem; margin-bottom: 6px;' }, `Postazione Locale: ${locale.nome_pc || 'Questo Computer'}`),
                            el('div', { style: 'font-size: 0.85rem; color: #475569; line-height: 1.5;' }, [
                                el('div', {}, `Nome: ${locale.nome || '(senza nome)'} · Ruolo: ${locale.ruolo === 'riunito' ? 'Monitor Medico (Poltrona)' : 'Segreteria'} · Porta HTTP: ${locale.porta || 'non impostata'}`),
                                indirizzi.length > 0
                                    ? el('div', {}, `Indirizzi IP Locali: ${indirizzi.join(', ')}`)
                                    : el('div', { style: 'color: #b45309; font-weight: 600;' }, 'Nessuna scheda di rete attiva rilevata.')
                            ])
                        ]),
                    el('div', { style: 'font-weight: 700; color: #0f172a; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;' }, [
                        el('span', {}, `${titoloElenco} (${attese.length}):`),
                        sonoMonitor ? el('span', { style: 'font-size: 0.75rem; color: #b45309; font-weight: 600;' }, 'Questo computer e impostato come monitor') : null
                    ].filter(Boolean)),
                    attese.length === 0
                        ? el('div', { style: 'padding: 20px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; color: #92400e; font-size: 0.9rem; line-height: 1.5;' }, [
                            el('div', { style: 'font-weight: 600; margin-bottom: 4px;' }, 'Nessun monitor attivo rilevato sulla subnet.'),
                            el('div', {}, 'Apri DentalSuite sull\'altro computer dello studio e seleziona "Ricevi" per renderlo immediatamente disponibile.')
                        ])
                        : el('div', { style: 'display: flex; flex-direction: column; gap: 10px; max-height: 240px; overflow-y: auto; margin-bottom: 18px;' }, attese.map(m => el('div', {
                            style: 'display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px;'
                        }, [
                            el('div', {}, [
                                el('div', { style: 'font-weight: 700; color: #166534; font-size: 0.95rem;' }, m.nome || m.etichetta_ruolo || 'Postazione'),
                                el('div', { style: 'font-size: 0.8rem; color: #15803d; margin-top: 2px;' }, `${m.etichetta_ruolo || m.ruolo} · IP: ${m.ip}:${m.porta} · Latenza: ${m.latenza_ms}ms · ${m.in_seduta ? 'In seduta' : 'Pronto a ricevere'}`)
                            ]),
                            el('span', { style: 'display: inline-block; padding: 5px 12px; background: #16a34a; color: #ffffff; border-radius: 9999px; font-size: 0.75rem; font-weight: 700;' }, 'ONLINE')
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
}
