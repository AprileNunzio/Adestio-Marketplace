import { el } from '../../components/dom.js';
import { apriModale } from '../../components/modale.js';
import { costruisciCampi, opzioniDa } from '../../components/campi.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import * as fmt from '../../kernel/format.js';
import { elenco } from '../shared/vista.js';

const STATI = [
    { valore: 'programmato', etichetta: 'Programmato' },
    { valore: 'confermato', etichetta: 'Confermato' },
    { valore: 'in_sala', etichetta: 'In sala' },
    { valore: 'concluso', etichetta: 'Concluso' },
    { valore: 'non_presentato', etichetta: 'Non presentato' },
    { valore: 'annullato', etichetta: 'Annullato' }
];

const DURATE = [15, 30, 45, 60, 90, 120]
    .map(minuti => ({ valore: minuti, etichetta: `${minuti} minuti` }));

function oraDa(timestamp) {
    const data = new Date(Number(timestamp));
    return `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
}

function timestampDa(giornoIso, oraTesto) {
    const parti = /^(\d{1,2}):(\d{2})$/.exec(String(oraTesto || '09:00'));
    const ore = parti ? Number(parti[1]) : 9;
    const minuti = parti ? Number(parti[2]) : 0;
    return fmt.inizioGiornata(giornoIso) + (ore * 60 + minuti) * 60000;
}

export async function apriAppuntamento({ appuntamento, poltrone, giorno, permessi, onEliminato }) {
    const [pazienti, staff, prestazioni] = await Promise.all([
        call('pazienti.list', {}).then(elenco),
        call('staff.list', {}).then(elenco),
        call('prestazioni.list', {}).then(elenco)
    ]);

    const giornoBase = appuntamento
        ? fmt.isoDa(new Date(Number(appuntamento.data_ora_inizio)))
        : giorno;

    const stato = {
        paziente_id: appuntamento ? appuntamento.paziente_id : '',
        medico_id: appuntamento ? appuntamento.medico_id : '',
        assistente_id: appuntamento ? appuntamento.assistente_id : '',
        poltrona_id: appuntamento ? appuntamento.poltrona_id : (poltrone[0] ? poltrone[0].id : ''),
        prestazione_id: appuntamento ? appuntamento.prestazione_id : '',
        giorno: giornoBase,
        ora: appuntamento ? oraDa(appuntamento.data_ora_inizio) : '09:00',
        durata_minuti: appuntamento ? Number(appuntamento.durata_minuti) : 30,
        stato: appuntamento ? appuntamento.stato : 'programmato',
        motivo_visita: appuntamento ? appuntamento.motivo_visita : '',
        note: appuntamento ? appuntamento.note : ''
    };

    const campi = [
        {
            campo: 'paziente_id',
            etichetta: 'Paziente',
            genere: 'selezione',
            opzioni: opzioniDa(pazienti, 'id', voce => voce.nominativo),
            ampio: true
        },
        {
            campo: 'poltrona_id',
            etichetta: 'Poltrona *',
            genere: 'selezione',
            vuoto: false,
            opzioni: opzioniDa(poltrone, 'id', 'nome')
        },
        {
            campo: 'medico_id',
            etichetta: 'Medico',
            genere: 'selezione',
            opzioni: opzioniDa(staff.filter(voce => voce.ruolo !== 'segreteria'), 'id', voce => voce.nominativo)
        },
        {
            campo: 'assistente_id',
            etichetta: 'Assistente',
            genere: 'selezione',
            opzioni: opzioniDa(staff, 'id', voce => voce.nominativo)
        },
        {
            campo: 'prestazione_id',
            etichetta: 'Prestazione prevista',
            genere: 'selezione',
            opzioni: opzioniDa(prestazioni, 'id', voce => voce.nome)
        },
        { campo: 'giorno', etichetta: 'Data *', tipo: 'date' },
        { campo: 'ora', etichetta: 'Ora inizio *', tipo: 'time' },
        { campo: 'durata_minuti', etichetta: 'Durata *', genere: 'selezione', vuoto: false, opzioni: DURATE },
        { campo: 'stato', etichetta: 'Stato', genere: 'selezione', vuoto: false, opzioni: STATI },
        { campo: 'motivo_visita', etichetta: 'Motivo della visita', ampio: true },
        { campo: 'note', etichetta: 'Note', genere: 'area', ampio: true }
    ];

    const azioni = [{ etichetta: 'Chiudi', variante: 'ghost', esito: null }];

    if (appuntamento && permessi.elimina) {
        azioni.push({
            etichetta: 'Elimina',
            variante: 'danger',
            simbolo: 'delete',
            onAzione: async () => onEliminato()
        });
    }

    if (permessi.modifica) {
        azioni.push({
            etichetta: appuntamento ? 'Aggiorna' : 'Prenota',
            simbolo: 'save',
            onAzione: async () => {
                const payload = {
                    ...stato,
                    durata_minuti: Number(stato.durata_minuti),
                    data_ora_inizio: timestampDa(stato.giorno, stato.ora)
                };
                delete payload.giorno;
                delete payload.ora;
                const risultato = appuntamento
                    ? await call('agenda.update', { ...payload, id: appuntamento.id })
                    : await call('agenda.create', payload);
                return esito(risultato, appuntamento ? 'Appuntamento aggiornato' : 'Appuntamento prenotato');
            }
        });
    }

    return apriModale({
        titolo: appuntamento ? 'Modifica appuntamento' : 'Nuovo appuntamento',
        corpo: el('div', { class: 'ds-grid ds-grid--form' },
            costruisciCampi(
                campi.map(campo => ({ ...campo, disabilitato: !permessi.modifica })),
                stato,
                (campo, valore) => {
                    stato[campo] = valore;
                }
            )),
        ampia: true,
        azioni
    });
}
