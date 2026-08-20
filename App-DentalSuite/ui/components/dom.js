const LISTENER = /^on[A-Z]/;

function applyProps(node, props) {
    Object.entries(props).forEach(([chiave, valore]) => {
        if (valore === null || valore === undefined || valore === false) return;
        if (chiave === 'class') {
            node.className = Array.isArray(valore) ? valore.filter(Boolean).join(' ') : valore;
            return;
        }
        if (chiave === 'dataset') {
            Object.entries(valore).forEach(([nome, dato]) => {
                if (dato !== null && dato !== undefined) node.dataset[nome] = String(dato);
            });
            return;
        }
        if (chiave === 'value') {
            node.value = valore;
            return;
        }
        if (chiave === 'checked' || chiave === 'disabled' || chiave === 'selected') {
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
    applyProps(node, props);
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
