'use strict';

const ANNI_CONSERVAZIONE_CLINICA = 10;

const CAMPI_IDENTIFICATIVI = [
    'codice_fiscale', 'nome', 'secondo_nome', 'cognome', 'data_nascita', 'luogo_nascita',
    'telefono', 'email', 'indirizzo', 'cap', 'citta', 'provincia', 'codice_sdi', 'pec',
    'medico_curante', 'tel_medico_curante', 'contatto_emergenza_nome',
    'contatto_emergenza_parentela', 'contatto_emergenza_tel', 'professione',
    'numero_polizza', 'assicurazione', 'note', 'preferenze_orari'
];

const SEGNAPOSTO = '[cancellato su richiesta]';

function annoDa(isoDate) {
    const parti = /^(\d{4})/.exec(String(isoDate || ''));
    return parti ? Number(parti[1]) : null;
}

function ultimoAttoClinico(atti) {
    const date = atti
        .map(atto => atto.data_trattamento || atto.data_prescrizione || atto.data_esame || '')
        .filter(Boolean)
        .sort();
    return date.length > 0 ? date[date.length - 1] : '';
}

function conservazioneFinoAl(atti, oggi) {
    if (!atti || atti.length === 0) return '';
    const ultimo = ultimoAttoClinico(atti) || oggi;
    const anno = annoDa(ultimo);
    if (anno === null) return '';
    return `${anno + ANNI_CONSERVAZIONE_CLINICA}${ultimo.slice(4)}`;
}

function valuta(contesto) {
    const oggi = contesto.oggi;
    const atti = contesto.atti_clinici || [];
    const scadenza = conservazioneFinoAl(atti, oggi);
    const obbligoAttivo = Boolean(scadenza) && scadenza >= oggi;

    const impedimenti = [];
    if (obbligoAttivo) {
        impedimenti.push({
            tipo: 'conservazione_clinica',
            descrizione: `Gli atti clinici vanno conservati fino al ${scadenza} (${ANNI_CONSERVAZIONE_CLINICA} anni dall'ultima prestazione)`
        });
    }
    if ((contesto.rate_aperte || 0) > 0) {
        impedimenti.push({
            tipo: 'rapporto_economico_aperto',
            descrizione: `${contesto.rate_aperte} rate non ancora incassate: il rapporto contrattuale non è chiuso`
        });
    }
    if ((contesto.appuntamenti_futuri || 0) > 0) {
        impedimenti.push({
            tipo: 'appuntamenti_futuri',
            descrizione: `${contesto.appuntamenti_futuri} appuntamenti ancora in agenda`
        });
    }

    return {
        cancellazione_totale_possibile: impedimenti.length === 0,
        anonimizzazione_possibile: (contesto.rate_aperte || 0) === 0 && (contesto.appuntamenti_futuri || 0) === 0,
        conservazione_fino_al: scadenza,
        obbligo_conservazione_attivo: obbligoAttivo,
        impedimenti,
        campi_da_anonimizzare: CAMPI_IDENTIFICATIVI.length,
        atti_clinici_conservati: atti.length
    };
}

function payloadAnonimizzazione() {
    return CAMPI_IDENTIFICATIVI.reduce((acc, campo) => {
        acc[campo] = campo === 'cognome' ? SEGNAPOSTO : '';
        return acc;
    }, {});
}

module.exports = {
    ANNI_CONSERVAZIONE_CLINICA, CAMPI_IDENTIFICATIVI, SEGNAPOSTO,
    valuta, payloadAnonimizzazione, conservazioneFinoAl, ultimoAttoClinico
};
