const SOGLIA = 0.08;
const MARGINE = '0px 0px -8% 0px';

function riduzioneMovimento() {
    try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (errore) {
        return true;
    }
}

function mostra(nodo) {
    nodo.dataset.visibile = 'true';
}

function nascondi(nodo, indice) {
    nodo.style.setProperty('--ds-ritardo', `${Math.min(indice, 6) * 70}ms`);
    nodo.dataset.visibile = 'false';
}

export function attivaRivelazione(contenitore) {
    const nodi = [...contenitore.querySelectorAll('[data-rivela="true"]')];
    if (nodi.length === 0) return () => {};

    if (riduzioneMovimento() || typeof IntersectionObserver !== 'function') {
        nodi.forEach(mostra);
        return () => {};
    }

    nodi.forEach(nascondi);

    const osservatore = new IntersectionObserver(voci => {
        for (const voce of voci) {
            if (!voce.isIntersecting) continue;
            mostra(voce.target);
            osservatore.unobserve(voce.target);
        }
    }, { threshold: SOGLIA, rootMargin: MARGINE });

    for (const nodo of nodi) osservatore.observe(nodo);

    const salvagente = setTimeout(() => nodi.forEach(mostra), 2500);
    if (typeof salvagente.unref === 'function') salvagente.unref();

    return () => {
        clearTimeout(salvagente);
        osservatore.disconnect();
    };
}
