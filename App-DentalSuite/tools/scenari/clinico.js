'use strict';

module.exports = async function scenario({ chiama, verifica, assertOk, assertKo, host, contesto }) {
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
        paziente_id: paziente.id, terapia_anticoagulanti: 1, allergie_farmaci: 'Penicillina', intolleranze: 'Lattosio'
    }));
    const anamnesi = assertOk('Anamnesi riletta', await chiama('anamnesi.get', { paziente_id: paziente.id }));
    verifica('Allerte cliniche generate', anamnesi.allerte.length === 3, anamnesi.allerte.join(' | '));
    verifica('Intolleranza registrata in anamnesi', anamnesi.scheda.intolleranze === 'Lattosio', anamnesi.scheda.intolleranze);

    assertOk('Anamnesi avanzata strutturata salvata', await chiama('anamnesi.save', {
        paziente_id: paziente.id,
        patologie_strutturate: { anticoagulanti_tao: { attivo: true, dettagli: 'INR 2.8' }, bifosfonati_orali: { attivo: true } },
        allergie_strutturate: { lattice: { attivo: true }, penicilline: { attivo: true } },
        intolleranze_strutturate: { glutine: { attivo: true } },
        valutazione_rischio: { asa: '3', rischio_emorragico: 'alto', rischio_mronj: 'medio', profilassi_antibiotica: true }
    }));
    const anamnesiStrutturata = assertOk('Anamnesi avanzata riletta', await chiama('anamnesi.get', { paziente_id: paziente.id }));
    verifica('Sincronizzazione automatica flag osteoporosi_bifosfonati', Number(anamnesiStrutturata.scheda.osteoporosi_bifosfonati) === 1);
    verifica('Calcolo rischio ASA 3', Number(anamnesiStrutturata.rischio.asa) === 3);
    verifica('Allerta critica lattice presente', anamnesiStrutturata.allerteDettagliate.some(a => a.etichetta.includes('lattice')));

    assertOk('Dente 16 aggiornato', await chiama('odontogramma.saveDente', {
        paziente_id: paziente.id, numero_dente: '16', stato: 'cariato',
        superfici: 'O,M', data_rilevazione: '2026-08-01'
    }));
    assertKo('Dente FDI inesistente rifiutato', await chiama('odontogramma.saveDente', {
        paziente_id: paziente.id, numero_dente: '19', stato: 'cariato'
    }), 'VALIDATION');
    const arcata = assertOk('Odontogramma letto', await chiama('odontogramma.get', { paziente_id: paziente.id }));
    verifica('32 elementi permanenti', arcata.denti.length === 32);
    verifica('Dente 16 registrato cariato',
        arcata.denti.find(d => d.numero_dente === '16').stato === 'cariato');

    assertOk('Seconda rilevazione sullo stesso dente', await chiama('odontogramma.saveDente', {
        paziente_id: paziente.id, numero_dente: '16', stato: 'otturato',
        superfici: 'O', materiale: 'Composito', data_rilevazione: '2026-08-10',
        note: 'Otturazione eseguita'
    }));
    const storia = assertOk('Storia clinica del dente 16', await chiama('odontogramma.storico', {
        paziente_id: paziente.id, numero_dente: '16'
    }));
    verifica('Entrambe le rilevazioni sono conservate', storia.length === 2, `${storia.length}`);
    verifica('La rilevazione piu recente per data e in cima, con la transizione',
        storia[0].stato === 'otturato' && storia[0].stato_precedente === 'cariato',
        `${storia[0].stato} da ${storia[0].stato_precedente}`);
    verifica('Le rilevazioni portano nome e anatomia del dente',
        storia[0].nome_dente === 'Primo molare' && storia[0].arcata === 'superiore',
        storia[0].nome_dente);

    const arcataDopo = assertOk('Odontogramma dopo la seconda rilevazione', await chiama('odontogramma.get', {
        paziente_id: paziente.id
    }));
    const dente16 = arcataDopo.denti.find(voce => voce.numero_dente === '16');
    verifica('Lo stato corrente riflette l ultima rilevazione',
        dente16.stato === 'otturato' && dente16.data_rilevazione === '2026-08-10',
        `${dente16.stato} del ${dente16.data_rilevazione}`);

    assertOk('Rilevazione corretta a posteriori', await chiama('odontogramma.modificaRilevazione', {
        id: storia[0].id, materiale: 'Composito nanoibrido', note: 'Corretto il materiale'
    }));
    const dopoModifica = assertOk('Storia riletta dopo la correzione', await chiama('odontogramma.storico', {
        paziente_id: paziente.id, numero_dente: '16'
    }));
    verifica('La correzione e visibile nella storia',
        dopoModifica[0].materiale === 'Composito nanoibrido', dopoModifica[0].materiale);

    assertOk('Rilevazione eliminata', await chiama('odontogramma.eliminaRilevazione', { id: storia[0].id }));
    const arcataRipristinata = assertOk('Odontogramma dopo eliminazione', await chiama('odontogramma.get', {
        paziente_id: paziente.id
    }));
    const dente16Ripristinato = arcataRipristinata.denti.find(voce => voce.numero_dente === '16');
    verifica('Lo stato torna alla rilevazione precedente',
        dente16Ripristinato.stato === 'cariato', dente16Ripristinato.stato);

    const storiaCompleta = assertOk('Storia di tutti gli elementi', await chiama('odontogramma.storico', {
        paziente_id: paziente.id
    }));
    verifica('Resta una sola rilevazione attiva', storiaCompleta.length === 1, `${storiaCompleta.length}`);


    const suggerimento = assertOk('Suggerimento trattamento calcolato', await chiama('trattamenti.suggerisci', {
        prestazione_id: prestazione.id, medico_id: medico.id
    }));
    verifica('Suggerimento calcola importo e quota',
        suggerimento.importo === 150 && suggerimento.quota_medico_stimata === 60,
        `imp ${suggerimento.importo}, quota ${suggerimento.quota_medico_stimata}`);

    const trattamento = assertOk('Trattamento registrato con tracciabilita', await chiama('trattamenti.add', {
        paziente_id: paziente.id, prestazione_id: prestazione.id, medico_id: medico.id,
        dente: '16', data_trattamento: '2026-08-01', stato: 'eseguito',
        anestesia: 'Articaina 1:100.000', lotto_materiali: 'Lotto #49281'
    }));
    const trattamenti = assertOk('Trattamenti letti', await chiama('trattamenti.listByPaziente', {
        paziente_id: paziente.id
    }));
    verifica('Quota medico 40% di 150 = 60', trattamenti[0].quota_medico === 60, `${trattamenti[0].quota_medico}`);
    verifica('Margine studio = 70', trattamenti[0].margine_studio === 70, `${trattamenti[0].margine_studio}`);
    verifica('Tracciabilita anestesia e lotto salvata',
        trattamenti[0].anestesia === 'Articaina 1:100.000' && trattamenti[0].lotto_materiali === 'Lotto #49281',
        `${trattamenti[0].anestesia} · ${trattamenti[0].lotto_materiali}`);

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

    const referti = require('../../backend/handlers/allegati');
    const percorsoFinto = require('path').join(host.radice, 'referto-di-prova.png');
    require('fs').writeFileSync(percorsoFinto, Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'));
    const { allegati } = require('../../backend/repositories/clinical');
    const refertoId = await allegati.insert({
        paziente_id: paziente.id,
        tipo: 'foto',
        titolo: 'Foto intraorale di prova',
        file_name: 'referto-di-prova.png',
        file_path: percorsoFinto,
        file_size: 16,
        mime_type: 'png',
        data_esame: '2026-08-01',
        derivate_stato: 'da_generare'
    });

    const arretrati = assertOk('Referti in attesa di derivate', await chiama('allegati.daDerivare', {
        paziente_id: paziente.id
    }));
    verifica('Il referto appena acquisito risulta da ottimizzare',
        arretrati.some(voce => voce.id === refertoId), `${arretrati.length} in coda`);

    const derivate = assertOk('Derivate WebP registrate', await chiama('allegati.salvaDerivate', {
        id: refertoId,
        anteprima: `data:image/webp;base64,${Buffer.from('anteprima-finta').toString('base64')}`,
        visione: `data:image/webp;base64,${Buffer.from('visione-finta-piu-grande').toString('base64')}`,
        larghezza: 1600,
        altezza: 1200
    }));
    verifica('Entrambe le derivate risultano salvate',
        derivate.anteprima === true && derivate.visione === true && derivate.stato === 'pronte');

    const porzioneVisione = assertOk('Porzione della versione di consultazione',
        await chiama('allegati.porzione', { id: refertoId, blocco: 0, variante: 'visione' }));
    verifica('La variante di consultazione viaggia come WebP',
        porzioneVisione.variante === 'visione' && porzioneVisione.mime === 'image/webp',
        `${porzioneVisione.variante} · ${porzioneVisione.mime}`);
    verifica('La derivata pesa meno dell originale dichiarato',
        porzioneVisione.dimensione_totale < 100, `${porzioneVisione.dimensione_totale} byte`);

    assertKo('Formato non derivabile rifiutato', await chiama('allegati.salvaDerivate', {
        id: refertoId,
        anteprima: ''
    }), 'VALIDATION');

    const datiProntuario = assertOk('Prontuario farmaci letto', await chiama('prescrizioni.prontuario', {}));
    verifica('Il prontuario predefinito contiene i farmaci odontoiatrici',
        datiProntuario.predefiniti.length >= 25, `${datiProntuario.predefiniti.length}`);
    verifica('Le categorie del prontuario sono configurate',
        datiProntuario.categorie.length >= 8, `${datiProntuario.categorie.length}`);

    const nuovoFarmaco = assertOk('Nuovo farmaco personalizzato salvato', await chiama('prescrizioni.salvaFarmaco', {
        farmaco: 'Collutorio Personalizzato Studio',
        principio_attivo: 'Clorexidina 0.30% + Zinco',
        categoria: 'collutori_antisettici',
        dosaggio: '250 ml',
        posologia: '1 sciacquo mattina e sera',
        durata_giorni: 10
    }));

    const prontuarioAggiornato = assertOk('Prontuario riletto con personalizzati', await chiama('prescrizioni.prontuario', {}));
    verifica('Il farmaco personalizzato e presente nel prontuario',
        prontuarioAggiornato.personalizzati.some(f => f.farmaco === 'Collutorio Personalizzato Studio'));

    const nuovaPrescrizione = assertOk('Prescrizione emessa da prontuario', await chiama('prescrizioni.add', {
        paziente_id: paziente.id,
        medico_id: medico.id,
        farmaco: 'Augmentin',
        principio_attivo: 'Amoxicillina + Acido Clavulanico',
        dosaggio: '875mg + 125mg',
        posologia: '1 compressa ogni 12 ore',
        durata_giorni: 6,
        data_prescrizione: '2026-08-15',
        salva_in_prontuario: true
    }));

    const listaPrescrizioni = assertOk('Prescrizioni del paziente lette', await chiama('prescrizioni.listByPaziente', {
        paziente_id: paziente.id
    }));
    verifica('La prescrizione e presente con medico prescrittore associato',
        listaPrescrizioni.some(p => p.farmaco === 'Augmentin' && p.medico.includes('Bianchi')));

    assertOk('Farmaco personalizzato eliminato dal prontuario', await chiama('prescrizioni.eliminaFarmaco', {
        id: nuovoFarmaco.id
    }));

    contesto.referto = refertoId;
    contesto.sede = sede;
    contesto.poltrona = poltrona;
    contesto.medico = medico;
    contesto.prestazione = prestazione;
    contesto.paziente = paziente;
    contesto.trattamento = trattamento;
};
