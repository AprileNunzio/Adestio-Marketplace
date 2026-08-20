import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, distintivo, vuoto, avviso, spaziatore } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { conferma } from '../../components/modale.js';
import { esito } from '../../components/notifica.js';
import { opzioniDa } from '../../components/campi.js';
import { call } from '../../kernel/transport.js';
import { can } from '../../security/permissions.js';
import * as fmt from '../../kernel/format.js';
import { elenco } from '../shared/vista.js';
import { apriForm } from '../shared/form_modale.js';

const AMBITI = [
    { valore: 'prestazione', etichetta: 'Una prestazione specifica' },
    { valore: 'categoria', etichetta: 'Una categoria di prestazioni' },
    { valore: 'branca', etichetta: 'Una branca clinica' },
    { valore: 'tutte', etichetta: 'Tutte le prestazioni' }
];

const RUOLI = [
    { valore: 'medico', etichetta: 'Come esecutore' },
    { valore: 'assistente', etichetta: 'Come assistente' }
];

const TIPI = [
    { valore: 'percentuale', etichetta: 'Percentuale sull\'importo' },
    { valore: 'fisso', etichetta: 'Importo fisso per intervento' }
];

const TONI_AMBITO = { prestazione: 'success', categoria: 'info', branca: 'warning', tutte: 'neutral' };

function campi(prestazioni) {
    const categorie = [...new Set(prestazioni.map(voce => voce.categoria).filter(Boolean))];
    const branche = [...new Set(prestazioni.map(voce => voce.branca).filter(Boolean))];
    return [
        { campo: 'ruolo', etichetta: 'Si applica quando lavora *', genere: 'selezione', opzioni: RUOLI, vuoto: false },
        { campo: 'ambito', etichetta: 'Ambito *', genere: 'selezione', opzioni: AMBITI, vuoto: false },
        {
            campo: 'riferimento',
            etichetta: 'A cosa si applica',
            aiuto: 'Prestazione, categoria o branca. Lasciare vuoto solo per "Tutte le prestazioni"',
            ampio: true,
            genere: 'selezione',
            opzioni: [
                ...opzioniDa(prestazioni, 'id', voce => `Prestazione: ${voce.nome}`),
                ...categorie.map(voce => ({ valore: voce, etichetta: `Categoria: ${voce}` })),
                ...branche.map(voce => ({ valore: voce, etichetta: `Branca: ${voce}` }))
            ]
        },
        { campo: 'etichetta', etichetta: 'Nome dell\'accordo', ampio: true },
        { campo: 'tipo', etichetta: 'Tipo di compenso *', genere: 'selezione', opzioni: TIPI, vuoto: false },
        { campo: 'valore', etichetta: 'Valore *', genere: 'numero' },
        { campo: 'valido_dal', etichetta: 'Valido dal', tipo: 'date' },
        { campo: 'valido_al', etichetta: 'Valido fino al', tipo: 'date' },
        { campo: 'attivo', etichetta: 'Accordo attivo', genere: 'booleano' },
        { campo: 'note', etichetta: 'Note', genere: 'area', ampio: true }
    ];
}

