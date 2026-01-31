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
                    enabled: false
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

    ctx.canvas.style.cursor = 'pointer';
}

// ========== UPDATE INSIGHTS ON HOVER ==========
function updateInsights(index) {
    if (index < 0 || index >= globalData.length) return;

    const current = globalData[index];
    const previous = index > 0 ? globalData[index - 1] : null;

    const totalCurrent = (current.bus || 0) + (current.metro || 0) + (current.minibus || 0) + (current.cable || 0);
    const totalPrevious = previous ? ((previous.bus || 0) + (previous.metro || 0) + (previous.minibus || 0) + (previous.cable || 0)) : 0;
    const totalChange = previous ? calculateChange(totalCurrent, totalPrevious) : null;

    updateTotalCard(totalCurrent, totalChange, current.date);

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
            
            changeElement.className = `insight-change total-change ${changeClass}`;
            changeElement.style.color = 'rgba(255,255,255,0.9)';
            changeElement.innerHTML = `${changeSymbol} ${Math.abs(change)}% vs წინა დღე`;
        } else {
            changeElement.className = 'insight-change total-change';
            changeElement.style.color = 'rgba(255,255,255,0.9)';
            changeElement.innerHTML = '—';
        }
    }
}

function updateModeCard(mode, value, change) {
    const valueElement = document.querySelector(`.${mode}-value`);
    const changeElement = document.querySelector(`.${mode}-change`);

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
            changeElement.innerHTML = `${changeSymbol} ${Math.abs(change)}% vs წინა დღე`;
        } else {
            changeElement.className = `insight-change ${mode}-change`;
            changeElement.style.color = '#6b7280';
            changeElement.innerHTML = '—';
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
    const modeNames = { bus: 'ავტობუსი', metro: 'მეტრო', minibus: 'მიკროავტობუსი', cable: 'საბაგირო' };
    
    const cards = modes.map(mode => {
        const change = calculateChange(latest[mode], previous[mode]);
        const changeClass = getChangeClass(change);
        const changeSymbol = getChangeSymbol(change);

        return `
            <div class="insight-card">
                <h3>${modeNames[mode]}</h3>
                <div class="insight-value ${mode}-value">${(latest[mode] || 0).toLocaleString()}</div>
                <div class="insight-change ${mode}-change ${changeClass}" style="color: ${changeClass === 'change-positive' ? '#10b981' : changeClass === 'change-negative' ? '#ef4444' : '#6b7280'};">
                    ${changeSymbol} ${Math.abs(change)}% vs წინა დღე
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="insight-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; position: relative;">
            <h3 style="color: rgba(255,255,255,0.9);">სულ მგზავრობა</h3>
            <div class="insight-value total-value" style="color: white;">${totalLatest.toLocaleString()}</div>
            <div class="insight-change total-change" style="color: rgba(255,255,255,0.9);">
                ${getChangeSymbol(totalChange)} ${Math.abs(totalChange)}% vs წინა დღე
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
}

// ========== DASHBOARD INITIALIZATION ==========
async function initDashboard() {
    const data = await loadData();
    
    if (data.length === 0) {
        document.getElementById('dashboard').innerHTML = '<p class="loading">No data available</p>';
        return;
    }

    data.sort((a, b) => parseDate(a.date) - parseDate(b.date));
    globalData = data;

    const html = `
        <div class="main-content">
            <div class="chart-container">
                <div class="chart-legend">
                    <div class="chart-legend-item">
                        <div class="chart-legend-color" style="background: #3b82f6;"></div>
                        <span>ავტობუსი</span>
                    </div>
                    <div class="chart-legend-item">
                        <div class="chart-legend-color" style="background: #10b981;"></div>
                        <span>მეტრო</span>
                    </div>
                    <div class="chart-legend-item">
                        <div class="chart-legend-color" style="background: #f59e0b;"></div>
                        <span>მიკროავტობუსი</span>
                    </div>
                    <div class="chart-legend-item">
                        <div class="chart-legend-color" style="background: #8b5cf6;"></div>
                        <span>საბაგირო</span>
                    </div>
                    <div class="chart-legend-item" style="margin-left: 10px;">
                        <div class="chart-legend-color" style="background: rgba(0, 0, 0, 0.1);"></div>
                        <span>შაბ-კვ.</span>
                    </div>
                    <div class="chart-legend-item">
                        <div class="chart-legend-color" style="background: rgba(102, 126, 234, 0.2);"></div>
                        <span>უქმე დღე</span>
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
                    <h3>მეთოდოლოგია</h3>
                    <button class="modal-close" onclick="closeMethodModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <p><strong>მონაცემთა წყარო:</strong> მგზავრობის ყოველდღიური მონაცემები ეყრდნობა <a href="https://ttc.com.ge" target="_blank" rel="noopener">თბილისის სატრანსპორტო კომპანიის</a> ოფიციალურ ინფორმაციას.</p>
                    <p><strong>მახასიათებლები:</strong> მონაცემები ფარავს საზოგადოებრივი ტრანსპორტის ოთხ სახეობას - ავტობუსს, მეტროს, მიკროავტობუსსა და საბაგიროს. 
                    პლატფორმაზე მოცემული უახლესი მონაცემი წინა დღის მაჩვენებელია.</p>
                    <p><strong>დასვენების დღეები:</strong> მგზავრობის დინამიკის უკეთ სანახავად, შაბათ-კვირა და უქმე დღეები მოცემულია შესაბამის ფერებში.</p>
                    <p><strong>ციტირება:</strong> მონაცემების გადმოწერის და გამოყენების შემთხვევაში, გთხოვთ, წყარო მიუთითოთ შესაბამის ფორმატში - <i>თბილისის სატრანსპორტო კომპანიის მონაცემები, Z.axis (2026).</i></p>
                </div>
            </div>
        </div>

        <div class="footer">
            <div class="footer-top">
                <div class="last-update">
                    <span class="last-update-label">ბოლო განახლება:</span>
                    <span class="last-update-value">${formatDate(data[data.length - 1].date)} 2026</span>
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
                <div class="social-share">
                    <button class="share-button facebook" onclick="shareOnFacebook()" title="გაზიარება Facebook-ზე">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                    </button>
                    <button class="share-button linkedin" onclick="shareOnLinkedIn()" title="გაზიარება LinkedIn-ზე">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                    </button>
                    <button class="share-button email" onclick="shareViaEmail()" title="გაზიარება ელფოსტით">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="footer-bottom">
                <div class="footer-logo-wrapper">
                    <a href="https://zaxis.ge" target="_blank" rel="noopener">
                        <img src="img/black-logo.png" alt="Logo" class="footer-logo-img">
                    </a>
                </div>
            </div>
            <span style="font-size: 12px">© 2026</span>
        </div>
    `;

    document.getElementById('dashboard').innerHTML = html;
    createChart(data);
    initTransitMap();
    updateInsights(data.length - 1);
}

// ========== MODAL AND DOWNLOAD HANDLERS ==========
function openMethodModal() {
    const modal = document.getElementById('methodModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeMethodModal() {
    const modal = document.getElementById('methodModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function downloadDataFile() {
    const a = document.createElement('a');
    a.href = 'data/ttc_passengers.json';
    a.download = 'tbilisi_transport_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// ========== SOCIAL SHARE FUNCTIONS ==========
function shareOnFacebook() {
    const url = encodeURIComponent(window.location.href);
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
}

function shareOnLinkedIn() {
    const url = encodeURIComponent(window.location.href);
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
}

function shareViaEmail() {
    const subject = encodeURIComponent('საზოგადოებრივი ტრანსპორტი თბილისში');
    const body = encodeURIComponent(`ნახეთ ეს ინტერაქტიული დაშბორდი, რომელიც აჩვენებს თბილისის საზოგადოებრივი ტრანსპორტის ყოველდღიურ სტატისტიკას:\n\n${window.location.href}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

// ========== START APPLICATION ==========
initDashboard();