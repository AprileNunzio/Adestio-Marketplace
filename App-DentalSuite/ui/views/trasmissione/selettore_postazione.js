import { el, icona } from '../../components/dom.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';

const PRESET_POSTAZIONI = [
    { nome: 'Studio 1', simbolo: 'chair' },
    { nome: 'Studio 2', simbolo: 'chair' },
    { nome: 'Studio 3', simbolo: 'chair' },
    { nome: 'Poltrona Chirurgia', simbolo: 'medical_services' },
    { nome: 'Poltrona Igiene', simbolo: 'dentistry' },
    { nome: 'Ortodonzia', simbolo: 'straighten' }
];

export function selettorePostazioneModalita({ postazioneAttuale, onSelezionato, onAnnulla }) {
    let nomeScelto = postazioneAttuale ? postazioneAttuale.nome : 'Studio 1';

    const campoNome = el('input', {
        class: 'ds-input ds-input--tocco ds-selettore-postazione__input',
        type: 'text',
        value: nomeScelto,
        placeholder: 'Nome di questa postazione (es. Studio 1)',
        onInput: (evento) => {
            nomeScelto = evento.target.value;
        }
    });

    const salvaConfigurazione = async (nome) => {
        try {
            const nomeFinale = String(nome || nomeScelto).trim();
            if (!nomeFinale) return;
            const risposta = await call('postazioni.configura', {
                ruolo: 'riunito',
                nome: nomeFinale
            });
            if (!esito(risposta, `Postazione impostata su "${nomeFinale}"`)) return;
            if (typeof onSelezionato === 'function') {
                onSelezionato(nomeFinale);
            }
        } catch (e) {
            esito({ error: e.message || 'Impossibile configurare postazione' });
        }
    };

    const pulsantiPreset = PRESET_POSTAZIONI.map(preset => el('button', {
        class: `ds-selettore-postazione__preset ${postazioneAttuale && postazioneAttuale.nome === preset.nome ? 'ds-selettore-postazione__preset--attivo' : ''}`,
        type: 'button',
        onClick: () => {
            campoNome.value = preset.nome;
            nomeScelto = preset.nome;
            salvaConfigurazione(preset.nome);
        }
    }, [
        el('span', { class: 'ds-selettore-postazione__preset-icona' }, icona(preset.simbolo)),
        el('span', { class: 'ds-selettore-postazione__preset-titolo' }, preset.nome)
    ]));

    const btnAnnulla = onAnnulla
        ? el('button', {
            class: 'ds-btn ds-btn--ghost ds-btn--tocco',
            type: 'button',
            onClick: onAnnulla
        }, [icona('arrow_back'), el('span', {}, 'Indietro')])
        : null;

    const btnConferma = el('button', {
        class: 'ds-btn ds-btn--primary ds-btn--tocco',
        type: 'button',
        onClick: () => salvaConfigurazione(nomeScelto)
    }, [icona('check_circle'), el('span', {}, 'Attiva Postazione')]);

    return el('div', { class: 'ds-selettore-postazione' }, [
        el('div', { class: 'ds-selettore-postazione__foglio' }, [
            el('div', { class: 'ds-selettore-postazione__testa' }, [
                el('div', { class: 'ds-selettore-postazione__icona' }, icona('monitor')),
                el('h2', { class: 'ds-selettore-postazione__titolo' }, 'Seleziona la tua postazione'),
                el('p', { class: 'ds-selettore-postazione__sottotitolo' },
                    'Indica quale poltrona o studio rappresenta questo monitor per ricevere le schede dei pazienti.'
                )
            ]),
            el('div', { class: 'ds-selettore-postazione__griglia' }, pulsantiPreset),
            el('div', { class: 'ds-selettore-postazione__personalizzato' }, [
                el('label', { class: 'ds-selettore-postazione__label' }, 'Oppure inserisci un nome personalizzato:'),
                campoNome
            ]),
            el('div', { class: 'ds-selettore-postazione__azioni' }, [
                btnAnnulla,
                btnConferma
            ].filter(Boolean))
        ])
    ]);
}
