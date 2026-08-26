import { el, rimpiazza, icona } from '../components/dom.js';
import { radice, intestazione, scheletro, vuoto } from '../components/layout.js';
import { call } from '../kernel/transport.js';
import { can } from '../security/permissions.js';
import { assicuraFoglio } from '../kernel/stili.js';
import { oggetto } from './shared/vista.js';
import { schermoAttesa } from './trasmissione/attesa.js';
import { schermoScheda } from './trasmissione/scheda.js';
import { consoleTrasmissione } from './trasmissione/console.js';
import { schermoAvvio } from './trasmissione/avvio.js';
import { hubSceltaModalita } from './trasmissione/hub_scelta.js';
import { selettorePaziente } from './shared/selettore_paziente.js';
import { adattaAlTelaio } from '../kernel/telaio.js';
import { esito } from '../components/notifica.js';
import { selettorePostazioneModalita } from './trasmissione/selettore_postazione.js';

const RUOLO_RIUNITO = 'riunito';

async function statoRete() {
    return oggetto(await call('postazioni.stato', {}), null);
}

async function situazioneRete() {
    return oggetto(await call('postazioni.situazione', {}), null);
}

function misuraSchermo() {
    return {
        larghezza: Math.round(window.innerWidth || 0),
        altezza: Math.round(window.innerHeight || 0)
    };
}

function schermoDisplay({ indietro, onCambiaPostazione, puoCambiarePaziente }) {
    const contenitore = el('div', { class: 'ds-monitor-display-wrap' });
    let versioneNota = -1;
    let attivo = true;
    let generazione = 0;
    let attesaInCorso = false;
    let ultimoMotivo = '';
    let densitaNota = '';
    let attesaMisura = null;

    const abbandona = azione => () => {
        attivo = false;
        window.removeEventListener('resize', allaRidimensione);
        azione();
    };

    const disegna = (istantanea, rete) => {
        const collegato = Boolean(
            (rete && rete.cliente && rete.cliente.collegato)
            || (istantanea && istantanea.presente)
        );
        if (istantanea.presente && istantanea.dossier) {
            rimpiazza(contenitore, schermoScheda({
                istantanea,
                collegato,
                onChiudi: chiudiSeduta,
                onAggiorna: ciclo,
                onCambiaPaziente: puoCambiarePaziente ? cambiaPaziente : null,
                onEsci: abbandona(indietro),
                onCambiaPostazione: onCambiaPostazione ? abbandona(onCambiaPostazione) : null
            }));
            return;
        }
        rimpiazza(contenitore, schermoAttesa({
            postazione: rete ? rete.postazione : null,
            onCambiaPostazione
        }));
    };

    const cambiaPaziente = async () => {
        try {
            const scelto = await selettorePaziente();
            if (!scelto) return;
            const risposta = await call('trasmissioni.cambiaPaziente', { paziente_id: scelto });
            if (!esito(risposta, 'Paziente cambiato sul monitor')) return;
            await ciclo();
        } catch (e) {
            esito({ success: false, error: e.message || 'Cambio paziente non riuscito' }, '');
        }
    };

    const chiudiSeduta = async () => {
        await call('trasmissioni.chiudiLocale', { motivo: 'seduta chiusa dal monitor' });
        await ciclo();
    };

    const vivo = () => attivo && contenitore.isConnected !== false;

    const dichiara = async () => {
        const misura = misuraSchermo();
        const risposta = oggetto(await call('trasmissioni.dichiaraSchermo', misura), null);
        if (risposta && risposta.id && risposta.id !== densitaNota) {
            densitaNota = risposta.id;
        }
        return risposta;
    };

    const allaRidimensione = () => {
        if (!vivo()) {
            window.removeEventListener('resize', allaRidimensione);
            return;
        }
        if (attesaMisura) clearTimeout(attesaMisura);
        attesaMisura = setTimeout(dichiara, 400);
    };

    const ciclo = async () => {
        if (!attivo) return;
        const miaGenerazione = ++generazione;
        await dichiara();
        const rete = await statoRete();
        const istantanea = oggetto(await call('trasmissioni.attiva', {}), { presente: false, versione: 0 });
        if (miaGenerazione !== generazione || !attivo) return;
        ultimoMotivo = istantanea.presente ? '' : (istantanea.origine || '');
        versioneNota = istantanea.versione;
        disegna(istantanea, rete);
        avviaAttesa(rete);
    };

    const avviaAttesa = rete => {
        if (attesaInCorso) return;
        attesaInCorso = true;
        attendi(rete);
    };

    const attendi = async rete => {
        if (!vivo()) {
            attesaInCorso = false;
            return;
        }
        const miaGenerazione = generazione;
        try {
            await call('trasmissioni.heartbeatPostazione', {});
            const risposta = oggetto(
                await call('trasmissioni.attiva', { attendi: true, versione: versioneNota }),
                { presente: false, versione: versioneNota }
            );
            if (!vivo()) {
                attivo = false;
                attesaInCorso = false;
                return;
            }
            if (miaGenerazione !== generazione) {
                attesaInCorso = false;
                return;
            }
            if (risposta.versione !== versioneNota || (risposta.presente && versioneNota === 0)) {
                versioneNota = risposta.versione;
                ultimoMotivo = risposta.presente ? '' : (risposta.origine || '');
                const aggiornata = await statoRete();
                if (miaGenerazione !== generazione) {
                    attesaInCorso = false;
                    return;
                }
                disegna(risposta, aggiornata);
            }
        } catch (_) {}

        setTimeout(() => {
            if (!vivo() || miaGenerazione !== generazione) {
                attesaInCorso = false;
                return;
            }
            attendi(rete);
        }, 2000);
    };

    rimpiazza(contenitore, radice('pazienti', scheletro(4)));
    window.addEventListener('resize', allaRidimensione);
    ciclo();

    const telaio = el('div', { class: 'ds-monitor-full-view' }, [
        el('div', { class: 'ds-riunito__barra-controllo', dataset: { attesa: 'true' } }, [
            el('button', {
                class: 'ds-btn ds-btn--ghost ds-btn--piccolo',
                type: 'button',
                onClick: abbandona(indietro)
            }, [icona('arrow_back'), 'Esci dal Monitor']),
            onCambiaPostazione
                ? el('button', {
                    class: 'ds-btn ds-btn--ghost ds-btn--piccolo',
                    type: 'button',
                    onClick: abbandona(onCambiaPostazione)
                }, [icona('tune'), 'Postazione'])
                : null
        ].filter(Boolean)),
        contenitore
    ]);

    adattaAlTelaio(telaio);
    return telaio;
}

