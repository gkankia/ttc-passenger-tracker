

// Georgian public holidays 2026
const GEORGIAN_HOLIDAYS = [
    '01.01.2026', '02.01.2026', '07.01.2026', '19.01.2026',
    '03.03.2026', '08.03.2026', '18.04.2026', '19.04.2026',
    '20.04.2026', '21.04.2026', '09.05.2026', '12.05.2026',
    '26.05.2026', '28.08.2026', '14.10.2026', '23.11.2026'
];

// Global data reference
let globalData = [];

// ========== DATA LOADING ==========
async function loadData() {
    try {
        const response = await fetch('data/ttc_passengers.json');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error loading data:', error);
        return [];
    }
}

// ========== DATE UTILITIES ==========
function parseDate(dateStr) {
    const [day, month, year] = dateStr.split('.');
    return new Date(year, month - 1, day);
}

function formatDate(dateStr) {
    const date = parseDate(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isHoliday(dateStr) {
    return GEORGIAN_HOLIDAYS.includes(dateStr);
}

// ========== CALCULATION UTILITIES ==========
function calculateChange(current, previous) {
    if (!previous || previous === 0) return null;
    return ((current - previous) / previous * 100).toFixed(1);
}

function getChangeClass(change) {
    if (change > 0) return 'change-positive';
    if (change < 0) return 'change-negative';
    return 'change-neutral';
}

function getChangeSymbol(change) {
    if (change > 0) return '↑';
    if (change < 0) return '↓';
    return '→';
}

// ========== NUMBER ANIMATION ==========
function animateNumber(element, start, end, duration = 500) {
    const startTime = performance.now();
    const difference = end - start;
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (difference * easeOut));
        
        element.textContent = current.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// ========== CHART PLUGIN FOR WEEKEND AND HOLIDAY HIGHLIGHTING ==========
const weekendHolidayHighlightPlugin = {
    id: 'weekendHolidayHighlight',
    beforeDatasetsDraw(chart) {
        const { ctx, chartArea: { left, right, top, bottom }, scales: { x, y } } = chart;
        
        ctx.save();
        
        const data = chart.data.labels;
        const dates = chart.config.options.plugins.weekendHolidayHighlight.dates;
        
        data.forEach((label, index) => {
            const dateStr = dates[index];
            const date = parseDate(dateStr);
            const dayOfWeek = date.getDay();
            
            const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
            const isHolidayDay = GEORGIAN_HOLIDAYS.includes(dateStr);
            
            if (isWeekendDay || isHolidayDay) {
                const xPos = x.getPixelForValue(index);
                const barWidth = x.width / data.length;
                
                if (isHolidayDay && !isWeekendDay) {
                    ctx.fillStyle = 'rgba(102, 126, 234, 0.08)';
                } else {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
                }
                
                ctx.fillRect(
                    xPos - barWidth / 2,
                    top,
                    barWidth,
                    bottom - top
                );
            }
        });
        
        ctx.restore();
    }
};

// ========== CHART CREATION ==========
function createChart(data) {
    const ctx = document.getElementById('passengerChart').getContext('2d');
    
    const labels = data.map(d => formatDate(d.date));
    const dates = data.map(d => d.date);

    const datasets = [
        {
            label: 'Bus',
            data: data.map(d => d.bus),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            pointBackgroundColor: '#3b82f6',
            pointRadius: 4,
            pointHoverRadius: 8,
            tension: 0.4
        },
        {
            label: 'Metro',
            data: data.map(d => d.metro),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            pointBackgroundColor: '#10b981',
            pointRadius: 4,
            pointHoverRadius: 8,
            tension: 0.4
        },
        {
            label: 'Minibus',
            data: data.map(d => d.minibus),
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            pointBackgroundColor: '#f59e0b',
            pointRadius: 4,
            pointHoverRadius: 8,
            tension: 0.4
        },
        {
            label: 'Cable',
            data: data.map(d => d.cable),
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            pointBackgroundColor: '#8b5cf6',
            pointRadius: 4,
            pointHoverRadius: 8,
            tension: 0.4
        }
    ];

    const chart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false // Disable tooltip
                },
                weekendHolidayHighlight: {
                    dates: dates
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return (value / 1000).toFixed(0) + 'k';
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            onHover: (event, activeElements) => {
                if (activeElements.length > 0) {
                    const index = activeElements[0].index;
                    updateInsights(index);
                }
            }
        },
        plugins: [weekendHolidayHighlightPlugin]
    });

    // Set canvas cursor to pointer
    ctx.canvas.style.cursor = 'pointer';
}

