import { el, rimpiazza, icona } from '../../components/dom.js';
import { pannello, bottone, spaziatore, avviso, distintivo, scheletro } from '../../components/layout.js';
import { conferma } from '../../components/modale.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import { assicuraFoglio } from '../../kernel/stili.js';
import * as fmt from '../../kernel/format.js';
import { oggetto } from '../shared/vista.js';
import { apriForm } from '../shared/form_modale.js';
import { pannelloAssenze } from './assenze.js';

const SEZIONI_TURNO = giorni => [{
    titolo: null,
    campi: [
        {
            campo: 'giorno_settimana',
            etichetta: 'Giorno della settimana *',
            genere: 'selezione',
            vuoto: false,
            opzioni: giorni.map(voce => ({ valore: voce.numero, etichetta: voce.nome }))
        },
        { campo: 'ora_inizio', etichetta: 'Dalle ore *', tipo: 'time' },
        { campo: 'ora_fine', etichetta: 'Alle ore *', tipo: 'time' },
        { campo: 'valido_dal', etichetta: 'Valido dal (facoltativo)', tipo: 'date' },
        { campo: 'valido_al', etichetta: 'Valido fino al (facoltativo)', tipo: 'date' },
        { campo: 'note', etichetta: 'Note', ampio: true }
    ]
}];

const SEZIONI_STRAORDINARIO = [{
    titolo: null,
    campi: [
        { campo: 'data_specifica', etichetta: 'Giorno *', tipo: 'date' },
        { campo: 'ora_inizio', etichetta: 'Dalle ore *', tipo: 'time' },
        { campo: 'ora_fine', etichetta: 'Alle ore *', tipo: 'time' },
        { campo: 'note', etichetta: 'Motivo', ampio: true }
    ]
}];

function rigaGiorno(giorno, azioni, puoModificare) {
    return [
        el('div', { class: 'ds-settimana__giorno' }, giorno.nome),
        giorno.fasce.length === 0
            ? el('div', { class: 'ds-settimana__vuoto' }, 'non lavora')
            : el('div', { class: 'ds-settimana__fasce' }, giorno.righe.map(riga => el('span', {
                class: 'ds-settimana__turno'
            }, [
                el('button', {
                    class: 'ds-slot-liberi__voce',
                    type: 'button',
                    title: riga.note || 'Modifica il turno',
                    disabled: !puoModificare,
                    onClick: () => azioni.modifica(riga)
                }, `${riga.ora_inizio}–${riga.ora_fine}`),
                puoModificare
                    ? bottone({
                        simbolo: 'close',
                        variante: 'ghost',
                        piccolo: true,
                        titolo: 'Elimina il turno',
                        onClick: () => azioni.elimina(riga)
                    })
                    : null
            ].filter(Boolean)))),
        puoModificare
            ? bottone({
                simbolo: 'add',
                variante: 'ghost',
                piccolo: true,
                titolo: `Aggiungi turno di ${giorno.nome.toLowerCase()}`,
                onClick: () => azioni.aggiungi(giorno.numero)
            })
            : el('span', {})
    ];
}

