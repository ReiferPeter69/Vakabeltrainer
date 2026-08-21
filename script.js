// =============================================
// VOKABELTRAINER - HAUPTSKRIPT
// Ultra Edition mit Auto-Backup
// =============================================

// =============================================
// KONFIGURATION & KONSTANTEN
// =============================================
const DB_VERSION = 2;
const BACKUP_KEY = 'ultraBackup';
const DATA_KEY = 'ultraData';
const THEME_KEY = 'ultraTheme';
const ACCENT_KEY = 'ultraAccent';
const AUTO_BACKUP_INTERVAL = 5 * 60 * 1000; // 5 Minuten
const LEARN_SETTINGS_KEY = 'ultraLearnSettings';

// Verfügbare Akzent-Themen (für den Picker)
const ACCENT_THEMES = [
    { id: 'indigo',  name: 'Indigo',  color: '#4f46e5' },
    { id: 'emerald', name: 'Smaragd', color: '#059669' },
    { id: 'sunny',   name: 'Sonnig',  color: '#ea580c' },
    { id: 'rose',    name: 'Rosé',    color: '#e11d48' }
];

// Leitner-Zeitintervalle (in Millisekunden)
const LEITNER_INTERVALS = {
    1: 24 * 60 * 60 * 1000,       // 1 Tag
    2: 3 * 24 * 60 * 60 * 1000,   // 3 Tage
    3: 7 * 24 * 60 * 60 * 1000,   // 7 Tage
    4: 14 * 24 * 60 * 60 * 1000,  // 14 Tage
    5: 30 * 24 * 60 * 60 * 1000   // 30 Tage
};

// MAX_LEITNER_BOX für Statistik
const MAX_LEITNER_BOX = 5;

// =============================================
// FARBPALETTEN
// =============================================
const COLOR_PALETTE = [
    { id: 'default', name: 'Standard', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
    { id: 'red', name: 'Rot', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
    { id: 'orange', name: 'Orange', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
    { id: 'amber', name: 'Bernstein', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    { id: 'yellow', name: 'Gelb', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' },
    { id: 'lime', name: 'Limette', color: '#84cc16', bg: 'rgba(132, 204, 22, 0.1)' },
    { id: 'green', name: 'Grün', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
    { id: 'emerald', name: 'Smaragd', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
    { id: 'teal', name: 'Türkis', color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.1)' },
    { id: 'cyan', name: 'Cyan', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)' },
    { id: 'sky', name: 'Himmel', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.1)' },
    { id: 'blue', name: 'Blau', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    { id: 'indigo', name: 'Indigo', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
    { id: 'violet', name: 'Violett', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
    { id: 'purple', name: 'Lila', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)' },
    { id: 'fuchsia', name: 'Fuchsia', color: '#d946ef', bg: 'rgba(217, 70, 239, 0.1)' },
    { id: 'pink', name: 'Pink', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' },
    { id: 'rose', name: 'Rose', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.1)' },
    { id: 'slate', name: 'Schiefer', color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' },
    { id: 'gray', name: 'Grau', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' },
];

// =============================================
// APP STATE
// =============================================
let data = { 
    folders: [], 
    cards: [], 
    lastLearnedDate: null, 
    streak: 0, 
    totalTimeSeconds: 0, 
    totalReviews: 0, 
    lastSessionDuration: 0,
    version: DB_VERSION,
    lastBackup: null
};
let curFolder = null;
let session = { 
    queue: [], idx: 0, method: 'flip', dir: 'mixed', 
    current: null, q: '', a: '', startTime: 0, 
    cardStartTime: 0, timeSpent: 0,
    answered: false,
    answeredCount: 0,
    uniqueCards: 0,
    firstWrongCount: 0,
    retryCorrectCount: 0,
    retryWrongCount: 0,
    repeatedCards: new Set(),
    currentIsRetry: false
};

// Multi Select State
let isSelectMode = false;
let selectedIds = new Set();

// Edit Card State
let editingCardId = null;

// Gamification State
let comboCount = 0; // Aufeinanderfolgende richtige Antworten
let lastAnswerTime = 0;
let comboTimeout = 8000; // Combo zurücksetzen nach 8 Sekunden
let audioCtx = null;

/**
 * Initialisiert den Audio-Kontext für Sound-Effekte
 */
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

/**
 * Spielt einen angenehmen Sound für richtige Antwort
 */
function playSuccessSound() {
    try {
        initAudio();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        // Angenehmer "ding" Sound mit harmonischen Obertönen
        const now = audioCtx.currentTime;
        
        // Hauptton
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now); // C5
        gain1.gain.setValueAtTime(0.15, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc1.start(now);
        osc1.stop(now + 0.3);
        
        // Harmonischer Oberton
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, now + 0.05); // E5
        gain2.gain.setValueAtTime(0.1, now + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc2.start(now + 0.05);
        osc2.stop(now + 0.25);
        
        // Hoher Oberton für "Klingeln"
        const osc3 = audioCtx.createOscillator();
        const gain3 = audioCtx.createGain();
        osc3.connect(gain3);
        gain3.connect(audioCtx.destination);
        osc3.type = 'triangle';
        osc3.frequency.setValueAtTime(783.99, now + 0.1); // G5
        gain3.gain.setValueAtTime(0.08, now + 0.1);
        gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc3.start(now + 0.1);
        osc3.stop(now + 0.4);
    } catch (e) {
        // Audio-Fehler ignorieren (nicht alle Browser unterstützen Web Audio)
    }
}

/**
 * Spielt einen speziellen Combo-Sound
 */
function playComboSound(level) {
    try {
        initAudio();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        const now = audioCtx.currentTime;
        const baseFreq = 440;
        const steps = Math.min(level, 7);
        
        for (let i = 0; i < steps; i++) {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq + (i * 100), now + (i * 0.06));
            gain.gain.setValueAtTime(0.12, now + (i * 0.06));
            gain.gain.exponentialRampToValueAtTime(0.01, now + (i * 0.06) + 0.15);
            osc.start(now + (i * 0.06));
            osc.stop(now + (i * 0.06) + 0.15);
        }
    } catch (e) {}
}

/**
 * Spielt einen falschen Sound (mild, nicht frustrierend)
 */
function playFailSound() {
    try {
        initAudio();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(250, now + 0.2);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } catch (e) {}
}

/**
 * Spielt einen Level-Up Sound wenn eine Box aufsteigt
 */
function playLevelUpSound() {
    try {
        initAudio();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        const now = audioCtx.currentTime;
        
        // Aufsteigende Tonleiter
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + (i * 0.1));
            gain.gain.setValueAtTime(0.15, now + (i * 0.1));
            gain.gain.exponentialRampToValueAtTime(0.01, now + (i * 0.1) + 0.3);
            osc.start(now + (i * 0.1));
            osc.stop(now + (i * 0.1) + 0.3);
        });
    } catch (e) {}
}

/**
 * Erstelle ein visuelles Combo-Element
 */
function showComboBadge(count, oldBox, newBox) {
    // Entferne alte Badges
    document.querySelectorAll('.combo-badge').forEach(el => el.remove());
    
    if (count < 2) return; // Kein Badge für einzelne richtige Antwort
    
    const badge = document.createElement('div');
    badge.className = 'combo-badge';
    badge.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        z-index: 1000;
        pointer-events: none;
        font-size: ${Math.min(2 + count * 0.3, 5)}rem;
        font-weight: 900;
        color: ${count >= 7 ? '#ffd700' : count >= 5 ? '#ff6347' : '#10b981'};
        text-shadow: 0 0 20px ${count >= 7 ? '#ffd700' : count >= 5 ? '#ff6347' : '#10b981'}, 0 2px 4px rgba(0,0,0,0.3);
        animation: comboPop 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        white-space: nowrap;
    `;
    
    if (count >= 7) {
        badge.textContent = `🔥 LEGENDÄR ${count}x! 🔥`;
    } else if (count >= 5) {
        badge.textContent = `⚡ SUPER ${count}x! ⚡`;
    } else if (count >= 3) {
        badge.textContent = `✨ ${count}x Combo!`;
    } else {
        badge.textContent = `👍 ${count}x!`;
    }
    
    document.body.appendChild(badge);
    
    // Level-Up Hinweis
    if (newBox > oldBox && newBox === 5) {
        setTimeout(() => {
            const levelBadge = document.createElement('div');
            levelBadge.className = 'level-badge';
            levelBadge.style.cssText = `
                position: fixed;
                top: 30%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0);
                z-index: 1001;
                pointer-events: none;
                font-size: 3rem;
                font-weight: 900;
                color: #ffd700;
                text-shadow: 0 0 30px rgba(255, 215, 0, 0.8), 0 4px 8px rgba(0,0,0,0.3);
                animation: levelUp 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                white-space: nowrap;
            `;
            levelBadge.innerHTML = '👑 MEISTER! 👑';
            document.body.appendChild(levelBadge);
            setTimeout(() => levelBadge.remove(), 1200);
        }, 400);
    } else if (newBox > oldBox) {
        setTimeout(() => {
            const levelBadge = document.createElement('div');
            levelBadge.className = 'level-badge';
            levelBadge.style.cssText = `
                position: fixed;
                top: 30%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0);
                z-index: 1001;
                pointer-events: none;
                font-size: 2.5rem;
                font-weight: 700;
                color: var(--success);
                text-shadow: 0 0 20px var(--success), 0 2px 4px rgba(0,0,0,0.3);
                animation: levelUp 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                white-space: nowrap;
            `;
            levelBadge.innerHTML = `⬆️ Box ${oldBox} → ${newBox}`;
            document.body.appendChild(levelBadge);
            setTimeout(() => levelBadge.remove(), 1000);
        }, 400);
    }
    
    setTimeout(() => badge.remove(), 1000);
}

// Undo State
let undoStack = null;
let undoTimer = null;

// Storage Error Flag
let storageAvailable = true;

// Share State
let shareFolderId = null;
let pendingImportData = null;

// Design State
let designTarget = null;
let selectedColor = null;

// Korrektur-Modus State
let correctionMode = false;

// Custom Confirm Dialog State
let customConfirmResolve = null;

// PWA
let deferredPrompt = null;

// Confetti
const confettiCanvas = document.getElementById('confettiCanvas');
const ctx = confettiCanvas ? confettiCanvas.getContext('2d') : null;
let confettiParticles = [];
let confettiRunning = false;

// =============================================
// ZENTRALES ERROR-HANDLING
// =============================================
window.addEventListener('error', function(e) {
    console.error('Globaler Fehler:', e.error);
    showNotification('Ein Fehler ist aufgetreten: ' + (e.error?.message || 'Unbekannter Fehler'), 'error');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unbehandelte Promise-Ablehnung:', e.reason);
    showNotification('Ein unerwarteter Fehler ist aufgetreten', 'error');
});

// Offline/Online-Erkennung
window.addEventListener('online', () => showNotification('Verbindung wiederhergestellt', 'success'));
window.addEventListener('offline', () => showNotification('Du bist offline. Die App funktioniert weiterhin lokal.', 'warning'));

// =============================================
// UTILITY FUNKTIONEN
// =============================================

/**
 * XSS-Schutz: Escaped HTML-Sonderzeichen
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

/**
 * Sichere localStorage-Operation mit Error-Behandlung
 */
function safeLocalStorage(action, key, value = null) {
    try {
        if (action === 'get') {
            return localStorage.getItem(key);
        } else if (action === 'set') {
            localStorage.setItem(key, value);
            return true;
        } else if (action === 'remove') {
            localStorage.removeItem(key);
            return true;
        }
    } catch (e) {
        console.error('localStorage Fehler:', e);
        storageAvailable = false;
        return action === 'get' ? null : false;
    }
}

/**
 * Zeigt eine Benachrichtigung an
 */
function showNotification(message, type = 'success') {
    try {
        const toast = document.getElementById('notificationToast');
        if (!toast) return;
        toast.textContent = message;
        toast.className = 'notification-toast show ' + type;
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    } catch (e) {
        console.error('Notification Fehler:', e);
    }
}

/**
 * Formatiert ein Datum für die Anzeige
 */
function formatDate(timestamp) {
    if (!timestamp) return '--';
    const date = new Date(timestamp);
    return date.toLocaleDateString('de-DE') + ' ' + date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Generiert eine eindeutige ID
 */
function genId() { 
    return Date.now().toString(36) + Math.random().toString(36).substr(2); 
}

/**
 * Animiert einen numerischen Wert von start zu end
 * @param {HTMLElement} element - Das Element, dessen Text animiert wird
 * @param {number} start - Startwert
 * @param {number} end - Endwert
 * @param {number} duration - Dauer der Animation in ms
 * @param {function} formatter - Funktion zum Formatieren des aktuellen Werts
 */
function animateValue(element, start, end, duration, formatter) {
    if (!element) return;
    
    const startTime = performance.now();
    const diff = end - start;
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
        const current = Math.round(start + diff * easeOut);
        
        element.textContent = formatter(current);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

/**
 * Custom Confirm-Dialog (ersetzt blockierendes confirm())
 */
function showConfirm(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'custom-confirm-overlay';
        overlay.innerHTML = `
            <div class="custom-confirm-dialog">
                <div class="custom-confirm-message">${escapeHtml(message)}</div>
                <div class="custom-confirm-buttons">
                    <button class="btn-confirm-cancel">Abbrechen</button>
                    <button class="btn-confirm-ok">Bestätigen</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        const handleResponse = (confirmed) => {
            overlay.remove();
            resolve(confirmed);
        };
        
        overlay.querySelector('.btn-confirm-cancel').onclick = () => handleResponse(false);
        overlay.querySelector('.btn-confirm-ok').onclick = () => handleResponse(true);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) handleResponse(false);
        });
    });
}

/**
 * Sicheres Ersetzen von confirm() für bestehende Funktionen
 */
async function safeConfirm(message) {
    // Fallback auf natives confirm wenn Custom Dialog nicht verfügbar
    if (typeof showConfirm === 'function') {
        return await showConfirm(message);
    }
    return confirm(message);
}

/**
 * Formatiert Sekunden in lesbare Zeit
 */
function formatTime(seconds) {
    if (!seconds) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' + s : s}`;
}

/**
 * Damerau-Levenshtein-Distanz für Fuzzy-Suche
 */
function levenshtein(a, b) {
    const m = a.length;
    const n = b.length;
    
    if (m === 0) return n;
    if (n === 0) return m;
    
    // Matrix initialisieren
    const d = [];
    for (let i = 0; i <= m; i++) {
        d[i] = [];
        for (let j = 0; j <= n; j++) {
            d[i][j] = i === 0 ? j : (j === 0 ? i : 0);
        }
    }
    
    // Fülle die Matrix
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
            d[i][j] = Math.min(
                d[i - 1][j] + 1,      // Löschung
                d[i][j - 1] + 1,      // Einfügung
                d[i - 1][j - 1] + cost  // Substitution
            );
            // Transposition (case-insensitive, konsistent zu cost)
            if (i > 1 && j > 1 && 
                a[i - 1].toLowerCase() === b[j - 2].toLowerCase() && 
                a[i - 2].toLowerCase() === b[j - 1].toLowerCase()) {
                d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
            }
        }
    }
    
    return d[m][n];
}

