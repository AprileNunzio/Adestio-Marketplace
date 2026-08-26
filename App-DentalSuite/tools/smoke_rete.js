'use strict';

const { creaHost, creaBroker } = require('./host_stub');
const { verifica, assertOk, assertKo, riepiloga } = require('./verifiche');

const PERMESSI = require('../core/permissions.json').map(voce => voce.id);
const PORTA = 7391;
const INDIRIZZO = `127.0.0.1:${PORTA}`;

async function preparaPaziente(chiama) {
    const paziente = assertOk('Paziente di prova creato', await chiama('pazienti.create', {
        nome: 'Giulia',
        cognome: 'Marino',
        data_nascita: '1984-03-12',
        telefono: '3401234567',
        pacemaker: 1
    }));

    await chiama('anamnesi.save', {
        paziente_id: paziente.id,
        allergie_farmaci: 'Penicillina',
        terapia_anticoagulanti: 1,
        diabete: 1
    });

    await chiama('odontogramma.saveDente', {
        paziente_id: paziente.id,
        numero_dente: '26',
        stato: 'otturato',
        superfici: 'O,M',
        materiale: 'composito',
        data_rilevazione: '2026-05-04'
    });

    for (let indice = 0; indice < 8; indice += 1) {
        await chiama('trattamenti.add', {
            paziente_id: paziente.id,
            descrizione: `Prestazione ${indice + 1}`,
            dente: '26',
            stato: 'eseguito',
            importo: 120,
            data_trattamento: `2026-0${(indice % 8) + 1}-04`
        });
    }

    return paziente.id;
}

async function attendiDossier(chiama, versioneNota) {
    const risposta = await chiama('trasmissioni.attiva', { attendi: true, versione: versioneNota });
    return risposta && risposta.success ? risposta.data : null;
}

