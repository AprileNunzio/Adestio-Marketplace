'use strict';

const path = require('path');
const { pathToFileURL } = require('url');
const dom = require('./dom_stub');
const { creaHost, creaBroker } = require('./host_stub');
const { verifica, riepiloga } = require('./verifiche');

const APP_ROOT = path.join(__dirname, '..');

const PAZIENTE = {
    nome: 'Giulia',
    cognome: 'Marino',
    data_nascita: '1984-03-12',
    luogo_nascita: 'Bari',
    sesso: 'F',
    telefono: '3401234567',
    email: 'giulia.marino@example.it',
    indirizzo: 'Via Roma 12',
    cap: '70100',
    citta: 'Bari',
    provincia: 'BA',
    codice_fiscale: 'RSSMRA85T10A562S',
    gruppo_sanguigno: '0+',
    pacemaker: 1,
    professione: 'Insegnante',
    stato_civile: 'coniugata',
    assicurazione: 'Unisalute',
    numero_polizza: 'POL-99120',
    esenzioni: 'E02',
    medico_curante: 'Dott. Neri',
    tel_medico_curante: '0801234567',
    contatto_emergenza_nome: 'Luca Marino',
    contatto_emergenza_parentela: 'Coniuge',
    contatto_emergenza_tel: '3339998877',
    consenso_privacy: 1,
    data_consenso_privacy: '2026-01-15',
    note: 'Paziente molto ansiosa, preferisce sedute brevi'
};

const ANAMNESI = {
    allergie_farmaci: 'Penicillina',
    farmaci_abituali: 'Cardioaspirina 100mg la sera',
    terapie_in_corso: 'Coumadin secondo INR',
    note_mediche: 'Controllo INR 48h prima di ogni estrazione',
    terapia_anticoagulanti: 1,
    patologie_strutturate: JSON.stringify({ anticoagulanti_tao: true, ipertensione: true, pacemaker_icd: true }),
    allergie_strutturate: JSON.stringify({ penicilline: true, lattice: true }),
    intolleranze_strutturate: JSON.stringify({ lattosio: true }),
    stile_vita_strutturato: JSON.stringify({ fumo_attivo: true, odontofobia: true })
};

function testo(nodo) {
    return dom.testoDi(nodo);
}

async function preparaDossier(broker) {
    const rispostaMedico = await broker.invoca('staff.create', { nome: 'Anna', cognome: 'Bianchi', ruolo: 'odontoiatra' });
    if (!rispostaMedico || !rispostaMedico.data) throw new Error('staff.create: ' + JSON.stringify(rispostaMedico));
    const medico = rispostaMedico.data;

    const rispostaPaziente = await broker.invoca('pazienti.create', PAZIENTE);
    if (!rispostaPaziente || !rispostaPaziente.data) throw new Error("pazienti.create: " + JSON.stringify(rispostaPaziente));
    const paziente = rispostaPaziente.data;
    const esitoAnamnesi = await broker.invoca('anamnesi.save', { paziente_id: paziente.id, ...ANAMNESI });
    if (!esitoAnamnesi || esitoAnamnesi.success !== true) throw new Error('anamnesi.save: ' + JSON.stringify(esitoAnamnesi));

    await broker.invoca('prescrizioni.add', {
        paziente_id: paziente.id,
        medico_id: medico.id,
        farmaco: 'Augmentin',
        principio_attivo: 'Amoxicillina + Acido clavulanico',
        dosaggio: '1g',
        posologia: '1 cp x 2',
        durata_giorni: 6,
        data_prescrizione: '2026-08-20'
    });
    await broker.invoca('prescrizioni.add', {
        paziente_id: paziente.id,
        medico_id: medico.id,
        farmaco: 'Tachipirina',
        principio_attivo: 'Paracetamolo',
        dosaggio: '1000mg',
        posologia: 'al bisogno',
        durata_giorni: 3,
        data_prescrizione: '2026-08-21'
    });

    await broker.invoca('trattamenti.add', {
        paziente_id: paziente.id,
        medico_id: medico.id,
        descrizione: 'Otturazione composito',
        dente: '26',
        stato: 'eseguito',
        importo: 150,
        data_trattamento: '2026-07-04'
    });

    const composizione = require(path.join(APP_ROOT, 'backend', 'domain', 'composizione_dossier'));
    return composizione.componiDossier(paziente.id);
}