/**
 * Fuzzy-Match-Funktion mit Levenshtein-Distanz
 * @param {string} input - Suchbegriff
 * @param {string} target - Zieltext
 * @returns {boolean} Ob der Suchbegriff zum Zieltext passt (Fuzzy)
 */
function fuzzyMatch(input, target) {
    if (!input || !target) return false;
    
    const normalizedInput = input.toLowerCase().trim();
    const normalizedTarget = target.toLowerCase().trim();
    
    // Exakter Match
    if (normalizedTarget.includes(normalizedInput)) return true;
    
    // Fuzzy-Match: Toleriere 1-2 Fehler abhängig von der Länge
    const maxDistance = Math.max(1, Math.floor(normalizedTarget.length / 4));
    return levenshtein(normalizedInput, normalizedTarget) <= maxDistance;
}

// =============================================
// BACKUP-SYSTEM
// =============================================

function createAutoBackup() {
    try {
        const backupData = {
            ...data,
            lastBackup: Date.now(),
            backupType: 'auto'
        };
        localStorage.setItem(BACKUP_KEY, JSON.stringify(backupData));
        data.lastBackup = Date.now();
        updateBackupStatus();
    } catch (e) {
        console.log('Backup-Hinweis:', e);
    }
}

function restoreFromBackup() {
    try {
        const backupStr = safeLocalStorage('get', BACKUP_KEY);
        if (backupStr) {
            const backupData = JSON.parse(backupStr);
            if (backupData && backupData.cards && backupData.folders) {
                data = backupData;
                safeLocalStorage('set', DATA_KEY, JSON.stringify(data));
                showNotification('Daten aus Backup wiederhergestellt!', 'success');
                return true;
            }
        }
    } catch (e) {
        console.error('Backup-Wiederherstellung fehlgeschlagen:', e);
    }
    return false;
}

function updateBackupStatus() {
    const badge = document.getElementById('backupBadge');
    const statusSpan = document.getElementById('backupStatus');
    const lastBackupEl = document.getElementById('lastBackupTime');
    
    if (!badge || !statusSpan) return;
    
    // Sicherstellen, dass Klassen nicht leer sind
    badge.classList.remove('warning');
    badge.classList.remove('error');
    
    if (data.lastBackup) {
        if (lastBackupEl) lastBackupEl.textContent = formatDate(data.lastBackup);
        statusSpan.textContent = 'OK';
    } else {
        if (lastBackupEl) lastBackupEl.textContent = 'Nie';
        badge.classList.add('warning');
        statusSpan.textContent = 'Neu';
    }

    const totalCardsEl = document.getElementById('totalCardsCount');
    const totalFoldersEl = document.getElementById('totalFoldersCount');
    const dbVersionEl = document.getElementById('dbVersion');
    
    if (totalCardsEl) totalCardsEl.textContent = data.cards.length;
    if (totalFoldersEl) totalFoldersEl.textContent = data.folders.length;
    if (dbVersionEl) dbVersionEl.textContent = data.version || 1;
}

// =============================================
// DATEN-MIGRATION
// =============================================

function migrateData(oldData) {
    let migrated = { ...oldData };
    
    if (!migrated.version || migrated.version < 2) {
        migrated.version = DB_VERSION;
        migrated.lastBackup = migrated.lastBackup || null;
        
        migrated.cards = migrated.cards.map(card => ({
            ...card,
            id: card.id || genId(),
            box: card.box || 1,
            createdAt: card.createdAt || Date.now()
        }));
        
        migrated.folders = migrated.folders.map(folder => ({
            ...folder,
            id: folder.id || genId()
        }));
    }
    
    return migrated;
}

// =============================================
// DATEN-CORE
// =============================================

function loadData() {
    try {
        const s = safeLocalStorage('get', DATA_KEY);
        if (s) {
            const parsed = JSON.parse(s);
            data = migrateData(parsed);
        } else {
            const backupStr = safeLocalStorage('get', BACKUP_KEY);
            if (backupStr) {
                const backup = JSON.parse(backupStr);
                if (backup && backup.cards) {
                    data = migrateData(backup);
                    showNotification('Daten aus Backup geladen!', 'success');
                } else {
                    createSampleData();
                }
            } else {
                createSampleData();
            }
        }
        
        if (!data.totalTimeSeconds) data.totalTimeSeconds = 0;
        if (!data.totalReviews) data.totalReviews = 0;
        if (!data.lastSessionDuration) data.lastSessionDuration = 0;
        if (!data.version) data.version = DB_VERSION;
        
        checkStreak();
        updateBackupStatus();
        
    } catch (e) {
        console.error('Fehler beim Laden der Daten:', e);
        if (restoreFromBackup()) {
        } else {
            createSampleData();
        }
    }
}

function createSampleData() {
    const fid = Date.now().toString();
    data = {
        folders: [{ id: fid, name: 'Beispiel: Spanisch', parentId: null }],
        cards: [{ id: 'c1', front: 'Haus', back: 'Casa', hint: 'Gebäude', box: 1, folderId: fid, createdAt: Date.now() }],
        lastLearnedDate: null,
        streak: 0,
        totalTimeSeconds: 0,
        totalReviews: 0,
        lastSessionDuration: 0,
        version: DB_VERSION,
        lastBackup: null
    };
    save();
}

function save() { 
    try {
        localStorage.setItem(DATA_KEY, JSON.stringify(data));
        
        try {
            const backupData = { ...data, lastBackup: Date.now(), backupType: 'auto' };
            localStorage.setItem(BACKUP_KEY, JSON.stringify(backupData));
            data.lastBackup = Date.now();
        } catch (backupErr) {
            console.log('Backup-Hinweis:', backupErr);
        }
    } catch (e) {
        console.error('Speichern fehlgeschlagen:', e);
        showNotification('Fehler beim Speichern!', 'error');
    }
}

