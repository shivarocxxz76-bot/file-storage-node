/**
 * Chart.js Visualizations for User Storage & Admin Analytics
 */

// User Dashboard Storage Doughnut Chart
function renderUserStorageChart(canvasId, storageData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: storageData.labels,
            datasets: [{
                data: storageData.values,
                backgroundColor: [
                    '#10b981', // Images
                    '#3b82f6', // Documents
                    '#ef4444', // Video
                    '#06b6d4', // Audio
                    '#f59e0b', // Archives
                    '#8b5cf6', // Code/Others
                    isDark ? '#334155' : '#e2e8f0'  // Available
                ],
                borderWidth: 2,
                borderColor: isDark ? '#111827' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 10,
                        padding: 12,
                        font: { size: 11, family: 'Plus Jakarta Sans, sans-serif' },
                        color: isDark ? '#94a3b8' : '#64748b'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${context.raw} MB`;
                        }
                    }
                }
            },
            cutout: '72%'
        }
    });
}

// Admin Monthly Uploads Chart
function renderAdminUploadsChart(canvasId, uploadData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || !uploadData) return;

    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: uploadData.months,
            datasets: [{
                label: 'Files Uploaded',
                data: uploadData.counts,
                backgroundColor: '#4f46e5',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: isDark ? '#1f2937' : '#f1f5f9' },
                    ticks: { color: isDark ? '#94a3b8' : '#64748b', font: { family: 'Plus Jakarta Sans' } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: isDark ? '#94a3b8' : '#64748b', font: { family: 'Plus Jakarta Sans' } }
                }
            }
        }
    });
}

// Admin Revenue Growth Chart
function renderAdminRevenueChart(canvasId, revenueData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || !revenueData) return;

    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: revenueData.months,
            datasets: [{
                label: 'Revenue ($)',
                data: revenueData.amounts,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#10b981',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: isDark ? '#1f2937' : '#f1f5f9' },
                    ticks: {
                        color: isDark ? '#94a3b8' : '#64748b',
                        font: { family: 'Plus Jakarta Sans' },
                        callback: (v) => '$' + v
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: isDark ? '#94a3b8' : '#64748b', font: { family: 'Plus Jakarta Sans' } }
                }
            }
        }
    });
}
