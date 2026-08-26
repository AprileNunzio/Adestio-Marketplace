import { el } from '../../components/dom.js';
import { pannello, bottone, distintivo, coppie, spaziatore, statistica, griglia } from '../../components/layout.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import * as fmt from '../../kernel/format.js';

const RUOLI = [
    { valore: 'segreteria', etichetta: 'Segreteria · custodisce l\'archivio' },
    { valore: 'riunito', etichetta: 'Riunito · display clinico' }
];

export function pannelloProfilo({ stato, puoModificare, onAggiornato }) {
    const postazione = stato.postazione || {};
    const bozza = {
        nome: postazione.nome || '',
        ruolo: postazione.ruolo || 'segreteria',
        porta: postazione.porta || 7345,
        attiva: postazione.attiva === true
    };

    const campoNome = el('input', {
        class: 'ds-input',
        type: 'text',
        value: bozza.nome,
        disabled: !puoModificare,
        onInput: evento => { bozza.nome = evento.target.value; }
    });

    const campoRuolo = el('select', {
        class: 'ds-select',
        disabled: !puoModificare,
        onChange: evento => { bozza.ruolo = evento.target.value; }
    }, RUOLI.map(voce => el('option', {
        value: voce.valore,
        selected: voce.valore === bozza.ruolo
    }, voce.etichetta)));

    const campoPorta = el('input', {
        class: 'ds-input',
        type: 'number',
        value: String(bozza.porta),
        min: '1024',
        max: '65535',
        disabled: !puoModificare,
        onInput: evento => { bozza.porta = Number(evento.target.value); }
    });

    const campoAttiva = el('label', { class: 'ds-check' }, [
        el('input', {
            type: 'checkbox',
            checked: bozza.attiva,
            disabled: !puoModificare,
            onChange: evento => { bozza.attiva = evento.target.checked; }
        }),
        el('span', {}, 'Rete di studio attiva su questa postazione')
    ]);

    const salva = async () => {
        if (!esito(await call('postazioni.salvaProfilo', bozza), 'Profilo di postazione salvato')) return;
        await onAggiornato();
    };

    const servizio = stato.servizio || {};
    const cliente = stato.cliente || {};

    return [
        griglia('stats', [
            statistica({
                etichetta: 'Servizio di rete',
                valore: servizio.attivo ? `In ascolto sulla ${servizio.porta}` : 'Non attivo',
                nota: servizio.ultimo_errore || '',
                tono: servizio.attivo ? 'positivo' : 'negativo'
            }),
            statistica({
                etichetta: 'Riuniti collegati',
                valore: String((stato.canali || []).length)
            }),
            statistica({
                etichetta: 'Collegamento alla segreteria',
                valore: cliente.collegato ? cliente.postazione || 'attivo' : 'non collegato',
                nota: cliente.bersaglio || '',
                tono: cliente.collegato ? 'positivo' : undefined
            }),
            statistica({
                etichetta: 'Atti in coda',
                valore: String((stato.coda || {}).in_attesa || 0),
                tono: (stato.coda || {}).in_attesa > 0 ? 'negativo' : undefined
            })
        ]),
        pannello({
            titolo: 'Profilo della postazione',
            azioni: [
                postazione.impronta ? distintivo(`Impronta ${postazione.impronta}`, 'info') : null,
                spaziatore(),
                puoModificare ? bottone({ etichetta: 'Salva e riavvia la rete', simbolo: 'save', onClick: salva }) : null
            ].filter(Boolean)
        }, [
            el('div', { class: 'ds-grid ds-grid--form' }, [
                el('label', { class: 'ds-field' }, [
                    el('span', { class: 'ds-field__label' }, 'Nome della postazione'),
                    campoNome
                ]),
                el('label', { class: 'ds-field' }, [
                    el('span', { class: 'ds-field__label' }, 'Ruolo nello studio'),
                    campoRuolo
                ]),
                el('label', { class: 'ds-field' }, [
                    el('span', { class: 'ds-field__label' }, 'Porta di servizio'),
                    campoPorta
                ])
            ]),
            campoAttiva,
            coppie([
                { etichetta: 'Indirizzi di questa macchina', valore: (postazione.indirizzi || []).join(' · ') },
                { etichetta: 'Segreteria di riferimento', valore: postazione.indirizzo_archivio },
                { etichetta: 'Versione del protocollo', valore: String(postazione.versione_protocollo || '') },
                { etichetta: 'Ultimo errore di rete', valore: stato.ultimo_errore }
            ])
        ]),
        (stato.canali || []).length > 0
            ? pannello({ titolo: 'Canali aperti' }, el('div', { class: 'ds-grid ds-grid--cards' },
                stato.canali.map(voce => el('div', { class: 'ds-card-statica' }, [
                    el('div', { class: 'ds-card__title' }, voce.nome || 'Postazione'),
                    el('div', { class: 'ds-card__desc' }, `${voce.indirizzo} · dalle ${fmt.ora(voce.aperta_il)}`),
                    el('div', { class: 'ds-muted ds-mono' }, voce.impronta)
                ]))))
            : null
    ].filter(Boolean);
}
