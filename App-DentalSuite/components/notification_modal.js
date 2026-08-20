import { renderModal } from '../shared/ui_kit.js';
import { sendWhatsAppManual, sendEmailManual } from '../services/notification_service.js';
import { generateAppointmentWhatsAppMessage, generateAppointmentEmail, generateInstallmentReminderMessage } from '../domain/message_templates.js';

export function openNotificationModal({ paziente, appuntamento, rata, onSent }) {
    try {
        const isApp = !!appuntamento;
        const defaultWa = isApp
            ? generateAppointmentWhatsAppMessage({ paziente, appuntamento })
            : generateInstallmentReminderMessage({ paziente, rata });

        const emailData = isApp
            ? generateAppointmentEmail({ paziente, appuntamento })
            : { subject: 'Promemoria Rata', body: defaultWa };

        const modalHtml = renderModal({
            id: 'ds-modal-notify',
            title: isApp ? 'Invio Promemoria Appuntamento' : 'Invio Sollecito / Promemoria Rata',
            icon: 'chat',
            bodyHtml: `
                <div style="display:flex; flex-direction:column; gap:1rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--md-surface-container-low); padding:0.8rem 1rem; border-radius:12px; border:1px solid var(--md-outline-variant);">
                        <div>
                            <strong>${paziente.cognome} ${paziente.nome}</strong><br>
                            <small style="color:var(--md-on-surface-variant);">Tel: ${paziente.telefono || 'Non presente'} • Email: ${paziente.email || 'Non presente'}</small>
                        </div>
                    </div>

                    <div class="ds-form-field">
                        <label>Canale di Comunicazione</label>
                        <div style="display:flex; gap:0.8rem;">
                            <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer; font-weight:700;">
                                <input type="radio" name="ds_notify_channel" value="whatsapp" checked>
                                <span class="ds-badge ds-badge-green" style="font-size:0.85rem;"><span class="material-symbols-rounded">chat</span> WhatsApp (wa.me)</span>
                            </label>
                            <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer; font-weight:700;">
                                <input type="radio" name="ds_notify_channel" value="email">
                                <span class="ds-badge ds-badge-blue" style="font-size:0.85rem;"><span class="material-symbols-rounded">mail</span> Email (Client / Web)</span>
                            </label>
                        </div>
                    </div>

                    <div id="ds-notify-email-subject-wrap" class="ds-form-field" style="display:none;">
                        <label>Oggetto Email</label>
                        <input type="text" id="ds-notify-email-subject" class="ds-input" value="${emailData.subject}">
                    </div>

                    <div class="ds-form-field">
                        <label>Testo del Messaggio (Modificabile)</label>
                        <textarea id="ds-notify-msg" class="ds-textarea" rows="8" style="font-family:monospace; font-size:0.85rem;">${defaultWa}</textarea>
                    </div>
                </div>
            `,
            footerHtml: `
                <button type="button" class="ds-btn ds-btn-ghost ds-modal-cancel">Annulla</button>
                <button type="button" class="ds-btn ds-btn-primary" id="ds-btn-do-send"><span class="material-symbols-rounded">send</span>Invia Notifica</button>
            `
        });

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        const mEl = modalContainer.querySelector('#ds-modal-notify');
        mEl.style.display = 'flex';

        const close = () => { modalContainer.remove(); };
        mEl.querySelectorAll('.ds-modal-close, .ds-modal-cancel').forEach(b => b.addEventListener('click', close));

        const channelRadios = mEl.querySelectorAll('[name=ds_notify_channel]');
        const emailSubWrap = mEl.querySelector('#ds-notify-email-subject-wrap');
        const txtArea = mEl.querySelector('#ds-notify-msg');

        channelRadios.forEach(r => {
            r.addEventListener('change', () => {
                if (r.value === 'email') {
                    emailSubWrap.style.display = 'flex';
                    txtArea.value = emailData.body;
                } else {
                    emailSubWrap.style.display = 'none';
                    txtArea.value = defaultWa;
                }
            });
        });

        mEl.querySelector('#ds-btn-do-send').addEventListener('click', async () => {
            try {
                const selectedChannel = mEl.querySelector('[name=ds_notify_channel]:checked').value;
                if (selectedChannel === 'whatsapp') {
                    const res = await sendWhatsAppManual({ paziente, appuntamento, rata });
                    if (!res.success) { alert(res.error); return; }
                } else {
                    const res = await sendEmailManual({ paziente, appuntamento, rata });
                    if (!res.success) { alert(res.error); return; }
                }
                close();
                if (typeof onSent === 'function') onSent();
            } catch (err) {
                alert(err.message);
            }
        });
    } catch (e) {}
}
