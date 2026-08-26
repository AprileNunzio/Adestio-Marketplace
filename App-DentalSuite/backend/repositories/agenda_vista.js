'use strict';

const { poltrone } = require('./facility');
const { pazienti } = require('./clinical');
const { staff, prestazioni } = require('./organization');
const riferimenti = require('../kernel/riferimenti');

function decora(righe) {
    const anagrafiche = riferimenti.mappaPerId(pazienti, riferimenti.raccogli(righe, 'paziente_id'));
    const collaboratori = riferimenti.mappaPerId(staff, riferimenti.raccogli(righe, 'medico_id'));
    const unita = riferimenti.mappaPerId(poltrone, riferimenti.raccogli(righe, 'poltrona_id'));
    const catalogo = riferimenti.mappaPerId(prestazioni, riferimenti.raccogli(righe, 'prestazione_id'));

    return righe.map(riga => {
        const paziente = anagrafiche.get(riga.paziente_id);
        const medico = collaboratori.get(riga.medico_id);
        return {
            ...riga,
            paziente_nome: paziente ? `${paziente.cognome} ${paziente.nome}`.trim() : '',
            paziente_telefono: paziente ? paziente.telefono : '',
            medico_nome: medico ? `${medico.cognome} ${medico.nome}`.trim() : '',
            medico_colore: medico ? medico.colore_agenda : '',
            poltrona_nome: unita.has(riga.poltrona_id) ? unita.get(riga.poltrona_id).nome : '',
            prestazione_nome: catalogo.has(riga.prestazione_id) ? catalogo.get(riga.prestazione_id).nome : ''
        };
    });
}

module.exports = { decora };
