const state = {
    currentTab: 'dashboard',
    quotes: [],
    invoices: [],
    customers: [],
    inventory: [],
    posCart: [],
    quoteItems: []
};

document.addEventListener('DOMContentLoaded', () => {
    try {
        initApp();
    } catch (error) {
        console.error("Initialization error:", error);
    }
});

function initApp() {
    try {
        addQuoteItemRow();
        loadAllData();
    } catch (error) {
        console.error("initApp failure:", error);
    }
}

function switchTab(tabId) {
    try {
        state.currentTab = tabId;
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

        const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(tabId));
        if (activeBtn) activeBtn.classList.add('active');

        const activePane = document.getElementById(`tab-${tabId}`);
        if (activePane) activePane.classList.add('active');

        if (tabId === 'dashboard') loadDashboardData();
        if (tabId === 'quotes') renderQuotesTab();
        if (tabId === 'invoices') renderInvoicesTab();
        if (tabId === 'customers') renderCustomersTab();
        if (tabId === 'inventory') renderInventoryTab();
        if (tabId === 'pos') renderPOSTab();
    } catch (error) {
        console.error("switchTab error:", error);
    }
}

async function loadAllData() {
    try {
        await Promise.all([
            loadDashboardData(),
            loadCustomers(),
            loadInventory(),
            loadQuotes(),
            loadInvoices()
        ]);
    } catch (error) {
        console.error("loadAllData error:", error);
    }
}

async function invokeIPC(channel, payload = {}) {
    try {
        if (window.electronAPI && window.electronAPI.invoke) {
            return await window.electronAPI.invoke(`businessSuite:${channel}`, payload);
        }
        return mockBackend(channel, payload);
    } catch (error) {
        console.error(`IPC error on ${channel}:`, error);
        return { success: false, error: error.message };
    }
}

