// ========== CONFIGURATION ==========
const CONFIG = {
    MAPBOX_TOKEN: 'pk.eyJ1Ijoiam9yam9uZTkwIiwiYSI6ImNrZ3R6M2FvdTBwbmwycXBibGRqM2w2enYifQ.BxjvFSGqefuC9yFCrXC-nQ',
    MAPBOX_STYLE: 'mapbox://styles/jorjone90/clplq461o00wy01o93mm76il6',
    MAP_CENTER: [44.8271, 41.7151],
    MAP_ZOOM: 12
};

// Georgian public holidays 2026
const GEORGIAN_HOLIDAYS = [
    '01.01.2026', '02.01.2026', '07.01.2026', '19.01.2026',
    '03.03.2026', '08.03.2026', '18.04.2026', '19.04.2026',
    '20.04.2026', '21.04.2026', '09.05.2026', '12.05.2026',
    '26.05.2026', '28.08.2026', '14.10.2026', '23.11.2026'
];

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

// ========== CHART PLUGIN FOR WEEKEND HIGHLIGHTING ==========
const weekendHighlightPlugin = {
    id: 'weekendHighlight',
    beforeDatasetsDraw(chart) {
        const { ctx, chartArea: { left, right, top, bottom }, scales: { x, y } } = chart;
        
        ctx.save();
        
        // Get the data to check weekdays
        const data = chart.data.labels;
        
        data.forEach((label, index) => {
            // Parse the date from label (e.g., "Jan 17")
            const dateStr = chart.config.options.plugins.weekendHighlight.dates[index];
            const date = parseDate(dateStr);
            const dayOfWeek = date.getDay();
            
            // Check if it's Saturday (6) or Sunday (0)
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                const xPos = x.getPixelForValue(index);
                const barWidth = x.width / data.length;
                
                ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
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
            
            // Check if it's a weekend
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            // Check if it's a holiday
            const isHoliday = isHoliday(dateStr);
            
            if (isWeekend || isHoliday) {
                const xPos = x.getPixelForValue(index);
                const barWidth = x.width / data.length;
                
                // Different colors for holidays vs weekends
                if (isHoliday && !isWeekend) {
                    // Holidays that aren't weekends - slightly more visible
                    ctx.fillStyle = 'rgba(102, 126, 234, 0.08)'; // Light purple/blue
                } else {
                    // Weekends (and holidays that fall on weekends)
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)'; // Light grey
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

    new Chart(ctx, {
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
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + 
                                   context.parsed.y.toLocaleString() + ' passengers';
                        }
                    }
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
            }
        },
        plugins: [weekendHolidayHighlightPlugin]
    });
}

// ========== INSIGHTS CREATION ==========
function createInsights(data) {
    if (data.length < 2) return '<p>Not enough data for insights</p>';

    const latest = data[data.length - 1];
    const previous = data[data.length - 2];

    const weekdays = data.filter(d => !['Saturday', 'Sunday'].includes(d.weekday) && !isHoliday(d.date));
    const weekends = data.filter(d => ['Saturday', 'Sunday'].includes(d.weekday) || isHoliday(d.date));

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

        let comparisonHtml = '';
        if (weekdays.length > 0 && weekends.length > 0) {
            const weekdayAvg = weekdays.reduce((sum, d) => sum + (d[mode] || 0), 0) / weekdays.length;
            const weekendAvg = weekends.reduce((sum, d) => sum + (d[mode] || 0), 0) / weekends.length;
            const weekendChange = calculateChange(weekendAvg, weekdayAvg);
            const comparisonClass = getChangeClass(weekendChange);
            const comparisonSymbol = getChangeSymbol(weekendChange);

            comparisonHtml = `
                <div class="insight-comparison ${comparisonClass}">
                    ${comparisonSymbol} ${Math.abs(weekendChange)}% weekend vs weekday
                </div>
            `;
        }

        return `
            <div class="insight-card">
                <h3>${modeNames[mode]}</h3>
                <div class="insight-value">${(latest[mode] || 0).toLocaleString()}</div>
                <div class="insight-change ${changeClass}">
                    ${changeSymbol} ${Math.abs(change)}% vs yesterday
                </div>
                ${comparisonHtml}
            </div>
        `;
    }).join('');

    return `
        <div class="insight-card" style="grid-column: 1 / -1; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <h3 style="color: rgba(255,255,255,0.9);">TOTAL PASSENGERS</h3>
            <div class="insight-value" style="color: white;">${totalLatest.toLocaleString()}</div>
            <div class="insight-change" style="color: rgba(255,255,255,0.9);">
                ${getChangeSymbol(totalChange)} ${Math.abs(totalChange)}% vs yesterday
                ${isHoliday(latest.date) ? '🎉 Public Holiday' : ''}
            </div>
        </div>
        ${cards}
    `;
}

// ========== MAP INITIALIZATION ==========
let map;

function initTransitMap() {
    mapboxgl.accessToken = CONFIG.MAPBOX_TOKEN;
    
    map = new mapboxgl.Map({
        container: 'transit-map',
        style: CONFIG.MAPBOX_STYLE,
        center: CONFIG.MAP_CENTER,
        zoom: CONFIG.MAP_ZOOM
    });

    console.log('Transit map initialized');
}

// ========== DASHBOARD INITIALIZATION ==========
async function initDashboard() {
    const data = await loadData();
    
    if (data.length === 0) {
        document.getElementById('dashboard').innerHTML = '<p class="loading">No data available</p>';
        return;
    }

    data.sort((a, b) => parseDate(a.date) - parseDate(b.date));

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
                </div>
                <canvas id="passengerChart"></canvas>
            </div>

            <div class="right-column">
                <div class="insights-grid">
                    ${createInsights(data)}
                </div>

                <div class="map-section">
                    <!--<h3>Transit Network Map</h3>-->
                    <!--<div id="transit-map"></div>-->
                </div>
            </div>
        </div>

        <div class="footer">
            <div class="footer-content">
                Data Source:
                <a href="https://ttc.com.ge" target="_blank" rel="noopener">Tbilisi Transport Company</a>
                <span class="footer-divider">|</span>
                Created by
                <a href="https://gkankia.xyz" target="_blank" rel="noopener">Giorgi Kankia</a>
            </div>

            <div class="footer-logo-wrapper">
                <img src="img/black-logo.png" alt="Logo" class="footer-logo-img">
            </div>
        </div>
    `;

    document.getElementById('dashboard').innerHTML = html;
    createChart(data);
    initTransitMap();
}

// ========== START APPLICATION ==========
initDashboard();