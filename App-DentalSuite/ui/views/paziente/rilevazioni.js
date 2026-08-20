import { el } from '../../components/dom.js';
import { pannello, bottone, distintivo, spaziatore } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { conferma } from '../../components/modale.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import * as fmt from '../../kernel/format.js';
import { apriForm } from '../shared/form_modale.js';

function pastiglia(colore) {
    const nodo = el('span', { class: 'ds-scelta__pastiglia' });
    nodo.style.backgroundColor = colore;
    return nodo;
}

function transizione(riga) {
    if (!riga.stato_precedente) return 'prima rilevazione';
    if (riga.stato_precedente === riga.stato) return 'aggiornamento';
    return `da ${fmt.etichettaStato(riga.stato_precedente)}`;
}

function campiRilevazione(stati, superfici) {
    return [
        {
            campo: 'stato',
            etichetta: 'Stato clinico',
            genere: 'selezione',
            vuoto: false,
            opzioni: stati.map(voce => ({ valore: voce.id, etichetta: voce.label }))
        },
        { campo: 'data_rilevazione', etichetta: 'Data della rilevazione', tipo: 'date' },
        {
            campo: 'superfici',
            etichetta: 'Superfici',
            aiuto: `Sigle ammesse: ${superfici.join(', ')}`,
            ampio: true
        },
        { campo: 'materiale', etichetta: 'Materiale' },
        { campo: 'mobilita', etichetta: 'Mobilità' },
        { campo: 'note', etichetta: 'Note cliniche', genere: 'area', ampio: true }
    ];
}

export function pannelloRilevazioni({ righe, stati, superfici, filtroDente, puoModificare, onFiltro, onAggiornato }) {
    const modifica = async riga => {
        await apriForm({
            titolo: `Rilevazione del ${fmt.data(riga.data_rilevazione)} · elemento ${riga.numero_dente}`,
            sezioni: [{ titolo: null, campi: campiRilevazione(stati, superfici) }],
            valori: {
                stato: riga.stato,
                data_rilevazione: riga.data_rilevazione,
                superfici: riga.superfici,
                materiale: riga.materiale,
                mobilita: riga.mobilita,
                note: riga.note
            },
            etichettaSalva: 'Aggiorna rilevazione',
            onSalva: stato => call('odontogramma.modificaRilevazione', { ...stato, id: riga.id })
        });
        await onAggiornato();
    };

    const elimina = async riga => {
        const procedi = await conferma({
            titolo: 'Eliminare la rilevazione?',
            messaggio: `La rilevazione del ${fmt.data(riga.data_rilevazione)} sull'elemento ${riga.numero_dente} verrà rimossa e lo stato del dente ricalcolato sulla rilevazione precedente.`,
            etichettaConferma: 'Elimina',
            distruttiva: true
        });
        if (!procedi) return;
        if (esito(await call('odontogramma.eliminaRilevazione', { id: riga.id }), 'Rilevazione eliminata')) {
            await onAggiornato();
        }
    };

    const intestazione = filtroDente
        ? `Storia clinica dell'elemento ${filtroDente}`
        : 'Storia clinica di tutti gli elementi';

    return pannello({
        titolo: `${intestazione} · ${righe.length} rilevazioni`,
        azioni: [
            spaziatore(),
            filtroDente
                ? bottone({
                    etichetta: 'Mostra tutti gli elementi',
                    simbolo: 'filter_alt_off',
                    variante: 'ghost',
                    piccolo: true,
                    onClick: () => onFiltro(null)
                })
                : null
        ].filter(Boolean),
        flush: true
    }, tabella({
        colonne: [
            { titolo: 'Data', rendi: riga => fmt.data(riga.data_rilevazione) },
            {
                titolo: 'Elemento',
                rendi: riga => el('button', {
                    class: 'ds-scelta__voce',
                    type: 'button',
                    'aria-pressed': String(filtroDente === riga.numero_dente),
                    onClick: () => onFiltro(riga.numero_dente)
                }, [pastiglia(riga.stato_colore), `${riga.numero_dente} · ${riga.nome_dente}`])
            },
            { titolo: 'Stato', rendi: riga => distintivo(riga.stato_label, 'info') },
            { titolo: 'Variazione', rendi: riga => el('span', { class: 'ds-muted' }, transizione(riga)) },
            { titolo: 'Superfici', campo: 'superfici' },
            { titolo: 'Materiale', campo: 'materiale' },
            { titolo: 'Mobilità', campo: 'mobilita' },
            { titolo: 'Note', campo: 'note' },
            {
                titolo: '',
                rendi: riga => azioniRiga([
                    puoModificare ? bottone({
                        simbolo: 'edit', variante: 'ghost', piccolo: true,
                        titolo: 'Modifica rilevazione', onClick: () => modifica(riga)
                    }) : null,
                    puoModificare ? bottone({
                        simbolo: 'delete', variante: 'ghost', piccolo: true,
                        titolo: 'Elimina rilevazione', onClick: () => elimina(riga)
                    }) : null
                ])
            }
        ],
        righe,
        vuotoTitolo: filtroDente ? 'Nessuna rilevazione su questo elemento' : 'Nessuna rilevazione registrata',
        vuotoTesto: 'Seleziona un dente sull\'arcata e registra il reperto: ogni registrazione resta datata e consultabile nel tempo.',
        vuotoSimbolo: 'timeline'
    }));
}