export function pannelloTurni({ collaboratore, collaboratori, puoModificare }) {
    assicuraFoglio('turni');
    const contenitore = el('div', {}, scheletro(3));

    const disegna = async () => {
        const dati = oggetto(await call('turni.listByStaff', { staff_id: collaboratore.id }), null);
        if (!dati) {
            rimpiazza(contenitore, avviso({
                tono: 'warning',
                simbolo: 'lock',
                titolo: 'Turni non consultabili',
                voci: ['Serve il permesso turni_view per vedere gli orari dei collaboratori.']
            }));
            return;
        }

        const perGiorno = dati.settimana.map(giorno => ({
            ...giorno,
            righe: dati.righe.filter(riga => !riga.data_specifica && Number(riga.giorno_settimana) === giorno.numero)
        }));
        const straordinari = dati.righe.filter(riga => riga.data_specifica);

        const azioni = {
            aggiungi: async giorno => {
                await apriForm({
                    titolo: `Nuovo turno · ${collaboratore.nominativo}`,
                    sezioni: SEZIONI_TURNO(dati.giorni),
                    valori: { giorno_settimana: giorno, ora_inizio: '09:00', ora_fine: '13:00', valido_dal: '', valido_al: '', note: '' },
                    etichettaSalva: 'Salva turno',
                    onSalva: stato => call('turni.salva', {
                        ...stato,
                        giorno_settimana: Number(stato.giorno_settimana),
                        staff_id: collaboratore.id
                    })
                });
                await disegna();
            },
            modifica: async riga => {
                await apriForm({
                    titolo: 'Modifica turno',
                    sezioni: SEZIONI_TURNO(dati.giorni),
                    valori: { ...riga, giorno_settimana: Number(riga.giorno_settimana) },
                    etichettaSalva: 'Aggiorna',
                    onSalva: stato => call('turni.salva', {
                        ...stato,
                        giorno_settimana: Number(stato.giorno_settimana),
                        staff_id: collaboratore.id,
                        id: riga.id
                    })
                });
                await disegna();
            },
            elimina: async riga => {
                const procedi = await conferma({
                    titolo: 'Eliminare il turno?',
                    messaggio: 'Il collaboratore risulterà non disponibile in quella fascia oraria.',
                    etichettaConferma: 'Elimina',
                    distruttiva: true
                });
                if (!procedi) return;
                if (!esito(await call('turni.rimuovi', { id: riga.id }), 'Turno eliminato')) return;
                await disegna();
            },
            straordinario: async () => {
                await apriForm({
                    titolo: `Turno straordinario · ${collaboratore.nominativo}`,
                    sezioni: SEZIONI_STRAORDINARIO,
                    valori: { data_specifica: fmt.oggiIso(), ora_inizio: '09:00', ora_fine: '13:00', note: '' },
                    etichettaSalva: 'Aggiungi apertura',
                    onSalva: stato => call('turni.salva', { ...stato, staff_id: collaboratore.id })
                });
                await disegna();
            },
            copia: async () => {
                const altri = collaboratori.filter(voce => voce.id !== collaboratore.id);
                if (altri.length === 0) return;
                await apriForm({
                    titolo: 'Copia i turni da un altro collaboratore',
                    sezioni: [{
                        titolo: null,
                        campi: [{
                            campo: 'origine_id',
                            etichetta: 'Copia i turni settimanali di',
                            genere: 'selezione',
                            vuoto: false,
                            ampio: true,
                            opzioni: altri.map(voce => ({ valore: voce.id, etichetta: voce.nominativo }))
                        }]
                    }],
                    valori: { origine_id: altri[0].id },
                    etichettaSalva: 'Copia turni',
                    onSalva: stato => call('turni.copiaSettimana', { ...stato, staff_id: collaboratore.id })
                });
                await disegna();
            }
        };

        rimpiazza(contenitore, [
            pannello({
                titolo: 'Orario settimanale',
                azioni: [
                    distintivo(dati.descrizione, dati.righe.length > 0 ? 'info' : 'neutral'),
                    spaziatore(),
                    puoModificare && collaboratori.length > 1
                        ? bottone({ etichetta: 'Copia da…', simbolo: 'content_copy', variante: 'ghost', onClick: azioni.copia })
                        : null,
                    puoModificare
                        ? bottone({ etichetta: 'Apertura straordinaria', simbolo: 'more_time', variante: 'ghost', onClick: azioni.straordinario })
                        : null
                ].filter(Boolean)
            }, [
                dati.righe.length === 0
                    ? avviso({
                        tono: 'warning',
                        simbolo: 'schedule',
                        titolo: 'Nessun orario dichiarato',
                        voci: [
                            'Finché non dichiari i giorni e gli orari, l\'agenda non può segnalare quando il collaboratore è disponibile.',
                            'Senza orari nessun appuntamento viene bloccato: il controllo entra in funzione appena aggiungi il primo turno.'
                        ]
                    })
                    : null,
                el('div', { class: 'ds-settimana' },
                    perGiorno.flatMap(giorno => rigaGiorno(giorno, azioni, puoModificare)))
            ].filter(Boolean)),
            straordinari.length > 0
                ? pannello({ titolo: 'Aperture straordinarie' }, el('div', { class: 'ds-slot-liberi' },
                    straordinari.map(riga => el('button', {
                        class: 'ds-slot-liberi__voce',
                        type: 'button',
                        title: riga.note || '',
                        onClick: puoModificare ? () => azioni.modifica(riga) : null
                    }, [icona('more_time'), ` ${fmt.data(riga.data_specifica)} ${riga.ora_inizio}–${riga.ora_fine}`]))))
                : null
        ].filter(Boolean));
    };

    disegna();
    return contenitore;
}

export function rendiTurni({ collaboratore, collaboratori, permessi }) {
    if (!collaboratore) {
        return avviso({
            tono: 'info',
            simbolo: 'badge',
            titolo: 'Nessun collaboratore selezionato',
            voci: ['Registra un collaboratore per poterne definire orari, ferie e permessi.']
        });
    }

    return el('div', {}, [
        pannelloTurni({ collaboratore, collaboratori, puoModificare: permessi.turni }),
        permessi.assenze ? pannelloAssenze({ collaboratore, puoGestire: permessi.assenzeGestione }) : null
    ].filter(Boolean));
}