async function main() {
    dom.installa();
    global.window.setTimeout = (fn, ms) => setTimeout(fn, ms);
    global.window.clearTimeout = id => clearTimeout(id);
    global.window.requestAnimationFrame = fn => setTimeout(fn, 0);
    global.window.addEventListener = global.window.addEventListener || (() => {});
    global.window.removeEventListener = global.window.removeEventListener || (() => {});
    const host = creaHost({ utenteId: 'dott-rossi' });
    const broker = creaBroker();
    const permessi = require(path.join(APP_ROOT, 'core', 'permissions.json')).map(voce => voce.id);
    host.concedi(permessi);
    require(path.join(APP_ROOT, 'backend.js'))
        .registerBackendHandlers(broker.registerApi, host.electronApp, host.adestioDb);

    const dossier = await preparaDossier(broker);

    verifica('Il dossier è alla versione 2', dossier.versione === 2, String(dossier.versione));
    verifica('Trasporta le note del paziente', Boolean(dossier.paziente.note), dossier.paziente.note);
    verifica('Trasporta il contatto di emergenza con parentela',
        dossier.paziente.emergenza.parentela === 'Coniuge', dossier.paziente.emergenza.sintesi);
    verifica('Trasporta il telefono del medico curante',
        dossier.paziente.medico_curante_scheda.telefono === '0801234567');
    verifica('Trasporta i dati assicurativi',
        dossier.paziente.amministrativo.assicurazione === 'Unisalute');
    verifica('Trasporta i farmaci abituali',
        dossier.anamnesi.farmaci_abituali.includes('Cardioaspirina'), dossier.anamnesi.farmaci_abituali);
    verifica('Trasporta il principio attivo delle prescrizioni',
        dossier.prescrizioni.every(voce => typeof voce.principio_attivo === 'string'));

    verifica('Calcola ASA III per il paziente in TAO', dossier.anamnesi.rischio.asa === 3,
        `ASA ${dossier.anamnesi.rischio.asa}`);
    verifica('Segnala rischio emorragico alto',
        dossier.anamnesi.rischio.emorragico.grado === 'alto');
    verifica('Segnala cautela sul vasocostrittore',
        dossier.anamnesi.rischio.vasocostrittore.grado === 'cautela');
    verifica('Risolve le patologie strutturate in etichette leggibili',
        dossier.anamnesi.patologie.some(gruppo =>
            gruppo.voci.some(voce => voce.etichetta.includes('anticoagulante'))),
        JSON.stringify(dossier.anamnesi.patologie.map(g => g.titolo)));
    verifica('Risolve allergie e intolleranze strutturate',
        dossier.anamnesi.allergie.length === 2 && dossier.anamnesi.intolleranze.length === 1,
        `allergie ${dossier.anamnesi.allergie.length} · intolleranze ${dossier.anamnesi.intolleranze.length}`);

    const augmentin = dossier.prescrizioni.find(voce => voce.farmaco === 'Augmentin');
    const tachipirina = dossier.prescrizioni.find(voce => voce.farmaco === 'Tachipirina');
    verifica('Segnala Augmentin contro l\'allergia alle penicilline',
        augmentin.avvisi.length > 0, augmentin.avvisi.map(a => a.riferimento).join(' · '));
    verifica('Non segnala il paracetamolo', tachipirina.avvisi.length === 0);

    const modulo = await import(pathToFileURL(path.join(APP_ROOT, 'ui', 'views', 'trasmissione', 'scheda.js')).href);
    const radice = modulo.schermoScheda({
        istantanea: { dossier, ricevuto_il: Date.now(), servitore_info: null },
        collegato: true,
        onChiudi: () => {},
        onAggiorna: () => {},
        onCambiaPaziente: () => {},
        onEsci: () => {},
        onCambiaPostazione: () => {}
    });

    verifica('La scheda monitor viene renderizzata', Boolean(radice));

    const contenuto = testo(radice);
    verifica('Il monitor mostra il nome del paziente', contenuto.includes('Marino'));
    verifica('Il monitor mostra il punteggio ASA', contenuto.includes('ASA'));
    verifica('Il monitor mostra il rischio emorragico', contenuto.includes('Emorragico'));
    verifica('Il monitor mostra i farmaci abituali', contenuto.includes('Cardioaspirina'));
    verifica('Il monitor mostra le patologie risolte', contenuto.includes('anticoagulante'));
    verifica('Il monitor mostra il principio attivo', contenuto.includes('Amoxicillina'));
    verifica('Il monitor avvisa sulla prescrizione a rischio', contenuto.includes('Verificare'));
    verifica('Il monitor mostra le note mediche', contenuto.includes('INR'));

    const pannelli = radice.querySelectorAll('.ds-mn__pannello');
    verifica('Il monitor espone i pannelli clinici', pannelli.length >= 5, `${pannelli.length} pannelli`);
    verifica('Esiste il pannello anamnestico',
        radice.querySelectorAll('.ds-mn__pannello--anamnesi').length === 1);
    verifica('Le voci critiche sono marcate',
        radice.querySelectorAll('.ds-mn__voce-clinica').length > 0,
        `${radice.querySelectorAll('.ds-mn__voce-clinica').length} voci`);

    riepiloga();
    process.exit(0);
}

main().catch(errore => {
    console.error('INTERROTTO:', errore);
    process.exit(1);
});
