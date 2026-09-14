/**
 * Main Application Script: Theme Toggle, Mobile Nav & Drawer, Toast & Utilities
 */

document.addEventListener('DOMContentLoaded', () => {
    // ---------------- Dark Mode Toggle & Persistence ----------------
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const htmlElement = document.documentElement;

    const savedTheme = localStorage.getItem('sv_theme') || 'dark';
    setTheme(savedTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = htmlElement.getAttribute('data-bs-theme') || 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
            localStorage.setItem('sv_theme', newTheme);
        });
    }

    function setTheme(theme) {
        htmlElement.setAttribute('data-bs-theme', theme);
        if (themeToggleBtn) {
            const icon = themeToggleBtn.querySelector('i');
            if (icon) {
                if (theme === 'dark') {
                    icon.className = 'bi bi-sun-fill text-warning';
                } else {
                    icon.className = 'bi bi-moon-stars-fill text-secondary';
                }
            }
        }
    }

    // ---------------- Mobile Sidebar Toggle ----------------
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMobileSidebar();
        });
    }

    // Close mobile drawer when clicking a link inside sidebar
    const sidebarNavLinks = document.querySelectorAll('.sidebar .nav-link');
    sidebarNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 992) {
                closeMobileSidebar();
            }
        });
    });

    // ---------------- Auto-dismiss Alert Messages ----------------
    const alerts = document.querySelectorAll('.alert-auto-dismiss');
    alerts.forEach(alert => {
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });

    // ---------------- Live Search Filter ----------------
    const liveSearchInput = document.getElementById('liveSearchInput');
    if (liveSearchInput) {
        liveSearchInput.addEventListener('keyup', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const searchableItems = document.querySelectorAll('.searchable-item');
            
            searchableItems.forEach(item => {
                const text = item.getAttribute('data-search') || item.textContent.toLowerCase();
                if (text.toLowerCase().includes(query)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
});

// Mobile Sidebar Helper Functions
function toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (!sidebar) return;

    sidebar.classList.toggle('show');
    if (backdrop) backdrop.classList.toggle('show');
}

function closeMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar) sidebar.classList.remove('show');
    if (backdrop) backdrop.classList.remove('show');
}

// Global Toast Notification Helper
function showToast(message, type = 'info') {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '1090';
        document.body.appendChild(toastContainer);
    }

    const toastId = 'toast_' + Date.now();
    const bgClass = type === 'success' ? 'bg-success text-white' : 
                    type === 'danger' ? 'bg-danger text-white' : 
                    type === 'warning' ? 'bg-warning text-dark' : 'bg-primary text-white';

    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastEl = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();

    toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
    });
}

// Sidebar Upload Handler
function triggerSidebarUpload() {
    const fileUploadInput = document.getElementById('fileUploadInput');
    if (fileUploadInput) {
        fileUploadInput.click();
    } else {
        const sidebarInput = document.getElementById('sidebarUploadFileInput');
        if (sidebarInput) sidebarInput.click();
    }
}

async function handleSidebarFileUpload(input) {
    if (!input.files || input.files.length === 0) return;
    
    const formData = new FormData();
    for (let i = 0; i < input.files.length; i++) {
        formData.append('files', input.files[i]);
    }
    
    const currentFolderInput = document.getElementById('currentFolderId');
    if (currentFolderInput && currentFolderInput.value) {
        formData.append('folder_id', currentFolderInput.value);
    }

    showToast('Encrypting & uploading ' + input.files.length + ' file(s)...', 'info');

    try {
        const response = await fetch('/files/upload', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.success) {
            showToast(result.message || 'Files encrypted & uploaded successfully!', 'success');
            setTimeout(() => {
                window.location.href = '/files';
            }, 800);
        } else {
            showToast(result.message || 'Upload failed.', 'danger');
        }
    } catch (err) {
        showToast('Error uploading files: ' + err.message, 'danger');
    }
}
