'use strict';

const denti = require('../denti');
const densita = require('../densita');
const anagrafica = require('./anagrafica');
const clinico = require('./clinico');
const quadroAnamnestico = require('../anamnesi/quadro');
const interazioni = require('../anamnesi/interazioni');

const VERSIONE = 2;

function componi(materiale) {
    const nominativi = materiale.nominativi;
    const catalogo = materiale.catalogo;
    const anamnesi = quadroAnamnestico.componi(materiale.anamnesi, materiale.paziente);
    const prescrizioni = materiale.prescrizioni.map(riga => clinico.prescrizione(riga, nominativi));

    return {
        versione: VERSIONE,
        generato_il: Date.now(),
        origine: materiale.origine || '',
        densita: densita.descrivi(materiale.schermo),
        paziente: anagrafica.componi(materiale.paziente),
        anamnesi,
        odontogramma: clinico.arcata(materiale.dentizione || denti.PERMANENTE, materiale.denti),
        rilevazioni: clinico.storiaDelDente(materiale.rilevazioni),
        trattamenti: materiale.trattamenti.map(riga => clinico.trattamento(riga, catalogo, nominativi)),
        prescrizioni: interazioni.annota(prescrizioni, anamnesi),
        referti: materiale.referti.map(clinico.referto),
        consensi: clinico.quadroConsensi(materiale.consensi, materiale.oggi),
        seduta: clinico.seduta(materiale.appuntamenti, nominativi, catalogo)
    };
}

module.exports = { componi, VERSIONE };
