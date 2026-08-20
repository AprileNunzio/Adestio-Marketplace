import { callApi } from '../shared/api.js';
import { generateAppointmentWhatsAppMessage, generateAppointmentEmail, generateInstallmentReminderMessage } from '../domain/message_templates.js';

export async function sendWhatsAppManual({ paziente, appuntamento, rata, messaggioCustom = '', studioInfo = {} }) {
    try {
        let phone = (paziente && (paziente.telefono || paziente.cellulare)) || '';
        phone = phone.replace(/\D/g, '');
        if (!phone) {
            return { success: false, error: 'Numero di telefono del paziente mancante o non valido.' };
        }
        if (phone.length === 10 && !phone.startsWith('39')) {
            phone = '39' + phone;
        }

        let message = messaggioCustom;
        if (!message) {
            if (appuntamento) {
                message = generateAppointmentWhatsAppMessage({ paziente, appuntamento, studioInfo });
            } else if (rata) {
                message = generateInstallmentReminderMessage({ paziente, rata, studioInfo });
            } else {
                message = `Gentile ${paziente.cognome} ${paziente.nome}, Le inviamo un promemoria da parte dello Studio Odontoiatrico.`;
            }
        }

        const encoded = encodeURIComponent(message);
        const waNativeUrl = `whatsapp://send?phone=${phone}&text=${encoded}`;
        const waWebUrl = `https://wa.me/${phone}?text=${encoded}`;

        try {
            window.location.href = waNativeUrl;
        } catch (e) {
            window.open(waWebUrl, '_blank');
        }

        await callApi('notifiche:log', {
            paziente_id: paziente.id,
            appuntamento_id: appuntamento ? appuntamento.id : '',
            tipo_canale: 'whatsapp',
            destinatario: phone,
            template_usato: appuntamento ? 'promemoria_visita' : (rata ? 'scadenza_rata' : 'messaggio_diretto'),
            messaggio: message,
            stato_esito: 'inviato'
        });

        return { success: true, url: waNativeUrl };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

export async function sendEmailManual({ paziente, appuntamento, rata, messaggioCustom = '', studioInfo = {} }) {
    try {
        const email = paziente && paziente.email;
        if (!email || !email.includes('@')) {
            return { success: false, error: 'Indirizzo email del paziente non specificato.' };
        }

        let subject = 'Comunicazione dallo Studio Odontoiatrico';
        let body = messaggioCustom;

        if (appuntamento) {
            const res = generateAppointmentEmail({ paziente, appuntamento, studioInfo });
            subject = res.subject;
            body = res.body;
        } else if (rata) {
            subject = `Promemoria Scadenza Pagamento - ${studioInfo.name || 'Studio Dentistico'}`;
            body = generateInstallmentReminderMessage({ paziente, rata, studioInfo });
        } else if (!body) {
            body = `Gentile ${paziente.cognome} ${paziente.nome},\n\nLe inviamo la presente comunicazione relativa alla Sua posizione clinica e contabile.\n\nCordiali saluti,\nStudio Odontoiatrico`;
        }

        const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoUrl;

        await callApi('notifiche:log', {
            paziente_id: paziente.id,
            appuntamento_id: appuntamento ? appuntamento.id : '',
            tipo_canale: 'email',
            destinatario: email,
            template_usato: appuntamento ? 'email_appuntamento' : (rata ? 'email_rata' : 'email_comunicazione'),
            messaggio: body,
            stato_esito: 'inviato'
        });

        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}
