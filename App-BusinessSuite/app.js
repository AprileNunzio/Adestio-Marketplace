const APP_STYLES = `
:root {
    --bg-primary: hsl(222, 47%, 11%);
    --bg-secondary: hsl(217, 33%, 17%);
    --bg-surface: hsl(215, 25%, 27%);
    --bg-glass: rgba(15, 23, 42, 0.95);
    --border-color: rgba(255, 255, 255, 0.12);
    --border-glow: rgba(99, 102, 241, 0.35);
    --text-primary: hsl(210, 40%, 98%);
    --text-secondary: hsl(215, 20%, 65%);
    --accent-primary: hsl(238, 84%, 67%);
    --accent-hover: hsl(238, 84%, 57%);
    --accent-success: hsl(160, 84%, 39%);
    --accent-warning: hsl(38, 92%, 50%);
    --accent-danger: hsl(354, 84%, 57%);
    --radius-sm: 10px;
    --radius-md: 16px;
    --radius-lg: 24px;
    --shadow-soft: 0 12px 32px -4px rgba(0, 0, 0, 0.4);
    --touch-min-size: 52px;
    --transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.bs-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: radial-gradient(circle at 90% 10%, rgba(99, 102, 241, 0.18), transparent 45%),
                radial-gradient(circle at 10% 90%, rgba(16, 185, 129, 0.14), transparent 45%),
                var(--bg-primary);
    color: var(--text-primary);
    font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
    box-sizing: border-box;
}

.bs-wrapper * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

.bs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 28px;
    background: var(--bg-glass);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border-color);
    min-height: 72px;
}

.bs-brand {
    display: flex;
    align-items: center;
    gap: 14px;
    cursor: pointer;
}

.bs-brand-icon {
    width: 46px;
    height: 46px;
    background: linear-gradient(135deg, var(--accent-primary), hsl(260, 84%, 60%));
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    color: #ffffff;
    box-shadow: 0 6px 18px rgba(99, 102, 241, 0.45);
}

.bs-brand-title {
    font-size: 1.35rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    background: linear-gradient(135deg, #ffffff, var(--text-secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.bs-nav-tabs {
    display: flex;
    gap: 8px;
    background: rgba(30, 41, 59, 0.8);
    padding: 6px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    overflow-x: auto;
}

.bs-tab-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 18px;
    min-height: 44px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-weight: 700;
    font-size: 0.9rem;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: var(--transition);
    white-space: nowrap;
}

.bs-tab-btn:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.08);
}

.bs-tab-btn.active {
    background: linear-gradient(135deg, var(--accent-primary), hsl(240, 80%, 60%));
    color: #ffffff;
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
}

.bs-main-content {
    flex: 1;
    padding: 28px;
    overflow-y: auto;
}

.bs-tab-pane {
    display: none;
}

.bs-tab-pane.active {
    display: block;
    animation: bsFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes bsFadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
}

.bs-hub-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 24px;
    margin-top: 20px;
}

.bs-hub-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 28px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    cursor: pointer;
    transition: var(--transition);
    box-shadow: var(--shadow-soft);
    position: relative;
    overflow: hidden;
}

.bs-hub-card:hover {
    transform: translateY(-6px);
    border-color: var(--accent-primary);
    box-shadow: 0 20px 40px -10px rgba(99, 102, 241, 0.3);
}

.bs-hub-card.disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.bs-hub-card.disabled:hover {
    transform: none;
    border-color: var(--border-color);
    box-shadow: var(--shadow-soft);
}

.bs-hub-icon {
    width: 64px;
    height: 64px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    color: #ffffff;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.bs-hub-title {
    font-size: 1.2rem;
    font-weight: 800;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.bs-hub-desc {
    font-size: 0.88rem;
    color: var(--text-secondary);
    line-height: 1.5;
}

.bs-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
    margin-bottom: 28px;
}

.bs-stat-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    padding: 24px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    gap: 20px;
    box-shadow: var(--shadow-soft);
    transition: var(--transition);
}

.bs-stat-card:hover {
    transform: translateY(-4px);
    border-color: var(--border-glow);
}

.bs-stat-icon {
    width: 58px;
    height: 58px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    flex-shrink: 0;
}

.bs-stat-val {
    font-size: 1.8rem;
    font-weight: 800;
}

.bs-stat-lbl {
    font-size: 0.88rem;
    color: var(--text-secondary);
    font-weight: 600;
}

.bs-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 28px;
    box-shadow: var(--shadow-soft);
    margin-bottom: 28px;
}

.bs-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
}

.bs-card-title {
    font-size: 1.25rem;
    font-weight: 800;
}

.bs-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: var(--touch-min-size);
    padding: 12px 24px;
    border-radius: var(--radius-sm);
    border: none;
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    transition: var(--transition);
}

.bs-btn-primary {
    background: linear-gradient(135deg, var(--accent-primary), hsl(240, 80%, 60%));
    color: #ffffff;
    box-shadow: 0 6px 18px rgba(99, 102, 241, 0.35);
}

.bs-btn-success {
    background: linear-gradient(135deg, var(--accent-success), hsl(160, 84%, 30%));
    color: #ffffff;
    box-shadow: 0 6px 18px rgba(16, 185, 129, 0.35);
}

.bs-btn-danger {
    background: linear-gradient(135deg, var(--accent-danger), hsl(354, 84%, 47%));
    color: #ffffff;
}

.bs-btn-secondary {
    background: var(--bg-surface);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
}

.bs-table-responsive {
    width: 100%;
    overflow-x: auto;
    border-radius: var(--radius-sm);
}

.bs-data-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
}

.bs-data-table th, .bs-data-table td {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
}

.bs-data-table th {
    color: var(--text-secondary);
    font-weight: 700;
    font-size: 0.85rem;
    text-transform: uppercase;
    background: rgba(15, 23, 42, 0.4);
}

.bs-data-table tr:hover {
    background: rgba(255, 255, 255, 0.03);
}

.bs-form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
    margin-bottom: 20px;
}

.bs-form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.bs-form-group label {
    font-size: 0.88rem;
    color: var(--text-secondary);
    font-weight: 700;
}

.bs-form-control {
    min-height: var(--touch-min-size);
    padding: 12px 18px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 1rem;
    outline: none;
    transition: var(--transition);
}

.bs-form-control:focus {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.3);
}

.bs-pos-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 24px;
}

@media (max-width: 960px) {
    .bs-pos-grid {
        grid-template-columns: 1fr;
    }
}

.bs-product-touch-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 16px;
}

.bs-touch-product-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 20px 16px;
    text-align: center;
    cursor: pointer;
    transition: var(--transition);
    min-height: 120px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.bs-touch-product-card:active {
    transform: scale(0.95);
    background: var(--accent-primary);
}

.bs-touch-product-name {
    font-weight: 700;
    font-size: 1rem;
    margin-bottom: 6px;
}

.bs-touch-product-price {
    color: var(--accent-success);
    font-weight: 800;
    font-size: 1.1rem;
}

.bs-badge {
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 800;
    text-transform: uppercase;
    display: inline-block;
}

.bs-badge-success { background: rgba(16, 185, 129, 0.2); color: var(--accent-success); border: 1px solid rgba(16, 185, 129, 0.4); }
.bs-badge-warning { background: rgba(245, 158, 11, 0.2); color: var(--accent-warning); border: 1px solid rgba(245, 158, 11, 0.4); }
.bs-badge-danger { background: rgba(239, 68, 68, 0.2); color: var(--accent-danger); border: 1px solid rgba(239, 68, 68, 0.4); }
`;

