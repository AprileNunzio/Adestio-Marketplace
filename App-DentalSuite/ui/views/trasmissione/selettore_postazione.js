import { el, icona, rimpiazza } from '../../components/dom.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import { oggetto } from '../shared/vista.js';

function etichettaPosizione(voce) {
    const parti = [voce.sede, voce.sala].filter(Boolean);
    return parti.length > 0 ? parti.join(' · ') : 'Senza sala assegnata';
}

function simboloDi(voce) {
    const nome = String(voce.nome || '').toLowerCase();
    if (nome.includes('chirurg')) return 'medical_services';
    if (nome.includes('igien')) return 'dentistry';
    if (nome.includes('orto')) return 'straighten';
    return 'chair';
}

export function selettorePostazioneModalita({ postazioneAttuale, onSelezionato, onAnnulla }) {
    const contenitore = el('div', { class: 'ds-selettore-postazione' });
    let nomeScelto = postazioneAttuale ? postazioneAttuale.nome : '';

    const salvaConfigurazione = async (nome) => {
        try {
            const nomeFinale = String(nome || '').trim();
            if (!nomeFinale) {
                esito({ success: false, error: 'Seleziona la poltrona di questa postazione' }, '');
                return;
            }
            const risposta = await call('postazioni.configura', {
                ruolo: 'riunito',
                nome: nomeFinale
            });
            if (!esito(risposta, `Postazione impostata su "${nomeFinale}"`)) return;
            if (typeof onSelezionato === 'function') {
                onSelezionato(nomeFinale);
            }
        } catch (e) {
            esito({ success: false, error: e.message || 'Impossibile configurare postazione' }, '');
        }
    };

    const testa = () => el('div', { class: 'ds-selettore-postazione__testa' }, [
        el('div', { class: 'ds-selettore-postazione__icona' }, icona('monitor')),
        el('h2', { class: 'ds-selettore-postazione__titolo' }, 'Seleziona la tua postazione'),
        el('p', { class: 'ds-selettore-postazione__sottotitolo' },
            'Indica quale poltrona dello studio rappresenta questo monitor per ricevere le schede dei pazienti.'
        )
    ]);

    const pulsanteIndietro = () => onAnnulla
        ? el('button', {
            class: 'ds-btn ds-btn--ghost ds-btn--tocco',
            type: 'button',
            onClick: onAnnulla
        }, [icona('arrow_back'), el('span', {}, 'Indietro')])
        : null;

    const disegnaVuoto = (messaggio, suggerimento) => {
        rimpiazza(contenitore, [
            el('div', { class: 'ds-selettore-postazione__foglio' }, [
                testa(),
                el('div', { class: 'ds-selettore-postazione__avviso' }, [
                    el('div', { class: 'ds-selettore-postazione__avviso-titolo' }, messaggio),
                    el('div', { class: 'ds-selettore-postazione__avviso-testo' }, suggerimento)
                ]),
                el('div', { class: 'ds-selettore-postazione__azioni' }, [pulsanteIndietro()].filter(Boolean))
            ])
        ]);
    };

    const disegnaElenco = (unita) => {
        const pulsanti = unita.map(voce => el('button', {
            class: `ds-selettore-postazione__preset ${nomeScelto === voce.nome ? 'ds-selettore-postazione__preset--attivo' : ''}`,
            type: 'button',
            onClick: () => {
                nomeScelto = voce.nome;
                salvaConfigurazione(voce.nome);
            }
        }, [
            el('span', { class: 'ds-selettore-postazione__preset-icona' }, icona(simboloDi(voce))),
            el('span', { class: 'ds-selettore-postazione__preset-titolo' }, voce.nome),
            el('span', { class: 'ds-selettore-postazione__preset-luogo' }, etichettaPosizione(voce))
        ]));

        rimpiazza(contenitore, [
            el('div', { class: 'ds-selettore-postazione__foglio' }, [
                testa(),
                el('div', { class: 'ds-selettore-postazione__griglia' }, pulsanti),
                el('div', { class: 'ds-selettore-postazione__azioni' }, [pulsanteIndietro()].filter(Boolean))
            ])
        ]);
    };

    const carica = async () => {
        try {
            const risposta = await call('postazioni.poltrone', {});
            const dati = oggetto(risposta, null);
            if (!dati) {
                disegnaVuoto(
                    'Impossibile leggere le poltrone dello studio',
                    (risposta && risposta.error) || 'Riprova fra qualche istante.'
                );
                return;
            }
            const unita = dati.poltrone || [];
            if (unita.length === 0) {
                disegnaVuoto(
                    'Nessuna poltrona configurata nello studio',
                    dati.sedi_configurate > 0
                        ? 'Apri "Sedi, Sale & Poltrone" e aggiungi le poltrone: compariranno qui automaticamente.'
                        : 'Apri "Sedi, Sale & Poltrone", crea la sede dello studio e poi le sue poltrone: compariranno qui automaticamente.'
                );
                return;
            }
            disegnaElenco(unita);
        } catch (e) {
            disegnaVuoto('Errore nel caricamento delle poltrone', e.message || 'Errore imprevisto');
        }
    };

    rimpiazza(contenitore, [
        el('div', { class: 'ds-selettore-postazione__foglio' }, [
            testa(),
            el('div', { class: 'ds-selettore-postazione__caricamento' }, 'Lettura delle poltrone dello studio...')
        ])
    ]);
    carica();

    return contenitore;
}
