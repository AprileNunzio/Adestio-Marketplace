import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, distintivo, spaziatore, vuoto } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { paginatore } from '../../components/paginatore.js';
import { call } from '../../kernel/transport.js';
import * as fmt from '../../kernel/format.js';
import { pagina } from '../shared/vista.js';

const ATTESA_DIGITAZIONE = 250;

const TONI_STATO = {
    programmato: 'info',
    confermato: 'success',
    in_sala: 'warning',
    concluso: 'neutral',
    annullato: 'danger',
    non_presentato: 'danger'
};

const STATI = [
    { valore: '', etichetta: 'Tutti gli stati' },
    { valore: 'programmato', etichetta: 'Programmato' },
    { valore: 'confermato', etichetta: 'Confermato' },
    { valore: 'in_sala', etichetta: 'In sala' },
    { valore: 'concluso', etichetta: 'Concluso' },
    { valore: 'annullato', etichetta: 'Annullato' },
    { valore: 'non_presentato', etichetta: 'Non presentato' }
];

function colonne({ onApri, onCartella, onGiorno }) {
    return [
        {
            titolo: 'Quando',
            rendi: riga => el('div', {}, [
                el('div', {}, fmt.dataOra(riga.data_ora_inizio)),
                el('div', { class: 'ds-muted' }, `${riga.durata_minuti || 0}′ · ${riga.poltrona_nome || 'poltrona non assegnata'}`)
            ])
        },
        {
            titolo: 'Paziente',
            rendi: riga => el('div', {}, [
                el('div', {}, riga.paziente_nome || '—'),
                el('div', { class: 'ds-muted' }, riga.paziente_telefono || '')
            ])
        },
        { titolo: 'Medico', campo: 'medico_nome' },
        { titolo: 'Motivo', rendi: riga => riga.prestazione_nome || riga.motivo_visita || '—' },
        {
            titolo: 'Stato',
            rendi: riga => distintivo(fmt.etichettaStato(riga.stato), TONI_STATO[riga.stato] || 'neutral')
        },
        {
            titolo: '',
            rendi: riga => azioniRiga([
                bottone({
                    simbolo: 'calendar_month', variante: 'ghost', piccolo: true, titolo: 'Apri il giorno in agenda',
                    onClick: () => onGiorno(riga)
                }),
                bottone({
                    simbolo: 'edit_calendar', variante: 'ghost', piccolo: true, titolo: 'Apri appuntamento',
                    onClick: () => onApri(riga)
                }),
                riga.paziente_id ? bottone({
                    simbolo: 'person', variante: 'ghost', piccolo: true, titolo: 'Apri cartella clinica',
                    onClick: () => onCartella(riga)
                }) : null
            ])
        }
    ];
}

export function pannelloRicerca({ onApri, onCartella, onGiorno }) {
    const stato = { termine: '', stato: '', dal: '', al: '', pagina: 1 };
    const risultati = el('div', {});
    const piede = el('div', {});
    let attesa = null;

    const svuotaRisultati = () => {
        rimpiazza(risultati, vuoto({
            titolo: 'Cerca un appuntamento',
            testo: 'Digita cognome, nome, codice fiscale o telefono del paziente per trovare tutti i suoi appuntamenti, passati e futuri.',
            simbolo: 'manage_search'
        }));
        rimpiazza(piede, null);
    };

    const cerca = async () => {
        if (stato.termine.trim().length < 2 && !stato.stato && !stato.dal && !stato.al) {
            svuotaRisultati();
            return;
        }
        const esito = pagina(await call('agenda.cerca', {
            term: stato.termine,
            stato: stato.stato || undefined,
            dal: stato.dal ? fmt.inizioGiornata(stato.dal) : undefined,
            al: stato.al ? fmt.fineGiornata(stato.al) : undefined,
            pagina: stato.pagina,
            dimensione: 25
        }));

        rimpiazza(risultati, tabella({
            colonne: colonne({ onApri, onCartella, onGiorno }),
            righe: esito.righe,
            vuotoTitolo: 'Nessun appuntamento trovato',
            vuotoTesto: 'Nessun appuntamento corrisponde ai criteri indicati.',
            vuotoSimbolo: 'event_busy'
        }));
        rimpiazza(piede, esito.totale > 0
            ? paginatore({
                stato: esito,
                onVai: numero => {
                    stato.pagina = numero;
                    cerca();
                }
            })
            : null);
    };

    const programma = () => {
        stato.pagina = 1;
        if (attesa) clearTimeout(attesa);
        attesa = setTimeout(cerca, ATTESA_DIGITAZIONE);
    };

    const campoTermine = el('input', {
        class: 'ds-input',
        type: 'search',
        placeholder: 'Cerca il paziente…',
        onInput: evento => {
            stato.termine = evento.target.value;
            programma();
        }
    });

    const campoStato = el('select', {
        class: 'ds-select',
        onChange: evento => {
            stato.stato = evento.target.value;
            stato.pagina = 1;
            cerca();
        }
    }, STATI.map(voce => el('option', { value: voce.valore }, voce.etichetta)));

    const campoDal = el('input', {
        class: 'ds-input', type: 'date', title: 'Dal giorno',
        onChange: evento => {
            stato.dal = evento.target.value;
            stato.pagina = 1;
            cerca();
        }
    });

    const campoAl = el('input', {
        class: 'ds-input', type: 'date', title: 'Fino al giorno',
        onChange: evento => {
            stato.al = evento.target.value;
            stato.pagina = 1;
            cerca();
        }
    });

    svuotaRisultati();

    return pannello({
        titolo: 'Ricerca appuntamenti',
        azioni: [campoTermine, campoStato, campoDal, campoAl, spaziatore()],
        flush: true
    }, [risultati, piede]);
}
