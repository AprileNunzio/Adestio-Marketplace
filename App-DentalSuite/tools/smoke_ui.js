'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const dom = require('./dom_stub');
const { creaHost, creaBroker } = require('./host_stub');

const APP_ROOT = path.join(__dirname, '..');
const esiti = [];

function verifica(descrizione, condizione, dettaglio) {
    esiti.push({ descrizione, superato: Boolean(condizione), dettaglio: dettaglio || '' });
}

function tuttiIPermessi() {
    return require(path.join(APP_ROOT, 'core', 'permissions.json')).map(voce => voce.id);
}

function installaFetch() {
    global.fetch = async url => {
        const percorso = url instanceof URL ? url : new URL(String(url));
        const file = decodeURIComponent(percorso.pathname).replace(/^\/([A-Za-z]:)/, '$1');
        if (!fs.existsSync(file)) return { ok: false, status: 404 };
        const contenuto = fs.readFileSync(file, 'utf8');
        return { ok: true, status: 200, json: async () => JSON.parse(contenuto) };
    };
}

function installaPonte(broker, host, permessi) {
    global.window.adestioNative = {
        callAppApi: async ({ action, payload }) => {
            const azione = action.replace(/^dentalSuite:/, '');
            try {
                return { success: true, data: await broker.invoca(azione, payload) };
            } catch (errore) {
                return { success: false, error: errore.message };
            }
        }
    };
    global.window.electronAPI = {
        rbac: {
            getEffectiveUserPermissions: async () => permessi.map(voce => `adestio_dental_suite:${voce}`)
        }
    };
    global.sessionStorage.setItem('currentUserId', host.utenteId);
}

async function preparaDati(broker) {
    const sede = (await broker.invoca('struttura.saveSede', { nome: 'Sede Centrale', citta: 'Napoli', is_principale: 1 })).data;
    const poltrona = (await broker.invoca('struttura.savePoltrona', { sede_id: sede.id, nome: 'Riunito 1' })).data;
    const medico = (await broker.invoca('staff.create', {
        nome: 'Anna', cognome: 'Bianchi', ruolo: 'odontoiatra', ritenuta_acconto_percentuale: 20
    })).data;
    const prestazione = (await broker.invoca('prestazioni.create', {
        nome: 'Otturazione', categoria: 'conservativa', branca: 'Conservativa',
        prezzo_paziente: 150, tipo_quota_medico: 'percentuale', valore_quota_medico: 40,
        costo_materiale_stimato: 20
    })).data;
    const paziente = (await broker.invoca('pazienti.create', {
        nome: 'Mario', cognome: 'Rossi', codice_fiscale: 'RSSMRA85T10A562S',
        data_nascita: '1985-12-10', telefono: '3331234567', consenso_promemoria: 1, consenso_privacy: 1
    })).data;

    await broker.invoca('anamnesi.save', { paziente_id: paziente.id, terapia_anticoagulanti: 1, allergie_farmaci: 'Penicillina' });
    await broker.invoca('odontogramma.saveDente', { paziente_id: paziente.id, numero_dente: '16', stato: 'cariato', superfici: 'O' });
    await broker.invoca('trattamenti.add', {
        paziente_id: paziente.id, prestazione_id: prestazione.id, medico_id: medico.id,
        dente: '16', data_trattamento: '2026-08-01', stato: 'eseguito'
    });
    await broker.invoca('prescrizioni.add', {
        paziente_id: paziente.id, medico_id: medico.id, farmaco: 'Amoxicillina', durata_giorni: 6
    });
    await broker.invoca('agenda.create', {
        paziente_id: paziente.id, medico_id: medico.id, poltrona_id: poltrona.id,
        data_ora_inizio: Date.now(), durata_minuti: 45, motivo_visita: 'Controllo'
    });
    const preventivo = (await broker.invoca('preventivi.create', {
        paziente_id: paziente.id, medico_id: medico.id, sconto_percentuale: 10,
        righe: [{ prestazione_id: prestazione.id, descrizione: 'Otturazione', quantita: 2, prezzo_unitario: 150 }]
    })).data;
    await broker.invoca('preventivi.setStato', { id: preventivo.id, stato: 'inviato' });
    await broker.invoca('preventivi.setStato', { id: preventivo.id, stato: 'accettato' });
    await broker.invoca('rate.creaPiano', {
        paziente_id: paziente.id, preventivo_id: preventivo.id,
        totale_piano: 270, acconto_iniziale: 0, numero_rate: 3, cadenza_mesi: 1, prima_scadenza: '2026-09-30'
    });
    await broker.invoca('spese.registra', {
        categoria: 'laboratorio_odontotecnico', descrizione: 'Corone', importo: 200, data_spesa: '2026-08-05'
    });

    return { paziente, medico, prestazione, poltrona };
}

async function attendiRender() {
    for (let giro = 0; giro < 12; giro += 1) {
        await new Promise(risolvi => setImmediate(risolvi));
    }
}

