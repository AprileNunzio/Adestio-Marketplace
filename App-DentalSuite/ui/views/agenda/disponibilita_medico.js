import { el, rimpiazza, icona } from '../../components/dom.js';
import { pannello, avviso, distintivo, spaziatore } from '../../components/layout.js';
import { fasciaGiornata, legendaFasce } from '../../components/fascia_giornata.js';
import { call } from '../../kernel/transport.js';
import { assicuraFoglio } from '../../kernel/stili.js';
import * as fmt from '../../kernel/format.js';
import { oggetto } from '../shared/vista.js';

function slotLiberi(quadro, oraScelta, onScegli) {
    if (quadro.slot.length === 0) {
        return el('p', { class: 'ds-muted' }, quadro.lavora
            ? 'Nessuno spazio libero di questa durata in quel giorno.'
            : 'Il collaboratore non è in turno in questo giorno.');
    }
    return el('div', { class: 'ds-slot-liberi' }, quadro.slot.map(voce => el('button', {
        class: 'ds-slot-liberi__voce',
        type: 'button',
        'aria-pressed': String(voce.ora === oraScelta),
        onClick: () => onScegli(voce.ora)
    }, voce.ora)));
}

function verdetto(esito) {
    if (esito.senza_medico) {
        return avviso({
            tono: 'info',
            simbolo: 'person_search',
            titolo: 'Nessun medico selezionato',
            voci: ['Scegli il medico per vedere i suoi turni e gli orari liberi.']
        });
    }
    if (esito.ammissibile) {
        return avviso({
            tono: 'info',
            simbolo: 'event_available',
            titolo: 'Orario compatibile con i turni del collaboratore',
            voci: esito.orari_dichiarati
                ? [`In turno ${esito.fasce_lavoro.map(fascia => fascia.etichetta).join(', ')}`]
                : ['Nessun orario dichiarato per questo collaboratore: l\'agenda non applica controlli.']
        });
    }
    return avviso({
        tono: 'danger',
        simbolo: 'event_busy',
        titolo: 'Orario non compatibile',
        voci: esito.motivi
    });
}

export function pannelloDisponibilita({ onScegliOra }) {
    assicuraFoglio('turni');
    const corpo = el('div', {});
    const intestazione = el('div', { class: 'ds-toolbar' }, []);
    let ammissibile = true;

    const aggiorna = async (stato, escludiId) => {
        if (!stato.medico_id) {
            ammissibile = true;
            rimpiazza(intestazione, []);
            rimpiazza(corpo, verdetto({ senza_medico: true }));
            return true;
        }

        const durata = Number(stato.durata_minuti) || 30;
        const [quadro, esito] = await Promise.all([
            call('disponibilita.giorno', {
                staff_id: stato.medico_id,
                data: stato.giorno,
                durata_minuti: durata,
                escludi_id: escludiId
            }).then(risultato => oggetto(risultato, null)),
            call('disponibilita.verifica', {
                staff_id: stato.medico_id,
                data_ora_inizio: stato.timestamp,
                durata_minuti: durata,
                escludi_id: escludiId
            }).then(risultato => oggetto(risultato, { ammissibile: true, motivi: [] }))
        ]);

        ammissibile = esito.ammissibile !== false;

        if (!quadro) {
            rimpiazza(corpo, avviso({
                tono: 'warning',
                simbolo: 'lock',
                titolo: 'Disponibilità non consultabile',
                voci: ['Serve il permesso agenda_view per leggere i turni del collaboratore.']
            }));
            return ammissibile;
        }

        rimpiazza(intestazione, [
            el('span', {}, `${quadro.collaboratore.nominativo} · ${quadro.giorno} ${fmt.data(quadro.data)}`),
            spaziatore(),
            distintivo(quadro.lavora
                ? `${Math.round(quadro.minuti_liberi / 60 * 10) / 10} ore libere`
                : 'non in turno', quadro.minuti_liberi > 0 ? 'success' : 'neutral')
        ]);

        rimpiazza(corpo, [
            verdetto(esito),
            fasciaGiornata({ quadro }),
            legendaFasce(),
            el('div', { class: 'ds-field__label' }, 'Orari liberi da cui scegliere'),
            slotLiberi(quadro, stato.ora, onScegliOra)
        ]);

        return ammissibile;
    };

    const nodo = pannello({
        titolo: 'Disponibilità del collaboratore',
        azioni: [intestazione]
    }, corpo);

    return { nodo, aggiorna, ammissibile: () => ammissibile };
}

export function selettoreForzatura(onCambio) {
    const casella = el('input', {
        type: 'checkbox',
        onChange: evento => onCambio(evento.target.checked)
    });
    const nodo = el('label', { class: 'ds-check ds-check--forzatura' }, [
        casella,
        icona('report'),
        el('span', {}, 'Prenota comunque fuori dai turni dichiarati')
    ]);
    nodo.hidden = true;
    return {
        nodo,
        mostra: visibile => {
            nodo.hidden = !visibile;
            if (!visibile) casella.checked = false;
        },
        attiva: () => casella.checked
    };
}
