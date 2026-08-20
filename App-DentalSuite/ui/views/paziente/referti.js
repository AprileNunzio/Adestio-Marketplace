import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, distintivo, scheletro } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { conferma } from '../../components/modale.js';
import { esito, errore } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import { can } from '../../security/permissions.js';
import * as fmt from '../../kernel/format.js';
import { elenco } from '../shared/vista.js';
import { apriForm } from '../shared/form_modale.js';

const TIPI = [
    { valore: 'opt', etichetta: 'Ortopantomografia (OPT)' },
    { valore: 'cbct', etichetta: 'CBCT / Cone Beam' },
    { valore: 'tac', etichetta: 'TAC' },
    { valore: 'rmn', etichetta: 'Risonanza magnetica' },
    { valore: 'rx_endorale', etichetta: 'Rx endorale' },
    { valore: 'teleradiografia', etichetta: 'Teleradiografia' },
    { valore: 'foto', etichetta: 'Documentazione fotografica' },
    { valore: 'referto', etichetta: 'Referto specialistico' },
    { valore: 'consenso', etichetta: 'Consenso informato' },
    { valore: 'altro', etichetta: 'Altro documento' }
];

function dimensione(byte) {
    const numero = Number(byte || 0);
    if (numero < 1024) return `${numero} B`;
    if (numero < 1024 * 1024) return `${(numero / 1024).toFixed(0)} KB`;
    return `${(numero / (1024 * 1024)).toFixed(1)} MB`;
}

export default {
    rendi: async ({ paziente }) => {
        const puoCaricare = await can('allegati_upload');
        const puoEliminare = await can('allegati_delete');
        const contenitore = el('div', { class: 'ds-root' }, scheletro(3));

        const disegna = async () => {
            const righe = elenco(await call('allegati.listByPaziente', { paziente_id: paziente.id }));

            const acquisisci = async () => {
                const dati = await apriForm({
                    titolo: 'Acquisisci referto diagnostico',
                    sezioni: [{
                        titolo: null,
                        campi: [
                            { campo: 'tipo', etichetta: 'Tipo di esame', genere: 'selezione', opzioni: TIPI, vuoto: false, ampio: true },
                            { campo: 'titolo', etichetta: 'Titolo', ampio: true },
                            { campo: 'data_esame', etichetta: 'Data esame', tipo: 'date' },
                            { campo: 'note', etichetta: 'Note', genere: 'area', ampio: true }
                        ]
                    }],
                    valori: { tipo: 'opt', data_esame: fmt.oggiIso() },
                    etichettaSalva: 'Seleziona file…',
                    onSalva: async stato => {
                        const risultato = await call('allegati.upload', { ...stato, paziente_id: paziente.id });
                        if (risultato.success && risultato.data && risultato.data.annullato) {
                            return { success: false, error: 'Selezione del file annullata' };
                        }
                        return risultato;
                    }
                });
                if (dati) await disegna();
            };

            const apriFile = async riga => {
                const risultato = await call('allegati.open', { id: riga.id });
                if (!risultato.success) errore(risultato.error);
            };

            const rimuovi = async riga => {
                const procedi = await conferma({
                    titolo: 'Rimuovere il referto?',
                    messaggio: `"${riga.titolo || riga.file_name}" verrà rimosso dall'archivio diagnostico. Il file su disco viene conservato.`,
                    etichettaConferma: 'Rimuovi',
                    distruttiva: true
                });
                if (!procedi) return;
                if (esito(await call('allegati.remove', { id: riga.id }), 'Referto rimosso')) await disegna();
            };

            rimpiazza(contenitore, pannello({
                titolo: `Archivio diagnostico · ${righe.length} documenti`,
                azioni: puoCaricare
                    ? [bottone({ etichetta: 'Acquisisci referto', simbolo: 'upload_file', onClick: acquisisci })]
                    : [],
                flush: true
            }, tabella({
                colonne: [
                    { titolo: 'Data esame', rendi: riga => fmt.data(riga.data_esame) },
                    {
                        titolo: 'Tipo',
                        rendi: riga => distintivo(
                            (TIPI.find(tipo => tipo.valore === riga.tipo) || { etichetta: riga.tipo }).etichetta,
                            'info'
                        )
                    },
                    { titolo: 'Titolo', campo: 'titolo' },
                    { titolo: 'File', campo: 'file_name' },
                    { titolo: 'Dimensione', numerica: true, rendi: riga => dimensione(riga.file_size) },
                    {
                        titolo: '',
                        rendi: riga => azioniRiga([
                            bottone({
                                simbolo: 'open_in_new', variante: 'ghost', piccolo: true,
                                titolo: 'Apri referto', onClick: () => apriFile(riga)
                            }),
                            puoEliminare ? bottone({
                                simbolo: 'delete', variante: 'ghost', piccolo: true,
                                titolo: 'Rimuovi dall\'archivio', onClick: () => rimuovi(riga)
                            }) : null
                        ])
                    }
                ],
                righe,
                vuotoTitolo: 'Archivio diagnostico vuoto',
                vuotoTesto: 'Acquisisci OPT, CBCT, Rx endorali, referti e consensi informati del paziente.',
                vuotoSimbolo: 'imagesmode'
            })));
        };

        await disegna();
        return contenitore;
    }
};
