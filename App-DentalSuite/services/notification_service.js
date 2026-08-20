import { callApi } from '../shared/api.js';
import { generateAppointmentWhatsAppMessage, generateAppointmentEmail, generateInstallmentReminderMessage } from '../domain/message_templates.js';

export async function sendWhatsAppManual({ paziente, appuntamento, rata, studioInfo = {} }) {
    try {
        let phone = (paziente && (paziente.telefono || paziente.cellulare)) || '';
        phone = phone.replace(/\D/g, '');
        if (!phone) {
            return { success: false, error: 'Numero di telefono del paziente mancante o non valido.' };
        }
        if (phone.length === 10 && !phone.startsWith('39')) {
            phone = '39' + phone;
        }

        let message = '';
        if (appuntamento) {
            message = generateAppointmentWhatsAppMessage({ paziente, appuntamento, studioInfo });
        } else if (rata) {
            message = generateInstallmentReminderMessage({ paziente, rata, studioInfo });
        }

        if (!message) {
            return { success: false, error: 'Impossibile comporre il messaggio.' };
        }

        const encoded = encodeURIComponent(message);
        const waUrl = `https://wa.me/${phone}?text=${encoded}`;

        window.open(waUrl, '_blank');

        await callApi('notifiche:log', {
            paziente_id: paziente.id,
            appuntamento_id: appuntamento ? appuntamento.id : '',
            tipo_canale: 'whatsapp',
            destinatario: phone,
            template_usato: appuntamento ? 'promemoria_visita' : 'scadenza_rata',
            messaggio: message,
            stato_esito: 'inviato'
        });

        return { success: true, url: waUrl };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

export async function sendEmailManual({ paziente, appuntamento, rata, studioInfo = {} }) {
    try {
        const email = paziente && paziente.email;
        if (!email || !email.includes('@')) {
            return { success: false, error: 'Indirizzo email del paziente non specificato.' };
        }

        let subject = '';
        let body = '';

        if (appuntamento) {
            const res = generateAppointmentEmail({ paziente, appuntamento, studioInfo });
            subject = res.subject;
            body = res.body;
        } else if (rata) {
            subject = `Promemoria Scadenza Rata - ${studioInfo.name || 'Studio Dentistico'}`;
            body = generateInstallmentReminderMessage({ paziente, rata, studioInfo });
        }

        const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoUrl, '_self');

        await callApi('notifiche:log', {
            paziente_id: paziente.id,
            appuntamento_id: appuntamento ? appuntamento.id : '',
            tipo_canale: 'email',
            destinatario: email,
            template_usato: appuntamento ? 'email_appuntamento' : 'email_rata',
            messaggio: body,
            stato_esito: 'inviato'
        });

        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}