// ========== UPDATE INSIGHTS ON HOVER ==========
function updateInsights(index) {
    console.log('updateInsights called with index:', index);
    if (index < 0 || index >= globalData.length) return;

    const current = globalData[index];
    const previous = index > 0 ? globalData[index - 1] : null;
    
    console.log('Current date:', current.date, 'Current bus:', current.bus);

    // Update total
    const totalCurrent = (current.bus || 0) + (current.metro || 0) + (current.minibus || 0) + (current.cable || 0);
    const totalPrevious = previous ? ((previous.bus || 0) + (previous.metro || 0) + (previous.minibus || 0) + (previous.cable || 0)) : 0;
    const totalChange = previous ? calculateChange(totalCurrent, totalPrevious) : null;

    updateTotalCard(totalCurrent, totalChange, current.date);

    // Update mode cards
    const modes = ['bus', 'metro', 'minibus', 'cable'];
    modes.forEach(mode => {
        const currentValue = current[mode] || 0;
        const previousValue = previous ? (previous[mode] || 0) : 0;
        const change = previous ? calculateChange(currentValue, previousValue) : null;

        updateModeCard(mode, currentValue, change);
    });
}

function updateTotalCard(total, change, date) {
    const valueElement = document.querySelector('.total-value');
    const changeElement = document.querySelector('.total-change');

    if (valueElement) {
        const oldValue = parseInt(valueElement.textContent.replace(/,/g, '')) || 0;
        animateNumber(valueElement, oldValue, total);
    }

    if (changeElement) {
        if (change !== null) {
            const changeClass = getChangeClass(change);
            const changeSymbol = getChangeSymbol(change);
            const holidayBadge = isHoliday(date) ? '' : '';
            
            changeElement.className = `insight-change total-change ${changeClass}`;
            changeElement.style.color = changeClass === 'change-positive' ? 'rgba(255,255,255,0.9)' : 
                                        changeClass === 'change-negative' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.9)';
            changeElement.innerHTML = `${changeSymbol} ${Math.abs(change)}% vs prev. day${holidayBadge}`;
        } else {
            // First day - hide or show placeholder
            changeElement.className = 'insight-change total-change';
            changeElement.style.color = 'rgba(255,255,255,0.9)';
            changeElement.innerHTML = '—';
        }
    }
}

function updateModeCard(mode, value, change) {
    const valueElement = document.querySelector(`.${mode}-value`);
    const changeElement = document.querySelector(`.${mode}-change`);

    console.log(`updateModeCard for ${mode}:`, { value, change, valueElement, changeElement });

    if (valueElement) {
        const oldValue = parseInt(valueElement.textContent.replace(/,/g, '')) || 0;
        animateNumber(valueElement, oldValue, value);
    }

    if (changeElement) {
        if (change !== null) {
            const changeClass = getChangeClass(change);
            const changeSymbol = getChangeSymbol(change);
            
            changeElement.className = `insight-change ${mode}-change ${changeClass}`;
            changeElement.style.color = changeClass === 'change-positive' ? '#10b981' : 
                                        changeClass === 'change-negative' ? '#ef4444' : '#6b7280';
            changeElement.innerHTML = `${changeSymbol} ${Math.abs(change)}% vs prev. day`;
            console.log(`Updated ${mode} change to: ${change}%`);
        } else {
            changeElement.className = `insight-change ${mode}-change`;
            changeElement.style.color = '#6b7280';
            changeElement.innerHTML = '—';
            console.log(`${mode} change is null (first day)`);
        }
    }
}

