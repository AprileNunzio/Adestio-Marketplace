import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, distintivo, statistica, griglia, spaziatore } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { conferma } from '../../components/modale.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import { can } from '../../security/permissions.js';
import * as fmt from '../../kernel/format.js';
import { oggetto } from '../shared/vista.js';
import { apriForm } from '../shared/form_modale.js';

const CATEGORIE = [
    { valore: 'materiali_consumo', etichetta: 'Materiali di consumo' },
    { valore: 'laboratorio_odontotecnico', etichetta: 'Laboratorio odontotecnico' },
    { valore: 'attrezzature', etichetta: 'Attrezzature' },
    { valore: 'manutenzioni', etichetta: 'Manutenzioni' },
    { valore: 'affitto', etichetta: 'Affitto' },
    { valore: 'utenze', etichetta: 'Utenze' },
    { valore: 'personale', etichetta: 'Personale' },
    { valore: 'consulenze', etichetta: 'Consulenze' },
    { valore: 'marketing', etichetta: 'Marketing' },
    { valore: 'assicurazioni', etichetta: 'Assicurazioni' },
    { valore: 'formazione', etichetta: 'Formazione' },
    { valore: 'smaltimento_rifiuti', etichetta: 'Smaltimento rifiuti speciali' },
    { valore: 'software', etichetta: 'Software e servizi' },
    { valore: 'altro', etichetta: 'Altro' }
];

const CAMPI = [
    { campo: 'descrizione', etichetta: 'Descrizione *', ampio: true },
    { campo: 'categoria', etichetta: 'Categoria', genere: 'selezione', opzioni: CATEGORIE, vuoto: false },
    { campo: 'importo', etichetta: 'Importo (€) *', genere: 'numero' },
    { campo: 'data_spesa', etichetta: 'Data', tipo: 'date' },
    { campo: 'fornitore', etichetta: 'Fornitore' },
    { campo: 'numero_fattura', etichetta: 'Numero fattura' },
    { campo: 'metodo_pagamento', etichetta: 'Metodo di pagamento' },
    { campo: 'ricorrente', etichetta: 'Spesa ricorrente', genere: 'booleano' },
    { campo: 'note', etichetta: 'Note', genere: 'area', ampio: true }
];

export default {
    rendi: async () => {
        const puoRegistrare = await can('spese_edit');
        const contenitore = el('div', { class: 'ds-root' });
        const filtro = { dal: `${new Date().getFullYear()}-01-01`, al: fmt.oggiIso() };

        const disegna = async () => {
            const dati = oggetto(await call('spese.list', filtro), { righe: [], totale: 0, per_categoria: [] });
            const righe = dati.righe || [];

            const apri = async riga => {
                await apriForm({
                    titolo: riga ? 'Modifica spesa' : 'Registra spesa',
                    sezioni: [{ titolo: null, campi: CAMPI }],
                    valori: riga || {
                        categoria: 'materiali_consumo',
                        data_spesa: fmt.oggiIso(),
                        importo: 0,
                        ricorrente: 0
                    },
                    etichettaSalva: riga ? 'Aggiorna' : 'Registra',
                    onSalva: stato => call('spese.registra', { ...stato, id: riga ? riga.id : undefined })
                });
                await disegna();
            };

            const storna = async riga => {
                const procedi = await conferma({
                    titolo: 'Stornare la spesa?',
                    messaggio: `"${riga.descrizione}" da ${fmt.euro(riga.importo)} verrà rimossa dalla prima nota.`,
                    etichettaConferma: 'Storna',
                    distruttiva: true
                });
                if (!procedi) return;
                if (esito(await call('spese.remove', { id: riga.id }), 'Spesa stornata')) await disegna();
            };

            const campoDal = el('input', {
                class: 'ds-input', type: 'date', value: filtro.dal,
                onChange: evento => { filtro.dal = evento.target.value; disegna(); }
            });
            const campoAl = el('input', {
                class: 'ds-input', type: 'date', value: filtro.al,
                onChange: evento => { filtro.al = evento.target.value; disegna(); }
            });

            const maggiore = dati.per_categoria[0];

            rimpiazza(contenitore, [
                griglia('stats', [
                    statistica({ etichetta: 'Totale spese', valore: fmt.euro(dati.totale), tono: 'negativo' }),
                    statistica({ etichetta: 'Movimenti', valore: String(righe.length) }),
                    maggiore ? statistica({
                        etichetta: 'Voce di costo principale',
                        valore: fmt.euro(maggiore.totale),
                        nota: fmt.etichettaStato(maggiore.etichetta)
                    }) : null,
                    statistica({
                        etichetta: 'Spese ricorrenti',
                        valore: String(righe.filter(riga => Number(riga.ricorrente) === 1).length)
                    })
                ].filter(Boolean)),
                pannello({
                    titolo: 'Prima nota passiva',
                    azioni: [
                        campoDal, campoAl, spaziatore(),
                        puoRegistrare ? bottone({ etichetta: 'Registra spesa', simbolo: 'add', onClick: () => apri(null) }) : null
                    ].filter(Boolean),
                    flush: true
                }, tabella({
                    colonne: [
                        { titolo: 'Data', rendi: riga => fmt.data(riga.data_spesa) },
                        { titolo: 'Descrizione', campo: 'descrizione' },
                        {
                            titolo: 'Categoria',
                            rendi: riga => distintivo(fmt.etichettaStato(riga.categoria), 'warning')
                        },
                        { titolo: 'Fornitore', campo: 'fornitore' },
                        { titolo: 'Fattura', campo: 'numero_fattura' },
                        { titolo: 'Importo', numerica: true, rendi: riga => fmt.euro(riga.importo) },
                        {
                            titolo: '',
                            rendi: riga => azioniRiga([
                                puoRegistrare ? bottone({
                                    simbolo: 'edit', variante: 'ghost', piccolo: true, titolo: 'Modifica',
                                    onClick: () => apri(riga)
                                }) : null,
                                puoRegistrare ? bottone({
                                    simbolo: 'undo', variante: 'ghost', piccolo: true, titolo: 'Storna',
                                    onClick: () => storna(riga)
                                }) : null
                            ])
                        }
                    ],
                    righe,
                    vuotoTitolo: 'Nessuna spesa nel periodo',
                    vuotoTesto: 'Registra i costi dello studio per ottenere una marginalità reale nelle statistiche.',
                    vuotoSimbolo: 'shopping_cart'
                }))
            ]);
        };

        await disegna();
        return contenitore;
    }
};
