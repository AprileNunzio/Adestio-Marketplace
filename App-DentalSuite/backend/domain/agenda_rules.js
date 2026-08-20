'use strict';

const MINUTO_MS = 60000;

function intervallo(appuntamento) {
    const inizio = Number(appuntamento.data_ora_inizio);
    const durata = Math.max(1, Number(appuntamento.durata_minuti) || 30);
    return { inizio, fine: inizio + durata * MINUTO_MS };
}

function siSovrappongono(primo, secondo) {
    const a = intervallo(primo);
    const b = intervallo(secondo);
    return a.inizio < b.fine && b.inizio < a.fine;
}

function conflitti(candidato, esistenti) {
    return esistenti
        .filter(altro => altro.id !== candidato.id)
        .filter(altro => altro.stato !== 'annullato')
        .filter(altro => {
            const stessaPoltrona = candidato.poltrona_id && altro.poltrona_id === candidato.poltrona_id;
            const stessoMedico = candidato.medico_id && altro.medico_id === candidato.medico_id;
            return (stessaPoltrona || stessoMedico) && siSovrappongono(candidato, altro);
        })
        .map(altro => ({
            id: altro.id,
            motivo: candidato.poltrona_id && altro.poltrona_id === candidato.poltrona_id
                ? 'poltrona occupata'
                : 'medico già impegnato',
            data_ora_inizio: altro.data_ora_inizio,
            durata_minuti: altro.durata_minuti
        }));
}

function validaAppuntamento(candidato) {
    const errori = [];
    if (!candidato.data_ora_inizio || Number.isNaN(Number(candidato.data_ora_inizio))) {
        errori.push('Data e ora di inizio non valide');
    }
    const durata = Number(candidato.durata_minuti);
    if (!Number.isFinite(durata) || durata <= 0) {
        errori.push('La durata deve essere maggiore di zero');
    }
    if (durata > 600) {
        errori.push('La durata non può superare 10 ore');
    }
    if (!candidato.poltrona_id && !candidato.medico_id) {
        errori.push('Indicare almeno la poltrona o il medico');
    }
    return errori;
}

module.exports = { siSovrappongono, conflitti, validaAppuntamento, intervallo };
