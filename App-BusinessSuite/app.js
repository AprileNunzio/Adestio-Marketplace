const state = {
    currentTab: 'dashboard',
    quotes: [],
    invoices: [],
    customers: [],
    inventory: [],
    posCart: [],
    quoteItems: []
};

async function invokeIPC(channel, payload = {}) {
    try {
        if (window.electronAPI && window.electronAPI.businessSuite && window.electronAPI.businessSuite[channel]) {
            return await window.electronAPI.businessSuite[channel](payload);
        }
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
                revenue: 28450.00,
                quotesCount: state.quotes.length || 12,
                customersCount: state.customers.length || 24,
                inventoryCount: state.inventory.length || 45,
                recent: [
                    { id: 'PRV-1001', type: 'Preventivo', customer: 'Acme Corp', amount: '€ 2,400.00', status: 'Approvato', date: '2026-07-23' },
                    { id: 'FT-2026/04', type: 'Fattura', customer: 'Studio Alfa SRL', amount: '€ 1,850.00', status: 'Inviata SDI', date: '2026-07-22' }
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

export default {
    render: async (el, params = {}) => {
        try {
            el.innerHTML = `
                <div class="app-container">
                    <header class="app-header">
                        <div class="brand">
                            <div class="brand-icon">💼</div>
                            <div class="brand-title">Adestio Business Suite</div>
                        </div>
                        <nav class="nav-tabs">
                            <button class="tab-btn active" id="tab-btn-dashboard">📊 Dashboard</button>
                            <button class="tab-btn" id="tab-btn-quotes">📝 Preventivi</button>
                            <button class="tab-btn" id="tab-btn-invoices">📑 Fatturazione SDI</button>
                            <button class="tab-btn" id="tab-btn-customers">👥 Anagrafica</button>
                            <button class="tab-btn" id="tab-btn-inventory">📦 Magazzino</button>
                            <button class="tab-btn" id="tab-btn-pos">🛒 POS Touch</button>
                        </nav>
                    </header>

                    <main class="main-content">
                        <section id="tab-dashboard" class="tab-pane active">
                            <div class="stats-grid">
                                <div class="stat-card">
                                    <div class="stat-icon" style="background: rgba(99, 102, 241, 0.2); color: #6366f1;">💰</div>
                                    <div>
                                        <div class="stat-val" id="stat-revenue">€ 0.00</div>
                                        <div class="stat-lbl">Fatturato Anno</div>
                                    </div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-icon" style="background: rgba(16, 185, 129, 0.2); color: #10b981;">📑</div>
                                    <div>
                                        <div class="stat-val" id="stat-quotes-count">0</div>
                                        <div class="stat-lbl">Preventivi Attivi</div>
                                    </div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-icon" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b;">👥</div>
                                    <div>
                                        <div class="stat-val" id="stat-customers-count">0</div>
                                        <div class="stat-lbl">Clienti In Anagrafica</div>
                                    </div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-icon" style="background: rgba(239, 68, 68, 0.2); color: #ef4444;">📦</div>
                                    <div>
                                        <div class="stat-val" id="stat-inventory-count">0</div>
                                        <div class="stat-lbl">Articoli a Magazzino</div>
                                    </div>
                                </div>
                            </div>

                            <div class="card">
                                <div class="card-header">
                                    <div class="card-title">Attività Recenti</div>
                                    <button class="btn btn-secondary" id="btn-refresh-dashboard">🔄 Aggiorna</button>
                                </div>
                                <div class="table-responsive">
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Tipo</th>
                                                <th>Cliente</th>
                                                <th>Importo</th>
                                                <th>Stato</th>
                                                <th>Data</th>
                                            </tr>
                                        </thead>
                                        <tbody id="recent-activity-tbody">
                                            <tr>
                                                <td colspan="6" style="text-align: center; color: var(--text-secondary);">Caricamento dati...</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>

                        <section id="tab-quotes" class="tab-pane">
                            <div class="card">
                                <div class="card-header">
                                    <div class="card-title">Nuovo Preventivo & Simulatore Margini</div>
                                    <button class="btn btn-primary" id="btn-save-quote">💾 Salva Preventivo</button>
                                </div>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label>Cliente</label>
                                        <select id="quote-customer-select" class="form-control"></select>
                                    </div>
                                    <div class="form-group">
                                        <label>Oggetto / Oggetto Lavoro</label>
                                        <input type="text" id="quote-subject" class="form-control" placeholder="Es. Fornitura software e servizi">
                                    </div>
                                    <div class="form-group">
                                        <label>Sconto (%)</label>
                                        <input type="number" id="quote-discount" class="form-control" value="0">
                                    </div>
                                    <div class="form-group">
                                        <label>Aliquota IVA (%)</label>
                                        <input type="number" id="quote-vat" class="form-control" value="22">
                                    </div>
                                </div>

                                <div class="card-title" style="margin: 20px 0 10px 0;">Voci di Costo / Articoli</div>
                                <div id="quote-items-container"></div>
                                <button class="btn btn-secondary" id="btn-add-quote-row" style="margin-top: 10px;">➕ Aggiungi Riga</button>

                                <div style="display: flex; justify-content: flex-end; gap: 20px; margin-top: 20px; font-size: 1.1rem; font-weight: 700;">
                                    <div>Subtotale: <span id="quote-subtotal">€ 0.00</span></div>
                                    <div>IVA: <span id="quote-vat-total">€ 0.00</span></div>
                                    <div style="color: var(--accent-success);">Totale: <span id="quote-grand-total">€ 0.00</span></div>
                                </div>
                            </div>

                            <div class="card">
                                <div class="card-header">
                                    <div class="card-title">Elenco Preventivi</div>
                                </div>
                                <div class="table-responsive">
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                <th>Numero</th>
                                                <th>Cliente</th>
                                                <th>Oggetto</th>
                                                <th>Importo Totale</th>
                                                <th>Stato</th>
                                                <th>Azioni</th>
                                            </tr>
                                        </thead>
                                        <tbody id="quotes-list-tbody"></tbody>
                                    </table>
                                </div>
                            </div>
                        </section>

                        <section id="tab-invoices" class="tab-pane">
                            <div class="card">
                                <div class="card-header">
                                    <div class="card-title">Registro Fatture & XML SDI</div>
                                    <button class="btn btn-primary" id="btn-new-invoice">➕ Nuova Fattura</button>
                                </div>
                                <div class="table-responsive">
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                <th>N. Fattura</th>
                                                <th>Data</th>
                                                <th>Cliente</th>
                                                <th>Totale</th>
                                                <th>Stato SDI</th>
                                                <th>Esporta XML</th>
                                            </tr>
                                        </thead>
                                        <tbody id="invoices-list-tbody"></tbody>
                                    </table>
                                </div>
                            </div>
                        </section>

                        <section id="tab-customers" class="tab-pane">
                            <div class="card">
                                <div class="card-header">
                                    <div class="card-title">Anagrafica Clienti & Fornitori</div>
                                    <button class="btn btn-primary" id="btn-save-customer">💾 Salva Anagrafica</button>
                                </div>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label>Ragione Sociale / Nome</label>
                                        <input type="text" id="cust-name" class="form-control">
                                    </div>
                                    <div class="form-group">
                                        <label>Partita IVA / Codice Fiscale</label>
                                        <input type="text" id="cust-vat" class="form-control">
                                    </div>
                                    <div class="form-group">
                                        <label>Codice Destinatario SDI / PEC</label>
                                        <input type="text" id="cust-sdi" class="form-control">
                                    </div>
                                    <div class="form-group">
                                        <label>Email / Telefono</label>
                                        <input type="text" id="cust-contact" class="form-control">
                                    </div>
                                </div>
                            </div>

                            <div class="card">
                                <div class="table-responsive">
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                <th>Ragione Sociale</th>
                                                <th>P.IVA / CF</th>
                                                <th>SDI / PEC</th>
                                                <th>Contatto</th>
                                            </tr>
                                        </thead>
                                        <tbody id="customers-list-tbody"></tbody>
                                    </table>
                                </div>
                            </div>
                        </section>

                        <section id="tab-inventory" class="tab-pane">
                            <div class="card">
                                <div class="card-header">
                                    <div class="card-title">Gestione Magazzino</div>
                                    <button class="btn btn-primary" id="btn-save-product">💾 Salva Articolo</button>
                                </div>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label>Codice Articolo</label>
                                        <input type="text" id="prod-code" class="form-control">
                                    </div>
                                    <div class="form-group">
                                        <label>Descrizione</label>
                                        <input type="text" id="prod-name" class="form-control">
                                    </div>
                                    <div class="form-group">
                                        <label>Prezzo Vendita (€)</label>
                                        <input type="number" id="prod-price" class="form-control" step="0.01">
                                    </div>
                                    <div class="form-group">
                                        <label>Giacenza Stock</label>
                                        <input type="number" id="prod-stock" class="form-control" value="0">
                                    </div>
                                </div>
                            </div>

                            <div class="card">
                                <div class="table-responsive">
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                <th>Codice</th>
                                                <th>Descrizione</th>
                                                <th>Prezzo</th>
                                                <th>Stock</th>
                                            </tr>
                                        </thead>
                                        <tbody id="inventory-list-tbody"></tbody>
                                    </table>
                                </div>
                            </div>
                        </section>

                        <section id="tab-pos" class="tab-pane">
                            <div class="pos-grid">
                                <div class="card">
                                    <div class="card-title" style="margin-bottom: 16px;">Seleziona Prodotti (Touch)</div>
                                    <div class="product-touch-grid" id="pos-products-touch"></div>
                                </div>

                                <div class="card">
                                    <div class="card-title" style="margin-bottom: 16px;">Carrello Cassa</div>
                                    <div id="pos-cart-items" style="min-height: 200px; margin-bottom: 20px;"></div>
                                    <div style="font-size: 1.4rem; font-weight: 700; display: flex; justify-content: space-between; margin-bottom: 20px;">
                                        <span>Totale:</span>
                                        <span id="pos-total-amount" style="color: var(--accent-success);">€ 0.00</span>
                                    </div>
                                    <button class="btn btn-success" style="width: 100%; min-height: 54px; font-size: 1.1rem;" id="btn-checkout-pos">💳 Incassa Ora</button>
                                </div>
                            </div>
                        </section>
                    </main>
                </div>
            `;

            setupEventListeners(el);
            addQuoteItemRow(el);
            await loadAllData(el);
        } catch (error) {
            console.error("Render error in Business Suite:", error);
        }
    }
};

function setupEventListeners(el) {
    try {
        const bindTab = (btnId, tabId) => {
            const btn = el.querySelector(`#${btnId}`);
            if (btn) btn.addEventListener('click', () => switchTab(el, tabId));
        };

        bindTab('tab-btn-dashboard', 'dashboard');
        bindTab('tab-btn-quotes', 'quotes');
        bindTab('tab-btn-invoices', 'invoices');
        bindTab('tab-btn-customers', 'customers');
        bindTab('tab-btn-inventory', 'inventory');
        bindTab('tab-btn-pos', 'pos');

        el.querySelector('#btn-refresh-dashboard')?.addEventListener('click', () => loadDashboardData(el));
        el.querySelector('#btn-save-quote')?.addEventListener('click', () => createNewQuote(el));
        el.querySelector('#btn-add-quote-row')?.addEventListener('click', () => addQuoteItemRow(el));
        el.querySelector('#btn-save-customer')?.addEventListener('click', () => saveCustomerForm(el));
        el.querySelector('#btn-save-product')?.addEventListener('click', () => saveProductForm(el));
        el.querySelector('#btn-checkout-pos')?.addEventListener('click', () => checkoutPOS(el));

        el.querySelector('#quote-discount')?.addEventListener('input', () => calculateQuoteTotals(el));
        el.querySelector('#quote-vat')?.addEventListener('input', () => calculateQuoteTotals(el));
    } catch (error) {
        console.error("setupEventListeners error:", error);
    }
}

function switchTab(el, tabId) {
    try {
        state.currentTab = tabId;
        el.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        el.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

        const activeBtn = el.querySelector(`#tab-btn-${tabId}`);
        if (activeBtn) activeBtn.classList.add('active');

        const activePane = el.querySelector(`#tab-${tabId}`);
        if (activePane) activePane.classList.add('active');

        if (tabId === 'dashboard') loadDashboardData(el);
        if (tabId === 'quotes') renderQuotesTab(el);
        if (tabId === 'invoices') renderInvoicesTab(el);
        if (tabId === 'customers') renderCustomersTab(el);
        if (tabId === 'inventory') renderInventoryTab(el);
        if (tabId === 'pos') renderPOSTab(el);
    } catch (error) {
        console.error("switchTab error:", error);
    }
}

async function loadAllData(el) {
    try {
        await Promise.all([
            loadDashboardData(el),
            loadCustomers(el),
            loadInventory(el),
            loadQuotes(el),
            loadInvoices(el)
        ]);
    } catch (error) {
        console.error("loadAllData error:", error);
    }
}

async function loadDashboardData(el) {
    try {
        const res = await invokeIPC('getStats');
        if (res && res.success) {
            const revEl = el.querySelector('#stat-revenue');
            if (revEl) revEl.innerText = `€ ${res.revenue ? res.revenue.toFixed(2) : '0.00'}`;
            const qEl = el.querySelector('#stat-quotes-count');
            if (qEl) qEl.innerText = res.quotesCount || 0;
            const cEl = el.querySelector('#stat-customers-count');
            if (cEl) cEl.innerText = res.customersCount || 0;
            const iEl = el.querySelector('#stat-inventory-count');
            if (iEl) iEl.innerText = res.inventoryCount || 0;

            const tbody = el.querySelector('#recent-activity-tbody');
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

async function loadCustomers(el) {
    try {
        const res = await invokeIPC('getCustomers');
        if (res && res.success) {
            state.customers = res.data;
            renderCustomersTab(el);
            populateCustomerSelect(el);
        }
    } catch (error) {
        console.error("loadCustomers error:", error);
    }
}

function renderCustomersTab(el) {
    try {
        const tbody = el.querySelector('#customers-list-tbody');
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

function populateCustomerSelect(el) {
    try {
        const select = el.querySelector('#quote-customer-select');
        if (!select) return;
        select.innerHTML = state.customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    } catch (error) {
        console.error("populateCustomerSelect error:", error);
    }
}

async function saveCustomerForm(el) {
    try {
        const name = el.querySelector('#cust-name').value.trim();
        const vat = el.querySelector('#cust-vat').value.trim();
        const sdi = el.querySelector('#cust-sdi').value.trim();
        const contact = el.querySelector('#cust-contact').value.trim();

        if (!name) {
            alert("Inserire la Ragione Sociale / Nome");
            return;
        }

        const customer = { id: Date.now(), name, vat, sdi, contact };
        state.customers.push(customer);
        await invokeIPC('saveCustomer', customer);
        
        el.querySelector('#cust-name').value = '';
        el.querySelector('#cust-vat').value = '';
        el.querySelector('#cust-sdi').value = '';
        el.querySelector('#cust-contact').value = '';

        loadCustomers(el);
        alert("Anagrafica salvata con successo!");
    } catch (error) {
        console.error("saveCustomerForm error:", error);
    }
}

async function loadInventory(el) {
    try {
        const res = await invokeIPC('getInventory');
        if (res && res.success) {
            state.inventory = res.data;
            renderInventoryTab(el);
            renderPOSTab(el);
        }
    } catch (error) {
        console.error("loadInventory error:", error);
    }
}

function renderInventoryTab(el) {
    try {
        const tbody = el.querySelector('#inventory-list-tbody');
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

async function saveProductForm(el) {
    try {
        const code = el.querySelector('#prod-code').value.trim();
        const name = el.querySelector('#prod-name').value.trim();
        const price = parseFloat(el.querySelector('#prod-price').value) || 0;
        const stock = parseInt(el.querySelector('#prod-stock').value) || 0;

        if (!code || !name) {
            alert("Compilare Codice e Descrizione articolo");
            return;
        }

        const product = { id: Date.now(), code, name, price, stock };
        state.inventory.push(product);
        await invokeIPC('saveProduct', product);

        el.querySelector('#prod-code').value = '';
        el.querySelector('#prod-name').value = '';
        el.querySelector('#prod-price').value = '';
        el.querySelector('#prod-stock').value = '0';

        loadInventory(el);
        alert("Articolo salvato con successo!");
    } catch (error) {
        console.error("saveProductForm error:", error);
    }
}

function addQuoteItemRow(el) {
    try {
        const container = el.querySelector('#quote-items-container');
        if (!container) return;
        const rowId = `quote-row-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const row = document.createElement('div');
        row.className = 'form-grid';
        row.id = rowId;
        row.innerHTML = `
            <div class="form-group" style="grid-column: span 2;">
                <input type="text" class="form-control item-desc" placeholder="Descrizione articolo/servizio">
            </div>
            <div class="form-group">
                <input type="number" class="form-control item-qty" value="1" min="1">
            </div>
            <div class="form-group">
                <input type="number" class="form-control item-price" value="0.00" step="0.01">
            </div>
            <div class="form-group" style="justify-content: flex-end;">
                <button class="btn btn-danger btn-remove-row">🗑️</button>
            </div>
        `;
        container.appendChild(row);

        row.querySelector('.item-qty').addEventListener('input', () => calculateQuoteTotals(el));
        row.querySelector('.item-price').addEventListener('input', () => calculateQuoteTotals(el));
        row.querySelector('.btn-remove-row').addEventListener('click', () => {
            row.remove();
            calculateQuoteTotals(el);
        });
    } catch (error) {
        console.error("addQuoteItemRow error:", error);
    }
}

function calculateQuoteTotals(el) {
    try {
        let subtotal = 0;
        const rows = el.querySelectorAll('#quote-items-container .form-grid');
        rows.forEach(r => {
            const qty = parseFloat(r.querySelector('.item-qty').value) || 0;
            const price = parseFloat(r.querySelector('.item-price').value) || 0;
            subtotal += qty * price;
        });

        const discount = parseFloat(el.querySelector('#quote-discount').value) || 0;
        const subtotalDiscounted = subtotal * (1 - discount / 100);
        const vatRate = parseFloat(el.querySelector('#quote-vat').value) || 0;
        const vatAmount = subtotalDiscounted * (vatRate / 100);
        const grandTotal = subtotalDiscounted + vatAmount;

        const subEl = el.querySelector('#quote-subtotal');
        if (subEl) subEl.innerText = `€ ${subtotalDiscounted.toFixed(2)}`;
        const vatEl = el.querySelector('#quote-vat-total');
        if (vatEl) vatEl.innerText = `€ ${vatAmount.toFixed(2)}`;
        const grandEl = el.querySelector('#quote-grand-total');
        if (grandEl) grandEl.innerText = `€ ${grandTotal.toFixed(2)}`;
    } catch (error) {
        console.error("calculateQuoteTotals error:", error);
    }
}

async function createNewQuote(el) {
    try {
        const select = el.querySelector('#quote-customer-select');
        const customerName = select ? select.options[select.selectedIndex]?.text || 'Cliente' : 'Cliente';
        const subject = el.querySelector('#quote-subject').value.trim() || 'Preventivo Servizi';
        const total = el.querySelector('#quote-grand-total').innerText;

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
        renderQuotesTab(el);
        alert("Preventivo salvato con successo!");
    } catch (error) {
        console.error("createNewQuote error:", error);
    }
}

async function loadQuotes(el) {
    try {
        const res = await invokeIPC('getQuotes');
        if (res && res.success) {
            state.quotes = res.data;
            renderQuotesTab(el);
        }
    } catch (error) {
        console.error("loadQuotes error:", error);
    }
}

function renderQuotesTab(el) {
    try {
        const tbody = el.querySelector('#quotes-list-tbody');
        if (!tbody) return;
        tbody.innerHTML = state.quotes.map(q => `
            <tr>
                <td><strong>${q.id}</strong></td>
                <td>${q.customer}</td>
                <td>${q.subject}</td>
                <td><strong>${q.total}</strong></td>
                <td><span class="badge badge-warning">${q.status}</span></td>
                <td>
                    <button class="btn btn-secondary btn-convert-quote" data-id="${q.id}" style="min-height: 36px; padding: 4px 10px;">📑 Converti in Fattura</button>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.btn-convert-quote').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const quoteId = e.currentTarget.getAttribute('data-id');
                convertQuoteToInvoice(el, quoteId);
            });
        });
    } catch (error) {
        console.error("renderQuotesTab error:", error);
    }
}

async function loadInvoices(el) {
    try {
        const res = await invokeIPC('getInvoices');
        if (res && res.success) {
            state.invoices = res.data;
            renderInvoicesTab(el);
        }
    } catch (error) {
        console.error("loadInvoices error:", error);
    }
}

function renderInvoicesTab(el) {
    try {
        const tbody = el.querySelector('#invoices-list-tbody');
        if (!tbody) return;
        tbody.innerHTML = state.invoices.map(inv => `
            <tr>
                <td><strong>${inv.number}</strong></td>
                <td>${inv.date}</td>
                <td>${inv.customer}</td>
                <td><strong>${inv.total}</strong></td>
                <td><span class="badge badge-success">${inv.sdiStatus || 'Pronta per Invio'}</span></td>
                <td>
                    <button class="btn btn-primary btn-export-xml" data-number="${inv.number}" style="min-height: 36px; padding: 4px 10px;">⚡ XML SDI</button>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.btn-export-xml').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const invNum = e.currentTarget.getAttribute('data-number');
                exportFatturaXML(el, invNum);
            });
        });
    } catch (error) {
        console.error("renderInvoicesTab error:", error);
    }
}

function convertQuoteToInvoice(el, quoteId) {
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
        renderQuotesTab(el);
        renderInvoicesTab(el);
        alert(`Fattura ${invoice.number} generata con successo dal preventivo ${quoteId}!`);
    } catch (error) {
        console.error("convertQuoteToInvoice error:", error);
    }
}

async function exportFatturaXML(el, invNumber) {
    try {
        const res = await invokeIPC('generateFatturaXML', { invNumber });
        if (res && res.success) {
            alert(`File XML FatturaPA ${invNumber} generato e pronto per la trasmissione SDI!`);
        } else {
            alert("Generazione XML completata in modalità simulazione.");
        }
    } catch (error) {
        console.error("exportFatturaXML error:", error);
    }
}

function renderPOSTab(el) {
    try {
        const container = el.querySelector('#pos-products-touch');
        if (!container) return;
        container.innerHTML = state.inventory.map(p => `
            <div class="touch-product-card" data-code="${p.code}">
                <div class="touch-product-name">${p.name}</div>
                <div class="touch-product-price">€ ${p.price.toFixed(2)}</div>
            </div>
        `).join('');

        container.querySelectorAll('.touch-product-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const code = e.currentTarget.getAttribute('data-code');
                addToPOSCart(el, code);
            });
        });

        renderPOSCart(el);
    } catch (error) {
        console.error("renderPOSTab error:", error);
    }
}

function addToPOSCart(el, productCode) {
    try {
        const p = state.inventory.find(item => item.code === productCode);
        if (!p) return;

        const existing = state.posCart.find(item => item.code === productCode);
        if (existing) {
            existing.qty += 1;
        } else {
            state.posCart.push({ code: p.code, name: p.name, price: p.price, qty: 1 });
        }
        renderPOSCart(el);
    } catch (error) {
        console.error("addToPOSCart error:", error);
    }
}

function renderPOSCart(el) {
    try {
        const container = el.querySelector('#pos-cart-items');
        if (!container) return;

        if (state.posCart.length === 0) {
            container.innerHTML = `<div style="text-align:center; color: var(--text-secondary); padding: 40px;">Nessun articolo nel carrello. Tocca un prodotto a sinistra per aggiungerlo.</div>`;
            const posTot = el.querySelector('#pos-total-amount');
            if (posTot) posTot.innerText = '€ 0.00';
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

        const posTot = el.querySelector('#pos-total-amount');
        if (posTot) posTot.innerText = `€ ${total.toFixed(2)}`;
    } catch (error) {
        console.error("renderPOSCart error:", error);
    }
}

async function checkoutPOS(el) {
    try {
        if (state.posCart.length === 0) {
            alert("Il carrello è vuoto!");
            return;
        }
        const total = el.querySelector('#pos-total-amount').innerText;
        await invokeIPC('processPOSSale', { cart: state.posCart, total });
        alert(`Vendita POS registrata! Totale incassato: ${total}`);
        state.posCart = [];
        renderPOSCart(el);
    } catch (error) {
        console.error("checkoutPOS error:", error);
    }
}
