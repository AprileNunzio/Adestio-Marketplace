export function calculateAge(birthDate) {
    try {
        if (!birthDate) return null;
        let d;
        if (typeof birthDate === 'number') {
            d = new Date(birthDate > 1e11 ? birthDate : birthDate * 1000);
        } else {
            d = new Date(birthDate);
        }
        if (isNaN(d.getTime())) return null;

        const today = new Date();
        let age = today.getFullYear() - d.getFullYear();
        const m = today.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
            age--;
        }
        return age >= 0 ? age : null;
    } catch (e) {
        return null;
    }
}

export function formatPatientDemographics(paziente) {
    try {
        if (!paziente) return '';
        let gender = '';
        const rawSex = String(paziente.sesso || '').trim().toUpperCase();
        if (rawSex === 'M' || rawSex === 'UOMO' || rawSex === 'MASCHIO') {
            gender = 'Uomo';
        } else if (rawSex === 'F' || rawSex === 'DONNA' || rawSex === 'FEMMINA') {
            gender = 'Donna';
        }

        let dateStr = '';
        let ageStr = '';

        if (paziente.data_nascita) {
            const d = new Date(paziente.data_nascita);
            if (!isNaN(d.getTime())) {
                dateStr = d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const age = calculateAge(paziente.data_nascita);
                if (age !== null) {
                    ageStr = `(${age} anni)`;
                }
            }
        }

        const parts = [gender, dateStr, ageStr].filter(Boolean);
        return parts.join(' ');
    } catch (e) {
        return '';
    }
}

export function formatPatientFullLabel(paziente) {
    try {
        if (!paziente) return '';
        const name = `${paziente.cognome || ''} ${paziente.nome || ''}${paziente.secondo_nome ? ' ' + paziente.secondo_nome : ''}`.trim();
        const demo = formatPatientDemographics(paziente);
        const cf = paziente.codice_fiscale ? `CF: ${paziente.codice_fiscale}` : '';
        const tel = paziente.telefono ? `Tel: ${paziente.telefono}` : '';

        const details = [demo, cf, tel].filter(Boolean).join(' • ');
        return details ? `${name} (${details})` : name;
    } catch (e) {
        return (paziente && (paziente.cognome + ' ' + paziente.nome)) || '';
    }
}
