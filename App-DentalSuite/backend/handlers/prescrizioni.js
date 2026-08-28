'use strict';

const { prescrizioni, pazienti, prontuarioFarmaci } = require('../repositories/clinical');
const { staff } = require('../repositories/organization');
const { validationError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const riferimenti = require('../kernel/riferimenti');
const { oggiIso } = require('../domain/rateizzazione');
const prontuarioDominio = require('../domain/prontuario_odontoiatrico');

function listByPaziente(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    const righe = prescrizioni.findAll({ where: { paziente_id: payload.paziente_id } });
    const medici = riferimenti.mappaPerId(staff, riferimenti.raccogli(righe, 'medico_id'));
    return righe.map(riga => ({
        ...riga,
        medico: medici.has(riga.medico_id)
            ? `${medici.get(riga.medico_id).cognome} ${medici.get(riga.medico_id).nome}`.trim()
            : ''
    }));
}

function prontuario() {
    const personalizzati = prontuarioFarmaci.findAll({});
    return {
        predefiniti: prontuarioDominio.elencoPredefiniti(),
        personalizzati: personalizzati || [],
        categorie: prontuarioDominio.CATEGORIE_PRONTUARIO
    };
}

async function salvaFarmaco(payload = {}) {
    if (!String(payload.farmaco || '').trim()) throw validationError('Nome del farmaco obbligatorio');
    const dati = {
        farmaco: String(payload.farmaco).trim(),
        principio_attivo: String(payload.principio_attivo || '').trim(),
        categoria: String(payload.categoria || 'altri').trim(),
        dosaggio: String(payload.dosaggio || '').trim(),
        posologia: String(payload.posologia || '').trim(),
        durata_giorni: Number(payload.durata_giorni || 0),
        note: String(payload.note || '').trim()
    };

    if (payload.id) {
        await prontuarioFarmaci.update(payload.id, dati, actor.stamp());
        return { id: payload.id };
    }

    const id = await prontuarioFarmaci.insert(dati, actor.stamp());
    return { id };
}

async function eliminaFarmaco(payload = {}) {
    if (!payload.id) throw validationError('Identificativo farmaco mancante');
    await prontuarioFarmaci.archive(payload.id);
    return { id: payload.id };
}

async function add(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    if (!String(payload.farmaco || '').trim()) throw validationError('Il farmaco è obbligatorio');
    if (!payload.medico_id) throw validationError('La prescrizione richiede il medico prescrittore');
    pazienti.requireById(payload.paziente_id, { includeArchived: true });
    staff.requireById(payload.medico_id, { includeArchived: true });

    const durata = Number(payload.durata_giorni || 0);
    if (durata < 0 || durata > 365) throw validationError('Durata della terapia non plausibile');

    const id = await prescrizioni.insert(
        { ...payload, data_prescrizione: payload.data_prescrizione || oggiIso() },
        actor.stamp()
    );

    if (payload.salva_in_prontuario === true) {
        try {
            const esistenti = prontuarioFarmaci.findAll({ where: { farmaco: payload.farmaco } });
            if (esistenti.length === 0) {
                await prontuarioFarmaci.insert({
                    farmaco: payload.farmaco,
                    principio_attivo: payload.principio_attivo || '',
                    categoria: payload.categoria || 'altri',
                    dosaggio: payload.dosaggio || '',
                    posologia: payload.posologia || '',
                    durata_giorni: durata,
                    note: payload.note || ''
                }, actor.stamp());
            }
        } catch {}
    }

    return { id };
}

async function remove(payload = {}) {
    await prescrizioni.archive(payload.id);
    return { id: payload.id };
}

module.exports = { listByPaziente, prontuario, salvaFarmaco, eliminaFarmaco, add, remove };
