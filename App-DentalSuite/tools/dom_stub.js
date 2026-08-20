'use strict';

class NodoTesto {
    constructor(valore) {
        this.nodeValue = String(valore);
        this.parentNode = null;
        this.childNodes = [];
        this.tagName = '#text';
        this.classi = new Set();
        this.attributi = new Map();
    }

    get textContent() {
        return this.nodeValue;
    }
}

class Elemento extends NodoTesto {
    constructor(tag) {
        super('');
        this.tagName = String(tag).toUpperCase();
        this.style = {};
        this.dataset = {};
        this.value = '';
        this.checked = false;
        this.disabled = false;
        this.ascoltatori = new Map();
        this.classList = {
            add: nome => this.classi.add(nome),
            remove: nome => this.classi.delete(nome),
            contains: nome => this.classi.has(nome)
        };
    }

    get className() {
        return [...this.classi].join(' ');
    }

    set className(valore) {
        this.classi = new Set(String(valore).split(/\s+/).filter(Boolean));
    }

    get isConnected() {
        let corrente = this;
        while (corrente.parentNode) corrente = corrente.parentNode;
        return corrente.radiceDocumento === true;
    }

    get firstChild() {
        return this.childNodes.length > 0 ? this.childNodes[0] : null;
    }

    get textContent() {
        return this.childNodes.map(figlio => figlio.textContent).join('');
    }

    set textContent(valore) {
        this.childNodes = [];
        if (valore !== '') this.appendChild(new NodoTesto(valore));
    }

    setAttribute(nome, valore) {
        if (nome === 'class') {
            this.className = String(valore);
            return;
        }
        this.attributi.set(nome, String(valore));
    }

    getAttribute(nome) {
        return this.attributi.has(nome) ? this.attributi.get(nome) : null;
    }

    removeAttribute(nome) {
        this.attributi.delete(nome);
    }

    appendChild(nodo) {
        nodo.parentNode = this;
        this.childNodes.push(nodo);
        return nodo;
    }

    removeChild(nodo) {
        const indice = this.childNodes.indexOf(nodo);
        if (indice >= 0) this.childNodes.splice(indice, 1);
        nodo.parentNode = null;
        return nodo;
    }

    remove() {
        if (this.parentNode) this.parentNode.removeChild(this);
    }

    addEventListener(tipo, gestore) {
        if (!this.ascoltatori.has(tipo)) this.ascoltatori.set(tipo, []);
        this.ascoltatori.get(tipo).push(gestore);
    }

    removeEventListener(tipo, gestore) {
        const elenco = this.ascoltatori.get(tipo) || [];
        const indice = elenco.indexOf(gestore);
        if (indice >= 0) elenco.splice(indice, 1);
    }

    async emetti(tipo, evento = {}) {
        const elenco = [...(this.ascoltatori.get(tipo) || [])];
        for (const gestore of elenco) {
            await gestore({ target: this, currentTarget: this, preventDefault() {}, ...evento });
        }
    }

    focus() {
        this.focalizzato = true;
    }

    closest(selettore) {
        let corrente = this;
        while (corrente) {
            if (corrente instanceof Elemento && corrisponde(corrente, selettore)) return corrente;
            corrente = corrente.parentNode;
        }
        return null;
    }

    discendenti() {
        const risultato = [];
        const visita = nodo => {
            nodo.childNodes.forEach(figlio => {
                if (figlio instanceof Elemento) {
                    risultato.push(figlio);
                    visita(figlio);
                }
            });
        };
        visita(this);
        return risultato;
    }

    querySelectorAll(selettore) {
        const parti = String(selettore).split(',').map(voce => voce.trim()).filter(Boolean);
        return this.discendenti().filter(nodo => parti.some(parte => corrisponde(nodo, parte)));
    }

    querySelector(selettore) {
        const trovati = this.querySelectorAll(selettore);
        return trovati.length > 0 ? trovati[0] : null;
    }
}

function corrisponde(nodo, selettore) {
    if (selettore.startsWith('.')) return nodo.classi.has(selettore.slice(1));
    if (selettore.startsWith('#')) return nodo.getAttribute('id') === selettore.slice(1);
    if (selettore.startsWith('[')) {
        const trovato = /^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(selettore);
        if (!trovato) return false;
        const valore = nodo.getAttribute(trovato[1]);
        return trovato[2] === undefined ? valore !== null : valore === trovato[2];
    }
    return nodo.tagName === selettore.toUpperCase();
}

class Frammento extends Elemento {
    constructor() {
        super('#fragment');
    }
}

function creaDocumento() {
    const documento = {
        radiceDocumento: true,
        ascoltatori: new Map(),
        createElement: tag => new Elemento(tag),
        createElementNS: (spazio, tag) => new Elemento(tag),
        createTextNode: valore => new NodoTesto(valore),
        createDocumentFragment: () => new Frammento(),
        addEventListener(tipo, gestore) {
            if (!this.ascoltatori.has(tipo)) this.ascoltatori.set(tipo, []);
            this.ascoltatori.get(tipo).push(gestore);
        },
        removeEventListener(tipo, gestore) {
            const elenco = this.ascoltatori.get(tipo) || [];
            const indice = elenco.indexOf(gestore);
            if (indice >= 0) elenco.splice(indice, 1);
        }
    };
    documento.body = new Elemento('body');
    documento.head = new Elemento('head');
    documento.body.parentNode = documento;
    documento.head.parentNode = documento;
    documento.querySelector = selettore => documento.body.querySelector(selettore);
    documento.querySelectorAll = selettore => documento.body.querySelectorAll(selettore);
    return documento;
}

function installa() {
    const documento = creaDocumento();
    global.Node = NodoTesto;
    global.document = documento;
    global.window = global.window || {};
    global.sessionStorage = {
        dati: new Map(),
        getItem(chiave) { return this.dati.has(chiave) ? this.dati.get(chiave) : null; },
        setItem(chiave, valore) { this.dati.set(chiave, String(valore)); },
        removeItem(chiave) { this.dati.delete(chiave); }
    };
    return documento;
}

function testoDi(nodo) {
    return nodo ? nodo.textContent : '';
}

module.exports = { installa, Elemento, NodoTesto, testoDi };
