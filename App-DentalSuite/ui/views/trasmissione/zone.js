import { el, icona } from '../../components/dom.js';
import * as fmt from '../../kernel/format.js';

export function zona({ titolo, simbolo, modificatore, azioni = [], fitto = false }, contenuto) {
    return el('section', { class: `ds-riunito__zona ds-riunito__zona--${modificatore}` }, [
        el('header', { class: 'ds-riunito__testa' }, [
            simbolo ? icona(simbolo) : null,
            el('span', {}, titolo),
            ...azioni
        ]),
        el('div', { class: fitto ? 'ds-riunito__corpo ds-riunito__corpo--fitto' : 'ds-riunito__corpo' }, contenuto)
    ]);
}

function dato(etichetta, valore) {
    if (!valore) return null;
    return el('span', { class: 'ds-riunito__dato' }, [`${etichetta} `, el('strong', {}, valore)]);
}

export function zonaIdentita(dossier, orologio) {
    const paziente = dossier.paziente;
    return zona({ titolo: 'Paziente', simbolo: 'badge', modificatore: 'identita', azioni: [orologio] }, [
        el('div', { class: 'ds-riunito__nome' }, paziente.nominativo),
        el('div', { class: 'ds-riunito__dati' }, [
            dato('Età', paziente.eta === null ? null : `${paziente.eta} anni`),
            dato('Nato il', fmt.data(paziente.data_nascita)),
            dato('CF', paziente.codice_fiscale),
            dato('Telefono', paziente.telefono),
            dato('Gruppo', paziente.gruppo_sanguigno),
            dato('Esenzioni', paziente.esenzioni),
            dato('Emergenza', paziente.contatto_emergenza)
        ].filter(Boolean))
    ]);
}

const SIMBOLI_ALLERTA = {
    critica: 'e911_emergency',
    attenzione: 'warning',
    nota: 'info'
};

export function zonaAllerte(dossier, quante) {
    const voci = dossier.anamnesi.allerte || [];
    const corpo = voci.length === 0
        ? el('div', { class: 'ds-riunito__sereno' }, [icona('verified_user'), 'Nessuna allerta registrata in anamnesi'])
        : el('div', { class: 'ds-riunito__allerte' }, voci.slice(0, quante || 6).map(voce => el('div', {
            class: 'ds-riunito__allerta',
            dataset: { livello: voce.livello }
        }, [
            icona(SIMBOLI_ALLERTA[voce.livello] || 'info'),
            el('span', {}, voce.etichetta)
        ])));

    return zona({
        titolo: dossier.anamnesi.compilata
            ? `Allerte cliniche · anamnesi del ${fmt.data(dossier.anamnesi.data_compilazione)}`
            : 'Allerte cliniche · anamnesi non compilata',
        simbolo: 'health_and_safety',
        modificatore: 'allerte'
    }, corpo);
}

function voceElenco(quando, titolo, coda) {
    return el('li', { class: 'ds-riunito__voce' }, [
        el('time', {}, quando),
        el('strong', { title: titolo }, titolo),
        el('span', {}, coda || '')
    ]);
}

