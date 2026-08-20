'use strict';

const { creaHost, creaBroker } = require('./host_stub');

const esiti = [];

function verifica(descrizione, condizione, dettaglio) {
    esiti.push({ descrizione, superato: Boolean(condizione), dettaglio: dettaglio || '' });
}

function assertOk(descrizione, risultato) {
    verifica(descrizione, risultato && risultato.success === true, risultato && risultato.error);
    return risultato && risultato.data;
}

function assertKo(descrizione, risultato, codiceAtteso) {
    const corrisponde = risultato
        && risultato.success === false
        && (!codiceAtteso || risultato.code === codiceAtteso);
    verifica(descrizione, corrisponde, risultato && `${risultato.code}: ${risultato.error}`);
}

const PERMESSI = [
    'pazienti_view', 'pazienti_edit', 'pazienti_delete', 'anamnesi_view', 'anamnesi_edit',
    'cartella_view', 'cartella_edit', 'prescrizioni_view', 'prescrizioni_edit',
    'agenda_view', 'agenda_edit', 'agenda_delete', 'struttura_view', 'struttura_edit',
    'prestazioni_view', 'prestazioni_edit', 'prestazioni_delete', 'staff_view', 'staff_edit',
    'compensi_view', 'compensi_settle', 'preventivi_view', 'preventivi_edit',
    'incassi_view', 'incassi_edit', 'spese_view', 'spese_edit', 'rate_view', 'rate_edit',
    'statistiche_view', 'consensi_view', 'consensi_manage', 'audit_view'
];