// ========== INSIGHTS CREATION ==========
function createInsights(data) {
    if (data.length < 2) return '<p>Not enough data for insights</p>';

    const latest = data[data.length - 1];
    const previous = data[data.length - 2];

    const totalLatest = (latest.bus || 0) + (latest.metro || 0) + 
                       (latest.minibus || 0) + (latest.cable || 0);
    const totalPrevious = (previous.bus || 0) + (previous.metro || 0) + 
                         (previous.minibus || 0) + (previous.cable || 0);
    const totalChange = calculateChange(totalLatest, totalPrevious);

    const modes = ['bus', 'metro', 'minibus', 'cable'];
    const modeNames = { bus: 'Bus', metro: 'Metro', minibus: 'Minibus', cable: 'Cable' };
    
    const cards = modes.map(mode => {
        const change = calculateChange(latest[mode], previous[mode]);
        const changeClass = getChangeClass(change);
        const changeSymbol = getChangeSymbol(change);

        return `
            <div class="insight-card">
                <h3>${modeNames[mode]}</h3>
                <div class="insight-value ${mode}-value">${(latest[mode] || 0).toLocaleString()}</div>
                <div class="insight-change ${mode}-change ${changeClass}" style="color: ${changeClass === 'change-positive' ? '#10b981' : changeClass === 'change-negative' ? '#ef4444' : '#6b7280'};">
                    ${changeSymbol} ${Math.abs(change)}% vs prev. day
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="insight-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; position: relative;">
            <h3 style="color: rgba(255,255,255,0.9);">TOTAL PASSENGERS</h3>
            <div class="insight-value total-value" style="color: white;">${totalLatest.toLocaleString()}</div>
            <div class="insight-change total-change" style="color: rgba(255,255,255,0.9);">
                ${getChangeSymbol(totalChange)} ${Math.abs(totalChange)}% vs prev. day
                ${isHoliday(latest.date) ? ' 🎉 Public Holiday' : ''}
            </div>
        </div>
        ${cards}
    `;
}

// ========== DASHBOARD INITIALIZATION ==========
async function initDashboard() {
    console.log('=== DASHBOARD INIT STARTED ===');
    const data = await loadData();
    console.log('Data loaded:', data.length, 'records');
    
    if (data.length === 0) {
        document.getElementById('dashboard').innerHTML = '<p class="loading">No data available</p>';
        return;
    }

    data.sort((a, b) => parseDate(a.date) - parseDate(b.date));
    globalData = data; // Store globally for hover updates
    console.log('Global data set, length:', globalData.length);

    const html = `
        <div class="main-content">
            <div class="chart-container">
                <div class="chart-legend">
                    <div class="chart-legend-item">
                        <div class="chart-legend-color" style="background: #3b82f6;"></div>
                        <span>Bus</span>
                    </div>
                    <div class="chart-legend-item">
                        <div class="chart-legend-color" style="background: #10b981;"></div>
                        <span>Metro</span>
                    </div>
                    <div class="chart-legend-item">
                        <div class="chart-legend-color" style="background: #f59e0b;"></div>
                        <span>Minibus</span>
                    </div>
                    <div class="chart-legend-item">
                        <div class="chart-legend-color" style="background: #8b5cf6;"></div>
                        <span>Cable</span>
                    </div>
                    <div class="chart-legend-item" style="margin-left: 10px;">
                        <div class="chart-legend-color" style="background: rgba(0, 0, 0, 0.1);"></div>
                        <span>Weekend</span>
                    </div>
                    <div class="chart-legend-item">
                        <div class="chart-legend-color" style="background: rgba(102, 126, 234, 0.2);"></div>
                        <span>Holiday</span>
                    </div>
                </div>
                <canvas id="passengerChart"></canvas>
            </div>

            <div class="insights-grid">
                ${createInsights(data)}
            </div>
        </div>

        <!-- Method Modal -->
        <div class="modal" id="methodModal" onclick="if(event.target === this || event.target.classList.contains('modal-backdrop')) closeMethodModal()">
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Methodology</h3>
                    <button class="modal-close" onclick="closeMethodModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <p><strong>Data Source:</strong> Daily passenger counts are scraped from the Tbilisi Transport Company (TTC) official website at 3:00 AM local time.</p>
                    <p><strong>Coverage:</strong> The data includes all four public transport modes in Tbilisi: buses, metro, minibuses (marshrutkas), and cable cars.</p>
                    <p><strong>Update Frequency:</strong> Data is updated once daily, capturing the previous day's ridership totals.</p>
                    <p><strong>Georgian Public Holidays:</strong> Official public holidays are marked on the chart and may show different ridership patterns.</p>
                </div>
            </div>
        </div>

        <div class="footer">
            <div class="footer-top">
                <div class="last-update">
                    <span class="last-update-label">ბოლო განახლება:</span>
                    <span class="last-update-value">${formatDate(data[data.length - 1].date)} • 03:00 AM</span>
                </div>
                <div class="footer-actions">
                    <button class="footer-button" onclick="openMethodModal()">
                        <b>მეთოდოლოგია</b>
                    </button>
                    <button class="footer-button" onclick="downloadDataFile()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        <b>მონაცემების გადმოწერა</b>
                    </button>
                </div>
            </div>
            
            <div class="footer-content">
                Data Source:
                <a href="https://ttc.com.ge" target="_blank" rel="noopener">Tbilisi Transport Company</a>
            </div>

            <div class="footer-logo-wrapper">
                <img src="img/black-logo.png" alt="Logo" class="footer-logo-img">
            </div>
        </div>
    `;

    document.getElementById('dashboard').innerHTML = html;
    console.log('HTML set in dashboard');
    createChart(data);
    console.log('Chart created');
    initTransitMap();
    console.log('Map initialized');
    
    // Initialize insights with the last data point
    updateInsights(data.length - 1);
    console.log('Insights initialized');
    console.log('=== DASHBOARD INIT COMPLETED ===');
}

// ========== MODAL AND DOWNLOAD HANDLERS ==========
function openMethodModal() {
    console.log('Opening method modal');
    const modal = document.getElementById('methodModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeMethodModal() {
    console.log('Closing method modal');
    const modal = document.getElementById('methodModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function downloadDataFile() {
    console.log('Downloading data file');
    const a = document.createElement('a');
    a.href = 'data/ttc_passengers.json';
    a.download = 'tbilisi_transport_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// ========== START APPLICATION ==========
initDashboard();