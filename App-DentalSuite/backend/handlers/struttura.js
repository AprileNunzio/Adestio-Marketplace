'use strict';

const { sedi, sale, poltrone, appuntamenti } = require('../repositories/facility');
const { validationError, conflictError } = require('../kernel/errors');

function tree() {
    const elencoSedi = sedi.findAll({});
    const elencoSale = sale.findAll({});
    const elencoPoltrone = poltrone.findAll({});

    return elencoSedi.map(sede => ({
        ...sede,
        sale: elencoSale
            .filter(sala => sala.sede_id === sede.id)
            .map(sala => ({
                ...sala,
                poltrone: elencoPoltrone.filter(unita => unita.sala_id === sala.id)
            })),
        poltrone_senza_sala: elencoPoltrone.filter(
            unita => unita.sede_id === sede.id && !unita.sala_id
        )
    }));
}

function assertNome(valore, etichetta) {
    if (!String(valore || '').trim()) throw validationError(`${etichetta} è obbligatorio`);
}

async function salvaPrincipale(idCorrente) {
    const altre = sedi.findAll({}).filter(sede => sede.id !== idCorrente && Number(sede.is_principale) === 1);
    await Promise.all(altre.map(sede => sedi.update(sede.id, { is_principale: 0 })));
}

async function saveSede(payload = {}) {
    assertNome(payload.nome, 'Il nome della sede');
    const id = payload.id
        ? await sedi.update(payload.id, payload)
        : await sedi.insert(payload);
    if (Number(payload.is_principale) === 1) await salvaPrincipale(id);
    return { id };
}

async function removeSede(payload = {}) {
    const figlie = sale.findAll({ where: { sede_id: payload.id } });
    const unita = poltrone.findAll({ where: { sede_id: payload.id } });
    if (figlie.length > 0 || unita.length > 0) {
        throw conflictError('Rimuovere prima sale e poltrone associate alla sede');
    }
    await sedi.archive(payload.id);
    return { id: payload.id };
}

async function saveSala(payload = {}) {
    assertNome(payload.nome, 'Il nome della sala');
    if (!payload.sede_id) throw validationError('La sala deve appartenere a una sede');
    sedi.requireById(payload.sede_id, { includeArchived: true });
    const id = payload.id ? await sale.update(payload.id, payload) : await sale.insert(payload);
    return { id };
}

async function removeSala(payload = {}) {
    const unita = poltrone.findAll({ where: { sala_id: payload.id } });
    if (unita.length > 0) throw conflictError('Rimuovere prima le poltrone assegnate alla sala');
    await sale.archive(payload.id);
    return { id: payload.id };
}

async function savePoltrona(payload = {}) {
    assertNome(payload.nome, 'Il nome della poltrona');
    if (!payload.sede_id) throw validationError('La poltrona deve appartenere a una sede');
    sedi.requireById(payload.sede_id, { includeArchived: true });
    if (payload.sala_id) sale.requireById(payload.sala_id, { includeArchived: true });
    const id = payload.id ? await poltrone.update(payload.id, payload) : await poltrone.insert(payload);
    return { id };
}

async function removePoltrona(payload = {}) {
    const impegni = appuntamenti
        .findAll({ where: { poltrona_id: payload.id } })
        .filter(app => app.stato !== 'annullato' && app.stato !== 'concluso');
    if (impegni.length > 0) {
        throw conflictError(`Poltrona con ${impegni.length} appuntamenti ancora aperti in agenda`);
    }
    await poltrone.archive(payload.id);
    return { id: payload.id };
}

module.exports = { tree, saveSede, removeSede, saveSala, removeSala, savePoltrona, removePoltrona };