async function main() {
    const host = creaHost({ utenteId: 'dott-rossi' });
    const broker = creaBroker();
    const backend = require('../backend.js');

    host.concedi(PERMESSI);
    const caricato = backend.registerBackendHandlers(broker.registerApi, host.electronApp, host.adestioDb);
    verifica('registerBackendHandlers ritorna true', caricato === true);
    verifica('78 canali registrati', broker.conteggio() === 78, `registrati: ${broker.conteggio()}`);

    const chiama = (azione, payload) => broker.invoca(azione, payload);

    const sede = assertOk('Sede creata', await chiama('struttura.saveSede', {
        nome: 'Sede Centrale', citta: 'Napoli', is_principale: 1
    }));
    const poltrona = assertOk('Poltrona creata', await chiama('struttura.savePoltrona', {
        sede_id: sede.id, nome: 'Riunito 1'
    }));
    const albero = assertOk('Albero struttura letto', await chiama('struttura.tree'));
    verifica('Albero contiene la sede', albero.length === 1 && albero[0].poltrone_senza_sala.length === 1);

    const medico = assertOk('Medico creato', await chiama('staff.create', {
        nome: 'Anna', cognome: 'Bianchi', ruolo: 'odontoiatra',
        ritenuta_acconto_percentuale: 20, codice_fiscale: 'RSSMRA85T10A562S'
    }));
    assertKo('Staff con CF invalido rifiutato',
        await chiama('staff.create', { nome: 'X', cognome: 'Y', codice_fiscale: 'RSSMRA85T10A562Z' }), 'VALIDATION');

    const prestazione = assertOk('Prestazione creata', await chiama('prestazioni.create', {
        nome: 'Otturazione composito', categoria: 'conservativa', branca: 'Conservativa',
        prezzo_paziente: 150, tipo_quota_medico: 'percentuale', valore_quota_medico: 40,
        costo_material_stimato: 0, costo_materiale_stimato: 20
    }));
    assertKo('Prestazione con margine negativo rifiutata', await chiama('prestazioni.create', {
        nome: 'In perdita', prezzo_paziente: 50,
        tipo_quota_medico: 'fisso', valore_quota_medico: 60
    }), 'VALIDATION');

    const paziente = assertOk('Paziente creato', await chiama('pazienti.create', {
        nome: 'Mario', cognome: 'Rossi', codice_fiscale: 'RSSMRA85T10A562S',
        data_nascita: '1985-12-10', telefono: '3331234567', consenso_promemoria: 1
    }));
    assertKo('Codice fiscale duplicato rifiutato', await chiama('pazienti.create', {
        nome: 'Altro', cognome: 'Paziente', codice_fiscale: 'RSSMRA85T10A562S'
    }), 'CONFLICT');
    assertKo('Paziente senza cognome rifiutato',
        await chiama('pazienti.create', { nome: 'Solo' }), 'VALIDATION');

    const schedaPaziente = assertOk('Paziente riletto', await chiama('pazienti.get', { id: paziente.id }));
    verifica('Età calcolata', schedaPaziente.eta === 40, `eta: ${schedaPaziente.eta}`);

    assertOk('Anamnesi salvata', await chiama('anamnesi.save', {
        paziente_id: paziente.id, terapia_anticoagulanti: 1, allergie_farmaci: 'Penicillina'
    }));
    const anamnesi = assertOk('Anamnesi riletta', await chiama('anamnesi.get', { paziente_id: paziente.id }));
    verifica('Allerte cliniche generate', anamnesi.allerte.length === 2, anamnesi.allerte.join(' | '));

    assertOk('Dente 16 aggiornato', await chiama('odontogramma.saveDente', {
        paziente_id: paziente.id, numero_dente: '16', stato: 'cariato', superfici: 'O,M'
    }));
    assertKo('Dente FDI inesistente rifiutato', await chiama('odontogramma.saveDente', {
        paziente_id: paziente.id, numero_dente: '19', stato: 'cariato'
    }), 'VALIDATION');
    const arcata = assertOk('Odontogramma letto', await chiama('odontogramma.get', { paziente_id: paziente.id }));
    verifica('32 elementi permanenti', arcata.denti.length === 32);
    verifica('Dente 16 registrato cariato',
        arcata.denti.find(d => d.numero_dente === '16').stato === 'cariato');

    const trattamento = assertOk('Trattamento registrato', await chiama('trattamenti.add', {
        paziente_id: paziente.id, prestazione_id: prestazione.id, medico_id: medico.id,
        dente: '16', data_trattamento: '2026-08-01', stato: 'eseguito'
    }));
    const trattamenti = assertOk('Trattamenti letti', await chiama('trattamenti.listByPaziente', {
        paziente_id: paziente.id
    }));
    verifica('Quota medico 40% di 150 = 60', trattamenti[0].quota_medico === 60, `${trattamenti[0].quota_medico}`);
    verifica('Margine studio = 70', trattamenti[0].margine_studio === 70, `${trattamenti[0].margine_studio}`);

    const inizio = Date.UTC(2026, 8, 1, 9, 0);
    assertOk('Appuntamento creato', await chiama('agenda.create', {
        paziente_id: paziente.id, medico_id: medico.id, poltrona_id: poltrona.id,
        data_ora_inizio: inizio, durata_minuti: 60, motivo_visita: 'Controllo'
    }));
    assertKo('Sovrapposizione poltrona bloccata', await chiama('agenda.create', {
        paziente_id: paziente.id, medico_id: medico.id, poltrona_id: poltrona.id,
        data_ora_inizio: inizio + 30 * 60000, durata_minuti: 30
    }), 'CONFLICT');
    assertOk('Slot libero accettato', await chiama('agenda.create', {
        paziente_id: paziente.id, medico_id: medico.id, poltrona_id: poltrona.id,
        data_ora_inizio: inizio + 60 * 60000, durata_minuti: 30
    }));
    const agenda = assertOk('Agenda letta', await chiama('agenda.listByRange', {
        dal: inizio - 86400000, al: inizio + 86400000
    }));
    verifica('2 appuntamenti in agenda', agenda.length === 2, `${agenda.length}`);
    verifica('Nome paziente risolto in agenda', agenda[0].paziente_nome === 'Rossi Mario');

    const preventivo = assertOk('Preventivo creato', await chiama('preventivi.create', {
        paziente_id: paziente.id, medico_id: medico.id, sconto_percentuale: 10,
        righe: [
            { prestazione_id: prestazione.id, descrizione: 'Otturazione', quantita: 2, prezzo_unitario: 150 },
            { descrizione: 'Igiene', quantita: 1, prezzo_unitario: 80 }
        ]
    }));
    verifica('Totale netto 342 (380 - 10%)', preventivo.totale_netto === 342, `${preventivo.totale_netto}`);
    const dettaglioPreventivo = assertOk('Preventivo riletto', await chiama('preventivi.get', { id: preventivo.id }));
    verifica('Numerazione progressiva', /^\d{4}\/0001$/.test(dettaglioPreventivo.numero_preventivo),
        dettaglioPreventivo.numero_preventivo);
    assertKo('Transizione bozza→accettato vietata',
        await chiama('preventivi.setStato', { id: preventivo.id, stato: 'accettato' }), 'CONFLICT');
    assertOk('Transizione bozza→inviato ammessa',
        await chiama('preventivi.setStato', { id: preventivo.id, stato: 'inviato' }));
    assertOk('Transizione inviato→accettato ammessa',
        await chiama('preventivi.setStato', { id: preventivo.id, stato: 'accettato' }));

    const piano = assertOk('Piano rateale creato', await chiama('rate.creaPiano', {
        paziente_id: paziente.id, preventivo_id: preventivo.id,
        totale_piano: 342, acconto_iniziale: 42, numero_rate: 4,
        cadenza_mesi: 1, prima_scadenza: '2026-09-30'
    }));
    verifica('4 rate generate', piano.rate_generate === 4);
    const piani = assertOk('Piani letti', await chiama('rate.listByPaziente', { paziente_id: paziente.id }));
    verifica('Residuo piano = 300', piani[0].residuo === 300, `${piani[0].residuo}`);
    verifica('Scadenze fine mese corrette',
        piani[0].rate.map(r => r.data_scadenza).join(',') === '2026-09-30,2026-10-30,2026-11-30,2026-12-30',
        piani[0].rate.map(r => r.data_scadenza).join(','));

    const primaRata = piani[0].rate[0];
    assertOk('Rata saldata', await chiama('rate.pagaRata', {
        id: primaRata.id, metodo_pagamento: 'bonifico'
    }));
    assertKo('Doppio pagamento rata bloccato',
        await chiama('rate.pagaRata', { id: primaRata.id }), 'CONFLICT');
    const incassi = assertOk('Incassi letti', await chiama('incassi.list'));
    verifica('Incasso automatico da rata = 75', incassi.totale === 75, `${incassi.totale}`);

    assertOk('Spesa registrata', await chiama('spese.registra', {
        categoria: 'laboratorio_odontotecnico', descrizione: 'Corone', importo: 200, data_spesa: '2026-08-05'
    }));
    assertKo('Spesa con importo nullo rifiutata',
        await chiama('spese.registra', { descrizione: 'Nulla', importo: 0 }), 'VALIDATION');

    const bozzaLiquidazione = assertOk('Liquidazione calcolata', await chiama('compensi.calcola', {
        staff_id: medico.id, periodo_dal: '2026-08-01', periodo_al: '2026-08-31'
    }));
    verifica('Competenze 60, ritenuta 12, netto 48',
        bozzaLiquidazione.totale_competenze === 60
        && bozzaLiquidazione.ritenuta_acconto === 12
        && bozzaLiquidazione.totale_liquidato === 48,
        JSON.stringify(bozzaLiquidazione.totale_liquidato));
    assertOk('Liquidazione emessa', await chiama('compensi.liquida', {
        staff_id: medico.id, periodo_dal: '2026-08-01', periodo_al: '2026-08-31'
    }));
    assertKo('Trattamento liquidato non modificabile',
        await chiama('trattamenti.update', { id: trattamento.id, importo: 999 }), 'CONFLICT');
    assertKo('Seconda liquidazione senza capienza',
        await chiama('compensi.liquida', {
            staff_id: medico.id, periodo_dal: '2026-08-01', periodo_al: '2026-08-31'
        }), 'CONFLICT');

    const produzione = assertOk('Statistiche produzione', await chiama('statistiche.produzione', {}));
    verifica('1 trattamento eseguito, valore 150',
        produzione.trattamenti_eseguiti === 1 && produzione.valore_eseguito === 150);
    assertKo('Economia direzionale negata senza permesso',
        await chiama('statistiche.economia', {}), 'FORBIDDEN');

    host.concedi(['direzione_economics']);
    require('../backend/kernel/authz').invalidate();
    const economia = assertOk('Economia direzionale concessa dopo grant', await chiama('statistiche.economia', {}));
    verifica('Margine lordo = 75 - 200 = -125', economia.margine_lordo === -125, `${economia.margine_lordo}`);

    assertKo('Eliminazione prestazione usata bloccata',
        await chiama('prestazioni.remove', { id: prestazione.id }), 'CONFLICT');
    assertKo('Eliminazione sede con poltrone bloccata',
        await chiama('struttura.removeSede', { id: sede.id }), 'CONFLICT');

    const modelloV1 = assertOk('Modello di consenso creato', await chiama('consensi.salvaModello', {
        codice: 'PRIVACY_GDPR', titolo: 'Informativa privacy', ambito: 'privacy',
        testo: 'Testo informativa versione uno', obbligatorio: 1, validita_mesi: 24
    }));
    verifica('Prima versione del modello e la 1', modelloV1.versione === 1 && modelloV1.nuova_versione === true);

    const modelloUguale = assertOk('Salvataggio con testo identico', await chiama('consensi.salvaModello', {
        codice: 'PRIVACY_GDPR', titolo: 'Informativa privacy', ambito: 'privacy',
        testo: 'Testo informativa versione uno', obbligatorio: 1, validita_mesi: 24
    }));
    verifica('Testo invariato non crea una nuova versione', modelloUguale.nuova_versione === false);

    assertOk('Consenso raccolto sul paziente', await chiama('consensi.registra', {
        paziente_id: paziente.id, modello_id: modelloV1.id, modalita_raccolta: 'firma_digitale'
    }));
    const statoConsensi = assertOk('Consensi del paziente letti', await chiama('consensi.listByPaziente', {
        paziente_id: paziente.id
    }));
    verifica('Nessuna scopertura dopo la raccolta', statoConsensi.scoperture.length === 0,
        JSON.stringify(statoConsensi.scoperture));

    const modelloV2 = assertOk('Nuova versione del modello', await chiama('consensi.salvaModello', {
        codice: 'PRIVACY_GDPR', titolo: 'Informativa privacy', ambito: 'privacy',
        testo: 'Testo informativa versione due, aggiornata', obbligatorio: 1, validita_mesi: 24
    }));
    verifica('Testo modificato genera la versione 2', modelloV2.versione === 2 && modelloV2.nuova_versione === true);

    const dopoVersione = assertOk('Consensi riletti dopo il cambio versione', await chiama('consensi.listByPaziente', {
        paziente_id: paziente.id
    }));
    verifica('Consenso su versione obsoleta risulta scoperto',
        dopoVersione.scoperture.length === 1 && dopoVersione.scoperture[0].motivo.includes('versione'),
        JSON.stringify(dopoVersione.scoperture));

    assertKo('Raccolta su modello non piu in vigore rifiutata', await chiama('consensi.registra', {
        paziente_id: paziente.id, modello_id: modelloV1.id
    }), 'CONFLICT');

    const nuovoConsenso = assertOk('Consenso ri-raccolto sulla versione corrente', await chiama('consensi.registra', {
        paziente_id: paziente.id, modello_id: modelloV2.id
    }));
    assertOk('Consenso revocato', await chiama('consensi.revoca', { id: nuovoConsenso.id }));
    assertKo('Doppia revoca rifiutata', await chiama('consensi.revoca', { id: nuovoConsenso.id }), 'CONFLICT');

    const consensiFinali = assertOk('Consensi riletti dopo la revoca', await chiama('consensi.listByPaziente', {
        paziente_id: paziente.id
    }));
    verifica('Il consenso vigente e quello revocato piu recente, non il precedente',
        consensiFinali.vigenti.length === 1 && consensiFinali.vigenti[0].stato_effettivo === 'revocato',
        JSON.stringify(consensiFinali.vigenti.map(v => `${v.versione}:${v.stato_effettivo}`)));

    const scopertureStudio = assertOk('Scoperture di studio calcolate', await chiama('consensi.scopertureStudio', {}));
    verifica('Il paziente con consenso revocato risulta scoperto',
        scopertureStudio.totale === 1 && scopertureStudio.pazienti_scoperti[0].mancanti[0].motivo === 'revocato dal paziente',
        JSON.stringify(scopertureStudio.pazienti_scoperti[0] || null));

    const registro = assertOk('Registro accessi consultabile', await chiama('audit.list', { limite: 500 }));
    verifica('Il registro ha tracciato ogni azione precedente', registro.totale >= 50, `righe: ${registro.totale}`);
    verifica('Il registro traccia anche le letture',
        registro.righe.some(riga => riga.azione === 'pazienti.get' && riga.esito === 'consentito'));
    verifica('Il registro traccia i tentativi negati',
        registro.righe.some(riga => riga.esito === 'negato' && riga.permesso === 'direzione_economics'));
    verifica('Le righe portano l identificativo del paziente coinvolto',
        registro.righe.some(riga => riga.paziente_id === paziente.id));

    const paginata = assertOk('Registro paginato', await chiama('audit.list', { limite: 5, scarto: 5 }));
    verifica('La paginazione limita le righe restituite', paginata.righe.length === 5 && paginata.scarto === 5);

    const sintesi = assertOk('Riepilogo del registro', await chiama('audit.riepilogo', {}));
    verifica('Il riepilogo aggrega per esito e per entita',
        sintesi.per_esito.length >= 2 && sintesi.per_entita.length > 5);

    const integrita = assertOk('Catena di integrita verificata', await chiama('audit.verificaIntegrita', {}));
    verifica('La catena del registro e integra', integrita.integra === true, JSON.stringify(integrita.anomalie));

    host.manomettiAudit();
    const dopoManomissione = assertOk('Verifica dopo manomissione', await chiama('audit.verificaIntegrita', {}));
    verifica('La manomissione di una riga viene rilevata',
        dopoManomissione.integra === false
        && dopoManomissione.anomalie.some(voce => voce.tipo === 'contenuto alterato dopo la scrittura'),
        JSON.stringify(dopoManomissione.anomalie.slice(0, 2)));


    host.revocaTutto();
    require('../backend/kernel/authz').invalidate();
    assertKo('Fail-closed: lettura pazienti negata dopo revoca',
        await chiama('pazienti.list'), 'FORBIDDEN');
    assertKo('Fail-closed: scrittura negata dopo revoca',
        await chiama('pazienti.create', { nome: 'A', cognome: 'B' }), 'FORBIDDEN');

    host.pulisci();

    const falliti = esiti.filter(esito => !esito.superato);
    esiti.forEach(esito => {
        const marchio = esito.superato ? 'OK  ' : 'FAIL';
        console.log(`${marchio} ${esito.descrizione}${esito.dettaglio ? `  [${esito.dettaglio}]` : ''}`);
    });
    console.log(`\n${esiti.length - falliti.length}/${esiti.length} verifiche superate.`);
    process.exit(falliti.length === 0 ? 0 : 1);
}

main().catch(errore => {
    console.error('Smoke test interrotto:', errore);
    process.exit(1);
});