export function zonaStoria(dossier, { onApriTrattamenti, onApriPrescrizioni, onApriReferti, quanti = 6, soloTrattamenti = false }) {
    const trattamenti = dossier.trattamenti.slice(0, quanti);
    const prescrizioni = soloTrattamenti ? [] : dossier.prescrizioni.slice(0, 2);

    return zona({
        titolo: `Storia clinica · ${dossier.trattamenti.length} trattamenti`,
        simbolo: 'history',
        modificatore: 'storia',
        azioni: [
            el('button', { class: 'ds-riunito__tasto ds-riunito__tasto--mini', type: 'button', onClick: onApriTrattamenti, title: 'Tutti i trattamenti' }, icona('open_in_full')),
            dossier.prescrizioni.length > 0
                ? el('button', { class: 'ds-riunito__tasto ds-riunito__tasto--mini', type: 'button', onClick: onApriPrescrizioni, title: 'Prescrizioni' }, icona('prescriptions'))
                : null,
            dossier.referti.length > 0
                ? el('button', { class: 'ds-riunito__tasto ds-riunito__tasto--mini', type: 'button', onClick: onApriReferti, title: 'Referti' }, icona('imagesmode'))
                : null
        ].filter(Boolean)
    }, [
        trattamenti.length === 0
            ? el('div', { class: 'ds-riunito__sereno' }, [icona('info'), 'Nessun trattamento precedente registrato'])
            : el('ul', { class: 'ds-riunito__elenco' }, trattamenti.map(voce => voceElenco(
                fmt.data(voce.data),
                `${voce.dente ? `${voce.dente} · ` : ''}${voce.descrizione}`,
                fmt.etichettaStato(voce.stato)
            ))),
        prescrizioni.length > 0
            ? el('ul', { class: 'ds-riunito__elenco' }, prescrizioni.map(voce => voceElenco(
                fmt.data(voce.data),
                `${voce.farmaco} ${voce.dosaggio}`.trim(),
                voce.posologia || ''
            )))
            : null
    ].filter(Boolean));
}

export function zonaSeduta(dossier) {
    const seduta = dossier.seduta;
    const bloccanti = dossier.consensi.bloccanti || [];

    return zona({ titolo: 'Seduta di oggi', simbolo: 'today', modificatore: 'seduta' }, [
        seduta
            ? el('div', { class: 'ds-riunito__dati' }, [
                el('span', { class: 'ds-riunito__dato' }, [
                    el('strong', {}, fmt.ora(seduta.inizio)),
                    ` · ${seduta.durata_minuti}′`
                ]),
                seduta.medico ? el('span', { class: 'ds-riunito__dato' }, seduta.medico) : null,
                seduta.prestazione || seduta.motivo
                    ? el('span', { class: 'ds-riunito__dato' }, seduta.prestazione || seduta.motivo)
                    : null
            ].filter(Boolean))
            : el('div', { class: 'ds-riunito__sereno' }, [icona('event_busy'), 'Nessun appuntamento in agenda per oggi']),
        bloccanti.length > 0
            ? el('div', { class: 'ds-riunito__allerta', dataset: { livello: 'critica' } }, [
                icona('assignment_late'),
                el('span', {}, `Consensi da raccogliere: ${bloccanti.map(voce => voce.titolo).join(', ')}`)
            ])
            : null,
        seduta && seduta.note
            ? el('div', { class: 'ds-riunito__dati' }, el('span', { class: 'ds-riunito__dato' }, seduta.note))
            : null
    ].filter(Boolean));
}

export function zonaPrescrizioni(dossier, quante) {
    const voci = dossier.prescrizioni.slice(0, quante || dossier.prescrizioni.length);
    return zona({
        titolo: `Prescrizioni · ${dossier.prescrizioni.length}`,
        simbolo: 'prescriptions',
        modificatore: 'prescrizioni'
    }, voci.length === 0
        ? el('div', { class: 'ds-riunito__sereno' }, [icona('info'), 'Nessuna prescrizione registrata'])
        : el('ul', { class: 'ds-riunito__elenco' }, voci.map(voce => voceElenco(
            fmt.data(voce.data),
            `${voce.farmaco} ${voce.dosaggio}`.trim(),
            voce.posologia || ''
        ))));
}

export function zonaRilevazioni(dossier, quante) {
    const voci = dossier.rilevazioni.slice(0, quante || dossier.rilevazioni.length);
    return zona({
        titolo: `Storia dell’odontogramma · ${dossier.rilevazioni.length} rilevazioni`,
        simbolo: 'history_edu',
        modificatore: 'rilevazioni'
    }, voci.length === 0
        ? el('div', { class: 'ds-riunito__sereno' }, [icona('info'), 'Nessuna rilevazione registrata'])
        : el('ul', { class: 'ds-riunito__elenco' }, voci.map(voce => voceElenco(
            fmt.data(voce.data_rilevazione),
            `${voce.numero_dente} · ${fmt.etichettaStato(voce.stato)}`,
            voce.superfici || voce.materiale || ''
        ))));
}
