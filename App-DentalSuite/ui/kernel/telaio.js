const RESPIRO = 8;

function altezzaSuperiore() {
    try {
        const barra = document.getElementById('title-bar') || document.querySelector('.title-bar');
        if (!barra) return 0;
        const misura = barra.getBoundingClientRect();
        if (misura.height <= 0) return 0;
        if (misura.top > 2) return 0;
        return Math.max(0, Math.round(misura.bottom));
    } catch (e) {
        return 0;
    }
}

const CANDIDATI_INFERIORI = ['#status-bar', '.status-bar', '#app-footer', '.app-footer'];

function invasioneDi(nodo) {
    try {
        if (!nodo) return 0;
        const misura = nodo.getBoundingClientRect();
        if (misura.height <= 0 || misura.width <= 0) return 0;
        const invasione = window.innerHeight - misura.top;
        if (invasione <= 0) return 0;
        return Math.round(Math.min(invasione, misura.height + Math.max(0, window.innerHeight - misura.bottom)));
    } catch (e) {
        return 0;
    }
}

function altezzaInferiore() {
    try {
        let massima = 0;
        for (const selettore of CANDIDATI_INFERIORI) {
            document.querySelectorAll(selettore).forEach(nodo => {
                massima = Math.max(massima, invasioneDi(nodo));
            });
        }
        return massima > 0 ? massima + RESPIRO : 0;
    } catch (e) {
        return 0;
    }
}

export function adattaAlTelaio(nodo) {
    const bersaglio = nodo && nodo.style ? nodo : document.documentElement;

    const misura = () => {
        try {
            const alto = `${altezzaSuperiore()}px`;
            const basso = `${altezzaInferiore()}px`;
            bersaglio.style.setProperty('--mn-telaio-alto', alto);
            bersaglio.style.setProperty('--mn-telaio-basso', basso);
            document.documentElement.style.setProperty('--mn-telaio-alto', alto);
            document.documentElement.style.setProperty('--mn-telaio-basso', basso);
        } catch (e) {}
    };

    misura();
    window.setTimeout(misura, 120);

    let attesa = null;
    const allaRidimensione = () => {
        if (attesa) window.clearTimeout(attesa);
        attesa = window.setTimeout(misura, 100);
    };

    window.addEventListener('resize', allaRidimensione);

    return () => {
        try {
            if (attesa) window.clearTimeout(attesa);
            window.removeEventListener('resize', allaRidimensione);
        } catch (e) {}
    };
}
