'use strict';

const crypto = require('crypto');

const AMBITI = ['sanitario', 'privacy', 'promemoria', 'marketing', 'ricerca', 'immagini'];
const STATO_CONCESSO = 'concesso';
const STATO_REVOCATO = 'revocato';
const STATO_SCADUTO = 'scaduto';

function improntaTesto(testo) {
    return crypto.createHash('sha256').update(String(testo || '')).digest('hex');
}

function aggiungiMesi(isoDate, mesi) {
    const parti = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || ''));
    if (!parti || !mesi) return '';
    const target = new Date(Number(parti[1]), Number(parti[2]) - 1 + Number(mesi), 1);
    const ultimo = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    const giorno = Math.min(Number(parti[3]), ultimo);
    return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`;
}

function statoEffettivo(consenso, oggi) {
    if (consenso.stato === STATO_REVOCATO) return STATO_REVOCATO;
    if (consenso.data_scadenza && consenso.data_scadenza < oggi) return STATO_SCADUTO;
    return STATO_CONCESSO;
}

function piuRecente(candidato, corrente) {
    if (!corrente) return true;
    const dataCandidato = String(candidato.data_concessione || '');
    const dataCorrente = String(corrente.data_concessione || '');
    if (dataCandidato !== dataCorrente) return dataCandidato > dataCorrente;
    return Number(candidato.created_at || 0) >= Number(corrente.created_at || 0);
}

function vigenti(consensi, oggi) {
    const perAmbito = new Map();
    consensi.forEach(consenso => {
        if (piuRecente(consenso, perAmbito.get(consenso.ambito))) {
            perAmbito.set(consenso.ambito, consenso);
        }
    });
    return [...perAmbito.values()].map(consenso => ({
        ...consenso,
        stato_effettivo: statoEffettivo(consenso, oggi)
    }));
}

function scoperture(modelli, consensi, oggi) {
    const attuali = new Map(vigenti(consensi, oggi).map(voce => [voce.ambito, voce]));
    return modelli
        .filter(modello => Number(modello.in_vigore) === 1)
        .map(modello => {
            const consenso = attuali.get(modello.ambito);
            if (!consenso) {
                return { ambito: modello.ambito, titolo: modello.titolo, motivo: 'mai raccolto', obbligatorio: Number(modello.obbligatorio) === 1 };
            }
            if (consenso.stato_effettivo === STATO_REVOCATO) {
                return { ambito: modello.ambito, titolo: modello.titolo, motivo: 'revocato dal paziente', obbligatorio: Number(modello.obbligatorio) === 1 };
            }
            if (consenso.stato_effettivo === STATO_SCADUTO) {
                return { ambito: modello.ambito, titolo: modello.titolo, motivo: 'scaduto', obbligatorio: Number(modello.obbligatorio) === 1 };
            }
            if (Number(consenso.versione) < Number(modello.versione)) {
                return {
                    ambito: modello.ambito,
                    titolo: modello.titolo,
                    motivo: `raccolto sulla versione ${consenso.versione}, in vigore la ${modello.versione}`,
                    obbligatorio: Number(modello.obbligatorio) === 1
                };
            }
            return null;
        })
        .filter(Boolean);
}

function consenteAmbito(consensi, ambito, oggi) {
    const attuale = vigenti(consensi, oggi).find(voce => voce.ambito === ambito);
    return Boolean(attuale && attuale.stato_effettivo === STATO_CONCESSO);
}

module.exports = {
    AMBITI, STATO_CONCESSO, STATO_REVOCATO, STATO_SCADUTO,
    improntaTesto, aggiungiMesi, statoEffettivo, vigenti, scoperture, consenteAmbito
};
