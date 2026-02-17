// Global state
let rawData = null;
let filteredData = null;
let config = null;
let charts = {};
let autoRefreshInterval = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    attachEventListeners();
    await loadData();
    renderDashboard();
    startAutoRefresh();
});

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        document.getElementById('theme-toggle').textContent = '☀️';
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    document.getElementById('theme-toggle').textContent = isLight ? '☀️' : '🌙';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

// Event Listeners
function attachEventListeners() {
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('refresh-btn').addEventListener('click', async () => {
        await loadData(true);
        renderDashboard();
    });

    // Filters
    ['date-range', 'agent-filter', 'project-filter', 'model-filter'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            applyFilters();
            renderDashboard();
        });
    });

    // Table controls
    document.getElementById('table-search').addEventListener('input', renderTable);
    document.getElementById('table-limit').addEventListener('change', renderTable);

    // Table sorting
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => sortTable(th.dataset.sort));
    });
}

// Auto-refresh Management
function startAutoRefresh() {
    if (!config || !config.refresh || !config.refresh.autoRefresh) return;

    const intervalMinutes = config.refresh.intervalMinutes || 15;
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log(`🔄 Auto-refresh enabled: every ${intervalMinutes} minutes`);

    autoRefreshInterval = setInterval(async () => {
        console.log('🔄 Auto-refreshing data...');
        await loadData(true);
        renderDashboard();
    }, intervalMs);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log('⏸️ Auto-refresh stopped');
    }
}

