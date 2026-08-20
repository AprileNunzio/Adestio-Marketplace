const CUSPIDI = {
    incisivo_centrale: [],
    incisivo_laterale: [],
    canino: [],
    primo_premolare: [[-0.24, -0.16], [0.24, -0.16]],
    secondo_premolare: [[-0.24, -0.16], [0.24, -0.16]],
    primo_molare: [[-0.26, -0.22], [0.26, -0.22], [-0.26, 0.14], [0.26, 0.14]],
    secondo_molare: [[-0.25, -0.2], [0.25, -0.2], [-0.25, 0.12], [0.25, 0.12]],
    terzo_molare: [[-0.22, -0.16], [0.22, -0.16], [0, 0.16]]
};

function arrotonda(valore) {
    return Math.round(valore * 100) / 100;
}

export function profiloCorona(tipo, larghezza, altezza) {
    const a = larghezza / 2;
    const b = a * 0.78;
    const h = altezza / 2;
    const bombatura = altezza * 0.16;

    if (tipo === 'canino') {
        return [
            `M ${arrotonda(-a)} ${arrotonda(-h + bombatura * 0.6)}`,
            `Q ${arrotonda(-a * 0.55)} ${arrotonda(-h - bombatura)} 0 ${arrotonda(-h - bombatura * 1.35)}`,
            `Q ${arrotonda(a * 0.55)} ${arrotonda(-h - bombatura)} ${arrotonda(a)} ${arrotonda(-h + bombatura * 0.6)}`,
            `L ${arrotonda(b)} ${arrotonda(h - bombatura * 0.5)}`,
            `Q ${arrotonda(b * 0.6)} ${arrotonda(h + bombatura * 0.5)} 0 ${arrotonda(h + bombatura * 0.5)}`,
            `Q ${arrotonda(-b * 0.6)} ${arrotonda(h + bombatura * 0.5)} ${arrotonda(-b)} ${arrotonda(h - bombatura * 0.5)}`,
            'Z'
        ].join(' ');
    }

    return [
        `M ${arrotonda(-a)} ${arrotonda(-h + bombatura * 0.35)}`,
        `Q ${arrotonda(-a)} ${arrotonda(-h - bombatura * 0.75)} ${arrotonda(-a * 0.55)} ${arrotonda(-h - bombatura * 0.85)}`,
        `L ${arrotonda(a * 0.55)} ${arrotonda(-h - bombatura * 0.85)}`,
        `Q ${arrotonda(a)} ${arrotonda(-h - bombatura * 0.75)} ${arrotonda(a)} ${arrotonda(-h + bombatura * 0.35)}`,
        `L ${arrotonda(b)} ${arrotonda(h - bombatura * 0.6)}`,
        `Q ${arrotonda(b)} ${arrotonda(h + bombatura * 0.6)} ${arrotonda(b * 0.5)} ${arrotonda(h + bombatura * 0.6)}`,
        `L ${arrotonda(-b * 0.5)} ${arrotonda(h + bombatura * 0.6)}`,
        `Q ${arrotonda(-b)} ${arrotonda(h + bombatura * 0.6)} ${arrotonda(-b)} ${arrotonda(h - bombatura * 0.6)}`,
        'Z'
    ].join(' ');
}

export function cuspidiDi(tipo, larghezza, altezza) {
    const punti = CUSPIDI[tipo] || [];
    return punti.map(([fx, fy]) => ({
        cx: arrotonda(fx * larghezza),
        cy: arrotonda(fy * altezza),
        r: arrotonda(Math.min(larghezza, altezza) * 0.11)
    }));
}

export function solcoDi(tipo, larghezza, altezza) {
    if (tipo === 'primo_molare' || tipo === 'secondo_molare') {
        return [
            `M ${arrotonda(-larghezza * 0.3)} ${arrotonda(-altezza * 0.04)}`,
            `L ${arrotonda(larghezza * 0.3)} ${arrotonda(-altezza * 0.04)}`,
            `M 0 ${arrotonda(-altezza * 0.28)}`,
            `L 0 ${arrotonda(altezza * 0.2)}`
        ].join(' ');
    }
    if (tipo === 'primo_premolare' || tipo === 'secondo_premolare') {
        return `M ${arrotonda(-larghezza * 0.22)} ${arrotonda(-altezza * 0.16)} L ${arrotonda(larghezza * 0.22)} ${arrotonda(-altezza * 0.16)}`;
    }
    if (tipo === 'incisivo_centrale' || tipo === 'incisivo_laterale') {
        return `M ${arrotonda(-larghezza * 0.26)} ${arrotonda(-altezza * 0.3)} L ${arrotonda(larghezza * 0.26)} ${arrotonda(-altezza * 0.3)}`;
    }
    return '';
}

export function settoriSuperficie(larghezza, altezza) {
    const a = larghezza / 2;
    const h = altezza / 2;
    const interno = Math.min(a, h) * 0.42;
    return {
        O: `M ${arrotonda(-interno)} ${arrotonda(-interno)} H ${arrotonda(interno)} V ${arrotonda(interno)} H ${arrotonda(-interno)} Z`,
        V: `M ${arrotonda(-a)} ${arrotonda(-h)} L ${arrotonda(a)} ${arrotonda(-h)} L ${arrotonda(interno)} ${arrotonda(-interno)} L ${arrotonda(-interno)} ${arrotonda(-interno)} Z`,
        L: `M ${arrotonda(-a)} ${arrotonda(h)} L ${arrotonda(a)} ${arrotonda(h)} L ${arrotonda(interno)} ${arrotonda(interno)} L ${arrotonda(-interno)} ${arrotonda(interno)} Z`,
        M: `M ${arrotonda(-a)} ${arrotonda(-h)} L ${arrotonda(-interno)} ${arrotonda(-interno)} L ${arrotonda(-interno)} ${arrotonda(interno)} L ${arrotonda(-a)} ${arrotonda(h)} Z`,
        D: `M ${arrotonda(a)} ${arrotonda(-h)} L ${arrotonda(interno)} ${arrotonda(-interno)} L ${arrotonda(interno)} ${arrotonda(interno)} L ${arrotonda(a)} ${arrotonda(h)} Z`
    };
}
