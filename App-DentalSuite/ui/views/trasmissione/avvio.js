import { el, rimpiazza, icona } from '../../components/dom.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import { assicuraFoglio } from '../../kernel/stili.js';
import { oggetto, elenco } from '../shared/vista.js';

const POSTI = [
    {
        id: 'segreteria',
        titolo: 'Alla reception',
        spiegazione: 'Qui c\'è l\'archivio dei pazienti. Da questo computer mandi la scheda al monitor dello studio.',
        simbolo: 'desk',
        nome: 'Reception'
    },
    {
        id: 'riunito',
        titolo: 'Nello studio, accanto alla poltrona',
        spiegazione: 'Questo monitor mostra la scheda del paziente che la reception ti manda. Il medico la tocca con il dito.',
        simbolo: 'chair',
        nome: 'Studio 1'
    }
];

function tasto(etichetta, simbolo, onClick, primario = true) {
    return el('button', {
        class: 'ds-avvio__tasto',
        type: 'button',
        dataset: { primario: primario ? 'true' : 'false' },
        onClick
    }, [simbolo ? icona(simbolo) : null, etichetta].filter(Boolean));
}

function riquadro(contenuto) {
    return el('div', { class: 'ds-avvio' }, el('div', { class: 'ds-avvio__foglio' }, contenuto));
}

function testa(titolo, spiegazione) {
    return el('div', { class: 'ds-avvio__testa' }, [
        el('h2', { class: 'ds-avvio__titolo' }, titolo),
        spiegazione ? el('p', { class: 'ds-avvio__testo' }, spiegazione) : null
    ].filter(Boolean));
}

function scegliPosto(onScelto) {
    return riquadro([
        testa('Dove si trova questo computer?', 'Serve una volta sola. Scegli dove si trova e pensiamo a tutto noi.'),
        el('div', { class: 'ds-avvio__scelte' }, POSTI.map(posto => el('button', {
            class: 'ds-avvio__scelta',
            type: 'button',
            onClick: () => onScelto(posto)
        }, [
            el('div', { class: 'ds-avvio__marchio' }, icona(posto.simbolo)),
            el('div', { class: 'ds-avvio__scelta-titolo' }, posto.titolo),
            el('div', { class: 'ds-avvio__scelta-testo' }, posto.spiegazione)
        ])))
    ]);
}

function daiNome(posto, onConferma, onIndietro) {
    const campo = el('input', {
        class: 'ds-avvio__campo',
        type: 'text',
        value: posto.nome,
        maxlength: '40'
    });

    return riquadro([
        testa(
            posto.id === 'segreteria' ? 'Come si chiama questa reception?' : 'Come si chiama questo studio?',
            'È il nome che vedrai quando manderai o riceverai una scheda. Puoi cambiarlo quando vuoi.'
        ),
        campo,
        el('div', { class: 'ds-avvio__azioni' }, [
            tasto('Indietro', 'arrow_back', onIndietro, false),
            tasto('Conferma', 'check', () => onConferma(campo.value))
        ])
    ]);
}

function mostraCodice(codice, scadeIl, onFatto) {
    const conto = el('p', { class: 'ds-avvio__testo' }, '');
    const aggiorna = () => {
        const restano = Math.max(Math.round((Number(scadeIl) - Date.now()) / 1000), 0);
        conto.textContent = restano > 0
            ? `Il codice vale ancora ${restano} secondi.`
            : 'Il codice è scaduto: chiedine uno nuovo.';
        if (restano <= 0) clearInterval(cadenza);
    };
    const cadenza = setInterval(aggiorna, 1000);
    aggiorna();

    return riquadro([
        testa('Scrivi questo numero sul monitor dello studio', 'Vai al computer dello studio, apri DentalSuite e scrivi questo numero quando te lo chiede.'),
        el('div', { class: 'ds-avvio__codice' }, String(codice).replace(/(\d{4})(\d{4})/, '$1 $2')),
        conto,
        el('div', { class: 'ds-avvio__azioni' }, [tasto('Ho finito', 'check', onFatto)])
    ]);
}

