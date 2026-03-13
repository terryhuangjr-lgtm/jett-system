#!/usr/bin/env python3
"""
Watchlist Dashboard - Flask web app for managing tickers
Reads/writes to jett-watchlist-config.yaml
Port: 5002
"""

import os
import yaml
import logging
from flask import Flask, render_template_string, request, jsonify, redirect, url_for

# Config
CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'jett-watchlist-config.yaml')
PORT = 5002
HOST = '0.0.0.0'

# Setup logging
os.makedirs(os.path.join(os.path.dirname(CONFIG_FILE), 'logs'), exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(os.path.dirname(CONFIG_FILE), 'logs/watchlist-dashboard.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

def load_config():
    """Load YAML config"""
    try:
        with open(CONFIG_FILE, 'r') as f:
            return yaml.safe_load(f)
    except Exception as e:
        logger.error(f"Failed to load config: {e}")
        return {'watchlist': [], 'settings': {}}

def save_config(config):
    """Save YAML config"""
    try:
        with open(CONFIG_FILE, 'w') as f:
            yaml.dump(config, f, default_flow_style=False, sort_keys=False)
        return True
    except Exception as e:
        logger.error(f"Failed to save config: {e}")
        return False

def get_sectors():
    """Get unique sectors from watchlist"""
    config = load_config()
    sectors = set()
    for item in config.get('watchlist', []):
        if 'sector' in item:
            sectors.add(item['sector'])
    return sorted(sectors)

# HTML Template
HTML_TEMPLATE = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Watchlist Dashboard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-primary: #0a0a0f;
            --bg-secondary: #111118;
            --bg-tertiary: #1a1a24;
            --bg-card: #16161f;
            --bg-card-hover: #1e1e2a;
            --border-color: #2a2a3a;
            --border-subtle: #1f1f2e;
            --text-primary: #ffffff;
            --text-secondary: #9898a8;
            --text-muted: #5a5a6e;
            --accent-primary: #6366f1;
            --accent-secondary: #818cf8;
            --accent-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --shadow-sm: 0 2px 8px rgba(0,0,0,0.3);
            --shadow-md: 0 4px 16px rgba(0,0,0,0.4);
            --radius-sm: 8px;
            --radius-md: 12px;
            --radius-lg: 16px;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, sans-serif; background: var(--bg-primary); color: var(--text-primary); min-height: 100vh; padding: 20px; }
        
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--border-color); }
        .header h1 { font-size: 24px; font-weight: 600; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .btn { padding: 10px 20px; border-radius: var(--radius-sm); border: none; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; }
        .btn-primary { background: var(--accent-gradient); color: white; }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: var(--shadow-md); }
        .btn-secondary { background: var(--bg-card); color: var(--text-secondary); border: 1px solid var(--border-color); }
        .btn-secondary:hover { background: var(--bg-card-hover); }
        .btn-danger { background: var(--danger); color: white; }
        .btn-danger:hover { background: #dc2626; }
        .btn-sm { padding: 6px 12px; font-size: 12px; }
        
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .stat-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; }
        .stat-card .label { font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-card .value { font-size: 28px; font-weight: 700; color: var(--accent-primary); margin-top: 4px; }
        
        .ticker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
        .ticker-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 20px; transition: all 0.2s; }
        .ticker-card:hover { border-color: var(--accent-primary); transform: translateY(-2px); }
        .ticker-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .ticker-symbol { font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 600; color: var(--accent-secondary); }
        .ticker-name { font-size: 14px; color: var(--text-secondary); margin-top: 2px; }
        .ticker-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; text-transform: uppercase; }
        .badge-crypto { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
        .badge-stock { background: rgba(99, 102, 241, 0.15); color: #818cf8; }
        .badge-etf { background: rgba(16, 185, 129, 0.15); color: #10b981; }
        
        .ticker-details { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; }
        .detail-row { display: flex; justify-content: space-between; }
        .detail-label { color: var(--text-muted); }
        .detail-value { color: var(--text-secondary); font-family: 'JetBrains Mono', monospace; }
        
        .ticker-alerts { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-subtle); }
        .alerts-title { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .alert-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
        .alert-item { font-size: 12px; }
        .alert-label { color: var(--text-muted); }
        .alert-value { color: var(--text-secondary); font-family: 'JetBrains Mono', monospace; }
        
        .ticker-actions { display: flex; gap: 8px; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-subtle); }
        
        /* Modal */
        .modal-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 1000; align-items: center; justify-content: center; }
        .modal-overlay.active { display: flex; }
        .modal { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
        .modal h2 { font-size: 18px; margin-bottom: 20px; }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; font-size: 13px; color: var(--text-muted); margin-bottom: 6px; }
        .form-group input, .form-group select { width: 100%; padding: 10px 12px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); color: var(--text-primary); font-size: 14px; }
        .form-group input:focus, .form-group select:focus { outline: none; border-color: var(--accent-primary); }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .modal-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }
        
        .empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
        .empty-state h3 { font-size: 18px; color: var(--text-secondary); margin-bottom: 8px; }
        
        .toast { position: fixed; bottom: 20px; right: 20px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px 20px; box-shadow: var(--shadow-lg); transform: translateY(100px); opacity: 0; transition: all 0.3s; }
        .toast.show { transform: translateY(0); opacity: 1; }
        .toast.success { border-left: 3px solid var(--success); }
        .toast.error { border-left: 3px solid var(--danger); }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Watchlist Dashboard</h1>
        <button class="btn btn-primary" onclick="openModal()">+ Add Ticker</button>
    </div>
    
    <div class="stats">
        <div class="stat-card">
            <div class="label">Total Tickers</div>
            <div class="value">{{ tickers|length }}</div>
        </div>
        <div class="stat-card">
            <div class="label">Crypto</div>
            <div class="value">{{ tickers|selectattr('type', 'equalto', 'crypto')|list|length }}</div>
        </div>
        <div class="stat-card">
            <div class="label">Stocks</div>
            <div class="value">{{ tickers|selectattr('type', 'equalto', 'stock')|list|length }}</div>
        </div>
        <div class="stat-card">
            <div class="label">Sectors</div>
            <div class="value">{{ sectors|length }}</div>
        </div>
    </div>
    
    {% if tickers %}
    <div class="ticker-grid">
        {% for t in tickers %}
        <div class="ticker-card">
            <div class="ticker-header">
                <div>
                    <div class="ticker-symbol">{{ t.ticker }}</div>
                    <div class="ticker-name">{{ t.name }}</div>
                </div>
                <span class="ticker-badge badge-{{ t.type }}">{{ t.type }}</span>
            </div>
            <div class="ticker-details">
                <div class="detail-row">
                    <span class="detail-label">Sector</span>
                    <span class="detail-value">{{ t.sector }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Cooldown</span>
                    <span class="detail-value">{{ t.cooldown_minutes }}min</span>
                </div>
            </div>
            {% if t.alerts %}
            <div class="ticker-alerts">
                <div class="alerts-title">Alert Thresholds</div>
                <div class="alert-grid">
                    {% if t.alerts.price_drop_pct %}<div class="alert-item"><span class="alert-label">Drop:</span> <span class="alert-value">{{ t.alerts.price_drop_pct }}%</span></div>{% endif %}
                    {% if t.alerts.price_gain_pct %}<div class="alert-item"><span class="alert-label">Gain:</span> <span class="alert-value">{{ t.alerts.price_gain_pct }}%</span></div>{% endif %}
                    {% if t.alerts.daily_drop_pct %}<div class="alert-item"><span class="alert-label">Daily Drop:</span> <span class="alert-value">{{ t.alerts.daily_drop_pct }}%</span></div>{% endif %}
                    {% if t.alerts.daily_gain_pct %}<div class="alert-item"><span class="alert-label">Daily Gain:</span> <span class="alert-value">{{ t.alerts.daily_gain_pct }}%</span></div>{% endif %}
                </div>
            </div>
            {% endif %}
            <div class="ticker-actions">
                <button class="btn btn-secondary btn-sm" onclick="editTicker('{{ t.ticker }}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteTicker('{{ t.ticker }}')">Delete</button>
            </div>
        </div>
        {% endfor %}
    </div>
    {% else %}
    <div class="empty-state">
        <h3>No tickers yet</h3>
        <p>Add your first ticker to start monitoring</p>
    </div>
    {% endif %}
    
    <!-- Add/Edit Modal -->
    <div class="modal-overlay" id="modal">
        <div class="modal">
            <h2 id="modalTitle">Add Ticker</h2>
            <form id="tickerForm">
                <input type="hidden" id="editTicker" value="">
                <div class="form-row">
                    <div class="form-group">
                        <label>Ticker Symbol</label>
                        <input type="text" id="ticker" placeholder="BTC-USD" required>
                    </div>
                    <div class="form-group">
                        <label>Type</label>
                        <select id="type" required>
                            <option value="stock">Stock</option>
                            <option value="crypto">Crypto</option>
                            <option value="etf">ETF</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" id="name" placeholder="Bitcoin" required>
                </div>
                <div class="form-group">
                    <label>Sector</label>
                    <input type="text" id="sector" list="sectors" placeholder="crypto" required>
                    <datalist id="sectors">
                        {% for s in sectors %}<option value="{{ s }}">{% endfor %}
                    </datalist>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Price Drop %</label>
                        <input type="number" id="price_drop_pct" step="0.1" placeholder="5">
                    </div>
                    <div class="form-group">
                        <label>Price Gain %</label>
                        <input type="number" id="price_gain_pct" step="0.1" placeholder="7">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Daily Drop %</label>
                        <input type="number" id="daily_drop_pct" step="0.1" placeholder="8">
                    </div>
                    <div class="form-group">
                        <label>Daily Gain %</label>
                        <input type="number" id="daily_gain_pct" step="0.1" placeholder="10">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Volume Spike X</label>
                        <input type="number" id="volume_spike_x" step="0.1" placeholder="2.5">
                    </div>
                    <div class="form-group">
                        <label>Cooldown (minutes)</label>
                        <input type="number" id="cooldown_minutes" step="15" placeholder="90">
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save</button>
                </div>
            </form>
        </div>
    </div>
    
    <div class="toast" id="toast"></div>
    
    <script>
        const tickers = {{ tickers_json | safe }};
        
        function showToast(message, type = 'success') {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.className = 'toast ' + type;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
        
        function openModal() {
            document.getElementById('modalTitle').textContent = 'Add Ticker';
            document.getElementById('tickerForm').reset();
            document.getElementById('editTicker').value = '';
            document.getElementById('modal').classList.add('active');
        }
        
        function closeModal() {
            document.getElementById('modal').classList.remove('active');
        }
        
        function editTicker(ticker) {
            const t = tickers.find(x => x.ticker === ticker);
            if (!t) return;
            document.getElementById('modalTitle').textContent = 'Edit Ticker';
            document.getElementById('editTicker').value = ticker;
            document.getElementById('ticker').value = t.ticker;
            document.getElementById('name').value = t.name;
            document.getElementById('type').value = t.type;
            document.getElementById('sector').value = t.sector || '';
            document.getElementById('price_drop_pct').value = t.alerts?.price_drop_pct || '';
            document.getElementById('price_gain_pct').value = t.alerts?.price_gain_pct || '';
            document.getElementById('daily_drop_pct').value = t.alerts?.daily_drop_pct || '';
            document.getElementById('daily_gain_pct').value = t.alerts?.daily_gain_pct || '';
            document.getElementById('volume_spike_x').value = t.alerts?.volume_spike_x || '';
            document.getElementById('cooldown_minutes').value = t.cooldown_minutes || '';
            document.getElementById('modal').classList.add('active');
        }
        
        function deleteTicker(ticker) {
            if (!confirm('Delete ' + ticker + '?')) return;
            fetch('/api/ticker/' + ticker, { method: 'DELETE' })
                .then(r => r.json())
                .then(d => {
                    if (d.success) { showToast('Ticker deleted'); location.reload(); }
                    else { showToast(d.error || 'Error', 'error'); }
                });
        }
        
        document.getElementById('tickerForm').onsubmit = function(e) {
            e.preventDefault();
            const editTicker = document.getElementById('editTicker').value;
            const data = {
                ticker: document.getElementById('ticker').value.toUpperCase(),
                name: document.getElementById('name').value,
                type: document.getElementById('type').value,
                sector: document.getElementById('sector').value,
                alerts: {
                    price_drop_pct: parseFloat(document.getElementById('price_drop_pct').value) || null,
                    price_gain_pct: parseFloat(document.getElementById('price_gain_pct').value) || null,
                    daily_drop_pct: parseFloat(document.getElementById('daily_drop_pct').value) || null,
                    daily_gain_pct: parseFloat(document.getElementById('daily_gain_pct').value) || null,
                    volume_spike_x: parseFloat(document.getElementById('volume_spike_x').value) || null,
                },
                cooldown_minutes: parseInt(document.getElementById('cooldown_minutes').value) || 90
            };
            fetch('/api/ticker' + (editTicker ? '/' + editTicker : ''), {
                method: editTicker ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).then(r => r.json()).then(d => {
                if (d.success) { showToast('Ticker saved'); closeModal(); location.reload(); }
                else { showToast(d.error || 'Error', 'error'); }
            });
        };
        
        document.getElementById('modal').onclick = function(e) {
            if (e.target.id === 'modal') closeModal();
        };
    </script>
</body>
</html>
'''

@app.route('/')
def index():
    config = load_config()
    tickers = config.get('watchlist', [])
    sectors = get_sectors()
    return render_template_string(HTML_TEMPLATE, 
                                  tickers=tickers, 
                                  sectors=sectors,
                                  tickers_json=json.dumps(tickers))

@app.route('/api/ticker', methods=['POST'])
def add_ticker():
    data = request.json
    config = load_config()
    
    # Check for duplicates
    for t in config.get('watchlist', []):
        if t.get('ticker') == data.get('ticker'):
            return jsonify({'success': False, 'error': 'Ticker already exists'})
    
    # Clean up null values
    ticker_data = {
        'ticker': data.get('ticker', '').upper(),
        'name': data.get('name', ''),
        'type': data.get('type', 'stock'),
        'sector': data.get('sector', 'other'),
        'alerts': {},
        'cooldown_minutes': data.get('cooldown_minutes', 90)
    }
    
    # Add alerts
    alerts = data.get('alerts', {})
    for key in ['price_drop_pct', 'price_gain_pct', 'daily_drop_pct', 'daily_gain_pct', 'volume_spike_x']:
        if alerts.get(key):
            ticker_data['alerts'][key] = alerts[key]
    
    config.setdefault('watchlist', []).append(ticker_data)
    
    if save_config(config):
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Failed to save'})

@app.route('/api/ticker/<old_ticker>', methods=['PUT'])
def update_ticker(old_ticker):
    data = request.json
    config = load_config()
    
    tickers = config.get('watchlist', [])
    for i, t in enumerate(tickers):
        if t.get('ticker') == old_ticker:
            # If ticker changed, delete old
            new_ticker = data.get('ticker', old_ticker).upper()
            if new_ticker != old_ticker:
                # Check new ticker doesn't exist
                for check in tickers:
                    if check.get('ticker') == new_ticker:
                        return jsonify({'success': False, 'error': 'Ticker already exists'})
                del tickers[i]
                i -= 1
            
            ticker_data = {
                'ticker': new_ticker,
                'name': data.get('name', ''),
                'type': data.get('type', 'stock'),
                'sector': data.get('sector', 'other'),
                'alerts': {},
                'cooldown_minutes': data.get('cooldown_minutes', 90)
            }
            
            alerts = data.get('alerts', {})
            for key in ['price_drop_pct', 'price_gain_pct', 'daily_drop_pct', 'daily_gain_pct', 'volume_spike_x']:
                if alerts.get(key):
                    ticker_data['alerts'][key] = alerts[key]
            
            # Replace the existing ticker (not append!)
            tickers[i] = ticker_data
            config['watchlist'] = tickers
            
            if save_config(config):
                return jsonify({'success': True})
            return jsonify({'success': False, 'error': 'Failed to save'})
    
    return jsonify({'success': False, 'error': 'Ticker not found'})

@app.route('/api/ticker/<ticker>', methods=['DELETE'])
def delete_ticker(ticker):
    config = load_config()
    tickers = config.get('watchlist', [])
    config['watchlist'] = [t for t in tickers if t.get('ticker') != ticker]
    
    if save_config(config):
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Failed to save'})

if __name__ == '__main__':
    import json
    logger.info(f"Starting Watchlist Dashboard on port {PORT}")
    app.run(host=HOST, port=PORT, debug=False)