async function main() {
    const documento = dom.installa();
    installaFetch();

    const host = creaHost({ utenteId: 'dott-verifica' });
    const broker = creaBroker();
    const permessi = tuttiIPermessi();
    host.concedi(permessi);

    const backend = require(path.join(APP_ROOT, 'backend.js'));
    backend.registerBackendHandlers(broker.registerApi, host.electronApp, host.adestioDb);
    installaPonte(broker, host, permessi);

    const dati = await preparaDati(broker);

    const app = await import(pathToFileURL(path.join(APP_ROOT, 'app.js')).href);
    const { creaShell } = await import(pathToFileURL(path.join(APP_ROOT, 'ui', 'app_shell.js')).href);
    const { SCHEDE } = await import(pathToFileURL(path.join(APP_ROOT, 'ui', 'views', 'paziente', 'schede.js')).href);

    const radice = documento.createElement('div');
    documento.body.appendChild(radice);

    await app.default.render(radice, {});
    await attendiRender();
    verifica('Hub renderizzato con 8 moduli',
        radice.querySelectorAll('.ds-card').length === 8,
        `card: ${radice.querySelectorAll('.ds-card').length}`);
    verifica('Nessuna card bloccata con tutti i permessi',
        radice.querySelectorAll('.ds-card').every(nodo => nodo.getAttribute('aria-disabled') === 'false'));

    const shell = creaShell(radice);
    const sezioni = ['pazienti', 'agenda', 'struttura', 'prestazioni', 'staff', 'contabilita', 'conformita', 'statistiche'];

    for (const sezione of sezioni) {
        await shell.naviga(sezione);
        await attendiRender();
        const titolo = radice.querySelector('.ds-header__title');
        const errore = radice.querySelectorAll('.ds-empty').find(nodo =>
            nodo.textContent.includes('Impossibile aprire'));
        verifica(`Sezione "${sezione}" renderizzata`, titolo !== null && !errore,
            titolo ? dom.testoDi(titolo) : 'nessuna intestazione');
    }

    await shell.naviga('paziente', { id: dati.paziente.id });
    await attendiRender();
    verifica('Cartella paziente aperta',
        dom.testoDi(radice.querySelector('.ds-header__title')) === 'Rossi Mario',
        dom.testoDi(radice.querySelector('.ds-header__title')));
    verifica(`${SCHEDE.length} schede cliniche disponibili`,
        radice.querySelectorAll('.ds-tab').length === SCHEDE.length,
        `${radice.querySelectorAll('.ds-tab').length}`);

    for (const scheda of SCHEDE) {
        const bottone = radice.querySelectorAll('.ds-tab').find(nodo => nodo.dataset.scheda === scheda.id);
        if (!bottone) {
            verifica(`Scheda "${scheda.id}" presente`, false);
            continue;
        }
        await bottone.emetti('click');
        await attendiRender();
        const contenuto = radice.querySelectorAll('.ds-panel, .ds-alert, .ds-empty, .ds-stat');
        verifica(`Scheda "${scheda.id}" produce contenuto`, contenuto.length > 0, `${contenuto.length} blocchi`);
    }

    await shell.naviga('conformita');
    await attendiRender();
    const schedeConformita = radice.querySelectorAll('.ds-tab');
    verifica('Conformita con 2 schede', schedeConformita.length === 2, `${schedeConformita.length}`);
    for (const scheda of schedeConformita) {
        await scheda.emetti('click');
        await attendiRender();
        verifica(`Scheda conformita "${scheda.dataset.scheda}" renderizzata`,
            radice.querySelectorAll('.ds-panel, .ds-stat').length > 0);
    }

    await shell.naviga('contabilita');
    await attendiRender();
    const schedeContabili = radice.querySelectorAll('.ds-tab');
    verifica('Contabilità con 4 schede', schedeContabili.length === 4, `${schedeContabili.length}`);
    for (const scheda of schedeContabili) {
        await scheda.emetti('click');
        await attendiRender();
        verifica(`Scheda contabile "${scheda.dataset.scheda}" renderizzata`,
            radice.querySelectorAll('.ds-panel').length > 0);
    }

    host.revocaTutto();
    require(path.join(APP_ROOT, 'backend', 'kernel', 'authz')).invalidate();
    global.window.electronAPI.rbac.getEffectiveUserPermissions = async () => [];
    const { invalidate } = await import(pathToFileURL(path.join(APP_ROOT, 'ui', 'security', 'permissions.js')).href);
    invalidate();

    await shell.naviga('statistiche');
    await attendiRender();
    verifica('Fail-closed UI: sezione negata senza permessi',
        radice.querySelectorAll('.ds-empty').some(nodo => nodo.textContent.includes('Permessi insufficienti')));

    host.pulisci();

    const falliti = esiti.filter(voce => !voce.superato);
    esiti.forEach(voce => {
        console.log(`${voce.superato ? 'OK  ' : 'FAIL'} ${voce.descrizione}${voce.dettaglio ? `  [${voce.dettaglio}]` : ''}`);
    });
    console.log(`\n${esiti.length - falliti.length}/${esiti.length} verifiche superate.`);
    process.exit(falliti.length === 0 ? 0 : 1);
}

main().catch(errore => {
    console.error('Smoke UI interrotto:', errore);
    process.exit(1);
});
