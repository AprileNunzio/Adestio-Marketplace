import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, distintivo, spaziatore, vuoto, avviso } from '../../components/layout.js';
import { tabella, azioniRiga } from '../../components/tabella.js';
import { conferma } from '../../components/modale.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import * as fmt from '../../kernel/format.js';
import { elenco } from '../shared/vista.js';

function contoAllaRovescia(scadeIl, alTermine) {
    const nodo = el('div', { class: 'ds-codice__scadenza' }, '');
    const aggiorna = () => {
        const restano = Math.max(Math.round((Number(scadeIl) - Date.now()) / 1000), 0);
        nodo.textContent = restano > 0
            ? `Valido ancora ${restano} secondi`
            : 'Codice scaduto: generane uno nuovo';
        if (restano <= 0) {
            clearInterval(cadenza);
            alTermine();
        }
    };
    aggiorna();
    const cadenza = setInterval(aggiorna, 1000);
    return nodo;
}

function codiceLeggibile(codice) {
    return String(codice).replace(/(\d{4})(\d{4})/, '$1 $2');
}

export function pannelloAccoppiamento({ ruolo, puoGestire, onAggiornato }) {
    const contenitore = el('div', {});

    const disegnaCodice = risultato => {
        rimpiazza(contenitore, [
            el('div', { class: 'ds-codice' }, codiceLeggibile(risultato.codice)),
            contoAllaRovescia(risultato.scade_il, () => rimpiazza(contenitore, azioneGenera())),
            avviso({
                tono: 'info',
                simbolo: 'record_voice_over',
                titolo: 'Scrivi questo numero sul monitor dello studio',
                voci: [
                    'Sul monitor dello studio: apri DentalSuite, tocca Riunito e scrivi questo numero.',
                    'Il codice vale una sola volta e scade dopo due minuti.'
                ]
            })
        ]);
    };

    const genera = async () => {
        const risposta = await call('postazioni.generaCodice', {});
        const dati = risposta && risposta.success ? risposta.data : null;
        if (!esito(risposta, '')) return;
        disegnaCodice(dati);
    };

    const azioneGenera = () => vuoto({
        titolo: 'Nessun codice in corso',
        testo: 'Mostra un codice e scrivilo sul monitor dello studio: serve una sola volta, poi i due computer si riconoscono da soli.',
        simbolo: 'key',
        azione: puoGestire
            ? bottone({ etichetta: 'Mostra il codice', simbolo: 'vpn_key', onClick: genera })
            : null
    });

    rimpiazza(contenitore, azioneGenera());

    if (ruolo !== 'segreteria') {
        return pannello({ titolo: 'Collegamento' }, avviso({
            tono: 'warning',
            simbolo: 'settings_ethernet',
            titolo: 'Questo computer è un monitor di studio',
            voci: [
                'Il codice lo mostra il computer della reception, dove c\'è l\'archivio.',
                'Da qui vedi solo i computer già collegati.'
            ]
        }));
    }

    return pannello({
        titolo: 'Collegare un monitor',
        azioni: [spaziatore(), puoGestire ? bottone({
            etichetta: 'Mostra un nuovo codice',
            simbolo: 'refresh',
            variante: 'ghost',
            onClick: genera
        }) : null].filter(Boolean)
    }, contenitore);
}

export function pannelloPari({ puoGestire, onAggiornato }) {
    const contenitore = el('div', {});

    const disegna = async () => {
        const righe = elenco(await call('postazioni.elenco', {}));
        rimpiazza(contenitore, tabella({
            colonne: [
                { titolo: 'Computer', campo: 'nome' },
                { titolo: 'Ruolo', rendi: riga => riga.etichetta_ruolo || fmt.etichettaStato(riga.ruolo) },
                { titolo: 'Indirizzo', rendi: riga => `${riga.ultimo_indirizzo || '—'}${riga.ultima_porta ? `:${riga.ultima_porta}` : ''}` },
                { titolo: 'Codice di sicurezza', rendi: riga => el('span', { class: 'ds-mono' }, riga.impronta) },
                { titolo: 'Ultimo contatto', rendi: riga => fmt.dataOra(riga.ultimo_contatto) },
                {
                    titolo: 'Stato',
                    rendi: riga => distintivo(riga.online ? 'In linea' : 'Non raggiungibile', riga.online ? 'success' : 'neutral')
                },
                {
                    titolo: '',
                    rendi: riga => azioniRiga([
                        puoGestire ? bottone({
                            simbolo: 'link_off', variante: 'ghost', piccolo: true, titolo: 'Scollega',
                            onClick: async () => {
                                const procedi = await conferma({
                                    titolo: 'Scollegare questo computer?',
                                    messaggio: `${riga.nome} non potrà più collegarsi finché non lo ricolleghi con un nuovo codice.`,
                                    etichettaConferma: 'Scollega',
                                    distruttiva: true
                                });
                                if (!procedi) return;
                                if (!esito(await call('postazioni.rimuovi', { id: riga.id }), 'Computer scollegato')) return;
                                await disegna();
                                await onAggiornato();
                            }
                        }) : null
                    ])
                }
            ],
            righe,
            vuotoTitolo: 'Nessun computer collegato',
            vuotoTesto: 'I computer collegati compaiono qui.',
            vuotoSimbolo: 'devices'
        }));
    };

    disegna();
    return pannello({ titolo: 'Computer collegati', flush: true }, contenitore);
}
