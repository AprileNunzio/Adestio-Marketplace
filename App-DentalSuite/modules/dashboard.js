import { callApi } from '../shared/api.js';
import { renderHero, renderStatCard, formatDateTime } from '../shared/ui_kit.js';

export default {
    render: async (el, onNavigate) => {
        try {
            el.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Caricamento Hub Odontoiatrico...</p></div>';

            const [appRes, pazRes, staffRes] = await Promise.all([
                callApi('agenda:getAppuntamenti', { dateFrom: Date.now() - 24 * 3600 * 1000, dateTo: Date.now() + 7 * 24 * 3600 * 1000 }),
                callApi('pazienti:getAll'),
                callApi('staff:getAll')
            ]);

            const appuntamenti = (appRes && appRes.success) ? appRes.data : [];
            const pazienti = (pazRes && pazRes.success) ? pazRes.data : [];
            const staffList = (staffRes && staffRes.success) ? staffRes.data : [];

            const appOggi = appuntamenti.filter(a => {
                const d = new Date(a.data_ora_inizio);
                const today = new Date();
                return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
            });

            const CARDS = [
                {
                    id: 'pazienti',
                    title: 'Pazienti & Cartelle Cliniche',
                    desc: 'Anagrafica, anamnesi medica, odontogramma interattivo FDI, prescrizioni e TAC/RMN.',
                    icon: 'person_search',
                    color: '#0d9488',
                    bg: 'rgba(13,148,136,0.12)',
                    badge: `${pazienti.length} Pazienti`
                },
                {
                    id: 'agenda',
                    title: 'Agenda & Gestione Poltrone',
                    desc: 'Pianificazione visite per riunito, collision detector in tempo reale e promemoria WhatsApp.',
                    icon: 'calendar_month',
                    color: '#2563eb',
                    bg: 'rgba(37,99,235,0.12)',
                    badge: `${appOggi.length} Oggi`
                },
                {
                    id: 'prestazioni',
                    title: 'Listino Prestazioni Cliniche',
                    desc: 'Nomenclatore odontoiatrico, tempi poltrona, quote per medico e segreteria/ASO.',
                    icon: 'list_alt',
                    color: '#16a34a',
                    bg: 'rgba(22,163,74,0.12)',
                    badge: 'Tariffario'
                },
                {
                    id: 'staff',
                    title: 'Equipe Medica & Staff',
                    desc: 'Medici odontoiatri, igienisti, assistenti alla poltrona ASO, segreteria e liquidazioni.',
                    icon: 'badge',
                    color: '#9333ea',
                    bg: 'rgba(147,51,234,0.12)',
                    badge: `${staffList.length} Membri`
                },
                {
                    id: 'contabilita',
                    title: 'Finanze, Incassi & Rate',
                    desc: 'Area riservata: emissione ricevute, acconti, piani di rateizzazione e spese di studio.',
                    icon: 'account_balance_wallet',
                    color: '#d97706',
                    bg: 'rgba(217,119,6,0.12)',
                    badge: 'Riservata'
                },
                {
                    id: 'statistiche',
                    title: 'Statistiche & Utili Direzione',
                    desc: 'Cruscotto economico e margini operativi per il Direttore Sanitario (protetto RBAC).',
                    icon: 'monitoring',
                    color: '#e11d48',
                    bg: 'rgba(225,29,72,0.12)',
                    badge: 'Direzione'
                }
            ];

            el.innerHTML = `
                <div class="ds-root fade-in-up">
                    ${renderHero({
                        title: 'DentalSuite • Hub Operativo Clinico',
                        subtitle: 'Seleziona una sezione per accedere alle funzionalità dello studio odontoiatrico.',
                        icon: 'dentistry',
                        actionsHtml: `
                            <button class="ds-btn ds-btn-hero" id="ds-quick-new-paz"><span class="material-symbols-rounded">person_add</span>Nuovo Paziente</button>
                            <button class="ds-btn ds-btn-hero" id="ds-quick-new-app"><span class="material-symbols-rounded">calendar_add_on</span>Nuova Visita</button>
                        `
                    })}

                    <div class="ds-hub-grid">
                        ${CARDS.map(c => `
                            <div class="ds-hub-card" data-target="${c.id}">
                                <div class="ds-hub-card-header">
                                    <div class="ds-hub-icon-wrap" style="background:${c.bg}; color:${c.color};">
                                        <span class="material-symbols-rounded">${c.icon}</span>
                                    </div>
                                    <span class="ds-badge" style="background:${c.bg}; color:${c.color};">${c.badge}</span>
                                </div>
                                <div class="ds-hub-card-body">
                                    <h3 class="ds-hub-card-title">${c.title}</h3>
                                    <p class="ds-hub-card-desc">${c.desc}</p>
                                </div>
                                <div class="ds-hub-card-footer">
                                    <span>Apri sezione</span>
                                    <span class="material-symbols-rounded" style="font-size:1.1rem;">arrow_forward</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="ds-panel" style="margin-top:0.8rem;">
                        <div class="ds-panel-header">
                            <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">event_upcoming</span>Prossimi Appuntamenti in Poltrona (Vista Operativa)</div>
                            <button class="ds-btn ds-btn-ghost" id="ds-hub-goto-agenda" style="font-size:0.8rem; padding:0.4rem 0.8rem;">Apri Agenda Completa</button>
                        </div>
                        <div class="ds-table-wrap">
                            <table class="ds-table">
                                <thead>
                                    <tr>
                                        <th>Data e Ora</th>
                                        <th>Paziente</th>
                                        <th>Medico / Operatore</th>
                                        <th>Poltrona</th>
                                        <th>Stato</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${appuntamenti.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:var(--md-on-surface-variant);">Nessun appuntamento in programma.</td></tr>' : appuntamenti.slice(0, 5).map(a => `
                                        <tr>
                                            <td style="font-weight:700;">${formatDateTime(a.data_ora_inizio)}</td>
                                            <td><strong>${a.paziente_cognome || ''} ${a.paziente_nome || ''}</strong><br><small style="color:var(--md-on-surface-variant);">Tel: ${a.paziente_telefono || '-'}</small></td>
                                            <td><span class="ds-badge" style="background:${a.colore_calendario || '#0d9488'}22; color:${a.colore_calendario || '#0d9488'}; font-weight:800;">Dr. ${a.medico_cognome || ''}</span></td>
                                            <td><span class="ds-badge ds-badge-teal">${a.poltrona || 'Unità 1'}</span></td>
                                            <td><span class="ds-badge ds-badge-${a.stato === 'completato' ? 'green' : (a.stato === 'in_corso' ? 'blue' : (a.stato === 'in_attesa' ? 'amber' : 'teal'))}">${a.stato}</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            el.querySelectorAll('.ds-hub-card').forEach(card => {
                card.addEventListener('click', () => {
                    const target = card.dataset.target;
                    if (target && onNavigate) onNavigate(target);
                });
            });

            const btnP = el.querySelector('#ds-quick-new-paz');
            if (btnP && onNavigate) btnP.addEventListener('click', () => onNavigate('pazienti', { openNew: true }));

            const btnV = el.querySelector('#ds-quick-new-app');
            if (btnV && onNavigate) btnV.addEventListener('click', () => onNavigate('agenda', { openNew: true }));

            const btnGA = el.querySelector('#ds-hub-goto-agenda');
            if (btnGA && onNavigate) btnGA.addEventListener('click', () => onNavigate('agenda'));

        } catch (e) {
            el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore: ${e.message}</p></div>`;
        }
    }
};