const state = {
    currentTab: 'hub',
    userPerms: [],
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
            await fetchUserPermissions();

            el.innerHTML = `
                <style>${APP_STYLES}</style>
                <div class="bs-wrapper">
                    <header class="bs-header">
                        <div class="bs-brand" id="btn-home-hub">
                            <div class="bs-brand-icon">💼</div>
                            <div>
                                <div class="bs-brand-title">Adestio Business Suite</div>
                                <div style="font-size: 0.75rem; color: var(--text-secondary);">Enterprise Suite</div>
                            </div>
                        </div>
                        <nav class="bs-nav-tabs">
                            <button class="bs-tab-btn active" id="tab-btn-hub">🏠 Hub Card</button>
                            <button class="bs-tab-btn" id="tab-btn-dashboard">📊 Dashboard</button>
                            <button class="bs-tab-btn" id="tab-btn-quotes">📝 Preventivi</button>
                            <button class="bs-tab-btn" id="tab-btn-invoices">📑 Fatturazione SDI</button>
                            <button class="bs-tab-btn" id="tab-btn-customers">👥 Anagrafica</button>
                            <button class="bs-tab-btn" id="tab-btn-inventory">📦 Magazzino</button>
                            <button class="bs-tab-btn" id="tab-btn-pos">🛒 POS Touch</button>
                        </nav>
                    </header>

                    <main class="bs-main-content">
                        <section id="tab-hub" class="bs-tab-pane active">
                            <div style="margin-bottom: 2rem;">
                                <h1 style="font-size: 2rem; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 0.4rem;">Applicazioni Enterprise</h1>
                                <p style="color: var(--text-secondary); font-size: 1rem;">Seleziona un modulo operativo per accedere alla sua area di lavoro.</p>
                            </div>

                            <div class="bs-hub-grid" id="hub-cards-container"></div>
                        </section>

                        <section id="tab-dashboard" class="bs-tab-pane">
                            <div class="bs-stats-grid">
                                <div class="bs-stat-card">
                                    <div class="bs-stat-icon" style="background: rgba(99, 102, 241, 0.2); color: #6366f1;">💰</div>
                                    <div>
                                        <div class="bs-stat-val" id="stat-revenue">€ 0.00</div>
                                        <div class="bs-stat-lbl">Fatturato Anno</div>
                                    </div>
                                </div>
                                <div class="bs-stat-card">
                                    <div class="bs-stat-icon" style="background: rgba(16, 185, 129, 0.2); color: #10b981;">📑</div>
                                    <div>
                                        <div class="bs-stat-val" id="stat-quotes-count">0</div>
                                        <div class="bs-stat-lbl">Preventivi Attivi</div>
                                    </div>
                                </div>
                                <div class="bs-stat-card">
                                    <div class="bs-stat-icon" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b;">👥</div>
                                    <div>
                                        <div class="bs-stat-val" id="stat-customers-count">0</div>
                                        <div class="bs-stat-lbl">Clienti In Anagrafica</div>
                                    </div>
                                </div>
                                <div class="bs-stat-card">
                                    <div class="bs-stat-icon" style="background: rgba(239, 68, 68, 0.2); color: #ef4444;">📦</div>
                                    <div>
                                        <div class="bs-stat-val" id="stat-inventory-count">0</div>
                                        <div class="bs-stat-lbl">Articoli a Magazzino</div>
                                    </div>
                                </div>
                            </div>

                            <div class="bs-card">
                                <div class="bs-card-header">
                                    <div class="bs-card-title">Attività Recenti</div>
                                    <button class="bs-btn bs-btn-secondary" id="btn-refresh-dashboard">🔄 Aggiorna</button>
                                </div>
                                <div class="bs-table-responsive">
                                    <table class="bs-data-table">
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

                        <section id="tab-quotes" class="bs-tab-pane">
                            <div class="bs-card">
                                <div class="bs-card-header">
                                    <div class="bs-card-title">Nuovo Preventivo & Simulatore Margini</div>
                                    <button class="bs-btn bs-btn-primary" id="btn-save-quote">💾 Salva Preventivo</button>
                                </div>
                                <div class="bs-form-grid">
                                    <div class="bs-form-group">
                                        <label>Cliente</label>
                                        <select id="quote-customer-select" class="bs-form-control"></select>
                                    </div>
                                    <div class="bs-form-group">
                                        <label>Oggetto / Oggetto Lavoro</label>
                                        <input type="text" id="quote-subject" class="bs-form-control" placeholder="Es. Fornitura software e servizi">
                                    </div>
                                    <div class="bs-form-group">
                                        <label>Sconto (%)</label>
                                        <input type="number" id="quote-discount" class="bs-form-control" value="0">
                                    </div>
                                    <div class="bs-form-group">
                                        <label>Aliquota IVA (%)</label>
                                        <input type="number" id="quote-vat" class="bs-form-control" value="22">
                                    </div>
                                </div>

                                <div class="bs-card-title" style="margin: 20px 0 10px 0;">Voci di Costo / Articoli</div>
                                <div id="quote-items-container"></div>
                                <button class="bs-btn bs-btn-secondary" id="btn-add-quote-row" style="margin-top: 10px;">➕ Aggiungi Riga</button>

                                <div style="display: flex; justify-content: flex-end; gap: 20px; margin-top: 20px; font-size: 1.1rem; font-weight: 700;">
                                    <div>Subtotale: <span id="quote-subtotal">€ 0.00</span></div>
                                    <div>IVA: <span id="quote-vat-total">€ 0.00</span></div>
                                    <div style="color: var(--accent-success);">Totale: <span id="quote-grand-total">€ 0.00</span></div>
                                </div>
                            </div>

                            <div class="bs-card">
                                <div class="bs-card-header">
                                    <div class="bs-card-title">Elenco Preventivi</div>
                                </div>
                                <div class="bs-table-responsive">
                                    <table class="bs-data-table">
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

                        <section id="tab-invoices" class="bs-tab-pane">
                            <div class="bs-card">
                                <div class="bs-card-header">
                                    <div class="bs-card-title">Registro Fatture & XML SDI</div>
                                    <button class="bs-btn bs-btn-primary" id="btn-new-invoice">➕ Nuova Fattura</button>
                                </div>
                                <div class="bs-table-responsive">
                                    <table class="bs-data-table">
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

                        <section id="tab-customers" class="bs-tab-pane">
                            <div class="bs-card">
                                <div class="bs-card-header">
                                    <div class="bs-card-title">Anagrafica Clienti & Fornitori</div>
                                    <button class="bs-btn bs-btn-primary" id="btn-save-customer">💾 Salva Anagrafica</button>
                                </div>
                                <div class="bs-form-grid">
                                    <div class="bs-form-group">
                                        <label>Ragione Sociale / Nome</label>
                                        <input type="text" id="cust-name" class="bs-form-control">
                                    </div>
                                    <div class="bs-form-group">
                                        <label>Partita IVA / Codice Fiscale</label>
                                        <input type="text" id="cust-vat" class="bs-form-control">
                                    </div>
                                    <div class="bs-form-group">
                                        <label>Codice Destinatario SDI / PEC</label>
                                        <input type="text" id="cust-sdi" class="bs-form-control">
                                    </div>
                                    <div class="bs-form-group">
                                        <label>Email / Telefono</label>
                                        <input type="text" id="cust-contact" class="bs-form-control">
                                    </div>
                                </div>
                            </div>

                            <div class="bs-card">
                                <div class="bs-table-responsive">
                                    <table class="bs-data-table">
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

                        <section id="tab-inventory" class="bs-tab-pane">
                            <div class="bs-card">
                                <div class="bs-card-header">
                                    <div class="bs-card-title">Gestione Magazzino</div>
                                    <button class="bs-btn bs-btn-primary" id="btn-save-product">💾 Salva Articolo</button>
                                </div>
                                <div class="bs-form-grid">
                                    <div class="bs-form-group">
                                        <label>Codice Articolo</label>
                                        <input type="text" id="prod-code" class="bs-form-control">
                                    </div>
                                    <div class="bs-form-group">
                                        <label>Descrizione</label>
                                        <input type="text" id="prod-name" class="bs-form-control">
                                    </div>
                                    <div class="bs-form-group">
                                        <label>Prezzo Vendita (€)</label>
                                        <input type="number" id="prod-price" class="bs-form-control" step="0.01">
                                    </div>
                                    <div class="bs-form-group">
                                        <label>Giacenza Stock</label>
                                        <input type="number" id="prod-stock" class="bs-form-control" value="0">
                                    </div>
                                </div>
                            </div>

                            <div class="bs-card">
                                <div class="bs-table-responsive">
                                    <table class="bs-data-table">
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

                        <section id="tab-pos" class="bs-tab-pane">
                            <div class="bs-pos-grid">
                                <div class="bs-card">
                                    <div class="bs-card-title" style="margin-bottom: 16px;">Seleziona Prodotti (Touch)</div>
                                    <div class="bs-product-touch-grid" id="pos-products-touch"></div>
                                </div>

                                <div class="bs-card">
                                    <div class="bs-card-title" style="margin-bottom: 16px;">Carrello Cassa</div>
                                    <div id="pos-cart-items" style="min-height: 200px; margin-bottom: 20px;"></div>
                                    <div style="font-size: 1.4rem; font-weight: 700; display: flex; justify-content: space-between; margin-bottom: 20px;">
                                        <span>Totale:</span>
                                        <span id="pos-total-amount" style="color: var(--accent-success);">€ 0.00</span>
                                    </div>
                                    <button class="bs-btn bs-btn-success" style="width: 100%; min-height: 54px; font-size: 1.1rem;" id="btn-checkout-pos">💳 Incassa Ora</button>
                                </div>
                            </div>
                        </section>
                    </main>
                </div>
            `;

            renderHubCards(el);
            setupEventListeners(el);
            addQuoteItemRow(el);
            await loadAllData(el);
        } catch (error) {
            console.error("Render error in Business Suite:", error);
        }
    }
};

