import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, distintivo, statistica, griglia, scheletro } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { conferma } from '../../components/modale.js';
import { esito } from '../../components/notifica.js';
import { opzioniDa } from '../../components/campi.js';
import { call } from '../../kernel/transport.js';
import { can } from '../../security/permissions.js';
import * as fmt from '../../kernel/format.js';
import { elenco } from '../shared/vista.js';
import { apriForm } from '../shared/form_modale.js';

const TONI_STATO = {
    pianificato: 'info',
    in_corso: 'warning',
    eseguito: 'success',
    annullato: 'neutral'
};

const STATI = [
    { valore: 'pianificato', etichetta: 'Pianificato' },
    { valore: 'in_corso', etichetta: 'In corso' },
    { valore: 'eseguito', etichetta: 'Eseguito' },
    { valore: 'annullato', etichetta: 'Annullato' }
];

function sezioniForm(prestazioni, medici) {
    return [{
        titolo: null,
        campi: [
            {
                campo: 'prestazione_id',
                etichetta: 'Prestazione a listino',
                genere: 'selezione',
                opzioni: opzioniDa(prestazioni, 'id', voce => `${voce.nome} · ${fmt.euro(voce.prezzo_paziente)}`),
                ampio: true
            },
            { campo: 'descrizione', etichetta: 'Descrizione', ampio: true },
            { campo: 'dente', etichetta: 'Elemento dentale', max: 2 },
            { campo: 'superfici', etichetta: 'Superfici' },
            {
                campo: 'medico_id',
                etichetta: 'Medico esecutore',
                genere: 'selezione',
                opzioni: opzioniDa(medici, 'id', voce => voce.nominativo)
            },
            {
                campo: 'segretaria_id',
                etichetta: 'Assistente / segreteria',
                genere: 'selezione',
                opzioni: opzioniDa(medici, 'id', voce => voce.nominativo)
            },
            { campo: 'data_trattamento', etichetta: 'Data', tipo: 'date' },
            { campo: 'stato', etichetta: 'Stato', genere: 'selezione', opzioni: STATI, vuoto: false },
            { campo: 'importo', etichetta: 'Importo (€)', genere: 'numero', aiuto: 'Vuoto = prezzo di listino' },
            { campo: 'costo_materiali', etichetta: 'Costo materiali (€)', genere: 'numero' },
            { campo: 'note', etichetta: 'Note cliniche', genere: 'area', ampio: true }
        ]
    }];
}

export default {
    rendi: async ({ paziente }) => {
        const puoModificare = await can('cartella_edit');
        const contenitore = el('div', { class: 'ds-root' }, scheletro(3));

        const disegna = async () => {
            const [righe, prestazioni, medici] = await Promise.all([
                call('trattamenti.listByPaziente', { paziente_id: paziente.id }).then(elenco),
                call('prestazioni.list', {}).then(elenco),
                call('staff.list', {}).then(elenco)
            ]);

            const eseguiti = righe.filter(riga => riga.stato === 'eseguito');
            const totale = eseguiti.reduce((somma, riga) => somma + Number(riga.importo || 0), 0);
            const pianificato = righe
                .filter(riga => riga.stato === 'pianificato' || riga.stato === 'in_corso')
                .reduce((somma, riga) => somma + Number(riga.importo || 0), 0);

            const nomiMedici = new Map(medici.map(medico => [medico.id, medico.nominativo]));

            const apri = async riga => {
                await apriForm({
                    titolo: riga ? 'Modifica trattamento' : 'Nuovo trattamento',
                    sezioni: sezioniForm(prestazioni, medici),
                    valori: riga || {
                        stato: 'pianificato',
                        data_trattamento: fmt.oggiIso(),
                        prestazione_id: '',
                        medico_id: '',
                        segretaria_id: ''
                    },
                    ampia: true,
                    etichettaSalva: riga ? 'Aggiorna' : 'Registra',
                    onSalva: stato => call(riga ? 'trattamenti.update' : 'trattamenti.add', {
                        ...stato,
                        id: riga ? riga.id : undefined,
                        paziente_id: paziente.id
                    })
                });
                await disegna();
            };

            const elimina = async riga => {
                const procedi = await conferma({
                    titolo: 'Eliminare il trattamento?',
                    messaggio: `"${riga.descrizione}" verrà rimosso dal diario clinico.`,
                    etichettaConferma: 'Elimina',
                    distruttiva: true
                });
                if (!procedi) return;
                if (esito(await call('trattamenti.remove', { id: riga.id }), 'Trattamento eliminato')) await disegna();
            };

            rimpiazza(contenitore, [
                griglia('stats', [
                    statistica({ etichetta: 'Trattamenti eseguiti', valore: String(eseguiti.length) }),
                    statistica({ etichetta: 'Valore eseguito', valore: fmt.euro(totale), tono: 'positivo' }),
                    statistica({ etichetta: 'In programma', valore: fmt.euro(pianificato) }),
                    statistica({ etichetta: 'Voci in cartella', valore: String(righe.length) })
                ]),
                pannello({
                    titolo: 'Diario clinico',
                    azioni: puoModificare
                        ? [bottone({ etichetta: 'Nuovo trattamento', simbolo: 'add', onClick: () => apri(null) })]
                        : [],
                    flush: true
                }, tabella({
                    colonne: [
                        { titolo: 'Data', rendi: riga => fmt.data(riga.data_trattamento) },
                        { titolo: 'Prestazione', campo: 'descrizione' },
                        { titolo: 'Elemento', campo: 'dente' },
                        { titolo: 'Medico', rendi: riga => nomiMedici.get(riga.medico_id) || '—' },
                        {
                            titolo: 'Stato',
                            rendi: riga => distintivo(fmt.etichettaStato(riga.stato), TONI_STATO[riga.stato] || 'neutral')
                        },
                        { titolo: 'Importo', numerica: true, rendi: riga => fmt.euro(riga.importo) },
                        { titolo: 'Quota medico', numerica: true, rendi: riga => fmt.euro(riga.quota_medico) },
                        { titolo: 'Margine', numerica: true, rendi: riga => fmt.euro(riga.margine_studio) },
                        {
                            titolo: '',
                            rendi: riga => azioniRiga([
                                riga.liquidazione_id ? distintivo('Liquidato', 'neutral') : null,
                                puoModificare && !riga.liquidazione_id ? bottone({
                                    simbolo: 'edit', variante: 'ghost', piccolo: true,
                                    titolo: 'Modifica', onClick: () => apri(riga)
                                }) : null,
                                puoModificare && !riga.liquidazione_id ? bottone({
                                    simbolo: 'delete', variante: 'ghost', piccolo: true,
                                    titolo: 'Elimina', onClick: () => elimina(riga)
                                }) : null
                            ])
                        }
                    ],
                    righe,
                    vuotoTitolo: 'Diario clinico vuoto',
                    vuotoTesto: 'Registra il primo trattamento per costruire la storia clinica del paziente.',
                    vuotoSimbolo: 'medical_services'
                }))
            ]);
        };

        await disegna();
        return contenitore;
    }
};
