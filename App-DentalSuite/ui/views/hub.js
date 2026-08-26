import { el } from '../components/dom.js';
import { avviso } from '../components/layout.js';

const APP_BASE = new URL('../../', import.meta.url).href;

export function rendiHub({ moduli, avvisoAccessi, onApri }) {
    const cards = moduli.map((modulo, idx) => {
        const allowed = modulo.consentito;
        const card = document.createElement('div');
        card.className = 'app-card subapp-card fade-in-up' + (allowed ? '' : ' locked');
        card.style.animationDelay = `${idx * 0.05}s`;
        card.innerHTML = `
            ${!allowed ? '<span class="badge-locked">Bloccato</span>' : ''}
            <img src="${APP_BASE}icons/${modulo.id}.png" class="app-icon" data-fallback-icon="${modulo.simbolo}">
            <div class="app-title">${modulo.titolo}</div>
            <div class="app-desc">${modulo.descrizione}</div>
        `;
        const iconImg = card.querySelector('img.app-icon');
        if (iconImg) {
            iconImg.addEventListener('error', () => {
                const fallback = document.createElement('span');
                fallback.className = 'material-symbols-rounded app-icon';
                fallback.style.cssText = 'font-size:64px;color:var(--md-primary);display:inline-flex;align-items:center;justify-content:center;';
                fallback.textContent = iconImg.dataset.fallbackIcon;
                iconImg.replaceWith(fallback);
            }, { once: true });
        }
        if (allowed) {
            card.addEventListener('click', () => {
                onApri(modulo.id);
            });
        }
        return card;
    });

    const root = el('div', { class: 'fade-in-up', style: 'width:100%;flex:1;display:flex;flex-direction:column;' }, [
        el('div', { style: 'display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:1.5rem;margin-bottom:3rem;width:100%;' }, [
            el('div', { style: 'flex:1;min-width:280px;' }, [
                el('h1', { class: 'text-title', style: 'font-size:2.4rem;color:var(--md-primary);margin-bottom:0.2rem;letter-spacing:-0.02em;text-align:left;' }, 'DentalSuite'),
                el('p', { class: 'text-body', style: 'color:var(--md-on-surface-variant);font-size:1.05rem;text-align:left;' }, 'Gestionale clinico ed economico per studi odontoiatrici')
            ])
        ]),
        avvisoAccessi
            ? avviso({
                tono: 'warning',
                simbolo: 'shield_question',
                titolo: 'Permessi non verificabili',
                voci: [
                    avvisoAccessi,
                    'Per sicurezza tutte le sezioni restano bloccate finché il controllo accessi non è disponibile.'
                ]
            })
            : null,
        el('div', { id: 'ds-modules-grid', class: 'subapps-grid' }, cards)
    ].filter(Boolean));

    return root;
}
