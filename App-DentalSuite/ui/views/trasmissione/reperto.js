import { el, icona } from '../../components/dom.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import * as fmt from '../../kernel/format.js';
import { apriLivello, tastoRiunito } from './livello.js';

function pastiglia(colore) {
    const nodo = el('span', { class: 'ds-scelta__pastiglia' });
    nodo.style.backgroundColor = colore;
    return nodo;
}

function selettoreStato(stati, scelto, onScegli) {
    return el('div', { class: 'ds-scelta ds-scelta--tocco' }, stati.map(stato => el('button', {
        class: 'ds-scelta__voce',
        type: 'button',
        'aria-pressed': String(stato.id === scelto),
        onClick: evento => {
            onScegli(stato.id);
            evento.currentTarget.parentNode.querySelectorAll('.ds-scelta__voce').forEach(nodo => {
                nodo.setAttribute('aria-pressed', 'false');
            });
            evento.currentTarget.setAttribute('aria-pressed', 'true');
        }
    }, [pastiglia(stato.colore), stato.label])));
}

function selettoreSuperfici(superfici, iniziali, onCambia) {
    const attive = new Set(String(iniziali || '').split(',').filter(Boolean));
    return el('div', { class: 'ds-superfici ds-superfici--tocco' }, superfici.map(sigla => el('button', {
        class: 'ds-superfici__voce',
        type: 'button',
        'aria-pressed': String(attive.has(sigla)),
        onClick: evento => {
            if (attive.has(sigla)) attive.delete(sigla);
            else attive.add(sigla);
            evento.currentTarget.setAttribute('aria-pressed', String(attive.has(sigla)));
            onCambia([...attive].join(','));
        }
    }, sigla)));
}

function storiaDelDente(rilevazioni, numero) {
    const voci = rilevazioni.filter(voce => voce.numero_dente === numero).slice(0, 6);
    if (voci.length === 0) {
        return el('div', { class: 'ds-riunito__sereno' }, [icona('history'), 'Nessuna rilevazione precedente su questo elemento']);
    }
    return el('ul', { class: 'ds-riunito__elenco' }, voci.map(voce => el('li', { class: 'ds-riunito__voce' }, [
        el('time', {}, fmt.data(voce.data_rilevazione)),
        el('strong', {}, `${fmt.etichettaStato(voce.stato)}${voce.superfici ? ` · ${voce.superfici}` : ''}`),
        el('span', {}, voce.materiale || voce.note || '')
    ])));
}

export function apriReperto({ dente, dossier, onRegistrato }) {
    const bozza = {
        numero_dente: dente.numero_dente,
        stato: dente.stato,
        superfici: dente.superfici || '',
        materiale: dente.materiale || '',
        note: '',
        data_rilevazione: fmt.oggiIso()
    };

    const campoNote = el('input', {
        class: 'ds-input ds-input--tocco',
        type: 'text',
        placeholder: 'Nota clinica (facoltativa)',
        onInput: evento => { bozza.note = evento.target.value; }
    });

    const campoMateriale = el('input', {
        class: 'ds-input ds-input--tocco',
        type: 'text',
        value: bozza.materiale,
        placeholder: 'Materiale',
        onInput: evento => { bozza.materiale = evento.target.value; }
    });

    const registra = async () => {
        const risposta = await call('atti.registra', {
            tipo: 'reperto',
            contenuto: { ...bozza }
        });
        const dati = risposta && risposta.success ? risposta.data : null;
        if (!dati) {
            esito(risposta, '');
            return;
        }
        if (dati.consegnato === false) {
            esito({ success: false, error: `Reperto messo in coda: ${dati.messaggio}` }, '');
        } else {
            esito({ success: true }, `Reperto registrato sull'elemento ${bozza.numero_dente}`);
        }
        chiudi();
        await onRegistrato();
    };

    const contenuto = el('div', { class: 'ds-riunito__reperto' }, [
        el('div', { class: 'ds-riunito__testa' }, `Stato attuale: ${fmt.etichettaStato(dente.stato)}`),
        selettoreStato(dossier.odontogramma.stati, bozza.stato, valore => { bozza.stato = valore; }),
        el('div', { class: 'ds-riunito__testa' }, 'Superfici interessate'),
        selettoreSuperfici(dossier.odontogramma.superfici, bozza.superfici, valore => { bozza.superfici = valore; }),
        el('div', { class: 'ds-riunito__campi' }, [campoMateriale, campoNote]),
        el('div', { class: 'ds-riunito__azioni' }, [
            tastoRiunito({ simbolo: 'add_task', etichetta: 'Registra reperto', primario: true, onClick: registra })
        ]),
        el('div', { class: 'ds-riunito__testa' }, 'Storia dell\'elemento'),
        storiaDelDente(dossier.rilevazioni, dente.numero_dente)
    ]);

    const chiudi = apriLivello({
        titolo: `Elemento ${dente.numero_dente} · ${dente.nome}`,
        sottotitolo: `${dente.arcata === 'superiore' ? 'Arcata superiore' : 'Arcata inferiore'} · emiarcata ${dente.lato}`,
        contenuto
    });

    return chiudi;
}