async function main() {
    const host = creaHost({ utenteId: 'dott-bianchi' });
    const broker = creaBroker();
    const backend = require('../backend.js');
    const trasporto = require('../backend/rete/trasporto');
    const cliente = require('../backend/rete/cliente');
    const { pari } = require('../backend/repositories/rete');

    host.concedi(PERMESSI);
    verifica(
        'Backend registrato con i canali di rete',
        backend.registerBackendHandlers(broker.registerApi, host.electronApp, host.adestioDb) === true
    );

    const chiama = (azione, payload) => broker.invoca(azione, payload);
    const pazienteId = await preparaPaziente(chiama);

    assertOk('Profilo di postazione inizializzato', await chiama('postazioni.profilo', {}));

    const primaVolta = assertOk('Guida alla prima configurazione', await chiama('postazioni.situazione', {}));
    verifica('Alla prima apertura chiede solo dove si trova il computer',
        primaVolta.passo === 'scegli_posto' && primaVolta.configurata === false,
        `${primaVolta.passo} · ${primaVolta.titolo}`);
    verifica('La guida non usa parole tecniche nel titolo',
        ['rete', 'postazione', 'accoppia', 'porta', 'impronta', 'canale']
            .every(parola => !primaVolta.titolo.toLowerCase().includes(parola)),
        primaVolta.titolo);

    const spenta = assertOk('Diagnosi con la rete spenta', await chiama('postazioni.verifica', {}));
    verifica('La diagnosi dice che la rete è disattivata, non che il servizio è rotto',
        Boolean(spenta && spenta.diagnosi && spenta.diagnosi.length === 1 && spenta.diagnosi[0].causa === 'disattivata'),
        spenta && spenta.problemi ? spenta.problemi.join(' | ') : '');
    verifica('La diagnosi propone il rimedio giusto',
        Boolean(spenta && spenta.rimedi && spenta.rimedi[0] && spenta.rimedi[0].includes('Attiva la rete adesso')),
        spenta && spenta.rimedi ? spenta.rimedi[0] : '');

    const configurata = assertOk('Configurazione guidata completata', await chiama('postazioni.configura', {
        ruolo: 'segreteria',
        nome: 'Reception',
        porta: PORTA
    }));
    verifica('Dopo la scelta il collegamento risulta acceso',
        configurata.situazione.configurata === true, `${configurata.situazione.passo}`);
    verifica('Senza monitor collegati la guida chiede di mostrare il codice',
        configurata.situazione.passo === 'mostra_codice', configurata.situazione.titolo);

    const profilo = assertOk('Profilo di postazione salvato', await chiama('postazioni.salvaProfilo', {
        nome: 'Segreteria di prova',
        ruolo: 'segreteria',
        porta: PORTA,
        attiva: true
    }));
    verifica('Il servizio di rete è in ascolto', profilo && profilo.rete && profilo.rete.avviato === true,
        profilo && profilo.rete ? profilo.rete.motivo || '' : 'nessun esito');

    const pronta = assertOk('Diagnosi con la rete attiva', await chiama('postazioni.verifica', {}));
    verifica('Con il servizio in ascolto non restano problemi di avvio',
        Boolean(pronta && (pronta.diagnosi || []).every(voce => voce.causa !== 'disattivata' && voce.causa !== 'servizio')),
        pronta && pronta.problemi ? pronta.problemi.join(' | ') : '');

    const stato = assertOk('Stato della rete leggibile', await chiama('postazioni.stato'));
    verifica('La porta di servizio è quella richiesta', stato && stato.servizio.porta === PORTA,
        stato ? String(stato.servizio.porta) : '');
    verifica('La postazione espone una impronta', Boolean(stato && stato.postazione.impronta),
        stato ? stato.postazione.impronta : '');

    const codice = assertOk('Codice di accoppiamento generato', await chiama('postazioni.generaCodice'));
    verifica('Il codice ha otto cifre', Boolean(codice && /^\d{8}$/.test(codice.codice)));

    assertKo('Accoppiamento rifiutato dalla postazione di segreteria',
        await chiama('postazioni.accoppia', { indirizzo: '127.0.0.1', porta: PORTA, codice: '00000000' }),
        'CONFLICT');

    let codiceRifiutato = '';
    try {
        await cliente.accoppia({ indirizzo: '127.0.0.1', porta: PORTA, codice: '00000000' });
    } catch (errore) {
        codiceRifiutato = errore.message;
    }
    verifica('Codice di accoppiamento errato rifiutato dal servizio',
        codiceRifiutato.includes('Codice errato') || codiceRifiutato.includes('non valida'),
        codiceRifiutato);

    const codiceValido = assertOk('Secondo codice generato', await chiama('postazioni.generaCodice'));
    const accoppiata = await cliente.accoppia({
        indirizzo: '127.0.0.1',
        porta: PORTA,
        codice: codiceValido.codice
    });
    verifica('Accoppiamento completato', Boolean(accoppiata && accoppiata.pari_id), accoppiata && accoppiata.nome);

    await pari.update(accoppiata.pari_id, { ruolo: 'riunito', nome: 'Riunito 1' });

    const collegamento = await trasporto.collegaRiunito(INDIRIZZO);
    verifica('Canale cifrato aperto verso la segreteria', Boolean(collegamento && collegamento.sessione));

    const postazioni = assertOk('Riuniti collegati elencati', await chiama('trasmissioni.postazioni'));
    verifica('Un riunito risulta collegato', Boolean(postazioni && postazioni.collegate.length === 1),
        postazioni ? String(postazioni.collegate.length) : '');

    const vuota = assertOk('Il riunito parte da pagina vuota', await chiama('trasmissioni.attiva'));
    verifica('Nessuna scheda presente prima della trasmissione', vuota && vuota.presente === false);

    const attesa = attendiDossier(chiama, vuota.versione);
    const inviata = assertOk('Scheda paziente trasmessa', await chiama('trasmissioni.invia', {
        paziente_id: pazienteId
    }));
    verifica('La trasmissione riporta la postazione di destinazione', inviata && inviata.postazione === 'Riunito 1',
        inviata ? inviata.postazione : '');

    const ricevuta = await attesa;
    verifica('Il riunito ha ricevuto la scheda', Boolean(ricevuta && ricevuta.presente));
    const dossier = ricevuta && ricevuta.dossier ? ricevuta.dossier : null;
    verifica('Il paziente trasmesso è quello atteso', Boolean(dossier && dossier.paziente.nominativo === 'Marino Giulia'),
        dossier ? dossier.paziente.nominativo : '');
    verifica('Le allerte cliniche viaggiano con la scheda',
        Boolean(dossier && dossier.anamnesi.allerte.length >= 3),
        dossier ? dossier.anamnesi.allerte.map(voce => voce.etichetta).join(' · ') : '');
    verifica('L odontogramma completo è nella scheda',
        Boolean(dossier && dossier.odontogramma.denti.length === 32),
        dossier ? String(dossier.odontogramma.denti.length) : '');
    verifica('Il dente già trattato conserva il suo stato',
        Boolean(dossier && dossier.odontogramma.denti.find(voce => voce.numero_dente === '26' && voce.stato === 'otturato')));
    verifica('I trattamenti precedenti sono nella scheda',
        Boolean(dossier && dossier.trattamenti.length > 0),
        dossier ? String(dossier.trattamenti.length) : '');
    verifica('Nessun dato economico viaggia verso il riunito',
        Boolean(dossier) && dossier.economia === undefined,
        dossier && dossier.economia ? 'presente' : 'assente');
    verifica('La scheda porta la galleria dei referti',
        Boolean(dossier) && Array.isArray(dossier.referti),
        dossier ? `${dossier.referti.length} referti` : '');

    const piccolo = assertOk('Schermo compatto dichiarato dal riunito',
        await chiama('trasmissioni.dichiaraSchermo', { larghezza: 1024, altezza: 600 }));
    verifica('Uno schermo piccolo sceglie la densità compatta', piccolo.id === 'compatta', piccolo.id);

    const primaDelPiccolo = assertOk('Stato prima della seconda trasmissione', await chiama('trasmissioni.attiva'));
    const attesaPiccolo = attendiDossier(chiama, primaDelPiccolo.versione);
    assertOk('Scheda ritrasmessa su schermo compatto',
        await chiama('trasmissioni.invia', { paziente_id: pazienteId }));
    const suPiccolo = await attesaPiccolo;
    verifica('Sul compatto la scheda porta meno trattamenti',
        suPiccolo.dossier.trattamenti.length === 5,
        `${suPiccolo.dossier.trattamenti.length}`);
    verifica('Sul compatto la zona storia non viene composta',
        suPiccolo.dossier.densita.zone.includes('storia') === false,
        suPiccolo.dossier.densita.zone.join(','));
    verifica('La galleria c è a ogni densità',
        suPiccolo.dossier.densita.zone.includes('galleria'),
        suPiccolo.dossier.densita.zone.join(','));

    const grande = assertOk('Schermo ad alta risoluzione dichiarato',
        await chiama('trasmissioni.dichiaraSchermo', { larghezza: 2560, altezza: 1440 }));
    verifica('Uno schermo grande sceglie la densità massima', grande.id === 'massima', grande.id);

    const primaDelGrande = assertOk('Stato prima della terza trasmissione', await chiama('trasmissioni.attiva'));
    const attesaGrande = attendiDossier(chiama, primaDelGrande.versione);
    assertOk('Scheda ritrasmessa su schermo grande',
        await chiama('trasmissioni.invia', { paziente_id: pazienteId }));
    const suGrande = await attesaGrande;
    verifica('Sul grande la scheda porta tutti i trattamenti',
        suGrande.dossier.trattamenti.length === 8,
        `${suGrande.dossier.trattamenti.length}`);
    verifica('Sul grande compaiono le zone aggiuntive',
        ['prescrizioni', 'galleria', 'rilevazioni'].every(zona => suGrande.dossier.densita.zone.includes(zona)),
        suGrande.dossier.densita.zone.join(','));
    verifica('La densità riporta le misure dichiarate',
        suGrande.dossier.densita.schermo.larghezza === 2560 && suGrande.dossier.densita.misurato === true,
        JSON.stringify(suGrande.dossier.densita.schermo));

    const atto = assertOk('Reperto registrato dal riunito', await chiama('atti.registra', {
        tipo: 'reperto',
        contenuto: {
            numero_dente: '16',
            stato: 'cariato',
            superfici: 'O',
            note: 'carie occlusale rilevata in seduta',
            data_rilevazione: '2026-08-21'
        }
    }));
    verifica('L atto è stato consegnato alla segreteria', Boolean(atto && atto.consegnato === true),
        atto ? atto.messaggio || '' : '');
    verifica('La segreteria ha accettato l atto', Boolean(atto && atto.esito && atto.esito.accettato === true),
        atto && atto.esito ? atto.esito.messaggio || '' : '');

    const mappa = assertOk('Odontogramma riletto in segreteria', await chiama('odontogramma.get', {
        paziente_id: pazienteId,
        dentizione: 'permanente'
    }));
    verifica('Il reperto del medico è nell archivio',
        Boolean(mappa && mappa.denti.find(voce => voce.numero_dente === '16' && voce.stato === 'cariato')));

    const ripetuto = assertOk('Atto ripetuto accettato senza duplicare', await chiama('atti.registra', {
        tipo: 'reperto',
        atto_id: atto.atto_id,
        contenuto: { numero_dente: '16', stato: 'cariato' }
    }));
    verifica('La ripetizione è riconosciuta come tale',
        Boolean(ripetuto && ripetuto.esito && ripetuto.esito.ripetuto === true));

    const storicoAtti = assertOk('Registro degli atti ricevuti', await chiama('atti.storico', {}));
    verifica('Un solo atto risulta applicato', storicoAtti && storicoAtti.totale === 1,
        storicoAtti ? String(storicoAtti.totale) : '');

    const primaDellaChiusura = assertOk('Stato del riunito prima della chiusura', await chiama('trasmissioni.attiva'));
    const chiusura = attendiDossier(chiama, primaDellaChiusura.versione);
    assertOk('Seduta chiusa dalla segreteria', await chiama('trasmissioni.chiudi', { id: inviata.id }));
    const dopo = await chiusura;
    verifica('Il riunito torna alla pagina vuota', Boolean(dopo && dopo.presente === false));

    const elencoTrasmissioni = assertOk('Registro delle trasmissioni', await chiama('trasmissioni.elenco', {}));
    const chiusa = elencoTrasmissioni.righe.find(riga => riga.id === inviata.id);
    verifica('La trasmissione chiusa risulta chiusa nel registro',
        Boolean(chiusa && chiusa.stato === 'chiusa'),
        chiusa ? chiusa.stato : 'non trovata');
    verifica('Il registro elenca tutte le trasmissioni della seduta',
        elencoTrasmissioni.totale === 3,
        `${elencoTrasmissioni.totale}`);

    await trasporto.ferma();
    host.pulisci();
    process.exit(riepiloga() === 0 ? 0 : 1);
}

main().catch(errore => {
    console.error('Smoke test di rete interrotto:', errore);
    process.exit(1);
});