export async function rendiAccordi({ collaboratore }) {
    const puoGestire = await can('accordi_manage');
    const contenitore = el('div', { class: 'ds-root' });

    if (!collaboratore) {
        return vuoto({
            titolo: 'Nessun collaboratore selezionato',
            testo: 'Scegli un collaboratore per definirne gli accordi economici.',
            simbolo: 'handshake'
        });
    }

    const disegna = async () => {
        const [righe, prestazioni] = await Promise.all([
            call('accordi.listByStaff', { staff_id: collaboratore.id }).then(elenco),
            call('prestazioni.list', {}).then(elenco)
        ]);

        const apri = async riga => {
            await apriForm({
                titolo: riga ? 'Modifica accordo' : `Nuovo accordo per ${collaboratore.nominativo}`,
                sezioni: [{ titolo: null, campi: campi(prestazioni) }],
                valori: riga || {
                    ruolo: 'medico', ambito: 'tutte', tipo: 'percentuale',
                    valore: 0, attivo: 1, riferimento: '', etichetta: ''
                },
                ampia: true,
                etichettaSalva: riga ? 'Aggiorna accordo' : 'Crea accordo',
                onSalva: stato => call('accordi.salva', {
                    ...stato,
                    id: riga ? riga.id : undefined,
                    staff_id: collaboratore.id
                })
            });
            await disegna();
        };

        const rimuovi = async riga => {
            const procedi = await conferma({
                titolo: 'Rimuovere l\'accordo?',
                messaggio: `"${riga.etichetta || riga.bersaglio}" non verrà più applicato ai nuovi trattamenti. Quelli già registrati mantengono la quota calcolata allora.`,
                etichettaConferma: 'Rimuovi',
                distruttiva: true
            });
            if (!procedi) return;
            if (esito(await call('accordi.rimuovi', { id: riga.id }), 'Accordo rimosso')) await disegna();
        };

        rimpiazza(contenitore, [
            avviso({
                tono: 'info',
                simbolo: 'account_tree',
                titolo: 'Come viene scelto il compenso',
                voci: [
                    'Vince sempre l\'accordo più specifico: prestazione, poi categoria, poi branca, poi "tutte".',
                    `Senza accordi si usa la percentuale di default del collaboratore (${fmt.percentuale(collaboratore.percentuale_default)}), e in mancanza di quella la ripartizione del listino.`,
                    `Il compenso fisso mensile (${fmt.euro(collaboratore.compenso_mensile)}) matura a parte, in proporzione ai giorni del periodo.`
                ]
            }),
            pannello({
                titolo: `Accordi economici di ${collaboratore.nominativo}`,
                azioni: [
                    spaziatore(),
                    puoGestire ? bottone({ etichetta: 'Nuovo accordo', simbolo: 'add', onClick: () => apri(null) }) : null
                ].filter(Boolean),
                flush: true
            }, tabella({
                colonne: [
                    { titolo: 'Accordo', campo: 'etichetta' },
                    {
                        titolo: 'Ambito',
                        rendi: riga => distintivo(riga.bersaglio, TONI_AMBITO[riga.ambito] || 'neutral')
                    },
                    { titolo: 'Ruolo', rendi: riga => (riga.ruolo === 'medico' ? 'Esecutore' : 'Assistente') },
                    {
                        titolo: 'Compenso',
                        numerica: true,
                        rendi: riga => (riga.tipo === 'percentuale'
                            ? fmt.percentuale(riga.valore)
                            : fmt.euro(riga.valore))
                    },
                    {
                        titolo: 'Validità',
                        rendi: riga => [riga.valido_dal ? `dal ${fmt.data(riga.valido_dal)}` : null,
                            riga.valido_al ? `al ${fmt.data(riga.valido_al)}` : null]
                            .filter(Boolean).join(' ') || 'sempre'
                    },
                    {
                        titolo: 'Stato',
                        rendi: riga => (Number(riga.attivo) === 1
                            ? distintivo('Attivo', 'success')
                            : distintivo('Sospeso', 'neutral'))
                    },
                    {
                        titolo: '',
                        rendi: riga => azioniRiga([
                            puoGestire ? bottone({
                                simbolo: 'edit', variante: 'ghost', piccolo: true,
                                titolo: 'Modifica', onClick: () => apri(riga)
                            }) : null,
                            puoGestire ? bottone({
                                simbolo: 'delete', variante: 'ghost', piccolo: true,
                                titolo: 'Rimuovi', onClick: () => rimuovi(riga)
                            }) : null
                        ])
                    }
                ],
                righe,
                vuotoTitolo: 'Nessun accordo specifico',
                vuotoTesto: 'Senza accordi il collaboratore prende la percentuale di default, o la ripartizione prevista dal listino.',
                vuotoSimbolo: 'handshake'
            }))
        ]);
    };

    await disegna();
    return contenitore;
}
