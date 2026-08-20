export function generateAppointmentWhatsAppMessage({ paziente, appuntamento, studioInfo = {} }) {
    try {
        const studioName = studioInfo.name || 'Studio Dentistico';
        const phone = studioInfo.phone || '';
        const d = new Date(appuntamento.data_ora_inizio);
        const dateStr = d.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        const doc = appuntamento.medico_cognome ? `Dr. ${appuntamento.medico_cognome}` : 'nostro specialista';

        const lines = [
            `Gentile ${paziente.nome} ${paziente.cognome},`,
            `Le ricordiamo il Suo appuntamento odontoiatrico fissato presso ${studioName}:`,
            ``,
            `📅 Data: ${dateStr}`,
            `⏰ Orario: ${timeStr}`,
            `👨‍⚕️ Medico: ${doc}`,
            `🏥 Poltrona: ${appuntamento.poltrona || 'Unità 1'}`,
            appuntamento.prestazione_nome ? `🩺 Prestazione: ${appuntamento.prestazione_nome}` : '',
            ``,
            `La preghiamo di presentarsi con 5 minuti di anticipo e di provvedere alla consueta igiene orale preventiva.`,
            `Per qualsiasi variazione o necessità, può contattarci al ${phone}.`,
            `Cordiali saluti,`,
            `${studioName}`
        ].filter(Boolean);

        return lines.join('\n');
    } catch (e) {
        return '';
    }
}

export function generateAppointmentEmail({ paziente, appuntamento, studioInfo = {} }) {
    try {
        const studioName = studioInfo.name || 'Studio Dentistico';
        const d = new Date(appuntamento.data_ora_inizio);
        const dateStr = d.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

        const subject = `Promemoria Appuntamento Odontoiatrico - ${dateStr} ore ${timeStr} - ${studioName}`;
        const body = `Gentile ${paziente.nome} ${paziente.cognome},

Le confermiamo il Suo appuntamento per la visita odontoiatrica fissata con i seguenti dettagli:

• Data: ${dateStr}
• Orario: ${timeStr}
• Medico Referente: Dr. ${appuntamento.medico_cognome || 'Specialista'}
• Unità Clinica: ${appuntamento.poltrona || 'Unità 1'}
${appuntamento.prestazione_nome ? '• Prestazione programmata: ' + appuntamento.prestazione_nome : ''}

In caso di impossibilità a presentarsi, La invitiamo a comunicarcelo tempestivamente con almeno 24 ore di anticipo.

Cordiali saluti,
Segreteria & Direzione Sanitaria
${studioName}`;

        return { subject, body };
    } catch (e) {
        return { subject: '', body: '' };
    }
}

export function generateInstallmentReminderMessage({ paziente, rata, studioInfo = {} }) {
    try {
        const studioName = studioInfo.name || 'Studio Dentistico';
        const scadenzaStr = new Date(rata.data_scadenza).toLocaleDateString('it-IT');
        const imp = Number(rata.importo || 0).toFixed(2);

        return [
            `Gentile ${paziente.nome} ${paziente.cognome},`,
            `Le ricordiamo la scadenza della rata n° ${rata.numero_rata} relativa al Suo piano di cura:`,
            ``,
            `💶 Importo: ${imp} €`,
            `📅 Data Scadenza: ${scadenzaStr}`,
            ``,
            `È possibile effettuare il saldo direttamente in segreteria tramite POS/Carta, bonifico o contanti.`,
            `Restiamo a disposizione per qualsiasi chiarimento.`,
            `${studioName}`
        ].join('\n');
    } catch (e) {
        return '';
    }
}
