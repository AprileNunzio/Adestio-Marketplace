'use strict';

function identificativiUnici(valori) {
    return [...new Set((valori || []).filter(Boolean).map(String))];
}

function mappaPerId(repository, valori, opzioni = {}) {
    const identificativi = identificativiUnici(valori);
    if (identificativi.length === 0) return new Map();
    const righe = repository.findAll({
        includeArchived: opzioni.includeArchived !== false,
        filtri: [{ colonna: 'id', operatore: 'in', valore: identificativi }]
    });
    return new Map(righe.map(riga => [riga.id, riga]));
}

function raccogli(righe, ...chiavi) {
    return identificativiUnici(
        righe.reduce((tutti, riga) => tutti.concat(chiavi.map(chiave => riga[chiave])), [])
    );
}

module.exports = { mappaPerId, raccogli, identificativiUnici };
