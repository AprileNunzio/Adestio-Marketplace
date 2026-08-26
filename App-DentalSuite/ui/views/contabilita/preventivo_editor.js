import { el, rimpiazza } from '../../components/dom.js';
import { bottone, spaziatore } from '../../components/layout.js';
import { apriModale } from '../../components/modale.js';
import { costruisciCampi, opzioniDa } from '../../components/campi.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import * as fmt from '../../kernel/format.js';
import { elenco, oggetto } from '../shared/vista.js';

function totaleRiga(riga) {
    const lordo = Number(riga.prezzo_unitario || 0) * Number(riga.quantita || 1);
    return Math.round((lordo - (lordo * Number(riga.sconto_percentuale || 0)) / 100) * 100) / 100;
}

function totali(righe, scontoTestata) {
    const lordo = righe.reduce((somma, riga) => somma + totaleRiga(riga), 0);
    const netto = lordo - (lordo * Number(scontoTestata || 0)) / 100;
    return { lordo: Math.round(lordo * 100) / 100, netto: Math.round(netto * 100) / 100 };
}

function rigaEditor(riga, prestazioni, onCambio, onRimuovi) {
    const aggiorna = (campo, valore) => {
        riga[campo] = valore;
        if (campo === 'prestazione_id') {
            const scelta = prestazioni.find(voce => voce.id === valore);
            if (scelta) {
                riga.descrizione = scelta.nome;
                riga.prezzo_unitario = scelta.prezzo_paziente;
            }
        }
        onCambio();
    };

    const campi = [
        {
            campo: 'prestazione_id',
            etichetta: 'Prestazione',
            genere: 'selezione',
            opzioni: opzioniDa(prestazioni, 'id', voce => voce.nome),
            segnaposto: 'Voce libera'
        },
        { campo: 'descrizione', etichetta: 'Descrizione' },
        { campo: 'dente', etichetta: 'Elemento', max: 2 },
        { campo: 'quantita', etichetta: 'Quantità', genere: 'numero', passo: '1', minimo: 1 },
        { campo: 'prezzo_unitario', etichetta: 'Prezzo unitario (€)', genere: 'numero' },
        { campo: 'sconto_percentuale', etichetta: 'Sconto riga (%)', genere: 'numero' }
    ];

    return el('div', { class: 'ds-panel' }, el('div', { class: 'ds-panel__body' }, [
        el('div', { class: 'ds-grid ds-grid--form' }, costruisciCampi(campi, riga, aggiorna)),
        el('div', { class: 'ds-toolbar' }, [
            el('strong', { class: 'ds-numeric' }, fmt.euro(totaleRiga(riga))),
            spaziatore(),
            bottone({ simbolo: 'delete', variante: 'ghost', piccolo: true, titolo: 'Rimuovi riga', onClick: onRimuovi })
        ])
    ]));
}

export async function apriPreventivo({ pazienteId, preventivoId }) {
    const [prestazioni, medici, esistente] = await Promise.all([
        call('prestazioni.list', {}).then(elenco),
        call('staff.list', {}).then(elenco),
        preventivoId ? call('preventivi.get', { id: preventivoId }).then(r => oggetto(r, null)) : Promise.resolve(null)
    ]);

    const testata = {
        medico_id: esistente ? esistente.medico_id : '',
        data_emissione: esistente ? esistente.data_emissione : fmt.oggiIso(),
        data_scadenza: esistente ? esistente.data_scadenza : '',
        sconto_percentuale: esistente ? esistente.sconto_percentuale : 0,
        acconto_richiesto: esistente ? esistente.acconto_richiesto : 0,
        note: esistente ? esistente.note : ''
    };

    const righe = esistente && esistente.righe.length > 0
        ? esistente.righe.map(riga => ({ ...riga }))
        : [{ prestazione_id: '', descrizione: '', dente: '', quantita: 1, prezzo_unitario: 0, sconto_percentuale: 0 }];

    const contenitoreRighe = el('div', { class: 'ds-root' });
    const riepilogo = el('div', { class: 'ds-toolbar' });

    const ridisegna = () => {
        const somme = totali(righe, testata.sconto_percentuale);
        rimpiazza(riepilogo, [
            el('span', { class: 'ds-muted' }, `Totale lordo ${fmt.euro(somme.lordo)}`),
            spaziatore(),
            el('strong', { class: 'ds-numeric' }, `Totale netto ${fmt.euro(somme.netto)}`)
        ]);
        rimpiazza(contenitoreRighe, righe.map((riga, indice) => rigaEditor(
            riga,
            prestazioni,
            ridisegna,
            () => {
                righe.splice(indice, 1);
                if (righe.length === 0) {
                    righe.push({ prestazione_id: '', descrizione: '', dente: '', quantita: 1, prezzo_unitario: 0, sconto_percentuale: 0 });
                }
                ridisegna();
            }
        )));
    };

    const campiTestata = [
        {
            campo: 'medico_id',
            etichetta: 'Medico responsabile',
            genere: 'selezione',
            opzioni: opzioniDa(medici, 'id', voce => voce.nominativo)
        },
        { campo: 'data_emissione', etichetta: 'Data emissione', tipo: 'date' },
        { campo: 'data_scadenza', etichetta: 'Valido fino al', tipo: 'date' },
        { campo: 'sconto_percentuale', etichetta: 'Sconto di testata (%)', genere: 'numero' },
        { campo: 'acconto_richiesto', etichetta: 'Acconto richiesto (€)', genere: 'numero' },
        { campo: 'note', etichetta: 'Note e condizioni', genere: 'area', ampio: true }
    ];

    ridisegna();

    const corpo = [
        el('div', { class: 'ds-grid ds-grid--form' }, costruisciCampi(campiTestata, testata, (campo, valore) => {
            testata[campo] = valore;
            if (campo === 'sconto_percentuale') ridisegna();
        })),
        el('div', { class: 'ds-panel__head' }, [
            el('span', {}, 'Voci del piano di cura'),
            spaziatore(),
            bottone({
                etichetta: 'Aggiungi voce',
                simbolo: 'add',
                variante: 'ghost',
                piccolo: true,
                onClick: () => {
                    righe.push({ prestazione_id: '', descrizione: '', dente: '', quantita: 1, prezzo_unitario: 0, sconto_percentuale: 0 });
                    ridisegna();
                }
            })
        ]),
        contenitoreRighe,
        riepilogo
    ];

    return apriModale({
        titolo: esistente ? `Preventivo ${esistente.numero_preventivo}` : 'Nuovo preventivo',
        corpo,
        ampia: true,
        azioni: [
            { etichetta: 'Chiudi', variante: 'ghost', esito: null },
            {
                etichetta: esistente ? 'Aggiorna preventivo' : 'Emetti preventivo',
                simbolo: 'save',
                onAzione: async () => {
                    const payload = {
                        ...testata,
                        paziente_id: pazienteId,
                        righe: righe.filter(riga => riga.descrizione || riga.prestazione_id)
                    };
                    const risultato = esistente
                        ? await call('preventivi.update', { ...payload, id: esistente.id })
                        : await call('preventivi.create', payload);
                    if (!esito(risultato, esistente ? 'Preventivo aggiornato' : 'Preventivo emesso')) return false;
                    return true;
                }
            }
        ]
    });
}
