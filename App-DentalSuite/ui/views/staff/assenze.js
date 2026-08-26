import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, distintivo, spaziatore, statistica, griglia } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { conferma } from '../../components/modale.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import * as fmt from '../../kernel/format.js';
import { oggetto } from '../shared/vista.js';
import { apriForm } from '../shared/form_modale.js';

const TONI_STATO = {
    richiesta: 'warning',
    approvata: 'success',
    rifiutata: 'neutral'
};

const TIPI = [
    { valore: 'ferie', etichetta: 'Ferie' },
    { valore: 'permesso', etichetta: 'Permesso' },
    { valore: 'malattia', etichetta: 'Malattia' },
    { valore: 'formazione', etichetta: 'Formazione' },
    { valore: 'congedo', etichetta: 'Congedo' },
    { valore: 'chiusura', etichetta: 'Chiusura dello studio' },
    { valore: 'altro', etichetta: 'Altro' }
];

const SEZIONI = [{
    titolo: null,
    campi: [
        { campo: 'tipo', etichetta: 'Tipo di assenza *', genere: 'selezione', opzioni: TIPI, vuoto: false },
        { campo: 'data_inizio', etichetta: 'Dal giorno *', tipo: 'date' },
        { campo: 'data_fine', etichetta: 'Al giorno *', tipo: 'date' },
        { campo: 'giornata_intera', etichetta: 'Giornata intera', genere: 'booleano', ampio: true },
        { campo: 'ora_inizio', etichetta: 'Dalle ore (se parziale)', tipo: 'time' },
        { campo: 'ora_fine', etichetta: 'Alle ore (se parziale)', tipo: 'time' },
        { campo: 'motivo', etichetta: 'Motivo', ampio: true },
        { campo: 'note', etichetta: 'Note', genere: 'area', ampio: true }
    ]
}];

function periodo(riga) {
    if (riga.data_inizio === riga.data_fine) {
        return Number(riga.giornata_intera) === 1
            ? fmt.data(riga.data_inizio)
            : `${fmt.data(riga.data_inizio)} · ${riga.ora_inizio}–${riga.ora_fine}`;
    }
    return `${fmt.data(riga.data_inizio)} — ${fmt.data(riga.data_fine)}`;
}

export function pannelloAssenze({ collaboratore, puoGestire }) {
    const contenitore = el('div', {});

    const disegna = async () => {
        const dati = oggetto(await call('turni.listAssenze', { staff_id: collaboratore.id }), {
            righe: [], giorni_richiesti: 0
        });
        const righe = dati.righe || [];
        const inAttesa = righe.filter(riga => riga.stato === 'richiesta');

        const apri = async riga => {
            await apriForm({
                titolo: riga ? 'Modifica assenza' : `Nuova assenza · ${collaboratore.nominativo}`,
                sezioni: SEZIONI,
                valori: riga
                    ? { ...riga, giornata_intera: Number(riga.giornata_intera) }
                    : {
                        tipo: 'ferie',
                        data_inizio: fmt.oggiIso(),
                        data_fine: fmt.oggiIso(),
                        giornata_intera: 1,
                        ora_inizio: '',
                        ora_fine: '',
                        motivo: '',
                        note: ''
                    },
                ampia: true,
                etichettaSalva: riga ? 'Aggiorna' : 'Registra assenza',
                onSalva: stato => call('turni.salvaAssenza', {
                    ...stato,
                    giornata_intera: Number(stato.giornata_intera) === 1,
                    id: riga ? riga.id : undefined,
                    staff_id: collaboratore.id
                })
            });
            await disegna();
        };

        const decidi = async (riga, stato) => {
            if (!esito(await call('turni.decidiAssenza', { id: riga.id, stato }),
                stato === 'approvata' ? 'Assenza approvata' : 'Assenza rifiutata')) return;
            await disegna();
        };

        const rimuovi = async riga => {
            const procedi = await conferma({
                titolo: 'Eliminare l\'assenza?',
                messaggio: `${fmt.etichettaStato(riga.tipo)} del ${periodo(riga)} verrà rimossa e il collaboratore tornerà disponibile.`,
                etichettaConferma: 'Elimina',
                distruttiva: true
            });
            if (!procedi) return;
            if (!esito(await call('turni.rimuoviAssenza', { id: riga.id }), 'Assenza eliminata')) return;
            await disegna();
        };

        rimpiazza(contenitore, [
            griglia('stats', [
                statistica({ etichetta: 'Giorni di assenza approvati', valore: String(dati.giorni_richiesti) }),
                statistica({
                    etichetta: 'Richieste in attesa',
                    valore: String(inAttesa.length),
                    tono: inAttesa.length > 0 ? 'negativo' : undefined
                }),
                statistica({ etichetta: 'Voci registrate', valore: String(righe.length) })
            ]),
            pannello({
                titolo: 'Ferie, permessi e assenze',
                azioni: [
                    spaziatore(),
                    puoGestire ? bottone({ etichetta: 'Registra assenza', simbolo: 'event_busy', onClick: () => apri(null) }) : null
                ].filter(Boolean),
                flush: true
            }, tabella({
                colonne: [
                    { titolo: 'Tipo', rendi: riga => fmt.etichettaStato(riga.tipo) },
                    { titolo: 'Periodo', rendi: periodo },
                    { titolo: 'Motivo', rendi: riga => riga.motivo || '—' },
                    {
                        titolo: 'Stato',
                        rendi: riga => distintivo(fmt.etichettaStato(riga.stato), TONI_STATO[riga.stato] || 'neutral')
                    },
                    {
                        titolo: '',
                        rendi: riga => azioniRiga([
                            puoGestire && riga.stato !== 'approvata' ? bottone({
                                simbolo: 'check', variante: 'ghost', piccolo: true, titolo: 'Approva',
                                onClick: () => decidi(riga, 'approvata')
                            }) : null,
                            puoGestire && riga.stato !== 'rifiutata' ? bottone({
                                simbolo: 'block', variante: 'ghost', piccolo: true, titolo: 'Rifiuta',
                                onClick: () => decidi(riga, 'rifiutata')
                            }) : null,
                            puoGestire ? bottone({
                                simbolo: 'edit', variante: 'ghost', piccolo: true, titolo: 'Modifica',
                                onClick: () => apri(riga)
                            }) : null,
                            puoGestire ? bottone({
                                simbolo: 'delete', variante: 'ghost', piccolo: true, titolo: 'Elimina',
                                onClick: () => rimuovi(riga)
                            }) : null
                        ])
                    }
                ],
                righe,
                vuotoTitolo: 'Nessuna assenza registrata',
                vuotoTesto: 'Ferie, permessi e malattie registrate qui tolgono automaticamente disponibilità in agenda.',
                vuotoSimbolo: 'beach_access'
            }))
        ]);
    };

    disegna();
    return contenitore;
}