export default {
    rendi: async ({ parametri, naviga, indietro }) => {
        assicuraFoglio('riunito');
        assicuraFoglio('livelli');
        assicuraFoglio('monitor');
        assicuraFoglio('attesa');

        const [puoTrasmettere, puoRicevere, puoCambiarePaziente] = await Promise.all([
            can('trasmissione_invia'),
            can('trasmissione_ricevi'),
            can('trasmissione_cambia_paziente')
        ]);

        const reteIniziale = await statoRete();
        const postazioneIniziale = reteIniziale ? reteIniziale.postazione : null;
        const collegateIniziali = reteIniziale && reteIniziale.canali
            ? reteIniziale.canali.filter(voce => voce.ruolo === RUOLO_RIUNITO)
            : [];

        const contenitorePrincipale = el('div', { class: 'ds-monitor-medico-main' });
        let vistaCorrente = (parametri && parametri.modo) ? parametri.modo : 'scelta';

        const mostraScelta = async () => {
            const [rete, postazioniDati] = await Promise.all([
                statoRete(),
                call('trasmissioni.postazioni', {}).then(r => oggetto(r, { collegate: [] }))
            ]);
            const postazione = rete ? rete.postazione : null;
            const monitorOnlineCount = (postazioniDati.collegate || []).length;

            rimpiazza(contenitorePrincipale, [
                intestazione({
                    titolo: 'Monitor del Medico',
                    sottotitolo: 'Trasmissione e ricezione live delle cartelle cliniche e atti odontoiatrici',
                    simbolo: 'monitor',
                    indietro
                }),
                hubSceltaModalita({
                    monitorOnline: monitorOnlineCount,
                    postazione,
                    puoTrasmettere,
                    puoRicevere,
                    onScegliTrasmetti: () => apriTrasmetti(),
                    onScegliRicevi: () => apriRicevi()
                })
            ]);
        };

        const apriTrasmetti = async () => {
            if (!puoTrasmettere) {
                rimpiazza(contenitorePrincipale, radice('pazienti', vuoto({
                    titolo: 'Trasmissione non autorizzata',
                    testo: 'Per trasmettere una scheda al monitor serve il permesso "trasmissione_invia".',
                    simbolo: 'lock',
                    azione: el('button', {
                        class: 'ds-btn ds-btn--ghost',
                        type: 'button',
                        onClick: mostraScelta
                    }, 'Torna alla scelta')
                })));
                return;
            }

            const rete = await statoRete();
            const postazione = rete ? rete.postazione : null;

            rimpiazza(contenitorePrincipale, consoleTrasmissione({
                pazienteIniziale: parametri && parametri.paziente_id ? parametri.paziente_id : null,
                postazione,
                naviga,
                onIndietro: mostraScelta
            }));
        };

        const apriRicevi = async () => {
            if (!puoRicevere) {
                rimpiazza(contenitorePrincipale, radice('pazienti', vuoto({
                    titolo: 'Ricezione non autorizzata',
                    testo: 'Per usare questa postazione come monitor serve il permesso "trasmissione_ricevi".',
                    simbolo: 'lock',
                    azione: el('button', {
                        class: 'ds-btn ds-btn--ghost',
                        type: 'button',
                        onClick: mostraScelta
                    }, 'Torna alla scelta')
                })));
                return;
            }

            const rete = await statoRete();
            const postazione = rete ? rete.postazione : null;

            if (!postazione || postazione.ruolo !== RUOLO_RIUNITO) {
                mostraSelettorePostazione(postazione);
                return;
            }

            mostraLiveDisplay();
        };

        const mostraSelettorePostazione = (postazioneAttuale) => {
            rimpiazza(contenitorePrincipale, [
                intestazione({
                    titolo: 'Configura Postazione Monitor',
                    sottotitolo: 'Imposta il nome di questo schermo per renderlo riconoscibile dalla segreteria',
                    simbolo: 'tune',
                    indietro: mostraScelta
                }),
                selettorePostazioneModalita({
                    postazioneAttuale,
                    onSelezionato: async () => {
                        await call('postazioni.attiva', { attiva: true });
                        mostraLiveDisplay();
                    },
                    onAnnulla: mostraScelta
                })
            ]);
        };

        const mostraLiveDisplay = () => {
            rimpiazza(contenitorePrincipale, schermoDisplay({
                puoCambiarePaziente,
                indietro: mostraScelta,
                onCambiaPostazione: async () => {
                    const rete = await statoRete();
                    mostraSelettorePostazione(rete ? rete.postazione : null);
                }
            }));
        };

        if (vistaCorrente === 'trasmetti') {
            await apriTrasmetti();
        } else if (vistaCorrente === 'ricevi' || vistaCorrente === 'display') {
            await apriRicevi();
        } else {
            await mostraScelta();
        }

        return contenitorePrincipale;
    }
};