function collegaAllaReception({ vicini, onCollegato, onIndietro }) {
    const stato = {
        indirizzo: vicini.length > 0 ? `${vicini[0].indirizzo}:${vicini[0].porta}` : '',
        codice: ''
    };

    const campoIndirizzo = el('input', {
        class: 'ds-avvio__campo',
        type: 'text',
        value: stato.indirizzo,
        placeholder: 'Indirizzo della reception, per esempio 192.168.1.20',
        onInput: evento => { stato.indirizzo = evento.target.value; }
    });

    const campoCodice = el('input', {
        class: 'ds-avvio__campo ds-avvio__campo--codice',
        type: 'text',
        inputmode: 'numeric',
        maxlength: '9',
        placeholder: '0000 0000',
        onInput: evento => { stato.codice = evento.target.value; }
    });

    const scelte = vicini.length > 0
        ? el('div', { class: 'ds-avvio__vicini' }, vicini.map(voce => el('button', {
            class: 'ds-avvio__vicino',
            type: 'button',
            onClick: () => {
                stato.indirizzo = `${voce.indirizzo}:${voce.porta}`;
                campoIndirizzo.value = stato.indirizzo;
            }
        }, [icona('desk'), el('span', {}, voce.nome), el('small', {}, voce.indirizzo)])))
        : el('p', { class: 'ds-avvio__testo' }, 'Nessuna reception trovata da sola: scrivi l\'indirizzo che ti dà la reception.');

    const collega = async () => {
        const risposta = await call('postazioni.accoppia', {
            indirizzo: stato.indirizzo.split(':')[0],
            porta: Number(stato.indirizzo.split(':')[1]) || undefined,
            codice: stato.codice
        });
        if (!esito(risposta, 'Collegato alla reception')) return;
        await onCollegato();
    };

    return riquadro([
        testa('Collega questo monitor alla reception', 'Chiedi alla reception di mostrarti il codice, poi scrivilo qui sotto.'),
        scelte,
        campoIndirizzo,
        el('label', { class: 'ds-avvio__etichetta' }, 'Codice che vedi sullo schermo della reception'),
        campoCodice,
        el('div', { class: 'ds-avvio__azioni' }, [
            onIndietro ? tasto('Indietro', 'arrow_back', onIndietro, false) : null,
            tasto('Collega', 'link', collega)
        ].filter(Boolean))
    ]);
}

function passoSemplice(situazione, azioni) {
    const bottoni = [];
    if (situazione.azione && situazione.azione.tipo === 'accendi') {
        bottoni.push(tasto('Accendi il collegamento', 'power_settings_new', azioni.accendi));
    }
    if (situazione.azione && situazione.azione.tipo === 'codice') {
        bottoni.push(tasto('Mostra il codice', 'vpn_key', azioni.codice));
    }
    bottoni.push(tasto('Cambia impostazioni', 'settings', azioni.impostazioni, false));

    return riquadro([
        testa(situazione.titolo, situazione.spiegazione),
        el('div', { class: 'ds-avvio__azioni' }, bottoni)
    ]);
}

export function schermoAvvio({ situazione, onAggiornato, onImpostazioni }) {
    assicuraFoglio('avvio');
    const contenitore = el('div', {});
    let postoScelto = null;

    const azioni = {
        accendi: async () => {
            if (!esito(await call('postazioni.attiva', { attiva: true }), 'Collegamento acceso')) return;
            await onAggiornato();
        },
        codice: async () => {
            const risposta = await call('postazioni.generaCodice', {});
            const dati = oggetto(risposta, null);
            if (!esito(risposta, '')) return;
            rimpiazza(contenitore, mostraCodice(dati.codice, dati.scade_il, onAggiornato));
        },
        impostazioni: onImpostazioni
    };

    const disegna = async () => {
        if (!situazione.configurata) {
            if (!postoScelto) {
                rimpiazza(contenitore, scegliPosto(posto => {
                    postoScelto = posto;
                    disegna();
                }));
                return;
            }
            rimpiazza(contenitore, daiNome(postoScelto, async nome => {
                const risposta = await call('postazioni.configura', { ruolo: postoScelto.id, nome });
                if (!esito(risposta, 'Computer configurato')) return;
                postoScelto = null;
                await onAggiornato();
            }, () => {
                postoScelto = null;
                disegna();
            }));
            return;
        }

        if (situazione.passo === 'collega') {
            const vicini = elenco(await call('postazioni.vicini', {}));
            rimpiazza(contenitore, collegaAllaReception({
                vicini,
                onCollegato: onAggiornato,
                onIndietro: null
            }));
            return;
        }

        rimpiazza(contenitore, passoSemplice(situazione, azioni));
    };

    disegna();
    return contenitore;
}