// =============================================
// STREAK LOGIC
// =============================================

/**
 * Wandelt ein Datum in einen kalendertag-genauen Schlüssel (YYYY-MM-DD) um.
 * Bewusst KEIN toISOString(): das würde in UTC umrechnen und in Zeitzonen
 * östlich/westlich von UTC den Tag verschieben.
 */
function dayKey(date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * Differenz in Kalendertagen zwischen zwei Tagesschlüsseln.
 * Rechnet über UTC-Mittag, damit Sommerzeitwechsel (23h/25h-Tage)
 * keine krummen Werte wie 0.958 erzeugen.
 */
function daysBetweenKeys(fromKey, toKey) {
    const parse = (key) => {
        const [y, m, d] = key.split('-').map(Number);
        return Date.UTC(y, m - 1, d);
    };
    return Math.round((parse(toKey) - parse(fromKey)) / 86400000);
}

/**
 * Migriert Altbestände: früher wurde lastLearnedDate als
 * toDateString() ("Mon Jul 27 2026") gespeichert.
 */
function normalizeLearnedDate(value) {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    return isNaN(parsed) ? null : dayKey(parsed);
}

function checkStreak() {
    data.lastLearnedDate = normalizeLearnedDate(data.lastLearnedDate);

    if (data.lastLearnedDate) {
        const gap = daysBetweenKeys(data.lastLearnedDate, dayKey());
        // Nur ein echter Aussetzer (>= 2 Tage) bricht die Serie.
        // gap < 0 = Systemuhr zurückgestellt -> Serie unangetastet lassen.
        if (gap >= 2 && data.streak !== 0) {
            data.streak = 0;
            save();
        }
    }
    const streakEl = document.getElementById('streakCount');
    if (streakEl) streakEl.innerText = data.streak || 0;
}

/**
 * Erhöht die Lern-Serie. Gibt true zurück, wenn heute erstmals gelernt wurde
 * (nur dann ist eine Belohnung angebracht).
 */
function incrementStreak() {
    const today = dayKey();
    const last = normalizeLearnedDate(data.lastLearnedDate);

    if (last === today) return false;

    if (last) {
        const gap = daysBetweenKeys(last, today);
        data.streak = gap === 1 ? (data.streak || 0) + 1 : 1;
    } else {
        data.streak = 1;
    }

    data.lastLearnedDate = today;
    const streakEl = document.getElementById('streakCount');
    if (streakEl) streakEl.innerText = data.streak;
    save();
    return true;
}

// =============================================
// SELECTION MODE LOGIC
// =============================================
function updateSelectionUI() {
    const manageContent = document.getElementById('manageContent');
    const btnSelectMode = document.getElementById('btnSelectMode');
    
    if (!manageContent || !btnSelectMode) return;
    
    if (isSelectMode) {
        manageContent.classList.add('selection-mode-active');
        btnSelectMode.classList.add('active');
        btnSelectMode.innerHTML = '<i class="fas fa-times"></i> Abbrechen';
    } else {
        manageContent.classList.remove('selection-mode-active');
        btnSelectMode.classList.remove('active');
        btnSelectMode.innerHTML = '<i class="fas fa-check-square"></i> Auswählen';
    }
    updateFab();
}

function toggleSelectMode() {
    isSelectMode = !isSelectMode;
    if (!isSelectMode) {
        selectedIds.clear();
    }
    updateSelectionUI();
    renderManage();
}

function toggleSelection(id, e) {
    if (!isSelectMode) return;
    if (e) e.stopPropagation();
    
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
    
    updateFab();
    renderManage();
}

function updateFab() {
    const actions = document.getElementById('selectionActions');
    const fab = document.getElementById('mainFab');
    const menu = document.getElementById('fabMenu');

    if (!actions || !fab) return;

    if (isSelectMode && selectedIds.size > 0) {
        actions.classList.add('active');
        fab.classList.add('hidden');
        if (menu) menu.classList.remove('active');
    } else {
        actions.classList.remove('active');
        fab.classList.remove('hidden');
    }
}

function handleFabClick() {
    if (!isSelectMode) toggleFab();
}

// =============================================
// UNDO LOGIC
// =============================================
function triggerUndoToast(msg, backupData) {
    const toast = document.getElementById('undoToast');
    if (!toast) return;
    
    document.getElementById('undoMessage').innerText = msg;
    undoStack = backupData;
    toast.classList.add('show');

    if (undoTimer) clearTimeout(undoTimer);
    undoTimer = setTimeout(() => {
        toast.classList.remove('show');
        undoStack = null;
    }, 5000);
}

function undoLastAction() {
    if (!undoStack) return;

    if (undoStack.type === 'singleCard') {
        data.cards.push(undoStack.item);
    } else if (undoStack.type === 'singleFolder') {
        restoreFolderRecursive(undoStack.item);
    } else if (undoStack.type === 'bulk') {
        undoStack.items.forEach(item => {
            if (item.folderId !== undefined) data.cards.push(item);
            else data.folders.push(item);
        });
    }

    save();
    renderManage();
    
    const toast = document.getElementById('undoToast');
    if (toast) toast.classList.remove('show');
    if (undoTimer) clearTimeout(undoTimer);
    undoStack = null;
    
    showNotification('Aktion rückgängig gemacht!', 'success');
}

function restoreFolderRecursive(folder) {
    if (data.folders.find(f => f.id === folder.id)) {
        folder.id = genId();
    }
    data.folders.push(folder);
}

// =============================================
// DELETE ACTIONS (mit Custom Confirm)
// =============================================
async function delCard(id) {
    const confirmed = await showConfirm('Löschen?');
    if (confirmed) {
        const card = data.cards.find(c => c.id === id);
        if (card) {
            triggerUndoToast("Karte gelöscht", { type: 'singleCard', item: card });
            data.cards = data.cards.filter(c => c.id !== id);
            save();
            renderManage();
        }
    }
}

async function delFolder(e, id) {
    e.stopPropagation();
    const confirmed = await showConfirm('Ordner und Inhalt löschen?');
    if (confirmed) {
        const deletedItems = [];
        const collectItems = (fid) => {
            const folder = data.folders.find(f => f.id === fid);
            if (folder) deletedItems.push({...folder});
            data.cards.filter(c => c.folderId === fid).forEach(c => deletedItems.push({...c}));
            data.folders.filter(f => f.parentId === fid).forEach(s => collectItems(s.id));
        };
        collectItems(id);

        triggerUndoToast("Ordner gelöscht", { type: 'bulk', items: deletedItems });

        const rec = (fid) => {
            data.cards = data.cards.filter(c => c.folderId !== fid);
            data.folders.filter(f => f.parentId === fid).forEach(s => rec(s.id));
            data.folders = data.folders.filter(f => f.id !== fid);
        };
        rec(id);
        save();
        renderManage();
    }
}

// =============================================
// BULK ACTIONS
// =============================================
async function bulkDeleteSelected() {
    if (selectedIds.size === 0) return;
    const confirmed = await showConfirm(`${selectedIds.size} Element(e) wirklich löschen?`);
    if (!confirmed) return;
    
    const deletedItems = [];
    selectedIds.forEach(id => {
        const folder = data.folders.find(f => f.id === id);
        if (folder) {
            const collectRecursive = (fid) => {
                data.folders.filter(f => f.id === fid).forEach(f => deletedItems.push({...f}));
                data.cards.filter(c => c.folderId === fid).forEach(c => deletedItems.push({...c}));
                data.folders.filter(f => f.parentId === fid).forEach(subFolder => {
                    collectRecursive(subFolder.id);
                });
            };
            collectRecursive(id);
        }
    });
    
    if (deletedItems.length > 0) {
        triggerUndoToast(`${selectedIds.size} Element(e) gelöscht`, { type: 'bulk', items: deletedItems });
        
        selectedIds.forEach(id => {
            const folder = data.folders.find(f => f.id === id);
            if (folder) {
                const rec = (fid) => {
                    data.cards = data.cards.filter(c => c.folderId !== fid);
                    data.folders.filter(f => f.parentId === fid).forEach(s => rec(s.id));
                    data.folders = data.folders.filter(f => f.id !== fid);
                };
                rec(id);
            } else {
                data.cards = data.cards.filter(c => c.id !== id);
            }
        });
        
        save();
        selectedIds.clear();
        isSelectMode = false;
        updateSelectionUI();
        renderManage();
    }
}

// =============================================
// TEILEN-FUNKTIONEN
// =============================================

function collectFolderData(folderId) {
    const folders = [];
    const cards = [];
    
    function collect(fid, newParentId = null) {
        const folder = data.folders.find(f => f.id === fid);
        if (!folder) return;
        
        const newFolderId = genId();
        folders.push({
            id: newFolderId,
            name: folder.name,
            parentId: newParentId,
            originalId: folder.id
        });
        
        data.cards.filter(c => c.folderId === fid).forEach(c => {
            cards.push({
                id: genId(),
                front: c.front,
                back: c.back,
                hint: c.hint,
                box: 1,
                folderId: newFolderId,
                createdAt: Date.now()
            });
        });
        
        data.folders.filter(f => f.parentId === fid).forEach(subFolder => {
            collect(subFolder.id, newFolderId);
        });
    }
    
    collect(folderId);
    return { folders, cards };
}

function openShareModal(folderId, e) {
    if (e) e.stopPropagation();
    
    shareFolderId = folderId;
    const folder = data.folders.find(f => f.id === folderId);
    if (!folder) return;
    
    collectFolderData(folderId);
    const folderCount = countFoldersRecursive(folderId);
    const cardCount = countCardsRecursive(folderId);
    
    const shareFolderNameEl = document.getElementById('shareFolderName');
    const shareStatsEl = document.getElementById('shareStats');
    const shareLinkContainer = document.getElementById('shareLinkContainer');
    
    if (shareFolderNameEl) shareFolderNameEl.textContent = folder.name;
    if (shareStatsEl) shareStatsEl.textContent = `${folderCount} Ordner, ${cardCount} Karten`;
    if (shareLinkContainer) shareLinkContainer.style.display = 'none';
    
    showModal('shareModal');
}

function countFoldersRecursive(folderId) {
    let count = 1;
    data.folders.filter(f => f.parentId === folderId).forEach(sub => {
        count += countFoldersRecursive(sub.id);
    });
    return count;
}

function countCardsRecursive(folderId) {
    let count = data.cards.filter(c => c.folderId === folderId).length;
    data.folders.filter(f => f.parentId === folderId).forEach(sub => {
        count += countCardsRecursive(sub.id);
    });
    return count;
}

function shareAsFile() {
    if (!shareFolderId) return;
    
    const folder = data.folders.find(f => f.id === shareFolderId);
    const collected = collectFolderData(shareFolderId);
    
    const shareData = {
        type: 'ultracards-folder',
        version: 1,
        exportedAt: Date.now(),
        name: folder.name,
        folders: collected.folders,
        cards: collected.cards
    };
    
    const json = JSON.stringify(shareData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ultracards-${folder.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showNotification('Datei heruntergeladen!', 'success');
}

/**
 * Sichere UTF-8 zu Base64 Kodierung (ersetzt veraltete escape/unescape)
 */
function utf8ToBase64(str) {
    try {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
            return String.fromCharCode('0x' + p1);
        }));
    } catch (e) {
        return '';
    }
}

