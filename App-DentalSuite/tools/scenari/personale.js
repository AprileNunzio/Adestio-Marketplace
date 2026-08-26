'use strict';

const dominio = require('../../backend/domain/disponibilita');

function lunedeSuccessivo() {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + ((8 - (base.getDay() || 7)) % 7 || 7));
    return dominio.isoDa(base);
}

module.exports = async ({ chiama, verifica, assertOk, assertKo, contesto }) => {
    const medico = contesto.medico;
    const paziente = contesto.paziente;
    const poltrona = contesto.poltrona;

    const lunedi = lunedeSuccessivo();
    const mercoledi = dominio.giorniDopo(lunedi, 2);
    const martedi = dominio.giorniDopo(lunedi, 1);
    const venerdi = dominio.giorniDopo(lunedi, 4);

    for (const giorno of [1, 3, 5]) {
        assertOk(`Turno del giorno ${giorno} salvato`, await chiama('turni.salva', {
            staff_id: medico.id,
            giorno_settimana: giorno,
            ora_inizio: '17:00',
            ora_fine: '19:00'
        }));
    }

    assertKo('Turno sovrapposto rifiutato', await chiama('turni.salva', {
        staff_id: medico.id,
        giorno_settimana: 1,
        ora_inizio: '18:00',
        ora_fine: '20:00'
    }), 'CONFLICT');

    assertKo('Orario di fine prima dell inizio rifiutato', await chiama('turni.salva', {
        staff_id: medico.id,
        giorno_settimana: 2,
        ora_inizio: '19:00',
        ora_fine: '17:00'
    }), 'VALIDATION');

    const settimana = assertOk('Turni del collaboratore letti', await chiama('turni.listByStaff', {
        staff_id: medico.id
    }));
    verifica('La settimana è descritta a parole',
        settimana.descrizione === 'Lun 17:00–19:00 · Mer 17:00–19:00 · Ven 17:00–19:00',
        settimana.descrizione);
    verifica('Tre giorni lavorati',
        settimana.settimana.filter(giorno => giorno.fasce.length > 0).length === 3);

    const giornoLavorato = assertOk('Disponibilità del lunedì', await chiama('disponibilita.giorno', {
        staff_id: medico.id,
        data: lunedi,
        durata_minuti: 30
    }));
    verifica('Il lunedì il medico lavora', giornoLavorato.lavora === true);
    verifica('Due ore disponibili', giornoLavorato.minuti_disponibili === 120,
        `${giornoLavorato.minuti_disponibili}`);
    verifica('Sette slot da mezz ora proposti a passo di un quarto d ora',
        giornoLavorato.slot.length === 7,
        `${giornoLavorato.slot.length}`);

    const giornoLibero = assertOk('Disponibilità del martedì', await chiama('disponibilita.giorno', {
        staff_id: medico.id,
        data: martedi,
        durata_minuti: 30
    }));
    verifica('Il martedì non lavora', giornoLibero.lavora === false);

    const inizioLunedi = dominio.inizioGiornataDi(lunedi);

    assertKo('Appuntamento fuori orario rifiutato', await chiama('agenda.create', {
        paziente_id: paziente.id,
        medico_id: medico.id,
        poltrona_id: poltrona.id,
        data_ora_inizio: inizioLunedi + 10 * 60 * 60000,
        durata_minuti: 30
    }), 'CONFLICT');

    assertKo('Appuntamento in un giorno non lavorato rifiutato', await chiama('agenda.create', {
        paziente_id: paziente.id,
        medico_id: medico.id,
        poltrona_id: poltrona.id,
        data_ora_inizio: dominio.inizioGiornataDi(martedi) + 17.5 * 60 * 60000,
        durata_minuti: 30
    }), 'CONFLICT');

    const dentroOrario = assertOk('Appuntamento dentro l orario accettato', await chiama('agenda.create', {
        paziente_id: paziente.id,
        medico_id: medico.id,
        poltrona_id: poltrona.id,
        data_ora_inizio: inizioLunedi + 17 * 60 * 60000,
        durata_minuti: 30
    }));
    verifica('Non risulta forzato', dentroOrario.forzato === false);

    const forzato = assertOk('Forzatura esplicita accettata', await chiama('agenda.create', {
        paziente_id: paziente.id,
        medico_id: medico.id,
        poltrona_id: poltrona.id,
        data_ora_inizio: inizioLunedi + 10 * 60 * 60000,
        durata_minuti: 30,
        forza: true
    }));
    verifica('L appuntamento è marcato come forzato', forzato.forzato === true);

    const dopoPrenotazione = assertOk('Disponibilità aggiornata dopo la prenotazione',
        await chiama('disponibilita.giorno', { staff_id: medico.id, data: lunedi, durata_minuti: 30 }));
    verifica('Mezz ora in meno di tempo libero', dopoPrenotazione.minuti_liberi === 90,
        `${dopoPrenotazione.minuti_liberi}`);

    assertOk('Ferie registrate sul mercoledì', await chiama('turni.salvaAssenza', {
        staff_id: medico.id,
        tipo: 'ferie',
        data_inizio: mercoledi,
        data_fine: mercoledi,
        stato: 'approvata',
        motivo: 'Giornata di ferie'
    }));

    const inFerie = assertOk('Disponibilità del mercoledì in ferie', await chiama('disponibilita.giorno', {
        staff_id: medico.id,
        data: mercoledi,
        durata_minuti: 30
    }));
    verifica('In ferie non resta tempo disponibile', inFerie.minuti_disponibili === 0,
        `${inFerie.minuti_disponibili}`);

    assertKo('Appuntamento durante le ferie rifiutato', await chiama('agenda.create', {
        paziente_id: paziente.id,
        medico_id: medico.id,
        poltrona_id: poltrona.id,
        data_ora_inizio: dominio.inizioGiornataDi(mercoledi) + 17.5 * 60 * 60000,
        durata_minuti: 30
    }), 'CONFLICT');

    const permesso = assertOk('Permesso di due ore sul venerdì', await chiama('turni.salvaAssenza', {
        staff_id: medico.id,
        tipo: 'permesso',
        data_inizio: venerdi,
        data_fine: venerdi,
        giornata_intera: false,
        ora_inizio: '17:00',
        ora_fine: '18:00',
        stato: 'approvata'
    }));

    const conPermesso = assertOk('Disponibilità del venerdì', await chiama('disponibilita.giorno', {
        staff_id: medico.id,
        data: venerdi,
        durata_minuti: 30
    }));
    verifica('Il permesso taglia la prima ora', conPermesso.minuti_disponibili === 60,
        `${conPermesso.minuti_disponibili}`);

    assertOk('Permesso rifiutato dal responsabile', await chiama('turni.decidiAssenza', {
        id: permesso.id,
        stato: 'rifiutata'
    }));

    const dopoRifiuto = assertOk('Disponibilità del venerdì dopo il rifiuto',
        await chiama('disponibilita.giorno', { staff_id: medico.id, data: venerdi, durata_minuti: 30 }));
    verifica('Un permesso rifiutato non toglie disponibilità', dopoRifiuto.minuti_disponibili === 120,
        `${dopoRifiuto.minuti_disponibili}`);

    const calendario = assertOk('Calendario delle assenze', await chiama('turni.calendario', {
        dal: lunedi,
        al: venerdi
    }));
    verifica('Le ferie compaiono nel calendario di studio',
        calendario.some(voce => voce.tipo === 'ferie' && voce.collaboratore),
        `${calendario.length} voci`);

    const panoramica = assertOk('Panoramica dello studio del lunedì', await chiama('disponibilita.panoramica', {
        data: lunedi,
        durata_minuti: 30
    }));
    verifica('La panoramica include il medico con turni',
        panoramica.some(voce => voce.staff_id === medico.id && voce.lavora === true));

    assertOk('Un appuntamento forzato resta modificabile senza riconfermare',
        await chiama('agenda.update', { id: forzato.id, note: 'Nota aggiunta dopo la forzatura' }));

    assertKo('Spostare un appuntamento forzato richiede una nuova conferma',
        await chiama('agenda.update', {
            id: forzato.id,
            data_ora_inizio: dominio.inizioGiornataDi(martedi) + 11 * 60 * 60000
        }), 'CONFLICT');

    contesto.turni = { lunedi, martedi, mercoledi, venerdi };
};
