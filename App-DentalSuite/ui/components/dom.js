const LISTENER = /^on[A-Z]/;
const NS_SVG = 'http://www.w3.org/2000/svg';

function applyProps(node, props, vettoriale) {
    Object.entries(props).forEach(([chiave, valore]) => {
        if (valore === null || valore === undefined || valore === false) return;
        if (chiave === 'class') {
            const nomi = Array.isArray(valore) ? valore.filter(Boolean).join(' ') : valore;
            if (vettoriale) node.setAttribute('class', nomi);
            else node.className = nomi;
            return;
        }
        if (chiave === 'dataset') {
            Object.entries(valore).forEach(([nome, dato]) => {
                if (dato !== null && dato !== undefined) node.dataset[nome] = String(dato);
            });
            return;
        }
        if (chiave === 'value' && !vettoriale) {
            node.value = valore;
            return;
        }
        if (!vettoriale && (chiave === 'checked' || chiave === 'disabled' || chiave === 'selected')) {
            node[chiave] = Boolean(valore);
            return;
        }
        if (LISTENER.test(chiave)) {
            node.addEventListener(chiave.slice(2).toLowerCase(), valore);
            return;
        }
        node.setAttribute(chiave, String(valore));
    });
}

function appendChild(node, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) {
        child.forEach(voce => appendChild(node, voce));
        return;
    }
    node.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
}

export function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    applyProps(node, props, false);
    appendChild(node, children);
    return node;
}

export function svg(tag, props = {}, children = []) {
    const node = document.createElementNS(NS_SVG, tag);
    applyProps(node, props, true);
    appendChild(node, children);
    return node;
}

export function frammento(children) {
    const contenitore = document.createDocumentFragment();
    appendChild(contenitore, children);
    return contenitore;
}

export function icona(nome, classe) {
    return el('span', { class: ['material-symbols-rounded', classe].filter(Boolean).join(' ') }, nome);
}

export function svuota(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
}

export function rimpiazza(node, contenuto) {
    svuota(node);
    appendChild(node, contenuto);
    return node;
}