// Data Loading
async function loadData(force = false) {
    try {
        // Always use cache-busting for JSON files
        const timestamp = Date.now();
        const response = await fetch(`token-usage.json?t=${timestamp}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Validate data structure
        if (!data.entries || !Array.isArray(data.entries)) {
            throw new Error('Invalid data format: missing entries array');
        }

        rawData = data;

        // Load config if not already loaded
        if (!config) {
            config = await fetch(`config.json?t=${timestamp}`).then(r => r.json());
        }

        applyFilters();
        updateLastUpdated(data.generatedAt);

        console.log(`✅ Loaded ${data.entries.length} entries`);
    } catch (error) {
        console.error('Failed to load data:', error);
        document.getElementById('last-updated').textContent = `Error: ${error.message}`;
        document.getElementById('last-updated').style.color = '#f85149';
    }
}

function updateLastUpdated(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const ageMs = now - date;
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    const ageDays = Math.floor(ageHours / 24);

    const formatted = date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    let ageText = '';
    if (ageDays > 0) {
        ageText = ` (${ageDays}d ${ageHours % 24}h ago)`;
    } else if (ageHours > 0) {
        ageText = ` (${ageHours}h ago)`;
    } else {
        const ageMinutes = Math.floor(ageMs / (1000 * 60));
        ageText = ` (${ageMinutes}m ago)`;
    }

    const element = document.getElementById('last-updated');
    element.textContent = `Updated: ${formatted}${ageText}`;

    // Warn if data is old
    if (ageDays > 1) {
        element.style.color = '#f85149';
        element.title = '⚠️ Data may be stale. Consider updating.';
    } else {
        element.style.color = '';
        element.title = '';
    }
}

// Filtering
function applyFilters() {
    if (!rawData) return;

    let entries = [...rawData.entries];

    // Date range filter
    const dateRange = document.getElementById('date-range').value;
    const now = new Date();
    entries = entries.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        switch (dateRange) {
            case 'today':
                return entryDate.toDateString() === now.toDateString();
            case 'week':
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return entryDate >= weekAgo;
            case 'month':
                const monthAgo = new Date(now);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return entryDate >= monthAgo;
            case 'all':
                return true;
            default:
                return true;
        }
    });

    // Agent filter
    const agent = document.getElementById('agent-filter').value;
    if (agent !== 'all') {
        entries = entries.filter(e => e.agent === agent);
    }

    // Project filter
    const project = document.getElementById('project-filter').value;
    if (project !== 'all') {
        entries = entries.filter(e => e.project === project);
    }

    // Model filter
    const model = document.getElementById('model-filter').value;
    if (model !== 'all') {
        entries = entries.filter(e => e.model === model);
    }

    filteredData = entries;
}

// Dashboard Rendering
function renderDashboard() {
    if (!filteredData) return;

    renderOverviewCards();
    renderDailySpendChart();
    renderProjectChart();
    renderAgentChart();
    renderTokenChart();
    renderTable();
}

// Overview Cards
function renderOverviewCards() {
    const totalCost = filteredData.reduce((sum, e) => sum + e.cost.total, 0);
    const totalTokens = filteredData.reduce((sum, e) => sum + e.tokens.total, 0);

    document.getElementById('total-spend').textContent = `$${totalCost.toFixed(2)}`;
    document.getElementById('total-tokens').textContent = `${(totalTokens / 1000000).toFixed(2)}M tokens`;

    // Time-based cards
    const now = new Date();

    // Today
    const todayEntries = filteredData.filter(e =>
        new Date(e.timestamp).toDateString() === now.toDateString()
    );
    const todayCost = todayEntries.reduce((sum, e) => sum + e.cost.total, 0);
    document.getElementById('today-spend').textContent = `$${todayCost.toFixed(2)}`;

    if (config) {
        const todayPct = (todayCost / config.budgets.daily) * 100;
        const todayClass = todayPct >= 100 ? 'budget-danger' : todayPct >= 80 ? 'budget-warning' : 'budget-ok';
        document.getElementById('today-budget').innerHTML =
            `<span class="${todayClass}">${todayPct.toFixed(0)}% of $${config.budgets.daily}</span>`;
    }

    // This week
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekEntries = filteredData.filter(e => new Date(e.timestamp) >= weekAgo);
    const weekCost = weekEntries.reduce((sum, e) => sum + e.cost.total, 0);
    document.getElementById('week-spend').textContent = `$${weekCost.toFixed(2)}`;

    if (config) {
        const weekPct = (weekCost / config.budgets.weekly) * 100;
        const weekClass = weekPct >= 100 ? 'budget-danger' : weekPct >= 80 ? 'budget-warning' : 'budget-ok';
        document.getElementById('week-budget').innerHTML =
            `<span class="${weekClass}">${weekPct.toFixed(0)}% of $${config.budgets.weekly}</span>`;
    }

    // This month
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthEntries = filteredData.filter(e => new Date(e.timestamp) >= monthAgo);
    const monthCost = monthEntries.reduce((sum, e) => sum + e.cost.total, 0);
    document.getElementById('month-spend').textContent = `$${monthCost.toFixed(2)}`;

    if (config) {
        const monthPct = (monthCost / config.budgets.monthly) * 100;
        const monthClass = monthPct >= 100 ? 'budget-danger' : monthPct >= 80 ? 'budget-warning' : 'budget-ok';
        document.getElementById('month-budget').innerHTML =
            `<span class="${monthClass}">${monthPct.toFixed(0)}% of $${config.budgets.monthly}</span>`;
    }

    // Average per day
    const uniqueDays = new Set(filteredData.map(e =>
        new Date(e.timestamp).toDateString()
    )).size;
    const avgDay = uniqueDays > 0 ? totalCost / uniqueDays : 0;
    document.getElementById('avg-day').textContent = `$${avgDay.toFixed(2)}`;

    // Trend
    const recentDays = 3;
    const recentEntries = filteredData.slice(-Math.floor(filteredData.length / 2));
    const recentAvg = recentEntries.length > 0
        ? recentEntries.reduce((sum, e) => sum + e.cost.total, 0) / recentDays
        : 0;
    const trend = recentAvg > avgDay ? '📈 +' : '📉 ';
    const trendPct = avgDay > 0 ? Math.abs(((recentAvg - avgDay) / avgDay) * 100) : 0;
    document.getElementById('trend-indicator').textContent = `${trend}${trendPct.toFixed(0)}%`;
}

// Daily Spend Chart
function renderDailySpendChart() {
    const ctx = document.getElementById('daily-spend-chart');

    // Group by day and agent
    const dailyData = {};
    filteredData.forEach(entry => {
        const date = new Date(entry.timestamp).toDateString();
        if (!dailyData[date]) {
            dailyData[date] = { jett: 0, subagent: 0, cron: 0, other: 0 };
        }

        if (entry.agent === 'jett') dailyData[date].jett += entry.cost.total;
        else if (entry.agent.includes('subagent')) dailyData[date].subagent += entry.cost.total;
        else if (entry.agent === 'cron') dailyData[date].cron += entry.cost.total;
        else dailyData[date].other += entry.cost.total;
    });

    const dates = Object.keys(dailyData).sort((a, b) => new Date(a) - new Date(b));

    if (charts.dailySpend) charts.dailySpend.destroy();

    charts.dailySpend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
            datasets: [
                {
                    label: 'Jett',
                    data: dates.map(d => dailyData[d].jett),
                    borderColor: '#1f6feb',
                    backgroundColor: 'rgba(31, 111, 235, 0.1)',
                    fill: true
                },
                {
                    label: 'Subagents',
                    data: dates.map(d => dailyData[d].subagent),
                    borderColor: '#8b949e',
                    backgroundColor: 'rgba(139, 148, 158, 0.1)',
                    fill: true
                },
                {
                    label: 'Cron',
                    data: dates.map(d => dailyData[d].cron),
                    borderColor: '#3fb950',
                    backgroundColor: 'rgba(63, 185, 80, 0.1)',
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => '$' + value.toFixed(2)
                    }
                }
            }
        }
    });
}

// Project Chart
function renderProjectChart() {
    const ctx = document.getElementById('project-chart');

    const projectData = {};
    filteredData.forEach(entry => {
        const project = entry.project || 'unknown';
        projectData[project] = (projectData[project] || 0) + entry.cost.total;
    });

    const projects = Object.keys(projectData).sort((a, b) => projectData[b] - projectData[a]);

    if (charts.project) charts.project.destroy();

    charts.project = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: projects.map(p => p.replace('-', ' ').toUpperCase()),
            datasets: [{
                data: projects.map(p => projectData[p]),
                backgroundColor: [
                    '#1f6feb', '#d29922', '#3fb950', '#8b949e', '#f85149', '#a371f7'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'right' },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((value / total) * 100).toFixed(1);
                            return `${context.label}: $${value.toFixed(2)} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Agent Chart
function renderAgentChart() {
    const ctx = document.getElementById('agent-chart');

    const agentData = {};
    filteredData.forEach(entry => {
        const agent = entry.agent;
        agentData[agent] = (agentData[agent] || 0) + entry.cost.total;
    });

    const agents = Object.keys(agentData).sort((a, b) => agentData[b] - agentData[a]);

    if (charts.agent) charts.agent.destroy();

    charts.agent = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: agents.map(a => a.toUpperCase()),
            datasets: [{
                label: 'Cost ($)',
                data: agents.map(a => agentData[a]),
                backgroundColor: '#1f6feb'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `$${context.parsed.y.toFixed(2)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => '$' + value.toFixed(2)
                    }
                }
            }
        }
    });
}

// Token Chart
function renderTokenChart() {
    const ctx = document.getElementById('token-chart');

    // Group by day
    const dailyTokens = {};
    filteredData.forEach(entry => {
        const date = new Date(entry.timestamp).toDateString();
        if (!dailyTokens[date]) {
            dailyTokens[date] = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
        }

        dailyTokens[date].input += entry.tokens.input;
        dailyTokens[date].output += entry.tokens.output;
        dailyTokens[date].cacheRead += entry.tokens.cacheRead;
        dailyTokens[date].cacheWrite += entry.tokens.cacheWrite;
    });

    const dates = Object.keys(dailyTokens).sort((a, b) => new Date(a) - new Date(b));

    if (charts.tokens) charts.tokens.destroy();

    charts.tokens = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
            datasets: [
                {
                    label: 'Input',
                    data: dates.map(d => dailyTokens[d].input / 1000),
                    backgroundColor: '#1f6feb'
                },
                {
                    label: 'Output',
                    data: dates.map(d => dailyTokens[d].output / 1000),
                    backgroundColor: '#3fb950'
                },
                {
                    label: 'Cache Read',
                    data: dates.map(d => dailyTokens[d].cacheRead / 1000),
                    backgroundColor: '#d29922'
                },
                {
                    label: 'Cache Write',
                    data: dates.map(d => dailyTokens[d].cacheWrite / 1000),
                    backgroundColor: '#8b949e'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${(context.parsed.y * 1000).toLocaleString()} tokens`
                    }
                }
            },
            scales: {
                x: { stacked: true },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => value + 'K'
                    }
                }
            }
        }
    });
}

