'use strict';

module.exports = async function scenario({ chiama, verifica, assertOk, assertKo, host, contesto }) {
    const paziente = contesto.paziente;
    const prestazione = contesto.prestazione;
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

    const igienista = assertOk('Igienista con fisso mensile', await chiama('staff.create', {
        nome: 'Sara', cognome: 'Neri', ruolo: 'igienista',
        compenso_mensile: 2000, tipo_rapporto: 'dipendente', ritenuta_acconto_percentuale: 0
    }));
    assertKo('Tipo di rapporto non valido rifiutato', await chiama('staff.update', {
        id: igienista.id, nome: 'Sara', cognome: 'Neri', tipo_rapporto: 'schiavo'
    }), 'VALIDATION');
    assertKo('Compenso mensile negativo rifiutato', await chiama('staff.update', {
        id: igienista.id, nome: 'Sara', cognome: 'Neri', compenso_mensile: -100
    }), 'VALIDATION');

    assertOk('Accordo specifico sulla prestazione', await chiama('accordi.salva', {
        staff_id: igienista.id, ruolo: 'medico', ambito: 'prestazione',
        riferimento: prestazione.id, etichetta: 'Otturazioni al 60%',
        tipo: 'percentuale', valore: 60, attivo: 1
    }));
    assertOk('Accordo generale di categoria', await chiama('accordi.salva', {
        staff_id: igienista.id, ruolo: 'medico', ambito: 'categoria',
        riferimento: 'conservativa', etichetta: 'Conservativa al 30%',
        tipo: 'percentuale', valore: 30, attivo: 1
    }));
    assertKo('Percentuale oltre 100 rifiutata', await chiama('accordi.salva', {
        staff_id: igienista.id, ruolo: 'medico', ambito: 'tutte',
        tipo: 'percentuale', valore: 140, attivo: 1
    }), 'VALIDATION');
    assertKo('Accordo di categoria senza riferimento rifiutato', await chiama('accordi.salva', {
        staff_id: igienista.id, ruolo: 'medico', ambito: 'categoria',
        tipo: 'fisso', valore: 20, attivo: 1
    }), 'VALIDATION');

    const suoiAccordi = assertOk('Accordi del collaboratore', await chiama('accordi.listByStaff', {
        staff_id: igienista.id
    }));
    verifica('Due accordi attivi con bersaglio leggibile',
        suoiAccordi.length === 2 && suoiAccordi.some(a => a.bersaglio.includes('Otturazione')),
        suoiAccordi.map(a => a.bersaglio).join(' | '));

    const trattamentoIgienista = assertOk('Trattamento eseguito dall igienista', await chiama('trattamenti.add', {
        paziente_id: paziente.id, prestazione_id: prestazione.id, medico_id: igienista.id,
        dente: '26', data_trattamento: '2026-08-12', stato: 'eseguito'
    }));
    const suoiTrattamenti = assertOk('Trattamenti riletti', await chiama('trattamenti.listByPaziente', {
        paziente_id: paziente.id
    }));
    const rigaIgienista = suoiTrattamenti.find(riga => riga.id === trattamentoIgienista.id);
    verifica('Vince l accordo sulla prestazione (60% di 150 = 90), non il 40% del listino',
        rigaIgienista.quota_medico === 90, `${rigaIgienista.quota_medico}`);

    const bozzaMista = assertOk('Liquidazione con fisso piu variabile', await chiama('compensi.calcola', {
        staff_id: igienista.id, periodo_dal: '2026-08-01', periodo_al: '2026-08-31'
    }));
    verifica('Il fisso mensile matura intero su agosto',
        bozzaMista.totale_mensilita === 2000, `${bozzaMista.totale_mensilita}`);
    verifica('La parte variabile e la quota dell accordo',
        bozzaMista.totale_variabile === 90, `${bozzaMista.totale_variabile}`);
    verifica('Il totale sommato e 2090',
        bozzaMista.totale_competenze === 2090 && bozzaMista.totale_liquidato === 2090,
        `${bozzaMista.totale_competenze}`);

    const mezzoPeriodo = assertOk('Liquidazione su mezzo mese', await chiama('compensi.calcola', {
        staff_id: igienista.id, periodo_dal: '2026-08-01', periodo_al: '2026-08-15'
    }));
    verifica('Il fisso e proporzionale ai giorni coperti',
        mezzoPeriodo.totale_mensilita === 967.74,
        `${mezzoPeriodo.totale_mensilita}`);


    const maturato = assertOk('Maturato non liquidato dell igienista', await chiama('compensi.maturato', {
        staff_id: igienista.id, periodo_dal: '2026-08-01', periodo_al: '2026-08-31'
    }));
    verifica('Il maturato distingue fisso e variabile',
        maturato.totale_mensilita_aperto === 2000 && maturato.totale_variabile === 90,
        `${maturato.totale_mensilita_aperto} + ${maturato.totale_variabile}`);
    verifica('Il maturato e raggruppato per categoria e per giorno',
        maturato.per_categoria.length === 1 && maturato.per_categoria[0].etichetta === 'conservativa'
        && maturato.per_giorno[0].etichetta === '2026-08-12',
        `${maturato.per_categoria[0].etichetta} / ${maturato.per_giorno[0].etichetta}`);
    verifica('Il maturato include il paziente associato',
        maturato.voci.length === 1 && maturato.voci[0].paziente.includes('Rossi'),
        maturato.voci[0].paziente);
    verifica('Il maturato include raggruppamento per prestazione con ids',
        maturato.per_prestazione.length === 1 && maturato.per_prestazione[0].ids.length === 1,
        maturato.per_prestazione[0].etichetta);

    const flussiStaff = assertOk('Flussi staff a 360 gradi calcolati', await chiama('compensi.flussiStaff', {
        staff_id: igienista.id, dal: '2026-08-01', al: '2026-08-31'
    }));
    verifica('I flussi calcolano produzione, margine e competenze',
        flussiStaff.totale_prodotto === 150 && flussiStaff.competenze_maturate === 90 && flussiStaff.margine_studio === 40,
        `prod ${flussiStaff.totale_prodotto}, comp ${flussiStaff.competenze_maturate}, marg ${flussiStaff.margine_studio}`);
    verifica('I flussi includono andamento mensile e top prestazioni',
        flussiStaff.flusso_mensile.length >= 1 && flussiStaff.top_prestazioni.length >= 1,
        `${flussiStaff.flusso_mensile.length} mesi`);

    const soloVariabile = assertOk('Liquidazione della sola parte variabile', await chiama('compensi.liquida', {
        staff_id: igienista.id, periodo_dal: '2026-08-01', periodo_al: '2026-08-31',
        trattamenti: [trattamentoIgienista.id], metodo_pagamento: 'contanti'
    }));
    verifica('Paga solo i trattamenti scelti, senza il fisso',
        soloVariabile.totale_variabile === 90 && soloVariabile.totale_mensilita === 0,
        `variabile ${soloVariabile.totale_variabile}, fisso ${soloVariabile.totale_mensilita}`);

    const dopoParziale = assertOk('Maturato dopo il pagamento parziale', await chiama('compensi.maturato', {
        staff_id: igienista.id, periodo_dal: '2026-08-01', periodo_al: '2026-08-31'
    }));
    verifica('Il fisso resta aperto, il variabile e azzerato',
        dopoParziale.totale_mensilita_aperto === 2000 && dopoParziale.totale_variabile === 0,
        `${dopoParziale.totale_mensilita_aperto} + ${dopoParziale.totale_variabile}`);

    const soloFisso = assertOk('Liquidazione della sola mensilita', await chiama('compensi.liquida', {
        staff_id: igienista.id, periodo_dal: '2026-08-01', periodo_al: '2026-08-31',
        mensilita: ['2026-08'], metodo_pagamento: 'bonifico'
    }));
    verifica('Paga solo la mensilita indicata',
        soloFisso.totale_mensilita === 2000 && soloFisso.trattamenti_chiusi === 0,
        `${soloFisso.totale_mensilita}`);

    assertKo('Mensilita gia liquidata non ripagabile', await chiama('compensi.liquida', {
        staff_id: igienista.id, periodo_dal: '2026-08-01', periodo_al: '2026-08-31',
        mensilita: ['2026-08']
    }), 'CONFLICT');

    const esaurito = assertOk('Maturato finale', await chiama('compensi.maturato', {
        staff_id: igienista.id, periodo_dal: '2026-08-01', periodo_al: '2026-08-31'
    }));
    verifica('Non resta nulla da liquidare',
        esaurito.totale_maturato === 0 && esaurito.mensilita_liquidate.length === 1,
        `${esaurito.totale_maturato}`);


    const senzaNulla = assertOk('Collaboratore senza fisso ne trattamenti', await chiama('staff.create', {
        nome: 'Ugo', cognome: 'Gialli', ruolo: 'aso'
    }));
    assertKo('Liquidazione senza compensi maturati rifiutata', await chiama('compensi.liquida', {
        staff_id: senzaNulla.id, periodo_dal: '2026-08-01', periodo_al: '2026-08-31'
    }), 'CONFLICT');


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


    const FIRMA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

    assertKo('Firma senza tracciato rifiutata', await chiama('firme.registra', {
        paziente_id: paziente.id, tipo_documento: 'consenso', firmatario: 'Mario Rossi',
        testo: 'Testo del consenso informato', firma_immagine: ''
    }), 'VALIDATION');

    assertKo('Firma su documento vuoto rifiutata', await chiama('firme.registra', {
        paziente_id: paziente.id, tipo_documento: 'consenso', firmatario: 'Mario Rossi',
        testo: '', firma_immagine: FIRMA
    }), 'VALIDATION');

    const firmato = assertOk('Documento firmato registrato', await chiama('firme.registra', {
        paziente_id: paziente.id, tipo_documento: 'consenso', titolo: 'Consenso implantologia',
        firmatario: 'Mario Rossi', ruolo_firmatario: 'paziente',
        testo: 'Dichiaro di essere stato informato sui rischi della procedura implantare.',
        firma_immagine: FIRMA
    }));
    verifica('La firma produce un impronta del documento',
        typeof firmato.impronta_documento === 'string' && firmato.impronta_documento.length === 64);

    const verificaFirma = assertOk('Integrita del documento firmato', await chiama('firme.verifica', { id: firmato.id }));
    verifica('Documento firmato integro', verificaFirma.integro === true);

    host.alteraDocumentoFirmato(firmato.id);
    const dopoAlterazione = assertOk('Verifica dopo alterazione del testo', await chiama('firme.verifica', { id: firmato.id }));
    verifica('Alterazione del testo firmato rilevata',
        dopoAlterazione.integro === false && dopoAlterazione.testo_integro === false);

    const valutazione = assertOk('Valutazione cancellazione', await chiama('privacy.valutaCancellazione', {
        paziente_id: paziente.id
    }));
    verifica('Obbligo di conservazione clinica rilevato',
        valutazione.obbligo_conservazione_attivo === true
        && valutazione.impedimenti.some(voce => voce.tipo === 'conservazione_clinica'),
        JSON.stringify(valutazione.impedimenti.map(v => v.tipo)));
    verifica('Cancellazione totale non ammessa', valutazione.cancellazione_totale_possibile === false);
    verifica('Anonimizzazione bloccata da rate e appuntamenti aperti',
        valutazione.anonimizzazione_possibile === false);

    assertKo('Anonimizzazione rifiutata con rapporti aperti', await chiama('privacy.anonimizzaPaziente', {
        paziente_id: paziente.id, motivo: 'Richiesta dell interessato'
    }), 'CONFLICT');
    assertKo('Anonimizzazione senza motivo rifiutata', await chiama('privacy.anonimizzaPaziente', {
        paziente_id: paziente.id
    }), 'VALIDATION');

    const anteprima = assertOk('Anteprima di portabilita', await chiama('privacy.anteprimaEsportazione', {
        paziente_id: paziente.id
    }));
    verifica('L anteprima elenca le sezioni esportate',
        anteprima.sezioni.length === 7 && anteprima.sezioni.some(voce => voce.totale > 0));

    const pazienteLibero = assertOk('Secondo paziente senza rapporti aperti', await chiama('pazienti.create', {
        nome: 'Lucia', cognome: 'Verdi', telefono: '3339998877'
    }));
    const valutazioneLibera = assertOk('Valutazione paziente senza vincoli', await chiama('privacy.valutaCancellazione', {
        paziente_id: pazienteLibero.id
    }));
    verifica('Senza atti clinici la cancellazione e ammessa',
        valutazioneLibera.cancellazione_totale_possibile === true);

    const anonimizzato = assertOk('Anonimizzazione eseguita', await chiama('privacy.anonimizzaPaziente', {
        paziente_id: pazienteLibero.id, motivo: 'Richiesta di cancellazione dell interessato'
    }));
    verifica('Tutti i campi identificativi sono stati cancellati', anonimizzato.campi_anonimizzati === 24,
        `${anonimizzato.campi_anonimizzati}`);

    const dopoOblio = assertOk('Paziente riletto dopo anonimizzazione', await chiama('pazienti.get', {
        id: pazienteLibero.id
    }));
    verifica('Nome e telefono non sono piu presenti',
        dopoOblio.nome === '' && dopoOblio.telefono === '' && dopoOblio.cognome.includes('cancellato'),
        `${dopoOblio.cognome}`);
    verifica('La cartella e archiviata dopo la cancellazione', Number(dopoOblio.is_deleted) === 1);

    const registroOblio = assertOk('Registro cancellazioni', await chiama('privacy.registroCancellazioni', {}));
    verifica('La cancellazione e tracciata con il nominativo originale',
        registroOblio.length === 1 && registroOblio[0].nominativo_cancellato === 'Verdi Lucia',
        registroOblio[0] ? registroOblio[0].nominativo_cancellato : 'nessuna riga');


};
