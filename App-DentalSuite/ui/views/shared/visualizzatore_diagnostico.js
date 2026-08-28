import { el, icona, rimpiazza } from '../../components/dom.js';
import { bottone, distintivo } from '../../components/layout.js';
import { call } from '../../kernel/transport.js';
import * as fmt from '../../kernel/format.js';

export function apriVisualizzatoreDiagnostico({ referti = [], indiceIniziale = 0, serverOrigine = null }) {
    let indiceCorrente = Math.max(0, Math.min(indiceIniziale, referti.length - 1));
    let zoom = 1;
    let rotazione = 0;
    let invertiColori = false;
    let specchiaX = false;
    let luminosita = 100;
    let contrasto = 100;
    let traslaX = 0;
    let traslaY = 0;
    let inTrascinamento = false;
    let inizioDragX = 0;
    let inizioDragY = 0;
    let touchStartDist = 0;
    let touchStartZoom = 1;

    const overlay = el('div', {
        class: 'ds-diag-viewer-overlay',
        style: 'position: fixed; inset: 0; z-index: 99999; background: rgba(10, 15, 29, 0.96); display: flex; flex-direction: column; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; user-select: none; backdrop-filter: blur(8px);'
    });

    const nodoImg = el('img', {
        style: 'max-width: 100%; max-height: 100%; object-fit: contain; transform-origin: center center; transition: filter 0.15s ease; pointer-events: auto; cursor: grab;'
    });

    const nodoViewport = el('div', {
        style: 'flex: 1; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; touch-action: none;'
    });

    const nodoHeader = el('div', {
        style: 'padding: 12px 20px; background: rgba(15, 23, 42, 0.9); border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;'
    });

    const nodoToolbar = el('div', {
        style: 'padding: 10px 16px; background: rgba(15, 23, 42, 0.95); border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: center; align-items: center; gap: 10px; flex-wrap: wrap;'
    });

    const applicaTrasformazioni = () => {
        try {
            const filtri = [
                invertiColori ? 'invert(100%)' : null,
                `brightness(${luminosita}%)`,
                `contrast(${contrasto}%)`
            ].filter(Boolean).join(' ');

            nodoImg.style.filter = filtri;
            const scaleX = specchiaX ? -zoom : zoom;
            nodoImg.style.transform = `translate(${traslaX}px, ${traslaY}px) rotate(${rotazione}deg) scale(${scaleX}, ${zoom})`;
        } catch (_) {}
    };

    const resetRegolazioni = () => {
        zoom = 1;
        rotazione = 0;
        invertiColori = false;
        specchiaX = false;
        luminosita = 100;
        contrasto = 100;
        traslaX = 0;
        traslaY = 0;
        applicaTrasformazioni();
    };

    const chiudi = () => {
        try {
            document.removeEventListener('keydown', gestisciTasti);
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        } catch (_) {}
    };

    const caricaDatiReferto = async (referto) => {
        try {
            rimpiazza(nodoViewport, el('div', {
                style: 'display: flex; flex-direction: column; align-items: center; gap: 12px; color: #94a3b8;'
            }, [
                el('div', { style: 'font-size: 32px; animation: spin 1s linear infinite;' }, icona('refresh')),
                el('span', {}, 'Caricamento referto diagnostico…')
            ]));

            let datiUrl = null;
            let mimeType = referto.mime_type || 'image/jpeg';
            let isPdf = String(mimeType).toLowerCase().includes('pdf') || String(referto.titolo || '').toLowerCase().endsWith('.pdf');

            try {
                const resTx = await call('trasmissioni.scaricaAllegato', { id: referto.id, server: serverOrigine });
                if (resTx && resTx.success && resTx.data && resTx.data.data_url) {
                    datiUrl = resTx.data.data_url;
                    mimeType = resTx.data.mime || mimeType;
                    isPdf = isPdf || String(mimeType).toLowerCase().includes('pdf');
                }
            } catch (_) {}

            if (!datiUrl) {
                try {
                    const res = await call('allegati.contenuto', { id: referto.id });
                    if (res && res.success && res.data && res.data.data_url) {
                        datiUrl = res.data.data_url;
                        mimeType = res.data.mime || mimeType;
                        isPdf = isPdf || String(mimeType).toLowerCase().includes('pdf');
                    }
                } catch (_) {}
            }

            if (!datiUrl && serverOrigine && serverOrigine.ip) {
                try {
                    const host = serverOrigine.ip;
                    const porta = serverOrigine.porta || 7345;
                    const resLan = await fetch(`http://${host}:${porta}/allegato-contenuto`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: referto.id })
                    });
                    if (resLan.ok) {
                        const jsonLan = await resLan.json();
                        if (jsonLan && jsonLan.data_url) {
                            datiUrl = jsonLan.data_url;
                            mimeType = jsonLan.mime || mimeType;
                            isPdf = isPdf || String(mimeType).toLowerCase().includes('pdf');
                        }
                    }
                } catch (_) {}
            }

            if (!datiUrl) {
                try {
                    const diag = await call('trasmissioni.diagnosticaRete', {});
                    const stazioni = (diag && diag.stazioni_rilevate) || (diag && diag.monitor_rilevati) || [];
                    for (const s of stazioni) {
                        if (!s.ip || (serverOrigine && s.ip === serverOrigine.ip)) continue;
                        try {
                            const resScan = await fetch(`http://${s.ip}:${s.porta || 7345}/allegato-contenuto`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: referto.id })
                            });
                            if (resScan.ok) {
                                const jsonScan = await resScan.json();
                                if (jsonScan && jsonScan.data_url) {
                                    datiUrl = jsonScan.data_url;
                                    mimeType = jsonScan.mime || mimeType;
                                    isPdf = isPdf || String(mimeType).toLowerCase().includes('pdf');
                                    break;
                                }
                            }
                        } catch (_) {}
                    }
                } catch (_) {}
            }

            if (!datiUrl) {
                rimpiazza(nodoViewport, el('div', {
                    style: 'text-align: center; max-width: 450px; padding: 24px; background: rgba(30, 41, 59, 0.8); border-radius: 12px;'
                }, [
                    el('div', { style: 'font-size: 40px; color: #f59e0b; margin-bottom: 8px;' }, icona('warning')),
                    el('div', { style: 'font-weight: 700; font-size: 1.1rem; margin-bottom: 6px;' }, referto.titolo || 'Referto non caricabile'),
                    el('p', { style: 'font-size: 0.85rem; color: #94a3b8; margin-bottom: 16px;' }, 'Il file originale è archiviato sulla postazione principale.'),
                    el('button', {
                        class: 'ds-btn ds-btn--primario',
                        type: 'button',
                        onClick: () => call('allegati.open', { id: referto.id }).catch(() => {})
                    }, [icona('open_in_new'), 'Apri con applicazione di sistema'])
                ]));
                return;
            }

            if (isPdf) {
                const framePdf = el('iframe', {
                    src: datiUrl,
                    style: 'width: 100%; height: 100%; border: none; background: #ffffff;'
                });
                rimpiazza(nodoViewport, framePdf);
                return;
            }

            nodoImg.src = datiUrl;
            nodoImg.onload = () => {
                resetRegolazioni();
                rimpiazza(nodoViewport, nodoImg);
            };
        } catch (_) {}
    };

    const renderHeader = () => {
        const ref = referti[indiceCorrente] || {};
        const conta = referti.length > 1 ? `(${indiceCorrente + 1} di ${referti.length})` : '';

        rimpiazza(nodoHeader, [
            el('div', { style: 'display: flex; align-items: center; gap: 12px;' }, [
                el('div', { style: 'font-size: 24px; color: #38bdf8;' }, icona('imagesmode')),
                el('div', {}, [
                    el('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
                        el('strong', { style: 'font-size: 1.05rem; font-weight: 700; color: #ffffff;' }, ref.titolo || 'Immagine Diagnostica'),
                        el('span', { style: 'font-size: 0.82rem; color: #94a3b8;' }, conta)
                    ]),
                    el('div', { style: 'font-size: 0.78rem; color: #64748b; margin-top: 2px;' }, [
                        ref.data ? `Data esame: ${fmt.data(ref.data)}` : '',
                        ref.tipo ? ` · Tipo: ${ref.tipo.toUpperCase()}` : ''
                    ].join(''))
                ])
            ]),
            el('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
                referti.length > 1 ? bottone({
                    simbolo: 'chevron_left',
                    etichetta: 'Precedente',
                    variante: 'ghost',
                    piccolo: true,
                    disabilitato: indiceCorrente === 0,
                    onClick: () => { if (indiceCorrente > 0) { indiceCorrente--; aggiorna(); } }
                }) : null,
                referti.length > 1 ? bottone({
                    simbolo: 'chevron_right',
                    etichetta: 'Successivo',
                    variante: 'ghost',
                    piccolo: true,
                    disabilitato: indiceCorrente >= referti.length - 1,
                    onClick: () => { if (indiceCorrente < referti.length - 1) { indiceCorrente++; aggiorna(); } }
                }) : null,
                el('button', {
                    class: 'ds-btn ds-btn--ghost',
                    type: 'button',
                    style: 'color: #f43f5e; font-weight: 700; font-size: 1.1rem; padding: 6px 12px;',
                    onClick: chiudi
                }, [icona('close'), 'Chiudi'])
            ].filter(Boolean))
        ]);
    };

    const renderToolbar = () => {
        rimpiazza(nodoToolbar, [
            bottone({
                simbolo: 'zoom_in',
                etichetta: 'Zoom +',
                variante: 'ghost',
                piccolo: true,
                onClick: () => { zoom = Math.min(zoom * 1.25, 6); applicaTrasformazioni(); }
            }),
            bottone({
                simbolo: 'zoom_out',
                etichetta: 'Zoom -',
                variante: 'ghost',
                piccolo: true,
                onClick: () => { zoom = Math.max(zoom / 1.25, 0.3); applicaTrasformazioni(); }
            }),
            bottone({
                simbolo: 'restart_alt',
                etichetta: '100% / Reset',
                variante: 'ghost',
                piccolo: true,
                onClick: resetRegolazioni
            }),
            el('span', { style: 'width: 1px; height: 20px; background: rgba(255,255,255,0.2); margin: 0 4px;' }),
            bottone({
                simbolo: 'rotate_right',
                etichetta: 'Ruota 90°',
                variante: 'ghost',
                piccolo: true,
                onClick: () => { rotazione = (rotazione + 90) % 360; applicaTrasformazioni(); }
            }),
            bottone({
                simbolo: 'flip',
                etichetta: 'Specchia',
                variante: 'ghost',
                piccolo: true,
                onClick: () => { specchiaX = !specchiaX; applicaTrasformazioni(); }
            }),
            bottone({
                simbolo: 'contrast',
                etichetta: invertiColori ? 'Positivo' : 'Negativo RX',
                variante: invertiColori ? 'primario' : 'ghost',
                piccolo: true,
                onClick: () => { invertiColori = !invertiColori; applicaTrasformazioni(); }
            }),
            el('span', { style: 'width: 1px; height: 20px; background: rgba(255,255,255,0.2); margin: 0 4px;' }),
            bottone({
                simbolo: 'wb_sunny',
                etichetta: 'Luminosità +',
                variante: 'ghost',
                piccolo: true,
                onClick: () => { luminosita = Math.min(luminosita + 15, 250); applicaTrasformazioni(); }
            }),
            bottone({
                simbolo: 'brightness_6',
                etichetta: 'Contrasto +',
                variante: 'ghost',
                piccolo: true,
                onClick: () => { contrasto = Math.min(contrasto + 20, 300); applicaTrasformazioni(); }
            })
        ]);
    };

    const aggiorna = async () => {
        renderHeader();
        renderToolbar();
        await caricaDatiReferto(referti[indiceCorrente]);
    };

    nodoViewport.addEventListener('mousedown', evento => {
        inTrascinamento = true;
        inizioDragX = evento.clientX - traslaX;
        inizioDragY = evento.clientY - traslaY;
        nodoImg.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', evento => {
        if (!inTrascinamento) return;
        traslaX = evento.clientX - inizioDragX;
        traslaY = evento.clientY - inizioDragY;
        applicaTrasformazioni();
    });

    window.addEventListener('mouseup', () => {
        inTrascinamento = false;
        nodoImg.style.cursor = 'grab';
    });

    nodoViewport.addEventListener('wheel', evento => {
        evento.preventDefault();
        const delta = evento.deltaY < 0 ? 1.15 : 0.85;
        zoom = Math.max(0.3, Math.min(zoom * delta, 6));
        applicaTrasformazioni();
    }, { passive: false });

    nodoViewport.addEventListener('touchstart', evento => {
        if (evento.touches.length === 1) {
            inTrascinamento = true;
            inizioDragX = evento.touches[0].clientX - traslaX;
            inizioDragY = evento.touches[0].clientY - traslaY;
        } else if (evento.touches.length === 2) {
            inTrascinamento = false;
            touchStartDist = Math.hypot(
                evento.touches[0].clientX - evento.touches[1].clientX,
                evento.touches[0].clientY - evento.touches[1].clientY
            );
            touchStartZoom = zoom;
        }
    }, { passive: true });

    nodoViewport.addEventListener('touchmove', evento => {
        if (evento.touches.length === 1 && inTrascinamento) {
            traslaX = evento.touches[0].clientX - inizioDragX;
            traslaY = evento.touches[0].clientY - inizioDragY;
            applicaTrasformazioni();
        } else if (evento.touches.length === 2) {
            const dist = Math.hypot(
                evento.touches[0].clientX - evento.touches[1].clientX,
                evento.touches[0].clientY - evento.touches[1].clientY
            );
            if (touchStartDist > 0) {
                zoom = Math.max(0.3, Math.min(touchStartZoom * (dist / touchStartDist), 6));
                applicaTrasformazioni();
            }
        }
    }, { passive: true });

    nodoViewport.addEventListener('touchend', () => {
        inTrascinamento = false;
    });

    const gestisciTasti = (evento) => {
        if (evento.key === 'Escape') chiudi();
        if (evento.key === 'ArrowRight' && indiceCorrente < referti.length - 1) { indiceCorrente++; aggiorna(); }
        if (evento.key === 'ArrowLeft' && indiceCorrente > 0) { indiceCorrente--; aggiorna(); }
        if (evento.key === '+' || evento.key === '=') { zoom = Math.min(zoom * 1.25, 6); applicaTrasformazioni(); }
        if (evento.key === '-') { zoom = Math.max(zoom / 1.25, 0.3); applicaTrasformazioni(); }
        if (evento.key === 'r') { rotazione = (rotazione + 90) % 360; applicaTrasformazioni(); }
        if (evento.key === 'i') { invertiColori = !invertiColori; applicaTrasformazioni(); }
    };

    document.addEventListener('keydown', gestisciTasti);

    overlay.appendChild(nodoHeader);
    overlay.appendChild(nodoViewport);
    overlay.appendChild(nodoToolbar);
    document.body.appendChild(overlay);

    aggiorna();
}
