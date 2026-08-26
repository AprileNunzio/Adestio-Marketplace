import { el } from './dom.js';

function involucro(definizione, controllo) {
    return el('label', { class: definizione.ampio ? 'ds-field ds-field--wide' : 'ds-field' }, [
        el('span', { class: 'ds-field__label' }, definizione.etichetta),
        controllo,
        definizione.aiuto ? el('span', { class: 'ds-field__error ds-muted' }, definizione.aiuto) : null
    ]);
}

export function testo(definizione, valore, onCambio) {
    const controllo = el('input', {
        class: 'ds-input',
        type: definizione.tipo || 'text',
        value: valore === null || valore === undefined ? '' : valore,
        placeholder: definizione.segnaposto || '',
        maxlength: definizione.max || null,
        step: definizione.passo || null,
        min: definizione.minimo !== undefined ? definizione.minimo : null,
        disabled: definizione.disabilitato === true,
        onInput: evento => onCambio(definizione.campo, evento.target.value)
    });
    return involucro(definizione, controllo);
}

export function numerico(definizione, valore, onCambio) {
    const controllo = el('input', {
        class: 'ds-input',
        type: 'number',
        value: valore === null || valore === undefined ? '' : valore,
        step: definizione.passo || '0.01',
        min: definizione.minimo !== undefined ? definizione.minimo : 0,
        disabled: definizione.disabilitato === true,
        onInput: evento => onCambio(definizione.campo, evento.target.value === '' ? '' : Number(evento.target.value))
    });
    return involucro(definizione, controllo);
}

export function selezione(definizione, valore, onCambio) {
    const opzioni = definizione.opzioni.map(opzione => el('option', {
        value: opzione.valore,
        selected: String(opzione.valore) === String(valore === null || valore === undefined ? '' : valore)
    }, opzione.etichetta));

    const controllo = el('select', {
        class: 'ds-select',
        disabled: definizione.disabilitato === true,
        onChange: evento => onCambio(definizione.campo, evento.target.value)
    }, [
        definizione.vuoto !== false
            ? el('option', { value: '', selected: !valore }, definizione.segnaposto || 'Seleziona…')
            : null,
        ...opzioni
    ]);
    return involucro(definizione, controllo);
}

export function areaTesto(definizione, valore, onCambio) {
    const controllo = el('textarea', {
        class: 'ds-textarea',
        rows: definizione.righe || 3,
        placeholder: definizione.segnaposto || '',
        disabled: definizione.disabilitato === true,
        onInput: evento => onCambio(definizione.campo, evento.target.value)
    }, valore === null || valore === undefined ? '' : String(valore));
    return involucro(definizione, controllo);
}

export function interruttore(definizione, valore, onCambio) {
    return el('label', { class: 'ds-check' }, [
        el('input', {
            type: 'checkbox',
            checked: Number(valore) === 1 || valore === true,
            disabled: definizione.disabilitato === true,
            onChange: evento => onCambio(definizione.campo, evento.target.checked ? 1 : 0)
        }),
        el('span', {}, definizione.etichetta)
    ]);
}

const COSTRUTTORI = {
    testo,
    numero: numerico,
    selezione,
    area: areaTesto,
    booleano: interruttore
};

export function costruisciCampi(definizioni, stato, onCambio) {
    return definizioni.map(definizione => {
        const costruttore = COSTRUTTORI[definizione.genere || 'testo'] || testo;
        return costruttore(definizione, stato[definizione.campo], onCambio);
    });
}

export function opzioniDa(elenco, campoValore, campoEtichetta) {
    return elenco.map(voce => ({
        valore: voce[campoValore],
        etichetta: typeof campoEtichetta === 'function' ? campoEtichetta(voce) : voce[campoEtichetta]
    }));
}
