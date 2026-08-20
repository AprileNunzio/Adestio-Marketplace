import { callApi } from '../shared/api.js';
import { renderHero } from '../shared/ui_kit.js';
import { openAppointmentModal } from '../components/appointment_modal.js';

export default {
    render: async (el, onNavigate) => {
        try {
            el.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Inizializzazione Dashboard...</p></div>';

            const [pazRes, appRes, staffRes, strutRes] = await Promise.all([
                callApi('pazienti:getAll'),
                callApi('agenda:getAppuntamenti', {
                    dateFrom: new Date(new Date().setHours(0,0,0,0)).getTime(),
                    dateTo: new Date(new Date().setHours(23,59,59,999)).getTime()
                }),
                callApi('staff:getAll'),
                callApi('struttura:getAll')
            ]);

            const pazientiCount = (pazRes && pazRes.success && Array.isArray(pazRes.data)) ? pazRes.data.length : 0;
            const appuntamentiOggi = (appRes && appRes.success && Array.isArray(appRes.data)) ? appRes.data.length : 0;
            const staffCount = (staffRes && staffRes.success && Array.isArray(staffRes.data)) ? staffRes.data.length : 0;
            const poltroneCount = (strutRes && strutRes.success && strutRes.data && Array.isArray(strutRes.data.poltrone)) ? strutRes.data.poltrone.length : 0;

            const CARDS = [
                {
                    id: 'pazienti',
                    title: 'Pazienti & Cartelle Cliniche',
                    subtitle: 'Cartelle complete a pieno schermo, anagrafica, anamnesi medica, odontogramma FDI e diario interventi.',
                    icon: 'person_search',
                    color: '#0d9488',
                    badge: `${pazientiCount} Cartelle Attive`
                },
                {
                    id: 'agenda',
                    title: 'Agenda Poltrone & Appuntamenti',
                    subtitle: 'Planning poltrone, gestione orari, assegnazione automatica specialisti e notifiche promemoria.',
                    icon: 'calendar_month',
                    color: '#2563eb',
                    badge: `${appuntamentiOggi} Visite Oggi`
                },
                {
                    id: 'struttura',
                    title: 'Sedi, Sale & Poltrone',
                    subtitle: 'Configura le sedi dello studio, gli ambulatori e assegna i medici specialisti alle unità operative.',
                    icon: 'domain',
                    color: '#0891b2',
                    badge: `${poltroneCount} Poltrone Configurate`
                },
                {
                    id: 'contabilita',
                    title: 'Finanze & Contabilità Riservata',
                    subtitle: 'Area protetta: emissione ricevute sanitarie, piani rateali, preventivi di spesa e uscite di studio.',
                    icon: 'account_balance_wallet',
                    color: '#9333ea',
                    badge: 'Area Riservata'
                },
                {
                    id: 'prestazioni',
                    title: 'Listino Prestazioni & Tariffe',
                    subtitle: 'Catalogo clinico, tariffe, provvigioni medici ed assistenti e tempi di poltrona.',
                    icon: 'list_alt',
                    color: '#059669',
                    badge: 'Nomenclatore Odontoiatrico'
                },
                {
                    id: 'staff',
                    title: 'Staff & Collaboratori Medici',
                    subtitle: 'Equipe medica, assistenti, calcolo liquidazioni periodiche e controllo accessi RBAC.',
                    icon: 'badge',
                    color: '#d97706',
                    badge: `${staffCount} Operatori`
                },
                {
                    id: 'statistiche',
                    title: 'Statistiche Direzione & Margini',
                    subtitle: 'Cruscotto economico con grafici moderni SVG, andamento mensile, previsioni di cassa e margini.',
                    icon: 'monitoring',
                    color: '#e11d48',
                    badge: 'Direzione Sanitaria'
                }
            ];

            const cardsHtml = CARDS.map(c => `
                <div class="ds-hub-card ds-hub-card-clickable fade-in-up" data-module="${c.id}" style="--hub-card-accent: ${c.color};">
                    <div class="ds-hub-card-header">
                        <div class="ds-hub-card-icon" style="background: ${c.color};">
                            <span class="material-symbols-rounded">${c.icon}</span>
                        </div>
                        <span class="ds-hub-card-badge">${c.badge}</span>
                    </div>
                    <h3 class="ds-hub-card-title">${c.title}</h3>
                    <p class="ds-hub-card-subtitle">${c.subtitle}</p>
                    <div class="ds-hub-card-footer">
                        <span class="ds-hub-card-action">Accedi alla Sezione</span>
                        <span class="material-symbols-rounded">arrow_forward</span>
                    </div>
                </div>
            `).join('');

            el.innerHTML = `
                <div class="ds-root fade-in-up">
                    ${renderHero({
                        title: 'DentalSuite Hub',
                        subtitle: 'Piattaforma Professionale per la Gestione dello Studio Odontoiatrico Multi-Sede.',
                        icon: 'dentistry',
                        actionsHtml: `
                            <button class="ds-btn ds-btn-hero" id="ds-hub-quick-paz"><span class="material-symbols-rounded">person_add</span>Nuova Cartella</button>
                            <button class="ds-btn ds-btn-hero" id="ds-hub-quick-app"><span class="material-symbols-rounded">add_circle</span>Nuova Visita</button>
                        `
                    })}

                    <div class="ds-hub-grid">
                        ${cardsHtml}
                    </div>
                </div>
            `;

            el.querySelectorAll('.ds-hub-card-clickable').forEach(card => {
                card.addEventListener('click', () => {
                    const mod = card.dataset.module;
                    if (mod && onNavigate) onNavigate(mod);
                });
            });

            const btnQuickPaz = el.querySelector('#ds-hub-quick-paz');
            if (btnQuickPaz) {
                btnQuickPaz.addEventListener('click', () => {
                    if (onNavigate) onNavigate('paziente_editor');
                });
            }

            const btnQuickApp = el.querySelector('#ds-hub-quick-app');
            if (btnQuickApp) {
                btnQuickApp.addEventListener('click', () => {
                    openAppointmentModal({
                        onSaved: () => {
                            if (onNavigate) onNavigate('agenda');
                        }
                    });
                });
            }

        } catch (e) {
            el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore durante il caricamento dell'Hub: ${e.message}</p></div>`;
        }
    }
};
