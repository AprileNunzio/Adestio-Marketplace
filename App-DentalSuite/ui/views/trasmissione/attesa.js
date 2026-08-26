import { el, icona, rimpiazza } from '../../components/dom.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import { elenco } from '../shared/vista.js';
import { tastoRiunito } from './livello.js';

function orologio() {
    const nodo = el('div', { class: 'ds-attesa__orologio' }, '--:--');
    const aggiorna = () => {
        const adesso = new Date();
        nodo.textContent = `${String(adesso.getHours()).padStart(2, '0')}:${String(adesso.getMinutes()).padStart(2, '0')}`;
    };
    aggiorna();
    const cadenza = setInterval(aggiorna, 20000);
    nodo.dataset.cadenza = String(cadenza);
    return nodo;
}

function spia(collegato) {
    return el('span', { class: 'ds-attesa__riga' }, [
        el('span', { class: 'ds-riunito__spia', dataset: { collegato: collegato ? 'true' : 'false' } }),
        collegato ? 'Pronto a ricevere dalla segreteria' : 'Non collegato alla segreteria'
    ]);
}

function moduloAccoppiamento(vicini, onFatto) {
    const stato = { indirizzo: vicini.length > 0 ? `${vicini[0].indirizzo}:${vicini[0].porta}` : '', codice: '' };

    const campoIndirizzo = el('input', {
        class: 'ds-input ds-input--tocco',
        type: 'text',
        value: stato.indirizzo,
        placeholder: 'Indirizzo della segreteria (es. 192.168.1.20)',
        onInput: evento => { stato.indirizzo = evento.target.value; }
    });

    const campoCodice = el('input', {
        class: 'ds-input ds-input--tocco',
        type: 'text',
        inputmode: 'numeric',
        maxlength: '11',
        placeholder: 'Codice a 8 cifre',
        onInput: evento => { stato.codice = evento.target.value; }
    });

    const scelta = vicini.length > 0
        ? el('select', {
            class: 'ds-select ds-input--tocco',
            onChange: evento => {
                stato.indirizzo = evento.target.value;
                campoIndirizzo.value = evento.target.value;
            }
        }, vicini.map(voce => el('option', {
            value: `${voce.indirizzo}:${voce.porta}`
        }, `${voce.nome} · ${voce.indirizzo}`)))
        : null;

    const collega = async () => {
        const risposta = await call('postazioni.accoppia', {
            indirizzo: stato.indirizzo.split(':')[0],
            porta: Number(stato.indirizzo.split(':')[1]) || undefined,
            codice: stato.codice
        });
        if (!esito(risposta, 'Monitor collegato alla segreteria')) return;
        await onFatto();
    };

    return el('div', { class: 'ds-attesa__corpo' }, [
        scelta,
        campoIndirizzo,
        campoCodice,
        tastoRiunito({ simbolo: 'link', etichetta: 'Collega alla segreteria', primario: true, onClick: collega })
    ].filter(Boolean));
}

export function schermoAttesa({ postazione, collegato, motivo, onRicollega, onCambiaPostazione }) {
    const contenitore = el('div', { class: 'ds-attesa' });

    const disegna = async () => {
        const vicini = collegato ? [] : elenco(await call('postazioni.vicini', {}));

        rimpiazza(contenitore, el('div', { class: 'ds-attesa__corpo' }, [
            el('div', { class: 'ds-attesa__marchio' }, icona('monitor')),
            orologio(),
            el('h1', { class: 'ds-attesa__titolo' }, postazione ? postazione.nome : 'Monitor del Medico'),
            el('p', { class: 'ds-attesa__testo' }, collegato
                ? 'In attesa. La segreteria può inviare la cartella clinica del paziente: comparirà qui a schermo intero.'
                : 'Questo monitor non è ancora collegato alla segreteria. Richiedi il codice e inseriscilo qui sotto.'),
            spia(collegato),
            postazione ? el('div', { class: 'ds-attesa__impronta' }, `Impronta di sicurezza: ${postazione.impronta}`) : null,
            motivo ? el('p', { class: 'ds-attesa__testo' }, motivo) : null,
            el('div', { class: 'ds-attesa__pulsanti-touch' }, [
                collegato
                    ? tastoRiunito({ simbolo: 'refresh', etichetta: 'Controlla connessione', onClick: onRicollega })
                    : null,
                onCambiaPostazione
                    ? tastoRiunito({ simbolo: 'tune', etichetta: 'Cambia postazione', onClick: onCambiaPostazione })
                    : null
            ].filter(Boolean)),
            !collegato ? moduloAccoppiamento(vicini, onRicollega) : null
        ].filter(Boolean)));
    };

    disegna();
    return contenitore;
}