async function fetchUserPermissions() {
    try {
        if (window.electronAPI && window.electronAPI.rbac) {
            const userId = sessionStorage.getItem('currentUserId');
            if (userId) {
                state.userPerms = await window.electronAPI.rbac.getEffectiveUserPermissions(userId);
            }
        }
    } catch (e) {
        state.userPerms = ['*'];
    }
}

function hasModulePermission(permId) {
    try {
        if (!state.userPerms || state.userPerms.length === 0) return true;
        if (state.userPerms.includes('*') || state.userPerms.includes('adestio_business_suite:*')) return true;
        return state.userPerms.includes(permId) || state.userPerms.includes(`adestio_business_suite:${permId}`);
    } catch (e) {
        return true;
    }
}

function renderHubCards(el) {
    try {
        const container = el.querySelector('#hub-cards-container');
        if (!container) return;

        const modules = [
            {
                id: 'dashboard',
                name: 'Dashboard & KPI',
                desc: 'Panoramica finanziaria, fatturato annuale, KPI in tempo reale e registro attività recenti.',
                icon: '📊',
                bgColor: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                perm: 'dashboard'
            },
            {
                id: 'quotes',
                name: 'Preventivi & Margini',
                desc: 'Simulatore margini di guadagno, preventivazione rapida e conversione automatica in fattura.',
                icon: '📝',
                bgColor: 'linear-gradient(135deg, #10b981, #059669)',
                perm: 'quotes'
            },
            {
                id: 'invoices',
                name: 'Fatturazione SDI',
                desc: 'Emissione fatture elettroniche, generazione XML norma SDI e controllo stato invio.',
                icon: '📑',
                bgColor: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                perm: 'invoices'
            },
            {
                id: 'customers',
                name: 'Anagrafica Clienti',
                desc: 'Registro unico clienti e fornitori, Partite IVA, PEC e Codici Destinatario SDI.',
                icon: '👥',
                bgColor: 'linear-gradient(135deg, #f59e0b, #d97706)',
                perm: 'customers'
            },
            {
                id: 'inventory',
                name: 'Magazzino & Stock',
                desc: 'Catalogo prodotti, prezzi di listino, monitoraggio scorte e giacenze di magazzino.',
                icon: '📦',
                bgColor: 'linear-gradient(135deg, #ef4444, #dc2626)',
                perm: 'inventory'
            },
            {
                id: 'pos',
                name: 'POS Cassa Touch',
                desc: 'Punto vendita touch screen per vendite immediate al banco, carrello e scontrino rapido.',
                icon: '🛒',
                bgColor: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                perm: 'pos'
            }
        ];

        container.innerHTML = modules.map(m => {
            const isAllowed = hasModulePermission(m.perm);
            return `
                <div class="bs-hub-card ${isAllowed ? '' : 'disabled'}" data-tab="${m.id}">
                    <div class="bs-hub-icon" style="background: ${m.bgColor};">
                        ${m.icon}
                    </div>
                    <div class="bs-hub-title">
                        <span>${m.name}</span>
                        ${isAllowed ? '<span style="font-size: 1.2rem; opacity: 0.6;">➔</span>' : '<span style="font-size: 0.8rem; background: rgba(239,68,68,0.2); color: #ef4444; padding: 2px 8px; border-radius: 6px;">Bloccato</span>'}
                    </div>
                    <div class="bs-hub-desc">${m.desc}</div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.bs-hub-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const tabId = e.currentTarget.getAttribute('data-tab');
                if (hasModulePermission(modules.find(m => m.id === tabId)?.perm)) {
                    switchTab(el, tabId);
                } else {
                    alert("Non possiedi i permessi per accedere a questo modulo aziendale.");
                }
            });
        });
    } catch (error) {
        console.error("renderHubCards error:", error);
    }
}

function setupEventListeners(el) {
    try {
        const bindTab = (btnId, tabId) => {
            const btn = el.querySelector(`#${btnId}`);
            if (btn) btn.addEventListener('click', () => switchTab(el, tabId));
        };

        el.querySelector('#btn-home-hub')?.addEventListener('click', () => switchTab(el, 'hub'));
        bindTab('tab-btn-hub', 'hub');
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
        el.querySelectorAll('.bs-tab-btn').forEach(btn => btn.classList.remove('active'));
        el.querySelectorAll('.bs-tab-pane').forEach(pane => pane.classList.remove('active'));

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
                        <td><span class="bs-badge bs-badge-success">${item.status}</span></td>
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
                <td><span class="bs-badge ${p.stock > 10 ? 'bs-badge-success' : 'bs-badge-warning'}">${p.stock}</span></td>
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
        row.className = 'bs-form-grid';
        row.id = rowId;
        row.innerHTML = `
            <div class="bs-form-group" style="grid-column: span 2;">
                <input type="text" class="bs-form-control item-desc" placeholder="Descrizione articolo/servizio">
            </div>
            <div class="bs-form-group">
                <input type="number" class="bs-form-control item-qty" value="1" min="1">
            </div>
            <div class="bs-form-group">
                <input type="number" class="bs-form-control item-price" value="0.00" step="0.01">
            </div>
            <div class="bs-form-group" style="justify-content: flex-end;">
                <button class="bs-btn bs-btn-danger btn-remove-row">🗑️</button>
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
        const rows = el.querySelectorAll('#quote-items-container .bs-form-grid');
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
                <td><span class="bs-badge bs-badge-warning">${q.status}</span></td>
                <td>
                    <button class="bs-btn bs-btn-secondary btn-convert-quote" data-id="${q.id}" style="min-height: 36px; padding: 4px 10px;">📑 Converti in Fattura</button>
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
                <td><span class="bs-badge bs-badge-success">${inv.sdiStatus || 'Pronta per Invio'}</span></td>
                <td>
                    <button class="bs-btn bs-btn-primary btn-export-xml" data-number="${inv.number}" style="min-height: 36px; padding: 4px 10px;">⚡ XML SDI</button>
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
            <div class="bs-touch-product-card" data-code="${p.code}">
                <div class="bs-touch-product-name">${p.name}</div>
                <div class="bs-touch-product-price">€ ${p.price.toFixed(2)}</div>
            </div>
        `).join('');

        container.querySelectorAll('.bs-touch-product-card').forEach(card => {
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