// Table
let tableSortKey = 'timestamp';
let tableSortAsc = false;

function sortTable(key) {
    if (tableSortKey === key) {
        tableSortAsc = !tableSortAsc;
    } else {
        tableSortKey = key;
        tableSortAsc = false;
    }
    renderTable();
}

function renderTable() {
    const search = document.getElementById('table-search').value.toLowerCase();
    const limit = parseInt(document.getElementById('table-limit').value);

    let data = [...filteredData];

    // Filter by search
    if (search) {
        data = data.filter(e =>
            e.agent.toLowerCase().includes(search) ||
            e.project.toLowerCase().includes(search) ||
            e.model.toLowerCase().includes(search)
        );
    }

    // Sort
    data.sort((a, b) => {
        let aVal, bVal;

        switch (tableSortKey) {
            case 'timestamp':
                aVal = new Date(a.timestamp);
                bVal = new Date(b.timestamp);
                break;
            case 'tokens':
                aVal = a.tokens.total;
                bVal = b.tokens.total;
                break;
            case 'cost':
                aVal = a.cost.total;
                bVal = b.cost.total;
                break;
            default:
                aVal = a[tableSortKey];
                bVal = b[tableSortKey];
        }

        if (aVal < bVal) return tableSortAsc ? -1 : 1;
        if (aVal > bVal) return tableSortAsc ? 1 : -1;
        return 0;
    });

    // Limit
    data = data.slice(0, limit);

    // Render
    const tbody = document.getElementById('activity-tbody');
    tbody.innerHTML = data.map(entry => {
        const date = new Date(entry.timestamp);
        const time = date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const agentClass = entry.agent.replace('-', '_');

        return `
            <tr>
                <td>${time}</td>
                <td><span class="agent-badge agent-${agentClass}">${entry.agent.toUpperCase()}</span></td>
                <td>${entry.project.toUpperCase()}</td>
                <td><span class="model-badge">${entry.model}</span></td>
                <td>${(entry.tokens.total / 1000).toFixed(1)}K</td>
                <td>$${entry.cost.total.toFixed(4)}</td>
            </tr>
        `;
    }).join('');
}
