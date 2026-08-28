'use strict';

const denti = require('./denti');
const allerte = require('./allerte');
const money = require('./money');
const consenso = require('./consenso');
const identita = require('./identita');
const densita = require('./densita');

const VERSIONE = 1;

function intestazione(paziente) {
    return {
        id: paziente.id,
        nominativo: identita.nominativo(paziente),
        eta: identita.eta(paziente.data_nascita),
        minore: identita.isMinore(paziente.data_nascita),
        sesso: paziente.sesso || '',
        data_nascita: paziente.data_nascita || '',
        codice_fiscale: paziente.codice_fiscale || '',
        telefono: paziente.telefono || '',
        medico_curante: paziente.medico_curante || '',
        contatto_emergenza: [paziente.contatto_emergenza_nome, paziente.contatto_emergenza_tel]
            .filter(Boolean)
            .join(' · '),
        gruppo_sanguigno: paziente.gruppo_sanguigno || '',
        esenzioni: paziente.esenzioni || ''
    };
}

function quadroAnamnestico(scheda, paziente) {
    try {
        if (!scheda) {
            return {
                compilata: false,
                data_compilazione: '',
                intolleranze: '',
                allergie_farmaci: '',
                allergie_materiali: '',
                allerte: allerte.elencoDettagliato({}, paziente),
                note: ''
            };
        }
        return {
            compilata: true,
            data_compilazione: scheda.data_compilazione || '',
            intolleranze: scheda.intolleranze || '',
            allergie_farmaci: scheda.allergie_farmaci || '',
            allergie_materiali: scheda.allergie_materiali || '',
            allerte: allerte.elencoDettagliato(scheda, paziente),
            terapie_in_corso: scheda.terapie_in_corso || '',
            altre_patologie: scheda.altre_patologie || '',
            note: scheda.note_mediche || ''
        };
    } catch {
        return { compilata: false, allerte: [], note: '' };
    }
}

function arcata(dentizione, righe) {
    const mappa = denti.mappaStati(dentizione, righe);
    return {
        dentizione,
        denti: mappa,
        stati: denti.STATI,
        superfici: denti.SUPERFICI,
        con_reperto: mappa.filter(voce => voce.registrato && voce.stato !== 'sano').length
    };
}

function storiaDelDente(rilevazioni) {
    return rilevazioni.map(riga => ({
        id: riga.id,
        numero_dente: riga.numero_dente,
        stato: riga.stato,
        stato_precedente: riga.stato_precedente || '',
        superfici: riga.superfici || '',
        materiale: riga.materiale || '',
        data_rilevazione: riga.data_rilevazione || '',
        note: riga.note || ''
    }));
}

function trattamento(riga, catalogo, nominativi) {
    const prestazione = catalogo.get(riga.prestazione_id);
    const medico = nominativi.get(riga.medico_id);
    return {
        id: riga.id,
        data: riga.data_trattamento || '',
        descrizione: riga.descrizione || (prestazione ? prestazione.nome : 'Prestazione non catalogata'),
        categoria: prestazione ? prestazione.categoria || '' : '',
        dente: riga.dente || '',
        superfici: riga.superfici || '',
        stato: riga.stato || 'pianificato',
        importo: money.round(riga.importo || 0),
        medico: medico ? identita.nominativo(medico) : '',
        note: riga.note || ''
    };
}

function prescrizione(riga, nominativi) {
    const medico = nominativi.get(riga.medico_id);
    return {
        id: riga.id,
        farmaco: riga.farmaco || '',
        dosaggio: riga.dosaggio || '',
        posologia: riga.posologia || '',
        durata_giorni: Number(riga.durata_giorni) || 0,
        data: riga.data_prescrizione || '',
        medico: medico ? identita.nominativo(medico) : ''
    };
}

function referto(riga) {
    return {
        id: riga.id,
        tipo: riga.tipo || 'altro',
        titolo: riga.titolo || riga.file_name || 'Referto',
        data: riga.data_esame || '',
        mime_type: riga.mime_type || '',
        dimensione: Number(riga.file_size) || 0
    };
}

function quadroConsensi(consensi, oggi) {
    const scoperture = consenso.scoperture(consensi.modelli, consensi.raccolti, oggi);
    return {
        vigenti: consenso.vigenti(consensi.raccolti, oggi),
        scoperture,
        bloccanti: scoperture.filter(voce => voce.obbligatorio)
    };
}

function seduta(appuntamentiOggi, nominativi, catalogo) {
    if (appuntamentiOggi.length === 0) return null;
    const riga = appuntamentiOggi[0];
    const medico = nominativi.get(riga.medico_id);
    const prestazione = catalogo.get(riga.prestazione_id);
    return {
        id: riga.id,
        inizio: Number(riga.data_ora_inizio) || 0,
        durata_minuti: Number(riga.durata_minuti) || 0,
        stato: riga.stato || 'programmato',
        motivo: riga.motivo_visita || '',
        medico: medico ? identita.nominativo(medico) : '',
        prestazione: prestazione ? prestazione.nome : '',
        note: riga.note || ''
    };
}

function componi(materiale) {
    const oggi = materiale.oggi;
    const nominativi = materiale.nominativi;
    const catalogo = materiale.catalogo;

    return {
        versione: VERSIONE,
        generato_il: Date.now(),
        origine: materiale.origine || '',
        densita: densita.descrivi(materiale.schermo),
        paziente: intestazione(materiale.paziente),
        anamnesi: quadroAnamnestico(materiale.anamnesi, materiale.paziente),
        odontogramma: arcata(materiale.dentizione || denti.PERMANENTE, materiale.denti),
        rilevazioni: storiaDelDente(materiale.rilevazioni),
        trattamenti: materiale.trattamenti.map(riga => trattamento(riga, catalogo, nominativi)),
        prescrizioni: materiale.prescrizioni.map(riga => prescrizione(riga, nominativi)),
        referti: materiale.referti.map(referto),
        consensi: quadroConsensi(materiale.consensi, oggi),
        seduta: seduta(materiale.appuntamenti, nominativi, catalogo)
    };
}

module.exports = { componi, VERSIONE };