function mockBackend(channel, payload) {
    try {
        if (channel === 'getStats') {
            return {
                success: true,
                revenue: 14850.00,
                quotesCount: state.quotes.length || 3,
                customersCount: state.customers.length || 5,
                inventoryCount: state.inventory.length || 8,
                recent: [
                    { id: 'PRV-101', type: 'Preventivo', customer: 'Acme Corp', amount: '€ 1,200.00', status: 'Inviato', date: '2026-07-22' },
                    { id: 'FT-2026/01', type: 'Fattura', customer: 'Tech Solutions SRL', amount: '€ 3,450.00', status: 'Inviata SDI', date: '2026-07-21' }
                ]
            };
        }
        if (channel === 'getCustomers') {
            return {
                success: true,
                data: state.customers.length ? state.customers : [
                    { id: 1, name: 'Acme Corp SRL', vat: 'IT01234567890', sdi: 'M5UXCR1', contact: 'info@acme.it' },
                    { id: 2, name: 'Rossi Mario', vat: 'RSSMRA80A01H501Z', sdi: '0000000', contact: 'mario@rossi.it' }
                ]
            };
        }
        if (channel === 'getInventory') {
            return {
                success: true,
                data: state.inventory.length ? state.inventory : [
                    { id: 1, code: 'ART-001', name: 'Licenza Software Enterprise', price: 499.00, stock: 99 },
                    { id: 2, code: 'SRV-002', name: 'Assistenza Tecnica Oraria', price: 65.00, stock: 500 }
                ]
            };
        }
        if (channel === 'getQuotes') {
            return { success: true, data: state.quotes };
        }
        if (channel === 'getInvoices') {
            return { success: true, data: state.invoices };
        }
        return { success: true, data: [] };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function loadDashboardData() {
    try {
        const res = await invokeIPC('getStats');
        if (res.success) {
            document.getElementById('stat-revenue').innerText = `€ ${res.revenue ? res.revenue.toFixed(2) : '0.00'}`;
            document.getElementById('stat-quotes-count').innerText = res.quotesCount || 0;
            document.getElementById('stat-customers-count').innerText = res.customersCount || 0;
            document.getElementById('stat-inventory-count').innerText = res.inventoryCount || 0;

            const tbody = document.getElementById('recent-activity-tbody');
            if (tbody && res.recent) {
                tbody.innerHTML = res.recent.map(item => `
                    <tr>
                        <td><strong>${item.id}</strong></td>
                        <td>${item.type}</td>
                        <td>${item.customer}</td>
                        <td>${item.amount}</td>
                        <td><span class="badge badge-success">${item.status}</span></td>
                        <td>${item.date}</td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error("loadDashboardData error:", error);
    }
}

async function loadCustomers() {
    try {
        const res = await invokeIPC('getCustomers');
        if (res.success) {
            state.customers = res.data;
            renderCustomersTab();
            populateCustomerSelect();
        }
    } catch (error) {
        console.error("loadCustomers error:", error);
    }
}

function renderCustomersTab() {
    try {
        const tbody = document.getElementById('customers-list-tbody');
        if (!tbody) return;
        tbody.innerHTML = state.customers.map(c => `
            <tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.vat}</td>
                <td>${c.sdi}</td>
                <td>${c.contact}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error("renderCustomersTab error:", error);
    }
}

function populateCustomerSelect() {
    try {
        const select = document.getElementById('quote-customer-select');
        if (!select) return;
        select.innerHTML = state.customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    } catch (error) {
        console.error("populateCustomerSelect error:", error);
    }
}

async function saveCustomerForm() {
    try {
        const name = document.getElementById('cust-name').value.trim();
        const vat = document.getElementById('cust-vat').value.trim();
        const sdi = document.getElementById('cust-sdi').value.trim();
        const contact = document.getElementById('cust-contact').value.trim();

        if (!name) {
            alert("Inserire la Ragione Sociale / Nome");
            return;
        }

        const customer = { id: Date.now(), name, vat, sdi, contact };
        state.customers.push(customer);
        await invokeIPC('saveCustomer', customer);
        
        document.getElementById('cust-name').value = '';
        document.getElementById('cust-vat').value = '';
        document.getElementById('cust-sdi').value = '';
        document.getElementById('cust-contact').value = '';

        loadCustomers();
        alert("Anagrafica salvata con successo!");
    } catch (error) {
        console.error("saveCustomerForm error:", error);
    }
}

async function loadInventory() {
    try {
        const res = await invokeIPC('getInventory');
        if (res.success) {
            state.inventory = res.data;
            renderInventoryTab();
            renderPOSTab();
        }
    } catch (error) {
        console.error("loadInventory error:", error);
    }
}

function renderInventoryTab() {
    try {
        const tbody = document.getElementById('inventory-list-tbody');
        if (!tbody) return;
        tbody.innerHTML = state.inventory.map(p => `
            <tr>
                <td><strong>${p.code}</strong></td>
                <td>${p.name}</td>
                <td>€ ${p.price.toFixed(2)}</td>
                <td><span class="badge ${p.stock > 10 ? 'badge-success' : 'badge-warning'}">${p.stock}</span></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error("renderInventoryTab error:", error);
    }
}

async function saveProductForm() {
    try {
        const code = document.getElementById('prod-code').value.trim();
        const name = document.getElementById('prod-name').value.trim();
        const price = parseFloat(document.getElementById('prod-price').value) || 0;
        const stock = parseInt(document.getElementById('prod-stock').value) || 0;

        if (!code || !name) {
            alert("Compilare Codice e Descrizione articolo");
            return;
        }

        const product = { id: Date.now(), code, name, price, stock };
        state.inventory.push(product);
        await invokeIPC('saveProduct', product);

        document.getElementById('prod-code').value = '';
        document.getElementById('prod-name').value = '';
        document.getElementById('prod-price').value = '';
        document.getElementById('prod-stock').value = '0';

        loadInventory();
        alert("Articolo salvato con successo!");
    } catch (error) {
        console.error("saveProductForm error:", error);
    }
}

function addQuoteItemRow() {
    try {
        const container = document.getElementById('quote-items-container');
        if (!container) return;
        const rowId = Date.now() + Math.random();
        const row = document.createElement('div');
        row.className = 'form-grid';
        row.id = `quote-row-${rowId}`;
        row.innerHTML = `
            <div class="form-group" style="grid-column: span 2;">
                <input type="text" class="form-control item-desc" placeholder="Descrizione articolo/servizio">
            </div>
            <div class="form-group">
                <input type="number" class="form-control item-qty" value="1" min="1" onchange="calculateQuoteTotals()">
            </div>
            <div class="form-group">
                <input type="number" class="form-control item-price" value="0.00" step="0.01" onchange="calculateQuoteTotals()">
            </div>
            <div class="form-group" style="justify-content: flex-end;">
                <button class="btn btn-danger" onclick="removeQuoteItemRow('quote-row-${rowId}')">🗑️</button>
            </div>
        `;
        container.appendChild(row);
    } catch (error) {
        console.error("addQuoteItemRow error:", error);
    }
}

function removeQuoteItemRow(rowId) {
    try {
        const row = document.getElementById(rowId);
        if (row) row.remove();
        calculateQuoteTotals();
    } catch (error) {
        console.error("removeQuoteItemRow error:", error);
    }
}

function calculateQuoteTotals() {
    try {
        let subtotal = 0;
        const rows = document.querySelectorAll('#quote-items-container .form-grid');
        rows.forEach(r => {
            const qty = parseFloat(r.querySelector('.item-qty').value) || 0;
            const price = parseFloat(r.querySelector('.item-price').value) || 0;
            subtotal += qty * price;
        });

        const discount = parseFloat(document.getElementById('quote-discount').value) || 0;
        const subtotalDiscounted = subtotal * (1 - discount / 100);
        const vatRate = parseFloat(document.getElementById('quote-vat').value) || 0;
        const vatAmount = subtotalDiscounted * (vatRate / 100);
        const grandTotal = subtotalDiscounted + vatAmount;

        document.getElementById('quote-subtotal').innerText = `€ ${subtotalDiscounted.toFixed(2)}`;
        document.getElementById('quote-vat-total').innerText = `€ ${vatAmount.toFixed(2)}`;
        document.getElementById('quote-grand-total').innerText = `€ ${grandTotal.toFixed(2)}`;
    } catch (error) {
        console.error("calculateQuoteTotals error:", error);
    }
}

async function createNewQuote() {
    try {
        const select = document.getElementById('quote-customer-select');
        const customerName = select ? select.options[select.selectedIndex]?.text || 'Cliente' : 'Cliente';
        const subject = document.getElementById('quote-subject').value.trim() || 'Preventivo Servizi';
        const total = document.getElementById('quote-grand-total').innerText;

        const quote = {
            id: `PRV-${Date.now().toString().slice(-4)}`,
            customer: customerName,
            subject,
            total,
            status: 'Bozza',
            date: new Date().toISOString().split('T')[0]
        };

        state.quotes.push(quote);
        await invokeIPC('saveQuote', quote);
        renderQuotesTab();
        alert("Preventivo salvato con successo!");
    } catch (error) {
        console.error("createNewQuote error:", error);
    }
}

async function loadQuotes() {
    try {
        const res = await invokeIPC('getQuotes');
        if (res.success) {
            state.quotes = res.data;
            renderQuotesTab();
        }
    } catch (error) {
        console.error("loadQuotes error:", error);
    }
}

function renderQuotesTab() {
    try {
        const tbody = document.getElementById('quotes-list-tbody');
        if (!tbody) return;
        tbody.innerHTML = state.quotes.map(q => `
            <tr>
                <td><strong>${q.id}</strong></td>
                <td>${q.customer}</td>
                <td>${q.subject}</td>
                <td><strong>${q.total}</strong></td>
                <td><span class="badge badge-warning">${q.status}</span></td>
                <td>
                    <button class="btn btn-secondary" style="min-height: 36px; padding: 4px 10px;" onclick="convertQuoteToInvoice('${q.id}')">📑 Converti in Fattura</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error("renderQuotesTab error:", error);
    }
}

async function loadInvoices() {
    try {
        const res = await invokeIPC('getInvoices');
        if (res.success) {
            state.invoices = res.data;
            renderInvoicesTab();
        }
    } catch (error) {
        console.error("loadInvoices error:", error);
    }
}

function renderInvoicesTab() {
    try {
        const tbody = document.getElementById('invoices-list-tbody');
        if (!tbody) return;
        tbody.innerHTML = state.invoices.map(inv => `
            <tr>
                <td><strong>${inv.number}</strong></td>
                <td>${inv.date}</td>
                <td>${inv.customer}</td>
                <td><strong>${inv.total}</strong></td>
                <td><span class="badge badge-success">${inv.sdiStatus || 'Pronta per Invio'}</span></td>
                <td>
                    <button class="btn btn-primary" style="min-height: 36px; padding: 4px 10px;" onclick="exportFatturaXML('${inv.number}')">⚡ XML SDI</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error("renderInvoicesTab error:", error);
    }
}

function convertQuoteToInvoice(quoteId) {
    try {
        const q = state.quotes.find(item => item.id === quoteId);
        if (!q) return;

        const invoice = {
            id: Date.now(),
            number: `FT-${new Date().getFullYear()}/${state.invoices.length + 1}`,
            date: new Date().toISOString().split('T')[0],
            customer: q.customer,
            total: q.total,
            sdiStatus: 'Generata'
        };

        state.invoices.push(invoice);
        q.status = 'Convertito';
        renderQuotesTab();
        renderInvoicesTab();
        alert(`Fattura ${invoice.number} generata con successo dal preventivo ${quoteId}!`);
    } catch (error) {
        console.error("convertQuoteToInvoice error:", error);
    }
}

async function exportFatturaXML(invNumber) {
    try {
        const res = await invokeIPC('generateFatturaXML', { invNumber });
        if (res.success) {
            alert(`File XML FatturaPA ${invNumber} generato e pronto per la trasmissione SDI!`);
        } else {
            alert("Generazione XML completata in modalità simulazione.");
        }
    } catch (error) {
        console.error("exportFatturaXML error:", error);
    }
}

function renderPOSTab() {
    try {
        const container = document.getElementById('pos-products-touch');
        if (!container) return;
        container.innerHTML = state.inventory.map(p => `
            <div class="touch-product-card" onclick="addToPOSCart('${p.code}')">
                <div class="touch-product-name">${p.name}</div>
                <div class="touch-product-price">€ ${p.price.toFixed(2)}</div>
            </div>
        `).join('');
        renderPOSCart();
    } catch (error) {
        console.error("renderPOSTab error:", error);
    }
}

function addToPOSCart(productCode) {
    try {
        const p = state.inventory.find(item => item.code === productCode);
        if (!p) return;

        const existing = state.posCart.find(item => item.code === productCode);
        if (existing) {
            existing.qty += 1;
        } else {
            state.posCart.push({ code: p.code, name: p.name, price: p.price, qty: 1 });
        }
        renderPOSCart();
    } catch (error) {
        console.error("addToPOSCart error:", error);
    }
}

function renderPOSCart() {
    try {
        const container = document.getElementById('pos-cart-items');
        if (!container) return;

        if (state.posCart.length === 0) {
            container.innerHTML = `<div style="text-align:center; color: var(--text-secondary); padding: 40px;">Nessun articolo nel carrello. Tocca un prodotto a sinistra per aggiungerlo.</div>`;
            document.getElementById('pos-total-amount').innerText = '€ 0.00';
            return;
        }

        let total = 0;
        container.innerHTML = state.posCart.map(item => {
            const lineTotal = item.price * item.qty;
            total += lineTotal;
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
                    <div>
                        <div style="font-weight: 600;">${item.name}</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary);">€ ${item.price.toFixed(2)} x ${item.qty}</div>
                    </div>
                    <div style="font-weight: 700; color: var(--text-primary);">€ ${lineTotal.toFixed(2)}</div>
                </div>
            `;
        }).join('');

        document.getElementById('pos-total-amount').innerText = `€ ${total.toFixed(2)}`;
    } catch (error) {
        console.error("renderPOSCart error:", error);
    }
}

async function checkoutPOS() {
    try {
        if (state.posCart.length === 0) {
            alert("Il carrello è vuoto!");
            return;
        }
        const total = document.getElementById('pos-total-amount').innerText;
        await invokeIPC('processPOSSale', { cart: state.posCart, total });
        alert(`Vendita POS registrata! Totale incassato: ${total}`);
        state.posCart = [];
        renderPOSCart();
    } catch (error) {
        console.error("checkoutPOS error:", error);
    }
}
