/**
 * SecureVault Progressive Web App (PWA) Manager
 * Handles Service Worker Registration, Install Prompts, and iOS Add-to-Home-Screen
 */

let deferredInstallPrompt = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js', { scope: '/' })
                .then((registration) => {
                    console.log('[PWA] Service Worker registered successfully with scope:', registration.scope);
                })
                .catch((error) => {
                    console.warn('[PWA] Service Worker registration failed:', error);
                });
        });
    }

    // 2. Check if already installed / running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         window.navigator.standalone === true ||
                         document.referrer.includes('android-app://');

    if (isStandalone) {
        console.log('[PWA] App is running in standalone mode.');
        const installBtns = document.querySelectorAll('.pwa-install-btn, #pwaInstallBanner');
        installBtns.forEach(btn => btn.style.display = 'none');
        return;
    }

    // 3. Handle Chromium / Android / Desktop "beforeinstallprompt"
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent immediate browser mini-infobar
        e.preventDefault();
        deferredInstallPrompt = e;

        // Show install button & floating banner
        const installBtns = document.querySelectorAll('.pwa-install-btn');
        installBtns.forEach(btn => {
            btn.classList.remove('d-none');
            btn.style.display = 'inline-flex';
        });

        showPwaBanner();
    });

    // 4. Handle Successful Installation
    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        console.log('[PWA] App installed successfully!');
        hidePwaBanner();
        const installBtns = document.querySelectorAll('.pwa-install-btn');
        installBtns.forEach(btn => btn.style.display = 'none');

        if (typeof showToast === 'function') {
            showToast('SecureVault has been installed to your home screen!', 'success');
        }
    });

    // 5. Detect iOS Safari (Needs manual "Add to Home Screen" instructions)
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isSafari = /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent.toLowerCase());

    if (isIos && isSafari && !isStandalone) {
        const iosShown = sessionStorage.getItem('pwa_ios_prompt_dismissed');
        if (!iosShown) {
            setTimeout(() => {
                showIosInstallModal();
            }, 3000);
        }
    }
});

// Trigger Install Dialog
window.triggerPwaInstall = async function() {
    if (!deferredInstallPrompt) {
        // Fallback for browsers that don't support beforeinstallprompt
        const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
        if (isIos) {
            showIosInstallModal();
            return;
        }
        alert('To install SecureVault:\n1. Click your browser menu (⋮ or ⋯)\n2. Select "Install SecureVault" or "Add to Home screen".');
        return;
    }

    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    console.log(`[PWA] User choice: ${outcome}`);

    if (outcome === 'accepted') {
        hidePwaBanner();
    }
    deferredInstallPrompt = null;
};

// UI: Floating Install Banner
function showPwaBanner() {
    if (localStorage.getItem('pwa_banner_dismissed')) return;
    if (document.getElementById('pwaInstallBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'pwaInstallBanner';
    banner.className = 'pwa-install-banner shadow-lg animate-fade-in';
    banner.innerHTML = `
        <div class="d-flex align-items-center gap-3">
            <div class="pwa-banner-icon">
                <img src="/images/icon-192.png" alt="SecureVault" width="42" height="42" class="rounded-3 shadow-sm">
            </div>
            <div class="flex-grow-1 text-start">
                <div class="fw-bold text-white small leading-tight">Install SecureVault App</div>
                <div class="text-white-50" style="font-size: 0.72rem;">Add to Home Screen for fast standalone access</div>
            </div>
            <div class="d-flex align-items-center gap-2">
                <button type="button" class="btn btn-sm btn-primary py-1 px-3 fw-bold" onclick="triggerPwaInstall()">
                    <i class="bi bi-download me-1"></i> Install
                </button>
                <button type="button" class="btn btn-sm btn-link text-white-50 p-1" onclick="dismissPwaBanner()" title="Dismiss">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(banner);
}

function hidePwaBanner() {
    const banner = document.getElementById('pwaInstallBanner');
    if (banner) {
        banner.remove();
    }
}

window.dismissPwaBanner = function() {
    hidePwaBanner();
    localStorage.setItem('pwa_banner_dismissed', 'true');
};

// iOS Instructions Modal
function showIosInstallModal() {
    if (document.getElementById('iosInstallModal')) return;

    const modal = document.createElement('div');
    modal.id = 'iosInstallModal';
    modal.className = 'ios-pwa-sheet shadow-lg animate-fade-in';
    modal.innerHTML = `
        <div class="d-flex justify-content-between align-items-start mb-2">
            <div class="d-flex align-items-center gap-2">
                <img src="/images/icon-192.png" width="34" height="34" class="rounded-2">
                <h6 class="mb-0 fw-bold text-white">Install SecureVault on iOS</h6>
            </div>
            <button type="button" class="btn-close btn-close-white small" onclick="dismissIosModal()"></button>
        </div>
        <p class="text-white-50 small mb-2">Install this web app to your iPhone/iPad Home Screen:</p>
        <ol class="text-white-50 small ps-3 mb-3" style="line-height: 1.6;">
            <li>Tap the <strong class="text-white"><i class="bi bi-box-arrow-up text-primary"></i> Share</strong> icon in your Safari toolbar.</li>
            <li>Scroll down and tap <strong class="text-white"><i class="bi bi-plus-square text-primary"></i> Add to Home Screen</strong>.</li>
            <li>Tap <strong class="text-white">Add</strong> in the top-right corner.</li>
        </ol>
        <button type="button" class="btn btn-sm btn-outline-light w-100 rounded-pill" onclick="dismissIosModal()">Got it</button>
    `;
    document.body.appendChild(modal);
}

window.dismissIosModal = function() {
    const modal = document.getElementById('iosInstallModal');
    if (modal) modal.remove();
    sessionStorage.setItem('pwa_ios_prompt_dismissed', 'true');
};