function base64ToUtf8(str) {
    try {
        return decodeURIComponent(Array.prototype.map.call(atob(str), function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    } catch (e) {
        return '';
    }
}

function shareAsLink() {
    if (!shareFolderId) return;
    
    const folder = data.folders.find(f => f.id === shareFolderId);
    const collected = collectFolderData(shareFolderId);
    
    const shareData = {
        type: 'ultracards-folder',
        version: 1,
        name: folder.name,
        folders: collected.folders,
        cards: collected.cards
    };
    
    try {
        const json = JSON.stringify(shareData);
        const base64 = utf8ToBase64(json);
        
        if (base64.length > 6000) {
            showNotification('Ordner zu groß für Link - nutze Datei-Download', 'warning');
            return;
        }
        
        const url = window.location.origin + window.location.pathname + '?import=' + base64;
        
        const shareLinkInput = document.getElementById('shareLinkInput');
        const shareLinkContainer = document.getElementById('shareLinkContainer');
        
        if (shareLinkInput) shareLinkInput.value = url;
        if (shareLinkContainer) shareLinkContainer.style.display = 'block';
    } catch (e) {
        showNotification('Fehler beim Erstellen des Links', 'error');
        console.error(e);
    }
}

async function copyShareLink() {
    const input = document.getElementById('shareLinkInput');
    if (!input) return;
    
    try {
        await navigator.clipboard.writeText(input.value);
        showNotification('Link kopiert!', 'success');
    } catch (e) {
        input.select();
        document.execCommand('copy');
        showNotification('Link kopiert!', 'success');
    }
}

async function shareViaWebShare() {
    if (!shareFolderId) return;
    
    const folder = data.folders.find(f => f.id === shareFolderId);
    const collected = collectFolderData(shareFolderId);
    
    if (!navigator.share) {
        showNotification('Teilen nicht unterstützt - nutze Link oder Datei', 'warning');
        return;
    }
    
    const shareData = {
        type: 'ultracards-folder',
        version: 1,
        name: folder.name,
        folders: collected.folders,
        cards: collected.cards
    };
    
    const json = JSON.stringify(shareData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const file = new File([blob], `ultracards-${folder.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`, { type: 'application/json' });
    
    try {
        await navigator.share({
            title: `UltraCards: ${folder.name}`,
            text: `${countCardsRecursive(shareFolderId)} Lernkarten zum Teilen`,
            files: [file]
        });
    } catch (e) {
        if (e.name !== 'AbortError') {
            console.error('Share error:', e);
            showNotification('Teilen fehlgeschlagen', 'error');
        }
    }
}

function checkUrlImport() {
    const params = new URLSearchParams(window.location.search);
    const importData = params.get('import');
    
    if (importData) {
        try {
            const json = base64ToUtf8(importData);
            const parsed = JSON.parse(json);
            
            if (parsed.type === 'ultracards-folder' && parsed.folders && parsed.cards) {
                pendingImportData = parsed;
                const urlImportNameEl = document.getElementById('urlImportName');
                const urlImportStatsEl = document.getElementById('urlImportStats');
                if (urlImportNameEl) urlImportNameEl.textContent = parsed.name;
                if (urlImportStatsEl) urlImportStatsEl.textContent = `${parsed.cards.length} Karten`;
                showModal('urlImportModal');
            }
        } catch (e) {
            console.error('URL import error:', e);
            showNotification('Ungültiger Import-Link', 'error');
            clearUrlParam();
        }
    }
}

function importFromUrl() {
    if (!pendingImportData) return;
    
    const importName = pendingImportData.name;
    const folderIdMap = {};
    
    // Ordner mit ID-Mapping importieren
    function processUrlFolder(oldFolder) {
        if (folderIdMap[oldFolder.id]) return;
        
        // Parent zuerst verarbeiten
        if (oldFolder.parentId && !folderIdMap[oldFolder.parentId]) {
            const parentFolder = pendingImportData.folders.find(f => f.id === oldFolder.parentId);
            if (parentFolder) {
                processUrlFolder(parentFolder);
            }
        }
        
        const newParentId = oldFolder.parentId ? folderIdMap[oldFolder.parentId] : null;
        
        const existingFolder = data.folders.find(f => 
            f.name === oldFolder.name && 
            (f.parentId || '') === (newParentId || '')
        );
        
        if (!existingFolder) {
            const newId = genId();
            folderIdMap[oldFolder.id] = newId;
            data.folders.push({
                id: newId,
                name: oldFolder.name,
                parentId: newParentId
            });
        } else {
            folderIdMap[oldFolder.id] = existingFolder.id;
        }
    }
    
    pendingImportData.folders.forEach(f => processUrlFolder(f));
    
    // Karten mit korrektem folderId-Mapping importieren
    let addedCards = 0;
    pendingImportData.cards.forEach(oldCard => {
        const newFolderId = folderIdMap[oldCard.folderId] || null;
        
        const exists = data.cards.some(c =>
            c.front === oldCard.front &&
            c.back === oldCard.back &&
            (c.folderId || '') === (newFolderId || '')
        );
        
        if (!exists) {
            data.cards.push({
                id: genId(),
                front: oldCard.front,
                back: oldCard.back,
                hint: oldCard.hint || '',
                box: oldCard.box || 1,
                folderId: newFolderId,
                createdAt: oldCard.createdAt || Date.now()
            });
            addedCards++;
        }
    });
    
    save();
    renderManage();
    hideModal('urlImportModal');
    clearUrlParam();
    pendingImportData = null;
    
    showNotification(`"${importName}" erfolgreich importiert! (${addedCards} Karten)`, 'success');
}

function clearUrlParam() {
    const url = new URL(window.location.href);
    url.searchParams.delete('import');
    window.history.replaceState({}, '', url.toString());
}

// =============================================
// DESIGN-FUNKTIONEN
// =============================================

function openDesignModal(type, id, e) {
    if (e) e.stopPropagation();
    
    designTarget = { type, id };
    const item = type === 'folder' 
        ? data.folders.find(f => f.id === id)
        : data.cards.find(c => c.id === id);
    
    if (!item) return;
    
    const designTargetNameEl = document.getElementById('designTargetName');
    if (designTargetNameEl) {
        designTargetNameEl.textContent = type === 'folder' 
            ? `Ordner: ${item.name}`
            : `Karte: ${item.front}`;
    }
    
    const palette = document.getElementById('colorPalette');
    if (!palette) return;
    
    palette.innerHTML = '';
    
    COLOR_PALETTE.forEach(color => {
        const div = document.createElement('div');
        div.className = 'color-option' + (item.color === color.id ? ' selected' : '');
        div.style.background = color.color;
        div.title = color.name;
        div.setAttribute('data-color-id', color.id);
        div.addEventListener('click', () => selectColor(color.id));
        palette.appendChild(div);
    });
    
    selectedColor = item.color || 'default';
    showModal('designModal');
}

function selectColor(colorId) {
    selectedColor = colorId;
    
    document.querySelectorAll('.color-option').forEach(el => {
        el.classList.remove('selected');
    });
    const target = document.querySelector(`[data-color-id="${colorId}"]`);
    if (target) target.classList.add('selected');
}

function applyDesign() {
    if (!designTarget || !selectedColor) return;
    
    if (designTarget.type === 'folder') {
        const folder = data.folders.find(f => f.id === designTarget.id);
        if (folder) {
            folder.color = selectedColor === 'default' ? null : selectedColor;
        }
    } else {
        const card = data.cards.find(c => c.id === designTarget.id);
        if (card) {
            card.color = selectedColor === 'default' ? null : selectedColor;
        }
    }
    
    save();
    renderManage();
    hideModal('designModal');
    showNotification('Farbe geändert!', 'success');
}

function getItemColor(item, type) {
    if (!item.color) {
        return type === 'folder' 
            ? COLOR_PALETTE[0]
            : COLOR_PALETTE[7];
    }
    return COLOR_PALETTE.find(c => c.id === item.color) || COLOR_PALETTE[0];
}

// =============================================
// MOVE BOTTOM SHEET
// =============================================
function openMoveSheet() {
    const sheet = document.getElementById('moveBottomSheet');
    const nav = document.getElementById('bottomNav');
    const list = document.getElementById('moveFolderList');
    
    if (!sheet || !list) return;
    
    list.innerHTML = '';

    if (nav) nav.classList.add('hidden-nav');
    
    const optRoot = document.createElement('div');
    optRoot.className = 'folder-select-item';
    optRoot.innerHTML = '<i class="fas fa-home"></i> <strong>Startseite</strong>';
    optRoot.addEventListener('click', () => executeMove(null));
    list.appendChild(optRoot);

    const renderFolderOptions = (parentId, level) => {
        const children = data.folders.filter(f => f.parentId === parentId);
        children.forEach(f => {
            if (selectedIds.has(f.id)) return;

            const div = document.createElement('div');
            div.className = 'folder-select-item';
            div.style.paddingLeft = (12 + level * 20) + 'px';
            div.innerHTML = `<i class="fas fa-folder"></i> ${escapeHtml(f.name)}`;
            div.addEventListener('click', () => executeMove(f.id));
            list.appendChild(div);

            renderFolderOptions(f.id, level + 1);
        });
    };
    renderFolderOptions(null, 0);

    sheet.classList.add('show');
}

function closeMoveSheet() {
    const sheet = document.getElementById('moveBottomSheet');
    const nav = document.getElementById('bottomNav');
    if (sheet) sheet.classList.remove('show');
    if (nav) nav.classList.remove('hidden-nav');
}

function executeMove(targetId) {
    data.folders.forEach(f => { if (selectedIds.has(f.id)) f.parentId = targetId; });
    data.cards.forEach(c => { if (selectedIds.has(c.id)) c.folderId = targetId; });

    save();
    selectedIds.clear();
    isSelectMode = false;
    updateSelectionUI();
    renderManage();
    closeMoveSheet();
    showNotification('Elemente verschoben!', 'success');
}

// =============================================
// CARD EDIT LOGIC
// =============================================
function openEditCard(id, e) {
    if (e) e.stopPropagation();
    const card = data.cards.find(c => c.id === id);
    if (!card) return;

    editingCardId = id;
    document.getElementById('inpFront').value = card.front;
    document.getElementById('inpBack').value = card.back;
    document.getElementById('inpHint').value = card.hint || '';
    
    document.getElementById('cardModalTitle').textContent = "📝 Karte bearbeiten";
    document.getElementById('btnSaveCard').textContent = "Änderungen speichern";
    
    showModal('cardModal');
}

function openNewCardModal() {
    editingCardId = null;
    document.getElementById('inpFront').value = '';
    document.getElementById('inpBack').value = '';
    document.getElementById('inpHint').value = '';
    
    document.getElementById('cardModalTitle').textContent = "📝 Neue Karte";
    document.getElementById('btnSaveCard').textContent = "Speichern";
    
    showModal('cardModal');
}

function saveCard() {
    const f = document.getElementById('inpFront').value.trim();
    const b = document.getElementById('inpBack').value.trim();
    const h = document.getElementById('inpHint').value.trim();

    if (!f || !b) { 
        showNotification('Bitte Vorder- und Rückseite ausfüllen!', 'warning'); 
        return; 
    }

    if (editingCardId) {
        const card = data.cards.find(c => c.id === editingCardId);
        if (card) {
            const exists = data.cards.some(c => 
                c.id !== editingCardId &&
                c.folderId === curFolder && 
                c.front.toLowerCase() === f.toLowerCase() && 
                c.back.toLowerCase() === b.toLowerCase()
            );
            if (exists) { 
                showNotification('Eine Karte mit diesem Inhalt existiert bereits in diesem Ordner!', 'warning'); 
                return; 
            }
            
            card.front = f; 
            card.back = b; 
            card.hint = h;
        }
        editingCardId = null;
    } else {
        const exists = data.cards.some(c => c.folderId === curFolder && c.front.toLowerCase() === f.toLowerCase() && c.back.toLowerCase() === b.toLowerCase());
        if (exists) { 
            showNotification('Duplikat!', 'warning'); 
            return; 
        }
        data.cards.push({ id: genId(), front: f, back: b, hint: h, box: 1, folderId: curFolder, createdAt: Date.now() });
    }

    save(); 
    hideModal('cardModal'); 
    renderManage();
    showNotification('Karte gespeichert!', 'success');
}

// =============================================
// UI RENDERING (MIT XSS-SCHUTZ & EVENT DELEGATION)
// =============================================
function renderManage(filter = '') {
    const list = document.getElementById('itemList');
    if (!list) return;
    
    list.innerHTML = '';
    
    const fragment = document.createDocumentFragment();
    const bc = document.getElementById('breadcrumbContainer'); 
    if (bc) bc.innerHTML = '';

    if (curFolder) {
        let path = [], curr = data.folders.find(f => f.id === curFolder);
        while (curr) { path.unshift(curr); curr = data.folders.find(f => f.id === curr.parentId); }
        const home = document.createElement('span'); 
        home.innerHTML = '<i class="fas fa-home"></i>';
        home.addEventListener('click', () => setFolder(null));
        home.style.cursor = 'pointer'; 
        if (bc) bc.appendChild(home);
        path.forEach((f, idx) => {
            if (bc) {
                const sep = document.createElement('span');
                sep.textContent = ' / ';
                sep.style.color = 'var(--text-muted)';
                bc.appendChild(sep);
            }
            const sp = document.createElement('span'); 
            sp.textContent = f.name;
            if (f.id !== curFolder) { 
                sp.style.cursor = 'pointer'; 
                sp.addEventListener('click', () => setFolder(f.id)); 
            }
            if (bc) bc.appendChild(sp);
        });
        const titleEl = document.getElementById('currentFolderTitle');
        if (titleEl && path.length > 0) titleEl.textContent = path[path.length - 1].name;

        const parentObj = data.folders.find(f => f.id === curFolder);
        const parentId = parentObj ? parentObj.parentId : null;
        const liBack = document.createElement('li'); 
        liBack.className = 'list-item';
        liBack.style.background = 'rgba(0,0,0,0.03)';
        liBack.innerHTML = `
            <div class="item-icon" style="background:var(--text-muted); color:white"><i class="fas fa-level-up-alt"></i></div>
            <div class="item-content"><div class="item-title">.. (Ebene höher)</div></div>
        `;
        liBack.addEventListener('click', () => setFolder(parentId));
        fragment.appendChild(liBack);

    } else {
        const titleEl = document.getElementById('currentFolderTitle');
        if (titleEl) titleEl.textContent = 'Startseite';
    }

    // Fuzzy-Suche für Ordner und Karten
    const filterLower = filter.toLowerCase();
    const subs = data.folders.filter(f => {
        if (filter === '') return true;
        return fuzzyMatch(filterLower, f.name);
    }).filter(f => f.parentId === curFolder);
    
    const cards = data.cards.filter(c => {
        if (filter === '') return true;
        return fuzzyMatch(filterLower, c.front) || fuzzyMatch(filterLower, c.back);
    }).filter(c => c.folderId === curFolder);

    const folderStatsEl = document.getElementById('folderStats');
    if (folderStatsEl) folderStatsEl.textContent = `${subs.length} Ordner, ${cards.length} Karten`;
    
    const emptyState = document.getElementById('emptyState');
    if (emptyState) emptyState.classList.toggle('hidden', subs.length > 0 || cards.length > 0);

    subs.forEach(f => {
        const isSelected = selectedIds.has(f.id);
        const li = document.createElement('li'); 
        li.className = `list-item ${isSelected ? 'selected' : ''}`;
        const colorInfo = getItemColor(f, 'folder');
        
        let actionsHtml = '';
        if (!isSelectMode) {
            const safeId = escapeHtml(f.id);
            actionsHtml = `
                <div class="item-actions">
                    <i class="fas fa-palette action-icon action-design" data-action="design" data-type="folder" data-id="${safeId}" title="Farbe"></i>
                    <i class="fas fa-share-alt action-icon" style="color: var(--primary);" data-action="share" data-id="${safeId}" title="Teilen"></i>
                    <i class="fas fa-trash action-icon action-del" data-action="delfolder" data-id="${safeId}" title="Löschen"></i>
                </div>
            `;
        }

        li.innerHTML = `
            <div class="selection-checkbox" data-action="select" data-id="${escapeHtml(f.id)}">
                ${isSelected ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <div class="item-icon" style="background: ${colorInfo.bg}; color: ${colorInfo.color};"><i class="fas fa-folder"></i></div>
            <div class="item-content"><div class="item-title">${escapeHtml(f.name)}</div></div>
            ${actionsHtml}
        `;
        li.addEventListener('click', (e) => {
            if (isSelectMode) toggleSelection(f.id, e);
            else setFolder(f.id);
        });
        fragment.appendChild(li);
    });

    cards.forEach(c => {
        const isSelected = selectedIds.has(c.id);
        const li = document.createElement('li'); 
        li.className = `list-item ${isSelected ? 'selected' : ''}`;
        const colorInfo = getItemColor(c, 'card');
        
        // Nächste Wiederholung berechnen
        let dueInfo = '';
        if (c.lastLearnedAt) {
            const nextReview = c.lastLearnedAt + (LEITNER_INTERVALS[c.box || 1] || LEITNER_INTERVALS[1]);
            dueInfo = `<div class="card-due-info" data-due-ts="${nextReview}">${nextReview > Date.now() ? formatTimeUntil(nextReview) : 'Fällig!'}</div>`;
        } else {
            dueInfo = `<div class="card-due-info">Neu</div>`;
        }

        let cardActionsHtml = '';
        if (!isSelectMode) {
            const safeId = escapeHtml(c.id);
            cardActionsHtml = `
                <div class="item-actions">
                    <i class="fas fa-undo action-icon" style="color:var(--warning)" data-action="reset" data-id="${safeId}" title="Zurücksetzen"></i>
                    <i class="fas fa-palette action-icon action-design" data-action="design" data-type="card" data-id="${safeId}" title="Farbe"></i>
                    <i class="fas fa-pen action-icon action-edit" data-action="edit" data-id="${safeId}" title="Bearbeiten"></i>
                    <i class="fas fa-trash action-icon action-del" data-action="delcard" data-id="${safeId}" title="Löschen"></i>
                </div>
            `;
        }

        li.innerHTML = `
            <div class="selection-checkbox" data-action="select" data-id="${escapeHtml(c.id)}">
                ${isSelected ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <div class="item-icon" style="background: ${colorInfo.bg}; color: ${colorInfo.color};"><i class="fas fa-sticky-note"></i></div>
            <div class="item-content"><div class="item-title">${escapeHtml(c.front)}</div><div style="font-size:0.8rem; color:var(--text-muted)">Box ${c.box || 1}</div>${dueInfo}</div>
            ${cardActionsHtml}
        `;
        if (isSelectMode) {
            li.addEventListener('click', (e) => toggleSelection(c.id, e));
        }
        fragment.appendChild(li);
    });

    list.appendChild(fragment);
    updateLearnSource();
}

// Event Delegation für Action-Icons
document.addEventListener('click', function(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    
    const action = target.dataset.action;
    const id = target.dataset.id;
    const type = target.dataset.type;
    
    switch (action) {
        case 'design':
            openDesignModal(type, id, e);
            break;
        case 'share':
            openShareModal(id, e);
            break;
        case 'delfolder':
            delFolder(e, id);
            break;
        case 'delcard':
            delCard(id);
            break;
        case 'edit':
            openEditCard(id, e);
            break;
        case 'select':
            toggleSelection(id, e);
            break;
        case 'reset':
            resetCard(id);
            break;
    }
});

function setFolder(id) { 
    curFolder = id; 
    renderManage(); 
}

// =============================================
// ACTIONS
// =============================================
function addFolder() {
    const n = document.getElementById('inpFolder').value.trim();
    if (!n) return;
    
    const exists = data.folders.some(f => 
        f.name.toLowerCase() === n.toLowerCase() && 
        (f.parentId || '') === (curFolder || '')
    );
    if (exists) {
        showNotification('Ein Ordner mit diesem Namen existiert bereits hier!', 'warning');
        return;
    }
    
    data.folders.push({ id: genId(), name: n, parentId: curFolder }); 
    save(); 
    hideModal('folderModal'); 
    document.getElementById('inpFolder').value = ''; 
    renderManage(); 
    showNotification('Ordner erstellt!', 'success');
}

/**
 * Export eines einzelnen Ordners
 */
function exportFolder(folderId) {
    const folder = data.folders.find(f => f.id === folderId);
    if (!folder) return;
    
    const subs = [folder.id];
    const collectIds = (fid) => {
        data.folders.filter(f => f.parentId === fid).forEach(child => {
            subs.push(child.id);
            collectIds(child.id);
        });
    };
    collectIds(folderId);
    
    const folderCards = data.cards.filter(c => subs.includes(c.folderId));
    const folderFolders = data.folders.filter(f => subs.includes(f.id));
    
    const payload = {
        type: 'ultracards-backup',
        version: DB_VERSION,
        exportedAt: Date.now(),
        folders: folderFolders,
        cards: folderCards
    };
    
    downloadJson(payload, `vokabeltrainer-${folder.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
    showNotification('Ordner exportiert!', 'success');
}

// =============================================
// MODALS & NAVIGATION
// =============================================
function showModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('show');
}

function hideModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('show');
}

/**
 * Zeigt eine Content-Area und entfernt Inline-Display-Styles
 * (wichtig für activeSession/sessionSummary, die inline display:none haben)
 */
function showView(viewId) {
    document.querySelectorAll('.content-area').forEach(a => {
        a.classList.remove('active');
        a.style.display = '';
    });
    const view = document.getElementById(viewId);
    if (view) view.classList.add('active');
}

function setActiveNav(index) {
    document.querySelectorAll('.nav-item').forEach((n, i) => {
        n.classList.toggle('active', i === index);
    });
}

function nav(viewId, el) {
    if (sessionActive) {
        showNotification('Bitte beende zuerst die laufende Session!', 'warning');
        return;
    }
    showView(viewId);
    if (el) {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        el.classList.add('active');
    }
    if (viewId === 'statsContent') renderStats();
    if (viewId === 'manageContent') renderManage(document.getElementById('searchBox')?.value || '');
}

// =============================================
// THEME & AKZENT
// =============================================
function applyTheme(theme) {
    document.body.dataset.theme = theme;
    const icon = document.getElementById('themeIcon');
    if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

function toggleTheme() {
    const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    safeLocalStorage('set', THEME_KEY, next);
}

function setAccent(id) {
    document.body.dataset.accent = id;
    safeLocalStorage('set', ACCENT_KEY, id);
    document.querySelectorAll('.accent-dot').forEach(d => {
        d.classList.toggle('active', d.dataset.accent === id);
    });
}

// =============================================
// FAB
// =============================================
function toggleFab() {
    const menu = document.getElementById('fabMenu');
    if (menu) menu.classList.toggle('active');
}

// =============================================
// LERN-QUELLEN & HILFSFUNKTIONEN
// =============================================
function getCardsForScope(scopeId) {
    if (!scopeId || scopeId === 'all') return [...data.cards];
    const subs = [scopeId];
    const collect = (fid) => {
        data.folders.filter(f => f.parentId === fid).forEach(c => {
            subs.push(c.id);
            collect(c.id);
        });
    };
    collect(scopeId);
    return data.cards.filter(c => subs.includes(c.folderId));
}

function isCardDue(card) {
    if (!card.lastLearnedAt) return true;
    const interval = LEITNER_INTERVALS[card.box || 1] || LEITNER_INTERVALS[1];
    return (card.lastLearnedAt + interval) <= Date.now();
}

function formatTimeUntil(ts) {
    const diff = ts - Date.now();
    if (diff <= 0) return 'Fällig!';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `in ${mins} Min.`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `in ${hours} Std.`;
    const days = Math.floor(hours / 24);
    return `in ${days} Tag${days === 1 ? '' : 'en'}`;
}

function updateLearnSource() {
    const sel = document.getElementById('learnSource');
    if (sel) {
        const prev = sel.value;
        sel.innerHTML = '';
        
        const optAll = document.createElement('option');
        optAll.value = 'all';
        optAll.textContent = `Alle Karten (${data.cards.length})`;
        sel.appendChild(optAll);
        
        const addFolders = (parentId, level) => {
            data.folders.filter(f => f.parentId === parentId).forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.id;
                opt.textContent = `${'\u00A0'.repeat(level * 2)}${f.name} (${countCardsRecursive(f.id)})`;
                sel.appendChild(opt);
                addFolders(f.id, level + 1);
            });
        };
        addFolders(null, 0);
        
        if ([...sel.options].some(o => o.value === prev)) sel.value = prev;
    }
    
    const scope = document.getElementById('statsScope');
    if (scope) {
        const prevScope = scope.value;
        scope.innerHTML = '';
        
        const optAll2 = document.createElement('option');
        optAll2.value = 'all';
        optAll2.textContent = 'Alle Karten';
        scope.appendChild(optAll2);
        
        const addScope = (parentId, level) => {
            data.folders.filter(f => f.parentId === parentId).forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.id;
                opt.textContent = `${'\u00A0'.repeat(level * 2)}${f.name}`;
                scope.appendChild(opt);
                addScope(f.id, level + 1);
            });
        };
        addScope(null, 0);
        
        if ([...scope.options].some(o => o.value === prevScope)) scope.value = prevScope;
    }
}

// =============================================
// LERN-SESSION
// =============================================
let sessionActive = false;

function setDirection(dir) {
    session.dir = dir;
    const mix = document.getElementById('btnMix');
    const front = document.getElementById('btnFront');
    const back = document.getElementById('btnBack');
    if (mix) mix.classList.toggle('active', dir === 'mixed');
    if (front) front.classList.toggle('active', dir === 'front');
    if (back) back.classList.toggle('active', dir === 'back');
}

function startSession() {
    const sourceEl = document.getElementById('learnSource');
    const strategyEl = document.getElementById('learnStrategy');
    const methodEl = document.getElementById('learnMethod');
    if (!sourceEl || !strategyEl || !methodEl) return;
    
    const source = sourceEl.value;
    const strategy = strategyEl.value;
    const method = methodEl.value;
    
    let pool = getCardsForScope(source);
    if (pool.length === 0) {
        showNotification('Keine Karten in dieser Quelle!', 'warning');
        return;
    }
    
    let queue = [];
    if (strategy === 'due') {
        queue = pool.filter(isCardDue);
        if (queue.length === 0) {
            showNotification('Alle Karten sind noch nicht fällig. Nutze eine andere Strategie!', 'info');
            return;
        }
    } else if (strategy === 'leitner') {
        // Fällige zuerst, dann Rest – beide nach Box aufsteigend
        const due = pool.filter(isCardDue).sort((a, b) => (a.box || 1) - (b.box || 1));
        const rest = pool.filter(c => !isCardDue(c)).sort((a, b) => (a.box || 1) - (b.box || 1));
        queue = [...due, ...rest].slice(0, 20);
    } else if (strategy === 'random') {
        queue = [...pool].sort(() => Math.random() - 0.5).slice(0, 10);
    } else if (strategy === 'hardest') {
        queue = [...pool].sort((a, b) => (a.box || 1) - (b.box || 1)).slice(0, 20);
    } else {
        queue = [...pool];
    }
    
    if (queue.length === 0) {
        showNotification('Keine Karten für diese Auswahl gefunden!', 'warning');
        return;
    }
    
    session = {
        queue, idx: 0, method, dir: session.dir || 'mixed',
        current: null, q: '', a: '', curDir: 'front',
        startTime: Date.now(), cardStartTime: Date.now(), timeSpent: 0,
        answered: false, answeredCount: 0, uniqueCards: queue.length,
        firstTryCorrect: 0, firstTryWrong: 0,
        retryCorrectCount: 0, retryWrongCount: 0,
        masteredCount: 0,
        repeatedCards: new Set(), currentIsRetry: false
    };
    sessionActive = true;
    comboCount = 0;
    
    incrementStreak();
    
    showView('activeSession');
    setActiveNav(-1);
    
    showCard();
}

function showCard() {
    const card = session.queue[session.idx];
    session.current = card;
    session.answered = false;
    session.currentIsRetry = session.repeatedCards.has(card.id);
    session.cardStartTime = Date.now();
    
    // Richtung auflösen (Mix = zufällig pro Karte)
    let dir = session.dir;
    if (dir === 'mixed') dir = Math.random() < 0.5 ? 'front' : 'back';
    session.curDir = dir;
    
    if (dir === 'front') {
        session.q = card.front;
        session.a = card.back;
    } else {
        session.q = card.back;
        session.a = card.front;
    }
    
    const progress = document.getElementById('sessionProgress');
    if (progress) progress.textContent = `${session.idx + 1} / ${session.queue.length}`;
    const bar = document.getElementById('progressBar');
    if (bar) bar.style.width = `${(session.idx / session.queue.length) * 100}%`;
    
    if (session.method === 'flip') showFlipCard();
    else if (session.method === 'type') showTypeCard();
    else showMcCard();
}

function setupHint(hintBtnId, hintBoxId) {
    const btn = document.getElementById(hintBtnId);
    const box = document.getElementById(hintBoxId);
    if (!btn || !box) return;
    if (session.current.hint) {
        btn.classList.remove('hidden');
        box.style.display = 'none';
        box.textContent = session.current.hint;
    } else {
        btn.classList.add('hidden');
        box.style.display = 'none';
    }
}

// ---------- FLIP-MODUS ----------
function showFlipCard() {
    document.getElementById('flipWrapper').style.display = '';
    document.getElementById('typingWrapper').style.display = 'none';
    document.getElementById('mcWrapper').style.display = 'none';
    
    const fc = document.getElementById('flashcard');
    fc.classList.remove('flipped');
    
    document.getElementById('boxBadge').textContent = `Box ${session.current.box || 1}`;
    document.getElementById('labelQ').textContent = session.curDir === 'back' ? 'Rückseite' : 'Vorderseite';
    document.getElementById('textQ').textContent = session.q;
    document.getElementById('labelA').textContent = session.curDir === 'back' ? 'Vorderseite' : 'Rückseite';
    document.getElementById('textA').textContent = session.a;
    
    setupHint('btnHintFront', 'hintFront');
}

function flipCard() {
    if (!sessionActive || session.method !== 'flip') return;
    document.getElementById('flashcard').classList.toggle('flipped');
}

// ---------- TYPE-MODUS ----------
function showTypeCard() {
    document.getElementById('flipWrapper').style.display = 'none';
    document.getElementById('typingWrapper').style.display = 'block';
    document.getElementById('mcWrapper').style.display = 'none';
    
    document.getElementById('typeLabelQ').textContent = session.curDir === 'back' ? 'RÜCKSEITE' : 'VORDERSEITE';
    document.getElementById('typeTextQ').textContent = session.q;
    
    setupHint('btnHintType', 'hintType');
    
    document.getElementById('normalInputArea').style.display = '';
    document.getElementById('correctionArea').style.display = 'none';
    document.getElementById('typeFeedback').style.display = 'none';
    document.getElementById('btnNextType').classList.add('hidden');
    
    const input = document.getElementById('typeInput');
    input.value = '';
    input.disabled = false;
    correctionMode = false;
    setTimeout(() => input.focus(), 50);
}

function normalizeAnswer(s) {
    return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function checkType() {
    if (!sessionActive || session.method !== 'type' || correctionMode || session.answered) return;
    
    const input = document.getElementById('typeInput');
    const answer = input.value.trim();
    if (!answer) return;
    
    const feedback = document.getElementById('typeFeedback');
    feedback.style.display = 'block';
    
    const normIn = normalizeAnswer(answer);
    const normTarget = normalizeAnswer(session.a);
    const tolerance = Math.max(1, Math.floor(normTarget.length / 5));
    const correct = normIn === normTarget || levenshtein(normIn, normTarget) <= tolerance;
    
    if (correct) {
        feedback.innerHTML = '<span style="color: var(--success); font-weight: bold;">✓ Richtig!</span>';
        input.disabled = true;
        handleAnswer(true);
        document.getElementById('btnNextType').classList.remove('hidden');
    } else {
        handleAnswer(false);
        startCorrection();
    }
}

function startCorrection() {
    correctionMode = true;
    playFailSound();
    document.getElementById('normalInputArea').style.display = 'none';
    document.getElementById('correctionArea').style.display = 'block';
    document.getElementById('correctAnswerText').textContent = session.a;
    document.getElementById('correctionSuccess').style.display = 'none';
    
    const cInput = document.getElementById('correctionInput');
    cInput.value = '';
    setTimeout(() => cInput.focus(), 50);
}

function confirmCorrection() {
    if (!correctionMode) return;
    const val = document.getElementById('correctionInput').value.trim();
    
    if (normalizeAnswer(val) !== normalizeAnswer(session.a)) {
        playFailSound();
        const input = document.getElementById('correctionInput');
        input.value = '';
        input.focus();
        showNotification('Noch nicht ganz richtig – schreibe die Antwort genau ab!', 'warning');
        return;
    }
    
    correctionMode = false;
    document.getElementById('correctionSuccess').style.display = 'block';
    playSuccessSound();
    session.retryCorrectCount++;
    document.getElementById('btnNextType').classList.remove('hidden');
}

// ---------- MULTIPLE-CHOICE-MODUS ----------
function showMcCard() {
    document.getElementById('flipWrapper').style.display = 'none';
    document.getElementById('typingWrapper').style.display = 'none';
    document.getElementById('mcWrapper').style.display = 'block';
    
    document.getElementById('mcBoxBadge').textContent = `Box ${session.current.box || 1}`;
    document.getElementById('mcLabelQ').textContent = session.curDir === 'back' ? 'Rückseite' : 'Vorderseite';
    document.getElementById('mcTextQ').textContent = session.q;
    
    setupHint('btnHintMc', 'hintMc');
    
    // Distraktoren aus anderen Karten generieren
    const options = new Set([session.a]);
    const pool = data.cards.filter(c => c.id !== session.current.id);
    const maxOptions = Math.min(4, data.cards.length);
    let guard = 0;
    while (options.size < maxOptions && guard < 100) {
        guard++;
        const pick = pool[Math.floor(Math.random() * pool.length)];
        if (!pick) break;
        const val = session.curDir === 'back' ? pick.front : pick.back;
        if (val) options.add(val);
    }
    const shuffled = [...options].sort(() => Math.random() - 0.5);
    
    const container = document.getElementById('mcOptions');
    container.innerHTML = '';
    document.getElementById('btnNextMc').classList.add('hidden');
    
    shuffled.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'mc-option';
        btn.textContent = opt;
        btn.addEventListener('click', () => {
            if (session.answered) return;
            session.answered = true;
            const correct = opt === session.a;
            
            document.querySelectorAll('.mc-option').forEach(b => {
                b.disabled = true;
                if (b.textContent === session.a) b.classList.add('correct');
            });
            if (!correct) btn.classList.add('wrong');
            
            handleAnswer(correct);
            document.getElementById('btnNextMc').classList.remove('hidden');
        });
        container.appendChild(btn);
    });
}

// ---------- ANTWORT-VERARBEITUNG (LEITNER) ----------
function handleAnswer(correct) {
    const card = session.current;
    if (!card) return;
    
    const oldBox = card.box || 1;
    const isFirstTry = !session.repeatedCards.has(card.id);
    
    if (correct) {
        card.box = Math.min(oldBox + 1, MAX_LEITNER_BOX);
        comboCount++;
        playSuccessSound();
        if (comboCount >= 2) showComboBadge(comboCount, oldBox, card.box);
        if (card.box === MAX_LEITNER_BOX && oldBox < MAX_LEITNER_BOX) {
            playLevelUpSound();
            launchConfetti();
            session.masteredCount++;
        }
        if (isFirstTry) session.firstTryCorrect++;
        else session.retryCorrectCount++;
    } else {
        card.box = 1;
        comboCount = 0;
        playFailSound();
        if (isFirstTry) {
            session.firstTryWrong++;
            // Karte zum Wiederholen ans Ende der Queue
            session.repeatedCards.add(card.id);
            session.queue.push(card);
        } else {
            session.retryWrongCount++;
        }
    }
    
    card.lastLearnedAt = Date.now();
    data.totalReviews = (data.totalReviews || 0) + 1;
    save();
}

function rate(correct) {
    if (!sessionActive || session.method !== 'flip' || session.answered) return;
    session.answered = true;
    handleAnswer(correct);
    nextCard();
}

function nextCard() {
    if (!sessionActive) return;
    session.idx++;
    if (session.idx >= session.queue.length) {
        endSessionSummary();
    } else {
        showCard();
    }
}

function endSessionSummary() {
    sessionActive = false;
    correctionMode = false;
    
    const duration = Math.max(1, Math.round((Date.now() - session.startTime) / 1000));
    data.lastSessionDuration = duration;
    data.totalTimeSeconds = (data.totalTimeSeconds || 0) + duration;
    save();
    
    const total = session.firstTryCorrect + session.firstTryWrong;
    const acc = total > 0 ? Math.round((session.firstTryCorrect / total) * 100) : 0;
    
    document.getElementById('summaryAccuracy').textContent = acc + '%';
    document.getElementById('summaryAccuracySub').textContent =
        `${session.firstTryCorrect} von ${total} Karten beim 1. Versuch richtig`;
    document.getElementById('summaryCorrect').textContent = session.firstTryCorrect;
    document.getElementById('summaryRetries').textContent = session.retryCorrectCount;
    document.getElementById('summaryTime').textContent = formatTime(duration);
    document.getElementById('summaryMastered').textContent = session.masteredCount;
    
    const emoji = acc >= 90 ? '🏆' : acc >= 70 ? '🎉' : acc >= 50 ? '💪' : '📚';
    const title = acc >= 90 ? 'Herausragend!' : acc >= 70 ? 'Sitzung geschafft!' : acc >= 50 ? 'Gut gemacht!' : 'Übung macht den Meister!';
    document.getElementById('summaryEmoji').textContent = emoji;
    document.getElementById('summaryTitle').textContent = title;
    document.getElementById('summarySubtitle').textContent =
        `${session.queue.length} Antworten in ${formatTime(duration)}`;
    
    launchConfetti();
    showView('sessionSummary');
    setActiveNav(-1);
}

function endSession() {
    sessionActive = false;
    correctionMode = false;
    
    const duration = Math.max(1, Math.round((Date.now() - session.startTime) / 1000));
    data.lastSessionDuration = duration;
    data.totalTimeSeconds = (data.totalTimeSeconds || 0) + duration;
    save();
    
    showView('learnContent');
    setActiveNav(1);
    showNotification('Session beendet', 'info');
}

function restartSession() {
    startSession();
}

function closeSummary() {
    showView('statsContent');
    setActiveNav(2);
    renderStats();
}

// =============================================
// SPRACHAUSGABE (TEXT-TO-SPEECH)
// =============================================
function guessLang(text) {
    if (/[äöüß]/i.test(text)) return 'de-DE';
    if (/[ñ¿¡áéíóú]/i.test(text)) return 'es-ES';
    if (/[àèìòùç]/i.test(text)) return 'fr-FR';
    if (/[àèìòù]/i.test(text)) return 'it-IT';
    return 'en-US';
}

function speak(e, which) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    const text = which === 'q' ? session.q : session.a;
    if (!text || !('speechSynthesis' in window)) return;
    try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = guessLang(text);
        u.rate = 0.9;
        speechSynthesis.speak(u);
    } catch (err) {
        console.error('Sprachausgabe fehlgeschlagen:', err);
    }
}

// =============================================
// HINWEISE (HINTS)
// =============================================
function toggleHint(e) {
    if (e) e.stopPropagation();
    const box = document.getElementById('hintFront');
    if (box) box.style.display = box.style.display === 'block' ? 'none' : 'block';
}

function toggleTypeHint() {
    const box = document.getElementById('hintType');
    if (box) box.style.display = box.style.display === 'block' ? 'none' : 'block';
}

function toggleMcHint() {
    const box = document.getElementById('hintMc');
    if (box) box.style.display = box.style.display === 'block' ? 'none' : 'block';
}

// =============================================
// EXPORT / IMPORT / RESET
// =============================================
function downloadJson(obj, filename) {
    const json = JSON.stringify(obj, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportData(format) {
    if (format === 'json') {
        const payload = {
            type: 'ultracards-backup',
            version: DB_VERSION,
            exportedAt: Date.now(),
            ...data
        };
        downloadJson(payload, `vokabeltrainer-backup-${dayKey()}.json`);
        showNotification('Backup heruntergeladen!', 'success');
    } else if (format === 'csv') {
        const esc = (s) => `"${String(s || '').replace(/"/g, '""')}"`;
        let csv = 'Vorderseite;Rueckseite;Hinweis;Box;Ordner\n';
        data.cards.forEach(c => {
            const folder = data.folders.find(f => f.id === c.folderId);
            csv += [
                esc(c.front), esc(c.back), esc(c.hint),
                c.box || 1, esc(folder ? folder.name : '')
            ].join(';') + '\n';
        });
        // BOM für Excel-Kompatibilität
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vokabeltrainer-${dayKey()}.csv`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showNotification('CSV exportiert!', 'success');
    }
}

function importData(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            if (!parsed.cards || !parsed.folders) {
                showNotification('Ungültige Backup-Datei!', 'error');
                input.value = '';
                return;
            }
            const confirmed = await showConfirm('Backup wiederherstellen? Die aktuellen Daten werden überschrieben!');
            if (!confirmed) {
                input.value = '';
                return;
            }
            data = migrateData(parsed);
            if (!data.totalTimeSeconds) data.totalTimeSeconds = 0;
            if (!data.totalReviews) data.totalReviews = 0;
            if (!data.lastSessionDuration) data.lastSessionDuration = 0;
            save();
            curFolder = null;
            renderManage();
            updateBackupStatus();
            checkStreak();
            showNotification('Backup wiederhergestellt!', 'success');
        } catch (err) {
            console.error('Import-Fehler:', err);
            showNotification('Fehler beim Lesen der Datei!', 'error');
        }
        input.value = '';
    };
    reader.readAsText(file);
}

function runImport() {
    const text = document.getElementById('inpImport').value.trim();
    if (!text) {
        showNotification('Keine Daten zum Importieren!', 'warning');
        return;
    }
    
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    let added = 0, skipped = 0;
    
    lines.forEach(line => {
        const parts = line.split(';').map(p => p.trim());
        const front = parts[0];
        const back = parts[1];
        const hint = parts[2] || '';
        
        if (!front || !back) { skipped++; return; }
        
        const exists = data.cards.some(c =>
            c.folderId === curFolder &&
            c.front.toLowerCase() === front.toLowerCase() &&
            c.back.toLowerCase() === back.toLowerCase()
        );
        if (exists) { skipped++; return; }
        
        data.cards.push({ id: genId(), front, back, hint, box: 1, folderId: curFolder, createdAt: Date.now() });
        added++;
    });
    
    save();
    renderManage();
    hideModal('importModal');
    document.getElementById('inpImport').value = '';
    showNotification(`${added} Karten importiert${skipped > 0 ? `, ${skipped} übersprungen` : ''}!`, 'success');
}

async function resetAll() {
    const confirmed = await showConfirm('Wirklich ALLE Daten löschen? Ordner, Karten und Fortschritt werden entfernt!');
    if (!confirmed) return;
    const confirmed2 = await showConfirm('Letzte Chance – wirklich alles löschen?');
    if (!confirmed2) return;
    
    safeLocalStorage('remove', DATA_KEY);
    safeLocalStorage('remove', BACKUP_KEY);
    curFolder = null;
    createSampleData();
    renderManage();
    updateBackupStatus();
    showNotification('Alle Daten gelöscht!', 'info');
}

function resetCard(id) {
    const card = data.cards.find(c => c.id === id);
    if (card) {
        card.box = 1;
        card.lastLearnedAt = null;
        save();
        renderManage();
        showNotification('Karte zurückgesetzt (Box 1)!', 'success');
    }
}

// =============================================
// STATISTIK
// =============================================
function renderStats() {
    const scopeEl = document.getElementById('statsScope');
    const cards = getCardsForScope(scopeEl ? scopeEl.value : 'all');
    
    const totalEl = document.getElementById('statsTotal');
    if (totalEl) totalEl.textContent = cards.length;
    
    const mastered = cards.filter(c => (c.box || 1) >= MAX_LEITNER_BOX).length;
    const pct = cards.length > 0 ? Math.round((mastered / cards.length) * 100) : 0;
    const masteredEl = document.getElementById('statsMastered');
    if (masteredEl) masteredEl.textContent = `${pct}% gemeistert`;
    
    const lastSessionEl = document.getElementById('perfLastSession');
    if (lastSessionEl) lastSessionEl.textContent = data.lastSessionDuration ? formatTime(data.lastSessionDuration) : '--:--';
    
    const avgEl = document.getElementById('perfAvgTime');
    if (avgEl) {
        avgEl.textContent = data.totalReviews > 0
            ? `${Math.max(1, Math.round((data.totalTimeSeconds || 0) / data.totalReviews))}s`
            : '--s';
    }
    
    const ttmEl = document.getElementById('perfTimeToMaster');
    if (ttmEl) {
        const unmastered = cards.filter(c => (c.box || 1) < MAX_LEITNER_BOX).length;
        // 1+3+7+14 = 25 Tage Intervall-Summe bis Box 5
        ttmEl.textContent = cards.length === 0 ? '--' : (unmastered === 0 ? 'Fertig! 🎉' : `~${unmastered * 25} Tage`);
    }
    
    const todayEl = document.getElementById('perfMasteredToday');
    if (todayEl) {
        const today = dayKey();
        const count = cards.filter(c =>
            c.lastLearnedAt &&
            dayKey(new Date(c.lastLearnedAt)) === today &&
            (c.box || 1) >= MAX_LEITNER_BOX
        ).length;
        todayEl.textContent = count;
    }
    
    // Box-Chart
    for (let b = 1; b <= MAX_LEITNER_BOX; b++) {
        const row = document.querySelector(`.box-row[data-box="${b}"]`);
        if (!row) continue;
        const count = cards.filter(c => (c.box || 1) === b).length;
        const valueEl = row.querySelector('.box-value');
        if (valueEl) valueEl.textContent = count;
        const fill = row.querySelector('.box-progress-fill');
        if (fill) fill.style.width = cards.length > 0 ? `${(count / cards.length) * 100}%` : '0%';
        row.classList.toggle('empty', count === 0);
    }
}

// =============================================
// CONFETTI
// =============================================
function resizeConfettiCanvas() {
    if (!confettiCanvas) return;
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeConfettiCanvas);

function launchConfetti() {
    if (!confettiCanvas || !ctx) return;
    resizeConfettiCanvas();
    
    const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444'];
    for (let i = 0; i < 80; i++) {
        confettiParticles.push({
            x: confettiCanvas.width / 2 + (Math.random() - 0.5) * 200,
            y: confettiCanvas.height * 0.4,
            vx: (Math.random() - 0.5) * 12,
            vy: Math.random() * -12 - 4,
            size: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.3,
            life: 1
        });
    }
    
    if (!confettiRunning) {
        confettiRunning = true;
        requestAnimationFrame(confettiLoop);
    }
}

function confettiLoop() {
    if (!ctx) return;
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiParticles = confettiParticles.filter(p => p.life > 0 && p.y < confettiCanvas.height + 50);
    
    confettiParticles.forEach(p => {
        p.vy += 0.25; // Gravitation
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.life -= 0.008;
        
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
    });
    
    if (confettiParticles.length > 0) {
        requestAnimationFrame(confettiLoop);
    } else {
        confettiRunning = false;
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
}

// =============================================
// PWA INSTALLATION
// =============================================
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!safeLocalStorage('get', 'ultraInstallDismissed')) {
        const banner = document.getElementById('installBanner');
        if (banner) banner.style.display = 'block';
    }
});

async function installPWA() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
        await deferredPrompt.userChoice;
    } catch (e) {}
    deferredPrompt = null;
    dismissInstall();
}

function dismissInstall() {
    const banner = document.getElementById('installBanner');
    if (banner) banner.style.display = 'none';
    safeLocalStorage('set', 'ultraInstallDismissed', '1');
}

// =============================================
// TASTATUR-STEUERUNG (NEUES FEATURE)
// =============================================
document.addEventListener('keydown', (e) => {
    if (!sessionActive) return;
    
    // Eingabefelder: Enter prüft die Antwort
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Enter' && session.method === 'type') {
            e.preventDefault();
            if (correctionMode) confirmCorrection();
            else checkType();
        }
        return;
    }
    
    if (session.method === 'flip') {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            flipCard();
        } else if (e.key === 'ArrowLeft') {
            rate(false);
        } else if (e.key === 'ArrowRight') {
            rate(true);
        }
    } else if (session.method === 'mc') {
        if (['1', '2', '3', '4'].includes(e.key)) {
            const btns = document.querySelectorAll('.mc-option:not(:disabled)');
            const btn = btns[parseInt(e.key, 10) - 1];
            if (btn) btn.click();
        } else if (e.key === 'Enter') {
            const nextBtn = document.getElementById('btnNextMc');
            if (nextBtn && !nextBtn.classList.contains('hidden')) nextBtn.click();
        }
    } else if (session.method === 'type') {
        if (e.key === 'Enter') {
            const nextBtn = document.getElementById('btnNextType');
            if (nextBtn && !nextBtn.classList.contains('hidden')) nextBtn.click();
        }
    }
});

// =============================================
// INITIALISIERUNG
// =============================================
function init() {
    // Theme & Akzent wiederherstellen
    applyTheme(safeLocalStorage('get', THEME_KEY) || 'light');
    const accent = safeLocalStorage('get', ACCENT_KEY);
    if (accent) setAccent(accent);
    
    loadData();
    renderManage();
    checkUrlImport();
    
    // Auto-Backup alle 5 Minuten
    setInterval(createAutoBackup, AUTO_BACKUP_INTERVAL);
    
    // FAB-Menü bei Klick außerhalb schließen
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('fabMenu');
        const fab = document.getElementById('mainFab');
        if (menu && menu.classList.contains('active') &&
            !menu.contains(e.target) && fab && !fab.contains(e.target)) {
            menu.classList.remove('active');
        }
    });
    
    // Suchbox (Fuzzy-Suche)
    const searchBox = document.getElementById('searchBox');
    if (searchBox) {
        searchBox.addEventListener('input', (e) => renderManage(e.target.value));
    }
    
    // Statistik-Filter
    const statsScope = document.getElementById('statsScope');
    if (statsScope) statsScope.addEventListener('change', renderStats);
    
    // Enter im Ordner-Modal
    const inpFolder = document.getElementById('inpFolder');
    if (inpFolder) {
        inpFolder.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addFolder();
        });
    }
    
    // Modals: Klick auf Backdrop schließt
    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', (e) => {
            if (e.target === m) m.classList.remove('show');
        });
    });
}

init();
