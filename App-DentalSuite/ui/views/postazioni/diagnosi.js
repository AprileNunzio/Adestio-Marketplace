import { el, rimpiazza } from '../../components/dom.js';
import { pannello, bottone, avviso, coppie, spaziatore, scheletro, vuoto } from '../../components/layout.js';
import { esito } from '../../components/notifica.js';
import { call } from '../../kernel/transport.js';
import { oggetto, elenco } from '../shared/vista.js';

function comando(testo) {
    return el('pre', { class: 'ds-comando' }, el('code', {}, testo));
}

function voceProblema(voce) {
    return el('div', { class: 'ds-diagnosi__voce' }, [
        el('div', { class: 'ds-diagnosi__causa' }, voce.testo),
        voce.rimedio ? el('div', { class: 'ds-diagnosi__rimedio' }, voce.rimedio) : null
    ].filter(Boolean));
}

function esitoDiagnosi(dati, azioni) {
    if (!dati) return vuoto({ titolo: 'Diagnosi non disponibile', simbolo: 'error' });

    const blocchi = [];

    if (dati.schema_incompleto) {
        blocchi.push(avviso({
            tono: 'danger',
            simbolo: 'database',
            titolo: 'Aggiornamento del database non applicato',
            voci: dati.problemi
        }));
        return blocchi;
    }

    if (dati.pronta) {
        blocchi.push(avviso({
            tono: 'info',
            simbolo: 'check_circle',
            titolo: 'La rete di studio è pronta',
            voci: ['Il canale fra segreteria e riuniti può essere aperto.']
        }));
    } else {
        const disattivata = (dati.diagnosi || []).some(voce => voce.causa === 'disattivata');
        blocchi.push(el('div', { class: 'ds-alert ds-alert--danger' }, [
            el('span', { class: 'material-symbols-rounded' }, disattivata ? 'toggle_off' : 'error'),
            el('div', {}, [
                el('strong', {}, disattivata
                    ? 'La rete di studio è spenta su questa postazione'
                    : `${dati.problemi.length} problemi rilevati`),
                el('div', { class: 'ds-diagnosi' }, (dati.diagnosi || []).map(voceProblema))
            ])
        ]));
        if (disattivata) {
            blocchi.push(el('div', { class: 'ds-toolbar' }, [
                bottone({ etichetta: 'Attiva la rete adesso', simbolo: 'power_settings_new', onClick: azioni.attiva })
            ]));
        }
    }

    blocchi.push(coppie([
        { etichetta: 'Postazione', valore: dati.postazione ? dati.postazione.nome : '' },
        { etichetta: 'Ruolo', valore: dati.postazione ? dati.postazione.etichetta_ruolo || dati.postazione.ruolo : '' },
        { etichetta: 'Rete attiva', valore: dati.attiva ? 'sì' : 'no' },
        { etichetta: 'Servizio', valore: dati.servizio.attivo ? `in ascolto sulla porta ${dati.servizio.porta}` : 'non in ascolto' },
        { etichetta: 'Scoperta automatica', valore: dati.scoperta.attivo ? `${dati.scoperta.vicini} postazioni viste` : 'non attiva' },
        { etichetta: 'Indirizzi di questa macchina', valore: (dati.postazione.indirizzi || []).join(' · ') },
        {
            etichetta: 'Segreteria di riferimento',
            valore: dati.archivio
                ? `${dati.archivio.bersaglio || 'non impostata'} · ${dati.archivio.raggiungibile ? 'raggiungibile' : dati.archivio.motivo || 'non raggiungibile'}`
                : 'non applicabile a questa postazione'
        }
    ]));

    blocchi.push(el('div', { class: 'ds-field__label' }, 'Regole di firewall da eseguire come amministratore'));
    dati.comandi_firewall.forEach(riga => blocchi.push(comando(riga)));

    return blocchi;
}

export function pannelloDiagnosi({ onAggiornato }) {
    const contenitore = el('div', {}, scheletro(3));

    const azioni = {
        attiva: async () => {
            if (!esito(await call('postazioni.attiva', { attiva: true }), 'Rete di studio attivata')) return;
            await esegui();
            if (onAggiornato) await onAggiornato();
        }
    };

    const esegui = async () => {
        rimpiazza(contenitore, scheletro(3));
        const dati = oggetto(await call('postazioni.verifica', {}), null);
        rimpiazza(contenitore, esitoDiagnosi(dati, azioni));
    };

    esegui();

    return pannello({
        titolo: 'Diagnosi della rete',
        azioni: [spaziatore(), bottone({ etichetta: 'Riesegui', simbolo: 'troubleshoot', variante: 'ghost', onClick: esegui })]
    }, contenitore);
}

export function pannelloVicini() {
    const contenitore = el('div', {}, scheletro(2));

    const esegui = async () => {
        const righe = elenco(await call('postazioni.vicini', {}));
        rimpiazza(contenitore, righe.length === 0
            ? vuoto({
                titolo: 'Nessuna postazione annunciata sulla rete',
                testo: 'Le segreterie con la rete di studio attiva si annunciano da sole. Se non compaiono, controlla la regola di firewall sulla porta UDP 7346 o indica l\'indirizzo a mano.',
                simbolo: 'wifi_find'
            })
            : el('div', { class: 'ds-grid ds-grid--cards' }, righe.map(voce => el('div', { class: 'ds-card-statica' }, [
                el('div', { class: 'ds-card__title' }, voce.nome),
                el('div', { class: 'ds-card__desc' }, `${voce.indirizzo}:${voce.porta} · ${voce.ruolo}`),
                el('div', { class: 'ds-muted ds-mono' }, voce.impronta)
            ]))));
    };

    esegui();

    return pannello({
        titolo: 'Postazioni viste sulla rete',
        azioni: [spaziatore(), bottone({ etichetta: 'Aggiorna', simbolo: 'refresh', variante: 'ghost', onClick: esegui })]
    }, contenitore);
}
