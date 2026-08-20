export function detectAppointmentConflicts({ existingAppointments = [], newAppointment = {}, excludeId = null }) {
    try {
        const start = Number(newAppointment.data_ora_inizio);
        const end = Number(newAppointment.data_ora_fine);
        const medicoId = newAppointment.medico_id;
        const poltrona = newAppointment.poltrona;

        if (!start || !end || start >= end) {
            return { hasConflict: true, reasons: ['Orario di inizio e fine non valido.'] };
        }

        const reasons = [];

        for (const app of existingAppointments) {
            if (excludeId && app.id === excludeId) continue;
            if (app.is_deleted || app.stato === 'disdetto') continue;

            const aStart = Number(app.data_ora_inizio);
            const aEnd = Number(app.data_ora_fine);

            const isOverlap = (start < aEnd && end > aStart);

            if (isOverlap) {
                if (medicoId && app.medico_id === medicoId) {
                    reasons.push(`Il Dr. ${app.medico_cognome || 'assegnato'} è già impegnato in un'altra visita (${new Date(aStart).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'})} - ${new Date(aEnd).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'})}).`);
                }
                if (poltrona && app.poltrona === poltrona) {
                    reasons.push(`La poltrona "${poltrona}" è già occupata dal paziente ${app.paziente_cognome || ''} ${app.paziente_nome || ''} (${new Date(aStart).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'})} - ${new Date(aEnd).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'})}).`);
                }
            }
        }

        return {
            hasConflict: reasons.length > 0,
            reasons
        };
    } catch (e) {
        return { hasConflict: false, reasons: [] };
    }
}
