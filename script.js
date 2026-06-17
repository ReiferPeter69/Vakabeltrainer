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
    cardStartTime: 0, timeSpent: 0 
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
            // Transposition
            if (i > 1 && j > 1 && 
                a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
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
function checkStreak() {
    const today = new Date().toDateString();
    if (data.lastLearnedDate) {
        const lastDate = new Date(data.lastLearnedDate);
        const todayDate = new Date(today);
        const diffTime = Math.abs(todayDate - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        if (diffDays > 1 && data.lastLearnedDate !== today) {
            data.streak = 0;
            save();
        }
    }
    const streakEl = document.getElementById('streakCount');
    if (streakEl) streakEl.innerText = data.streak || 0;
}

function incrementStreak() {
    const today = new Date().toDateString();
    if (data.lastLearnedDate === today) return;

    if (data.lastLearnedDate) {
        const lastDate = new Date(data.lastLearnedDate);
        const todayDate = new Date(today);
        const diffTime = todayDate - lastDate;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
            data.streak = (data.streak || 0) + 1;
        } else {
            data.streak = 1;
        }
    } else {
        data.streak = 1;
    }

    data.lastLearnedDate = today;
    save();
    triggerConfetti();
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
            
            const deleteRecursive = (fid) => {
                data.cards = data.cards.filter(c => c.folderId !== fid);
                data.folders.filter(f => f.parentId === fid).forEach(s => deleteRecursive(s.id));
                data.folders = data.folders.filter(f => f.id !== fid);
            };
            deleteRecursive(id);
        } else {
            const card = data.cards.find(c => c.id === id);
            if (card) deletedItems.push({...card});
            data.cards = data.cards.filter(c => c.id !== id);
        }
    });

    triggerUndoToast(`${deletedItems.length} Element(e) gelöscht`, { type: 'bulk', items: deletedItems });

    save();
    selectedIds.clear();
    isSelectMode = false;
    updateSelectionUI();
    renderManage();
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
    const folderSubs = data.folders.filter(f => subs.includes(f.id));
    
    const exportPayload = {
        type: 'ultracards-folder',
        version: 1,
        exportedAt: Date.now(),
        name: folder.name,
        folders: folderSubs.map(f => ({
            id: f.id,
            name: f.name,
            parentId: f.parentId
        })),
        cards: folderCards
    };
    
    const json = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ultracards-${folder.name.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Ordner exportiert!', 'success');
}

/**
 * Reset einer Karte auf Box 1
 */
function resetCard(id) {
    const card = data.cards.find(c => c.id === id);
    if (!card) return;
    
    const oldBox = card.box || 1;
    if (oldBox === 1) {
        showNotification('Karte ist bereits in Box 1', 'warning');
        return;
    }
    
    card.box = 1;
    card.lastLearnedAt = null;
    save();
    renderManage();
    showNotification(`Karte zurückgesetzt (Box ${oldBox} → 1)`, 'success');
}

function runImport() {
    if (curFolder === null) {
        showNotification('Bitte wähle zuerst einen Ordner aus!', 'warning');
        return;
    }
    
    const lines = document.getElementById('inpImport').value.split('\n');
    let addedCount = 0; 
    let skipCount = 0; 
    let errorCount = 0;

    lines.forEach(l => {
        let parts = l.split(';');
        if (parts.length < 2) parts = l.split('\t');
        const fRaw = parts[0]; 
        const bRaw = parts[1]; 
        const hRaw = parts[2];

        if (fRaw && bRaw) { 
            const f = fRaw.trim(); 
            const b = bRaw.trim(); 
            const h = hRaw ? hRaw.trim() : '';
            const exists = data.cards.some(c => c.folderId === curFolder && c.front.toLowerCase() === f.toLowerCase() && c.back.toLowerCase() === b.toLowerCase());
            if (!exists) {
                data.cards.push({ id: genId(), front: f, back: b, hint: h, box: 1, folderId: curFolder, createdAt: Date.now() }); 
                addedCount++;
            } else { 
                skipCount++; 
            }
        } else { 
            if (l.trim() !== '') errorCount++; 
        }
    });
    
    save(); 
    document.getElementById('inpImport').value = '';
    const fb = document.getElementById('importFeedback');
    if (fb) {
        fb.style.display = 'block';
        let msg = `<span style="color:var(--success)">✅ ${addedCount} importiert</span>`;
        if (skipCount > 0) msg += `<br><span style="color:var(--warning)">⚠️ ${skipCount} Duplikate übersprungen</span>`;
        if (errorCount > 0) msg += `<br><span style="color:var(--danger)">❌ ${errorCount} fehlerhafte Zeilen</span>`;
        fb.innerHTML = msg;
        if (errorCount === 0 && addedCount > 0) { 
            setTimeout(() => { hideModal('importModal'); renderManage(); }, 2000); 
        }
    }
}

// =============================================
// THEME
// =============================================
function toggleTheme() {
    try {
        const b = document.body;
        const t = b.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        b.setAttribute('data-theme', t);
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) themeIcon.className = t === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        safeLocalStorage('set', THEME_KEY, t);
    } catch (e) {
        console.log('Theme konnte nicht gespeichert werden:', e);
    }
}

function applyTheme() {
    try {
        const savedTheme = safeLocalStorage('get', THEME_KEY) || 'light';
        document.body.setAttribute('data-theme', savedTheme);
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    } catch (e) {
        console.log('Theme konnte nicht geladen werden:', e);
    }
}

/**
 * Setzt das Akzent-Theme (überschreibt nur --primary-*)
 */
function setAccent(name) {
    try {
        document.body.setAttribute('data-accent', name);
        safeLocalStorage('set', ACCENT_KEY, name);
        // Aktiven Punkt im Picker markieren
        document.querySelectorAll('.accent-dot').forEach(dot => {
            dot.classList.toggle('active', dot.dataset.accent === name);
        });
    } catch (e) {
        console.log('Akzent konnte nicht gespeichert werden:', e);
    }
}

function applyAccent() {
    try {
        const savedAccent = safeLocalStorage('get', ACCENT_KEY) || 'indigo';
        document.body.setAttribute('data-accent', savedAccent);
        document.querySelectorAll('.accent-dot').forEach(dot => {
            dot.classList.toggle('active', dot.dataset.accent === savedAccent);
        });
    } catch (e) {
        console.log('Akzent konnte nicht geladen werden:', e);
    }
}

// =============================================
// LEARNING ENGINE
// =============================================
function saveLearnSettings() {
    try {
        const settings = {
            source: document.getElementById('learnSource')?.value || 'due',
            strategy: document.getElementById('learnStrategy')?.value || 'leitner',
            method: document.getElementById('learnMethod')?.value || 'flip',
            direction: session.dir || 'mixed'
        };
        safeLocalStorage('set', LEARN_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.log('Lern-Einstellungen konnten nicht gespeichert werden:', e);
    }
}

function loadLearnSettings() {
    try {
        const raw = safeLocalStorage('get', LEARN_SETTINGS_KEY);
        if (!raw) return;
        const settings = JSON.parse(raw);
        
        const learnSource = document.getElementById('learnSource');
        const learnStrategy = document.getElementById('learnStrategy');
        const learnMethod = document.getElementById('learnMethod');
        
        if (learnSource && settings.source) {
            // Warte bis Optionen aufgebaut sind, dann setzen
            setTimeout(() => {
                if (Array.from(learnSource.options).some(o => o.value === settings.source)) {
                    learnSource.value = settings.source;
                }
            }, 0);
        }
        if (learnStrategy && settings.strategy) learnStrategy.value = settings.strategy;
        if (learnMethod && settings.method) learnMethod.value = settings.method;
        if (settings.direction) setDirection(settings.direction, true);
    } catch (e) {
        console.log('Lern-Einstellungen konnten nicht geladen werden:', e);
    }
}

function updateLearnSource() {
    const s = document.getElementById('learnSource'); 
    if (!s) return;
    s.innerHTML = '';
    
    // Zähle fällige Karten
    const dueCount = data.cards.filter(c => isCardDue(c)).length;
    const dueLabel = dueCount > 0 ? `Fällige Karten (${dueCount})` : 'Fällige Karten';
    
    s.innerHTML += `<option value="due">${dueLabel}</option>`;
    s.innerHTML += `<option value="all">Alle Karten</option>`;
    if (curFolder) s.innerHTML += `<option value="current">Aktueller Ordner (+Unterordner)</option>`;
    
    // Gespeicherte Quelle wiederherstellen falls vorhanden
    try {
        const raw = safeLocalStorage('get', LEARN_SETTINGS_KEY);
        if (raw) {
            const settings = JSON.parse(raw);
            if (settings.source && Array.from(s.options).some(o => o.value === settings.source)) {
                s.value = settings.source;
            } else {
                s.value = 'due';
            }
        } else {
            s.value = 'due';
        }
    } catch (e) {
        s.value = 'due';
    }
}

function setDirection(d, skipSave = false) {
    session.dir = d;
    ['btnMix', 'btnFront', 'btnBack'].forEach(b => {
        const el = document.getElementById(b);
        if (el) el.classList.remove('active');
    });
    if (d === 'mixed') {
        const el = document.getElementById('btnMix');
        if (el) el.classList.add('active');
    }
    if (d === 'front') {
        const el = document.getElementById('btnFront');
        if (el) el.classList.add('active');
    }
    if (d === 'back') {
        const el = document.getElementById('btnBack');
        if (el) el.classList.add('active');
    }
    if (!skipSave) saveLearnSettings();
}

function getFolderIdsRecursive(rootId) {
    let ids = [rootId];
    const children = data.folders.filter(f => f.parentId === rootId);
    children.forEach(child => ids = ids.concat(getFolderIdsRecursive(child.id)));
    return ids;
}

function startSession() {
    const src = document.getElementById('learnSource').value;
    const strat = document.getElementById('learnStrategy').value;
    session.method = document.getElementById('learnMethod').value;
    let pool = [];

    if (src === 'due') {
        // Nur fällige Karten
        pool = data.cards.filter(c => isCardDue(c));
        if (pool.length === 0) {
            showNotification('Keine fälligen Karten! Lerne einfach weiter oder erweitere den Lernumfang.', 'info');
            return;
        }
    } else if (src === 'all') {
        pool = [...data.cards];
    } else {
        if (curFolder) {
            const validFolderIds = getFolderIdsRecursive(curFolder);
            pool = data.cards.filter(c => validFolderIds.includes(c.folderId));
        } else {
            pool = data.cards.filter(c => c.folderId === null);
        }
    }

    if (pool.length === 0) { 
        showNotification('Keine Karten verfügbar!', 'warning'); 
        return; 
    }

    if (strat === 'leitner') {
        pool.sort((a, b) => { 
            const boxA = a.box || 1; 
            const boxB = b.box || 1; 
            if (boxA === boxB) return Math.random() - 0.5; 
            return boxA - boxB; 
        });
        session.queue = pool.slice(0, 50);
    } else if (strat === 'hardest') {
        pool.sort((a, b) => (a.box || 1) - (b.box || 1));
        session.queue = pool.slice(0, 30);
    } else if (strat === 'random') {
        session.queue = pool.sort(() => Math.random() - 0.5).slice(0, 20);
    } else {
        session.queue = pool;
    }

    session.idx = 0;
    session.startTime = Date.now();
    session.timeSpent = 0;
    correctionMode = false;

    // Pädagogik-Tracking: falsche Karten sofort wiederholen + Sitzungs-Zusammenfassung
    session.uniqueCards = session.queue.length;       // einzigartige Karten (für Statistik)
    session.firstWrongCount = 0;                       // beim 1. Versuch falsch
    session.retryCorrectCount = 0;                     // beim Wiederholen richtig gelernt
    session.retryWrongCount = 0;                       // beim Wiederholen immer noch falsch
    session.repeatedCards = new Set();                 // IDs der Karten, die bereits einmal falsch waren
    session.currentIsRetry = false;                    // ist die aktuell gezeigte Karte ein 2. Versuch?
    session.masteredThisSession = 0;                   // Karten, die in dieser Sitzung Box 5 erreicht haben

    // Ursprüngliche Box je Karte sichern, damit beim Erholen nicht über den Startwert aufgestiegen wird
    session.queue.forEach(card => { card._sessionStartBox = card.box || 1; });
    
    document.getElementById('manageContent').classList.remove('active');
    document.getElementById('learnContent').classList.remove('active');
    const bottomNav = document.querySelector('.bottom-nav');
    const header = document.querySelector('header');
    if (bottomNav) bottomNav.classList.add('hidden-nav');
    if (header) header.classList.add('hidden');
    document.getElementById('activeSession').style.display = 'block';

    const flipWrapper = document.getElementById('flipWrapper');
    const typingWrapper = document.getElementById('typingWrapper');
    if (flipWrapper) flipWrapper.style.display = session.method === 'flip' ? 'block' : 'none';
    if (typingWrapper) typingWrapper.style.display = session.method === 'type' ? 'block' : 'none';
    loadCard();
}

function loadCard() {
    if (session.idx >= session.queue.length) return finishSession();
    session.cardStartTime = Date.now();

    const c = session.queue[session.idx];
    session.current = c;
    session.currentIsRetry = !!(session.repeatedCards && session.repeatedCards.has(c.id));
    let isFront = true;
    if (session.dir === 'back') isFront = false;
    else if (session.dir === 'mixed') isFront = Math.random() > 0.5;

    session.q = isFront ? c.front : c.back;
    session.a = isFront ? c.back : c.front;
    const lblQ = isFront ? 'Vorderseite' : 'Rückseite';
    const lblA = isFront ? 'Rückseite' : 'Vorderseite';

    const sessionProgress = document.getElementById('sessionProgress');
    const progressBar = document.getElementById('progressBar');
    if (sessionProgress) sessionProgress.textContent = `${session.idx + 1} / ${session.queue.length}`;
    if (progressBar) progressBar.style.width = `${((session.idx + 1) / session.queue.length) * 100}%`;

    if (session.method === 'flip') {
        const el = document.getElementById('flashcard');
        if (!el) return;
        el.classList.remove('flipped', 'shake');
        setTimeout(() => {
            const labelQ = document.getElementById('labelQ');
            const textQ = document.getElementById('textQ');
            const labelA = document.getElementById('labelA');
            const textA = document.getElementById('textA');
            const boxBadge = document.getElementById('boxBadge');
            const hBtn = document.getElementById('btnHintFront');
            const hBox = document.getElementById('hintFront');
            
            if (labelQ) labelQ.textContent = lblQ;
            if (textQ) textQ.textContent = session.q;
            if (labelA) labelA.textContent = lblA;
            if (textA) textA.textContent = session.a;
            if (boxBadge) {
                boxBadge.textContent = `Box ${c.box || 1}`;
                boxBadge.style.background = `var(--box-${c.box || 1})`;
            }
            if (hBox) hBox.style.display = 'none';
            if (hBtn) {
                if (c.hint) { 
                    hBtn.classList.remove('hidden'); 
                    if (hBox) hBox.textContent = c.hint; 
                }
                else hBtn.classList.add('hidden');
            }
        }, 200);
    } else {
        correctionMode = false;
        const typeLabelQ = document.getElementById('typeLabelQ');
        const typeTextQ = document.getElementById('typeTextQ');
        const typeInput = document.getElementById('typeInput');
        const typeFeedback = document.getElementById('typeFeedback');
        const btnCheckType = document.getElementById('btnCheckType');
        const btnNextType = document.getElementById('btnNextType');
        const normalInputArea = document.getElementById('normalInputArea');
        const correctionArea = document.getElementById('correctionArea');
        const hBtn = document.getElementById('btnHintType');
        const hBox = document.getElementById('hintType');
        
        if (typeLabelQ) typeLabelQ.textContent = lblQ;
        if (typeTextQ) typeTextQ.textContent = session.q;
        if (typeInput) {
            typeInput.value = '';
            typeInput.disabled = false;
            typeInput.focus();
        }
        if (typeFeedback) typeFeedback.style.display = 'none';
        if (btnCheckType) btnCheckType.classList.remove('hidden');
        if (btnNextType) btnNextType.classList.add('hidden');
        if (normalInputArea) normalInputArea.style.display = 'block';
        if (correctionArea) correctionArea.style.display = 'none';
        if (hBox) hBox.style.display = 'none';
        if (hBtn) {
            if (c.hint) { 
                hBtn.classList.remove('hidden'); 
                if (hBox) hBox.textContent = c.hint; 
            }
            else hBtn.classList.add('hidden');
        }
    }
}

/**
 * Prüft, ob eine Karte basierend auf dem Leitner-Intervall fällig ist
 */
function isCardDue(card) {
    if (!card.lastLearnedAt) return true; // Noch nie gelernt
    
    const box = card.box || 1;
    const interval = LEITNER_INTERVALS[box] || LEITNER_INTERVALS[1];
    const nextReview = card.lastLearnedAt + interval;
    
    return Date.now() >= nextReview;
}

/**
 * Formatiert die verbleibende Zeit bis zur nächsten Wiederholung
 */
function formatTimeUntil(timestamp) {
    const diff = timestamp - Date.now();
    if (diff <= 0) return 'Jetzt fällig';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} Tag${days > 1 ? 'e' : ''}`;
    if (hours > 0) return `${hours} Stunde${hours > 1 ? 'n' : ''}`;
    return `${Math.floor(diff / (1000 * 60))} Minuten`;
}

function rate(success) {
    const c = session.current;
    if (!c) return;
    
    const now = Date.now();
    const cardDuration = (now - session.cardStartTime) / 1000;
    session.timeSpent += cardDuration;
    
    const oldBox = c.box || 1;

    if (success) {
        // Combo-System: Prüfe ob Combo noch aktiv
        if (now - lastAnswerTime < comboTimeout) {
            comboCount++;
        } else {
            comboCount = 1;
        }
        lastAnswerTime = now;
        
        // Confetti und Sound
        triggerConfetti();
        if (comboCount >= 3) {
            playComboSound(Math.min(comboCount, 7));
        } else if (comboCount === 1) {
            // Keine Special-Effekte für erste Antwort
        } else {
            playSuccessSound();
        }
        
        // Box-Aufstieg / Erholung
        let newBox;
        if (session.currentIsRetry) {
            // 2. Versuch richtig: Box darf sich erholen, aber nicht über den
            // Wert, den die Karte zu Beginn der Sitzung hatte (kein Glückstreffer-Aufstieg)
            session.retryCorrectCount++;
            const cap = (c._sessionStartBox != null) ? c._sessionStartBox : oldBox + 1;
            newBox = Math.min(oldBox + 1, cap, MAX_LEITNER_BOX);
        } else {
            newBox = Math.min(oldBox + 1, MAX_LEITNER_BOX);
        }
        if (newBox > oldBox) {
            setTimeout(() => playLevelUpSound(), 200);
        }
        
        c.box = newBox;
        if (c.box === MAX_LEITNER_BOX && !c.lastMasteredAt) {
            c.lastMasteredAt = now;
            session.masteredThisSession++;
        }
        c.lastLearnedAt = now;
        incrementStreak();
        
        // Combo Badge anzeigen
        showComboBadge(comboCount, oldBox, newBox);
        
    } else {
        // Combo zurücksetzen
        comboCount = 0;
        playFailSound();

        // Pädagogik: falsche Karte sofort als Nächstes wiederholen
        if (!session.currentIsRetry) {
            session.firstWrongCount++;
            session.repeatedCards.add(c.id);
            // Karte direkt als Nächstes einreihen (vor der eigentlich folgenden Karte)
            session.queue.splice(session.idx + 1, 0, c);
        } else {
            // Beim 2. Versuch immer noch falsch: kein dritter Versuch (Endlosschleife vermeiden)
            session.retryWrongCount++;
        }
        
        c.box = Math.max(1, (c.box || 1) - 1);
        c.lastLearnedAt = now;
        if (session.method === 'flip') {
            const flashcard = document.getElementById('flashcard');
            if (flashcard) flashcard.classList.add('shake');
        }
    }
    save();
    session.idx++;
    setTimeout(loadCard, success ? 500 : 800);
}

// =============================================
// FEHLERANALYSE MIT DIFF
// =============================================

function analyzeErrors(input, correct) {
    const result = [];
    const inputChars = input.split('');
    const correctChars = correct.split('');
    const maxLen = Math.max(inputChars.length, correctChars.length);
    
    let correctCount = 0;
    let wrongCount = 0;
    let missingCount = 0;
    let extraCount = 0;
    
    for (let i = 0; i < maxLen; i++) {
        const inputChar = inputChars[i];
        const correctChar = correctChars[i];
        
        if (inputChar === undefined && correctChar !== undefined) {
            result.push({ char: correctChar, status: 'missing' });
            missingCount++;
        } else if (inputChar !== undefined && correctChar === undefined) {
            result.push({ char: inputChar, status: 'extra' });
            extraCount++;
        } else if (inputChar && correctChar && inputChar.toLowerCase() === correctChar.toLowerCase()) {
            result.push({ char: correctChar, status: 'correct' });
            correctCount++;
        } else {
            if (correctChar) {
                result.push({ char: correctChar, status: 'wrong', inputChar: inputChar });
                wrongCount++;
            }
            if (inputChar && !correctChar) {
                result.push({ char: inputChar, status: 'extra' });
                extraCount++;
            }
        }
    }
    
    return {
        comparison: result,
        stats: {
            correct: correctCount,
            wrong: wrongCount,
            missing: missingCount,
            extra: extraCount,
            total: correctChars.length
        }
    };
}

function createComparisonHTML(input, correct) {
    const analysis = analyzeErrors(input, correct);
    let html = '';
    
    html += '<div class="comparison-row">';
    html += '<div class="comparison-label">Deine Antwort:</div>';
    html += '<div class="comparison-text">';
    
    const inputChars = input.split('');
    const correctChars = correct.split('');
    const maxLen = Math.max(inputChars.length, correctChars.length);
    
    for (let i = 0; i < maxLen; i++) {
        const inputChar = inputChars[i];
        const correctChar = correctChars[i];
        
        if (inputChar === undefined && correctChar !== undefined) {
            // Fehlender Buchstabe
        } else if (inputChar !== undefined && correctChar === undefined) {
            html += `<span class="char-box char-extra">${escapeHtml(inputChar)}</span>`;
        } else if (inputChar && correctChar && inputChar.toLowerCase() === correctChar.toLowerCase()) {
            html += `<span class="char-box char-correct">${escapeHtml(inputChar)}</span>`;
        } else if (inputChar) {
            html += `<span class="char-box char-wrong">${escapeHtml(inputChar)}</span>`;
        }
    }
    
    html += '</div></div>';
    
    html += '<div class="comparison-row">';
    html += '<div class="comparison-label">Richtige Antwort:</div>';
    html += '<div class="comparison-text">';
    
    for (let i = 0; i < correctChars.length; i++) {
        const inputChar = inputChars[i];
        const correctChar = correctChars[i];
        
        if (inputChar === undefined) {
            html += `<span class="char-box char-missing">${escapeHtml(correctChar)}</span>`;
        } else if (inputChar && correctChar && inputChar.toLowerCase() === correctChar.toLowerCase()) {
            html += `<span class="char-box char-correct">${escapeHtml(correctChar)}</span>`;
        } else if (correctChar) {
            html += `<span class="char-box char-wrong">${escapeHtml(correctChar)}</span>`;
        }
    }
    
    html += '</div></div>';
    
    return html;
}

/**
 * Prüft die getippte Antwort
 */
function checkType() {
    const now = Date.now();
    const cardDuration = (now - session.cardStartTime) / 1000;
    session.timeSpent += cardDuration;

    const inp = document.getElementById('typeInput');
    const val = inp ? inp.value.trim() : '';
    const corr = session.a.trim();
    
    // Leere Eingabe behandeln
    if (val === '') {
        if (inp) inp.disabled = true;
        const btnCheckType = document.getElementById('btnCheckType');
        if (btnCheckType) btnCheckType.classList.add('hidden');
        showCorrectionPhase('', corr);
        return;
    }
    
    const isCorr = val.toLowerCase() === corr.toLowerCase();
    
    if (isCorr) {
        if (inp) inp.disabled = true;
        const btnCheckType = document.getElementById('btnCheckType');
        if (btnCheckType) btnCheckType.classList.add('hidden');
        
        const fb = document.getElementById('typeFeedback');
        if (fb) {
            fb.style.display = 'block';
            fb.innerHTML = `<div style="color:var(--success); font-weight:bold"><i class="fas fa-check"></i> Richtig!</div>`;
        }
        
        triggerConfetti();
        
        // BUGFIX: Combo-System auch im Typ-Modus aktivieren
        if (now - lastAnswerTime < comboTimeout) {
            comboCount++;
        } else {
            comboCount = 1;
        }
        lastAnswerTime = now;
        
        // Sound basierend auf Combo
        if (comboCount >= 3) {
            playComboSound(Math.min(comboCount, 7));
        } else {
            playSuccessSound();
        }
        
        // Box-Up / Erholung (analog zum Flip-Modus)
        const oldBox = session.current.box || 1;
        let newBox;
        if (session.currentIsRetry) {
            session.retryCorrectCount++;
            const cap = (session.current._sessionStartBox != null) ? session.current._sessionStartBox : oldBox + 1;
            newBox = Math.min(oldBox + 1, cap, MAX_LEITNER_BOX);
        } else {
            newBox = Math.min(oldBox + 1, MAX_LEITNER_BOX);
        }
        session.current.box = newBox;
        if (newBox === MAX_LEITNER_BOX && !session.current.lastMasteredAt) {
            session.current.lastMasteredAt = now;
            session.masteredThisSession++;
        }
        session.current.lastLearnedAt = now;
        
        if (newBox > oldBox) {
            playLevelUpSound();
        }
        showComboBadge(comboCount, oldBox, newBox);
        
        incrementStreak();
        save();
        
        setTimeout(() => { session.idx++; loadCard(); }, 1200);
    } else {
        // BUGFIX: Falsche Antwort - Sound und Combo-Reset
        playFailSound();
        comboCount = 0;

        // Pädagogik: falsche Karte sofort als Nächstes wiederholen (nur beim 1. Versuch)
        if (!session.currentIsRetry) {
            session.firstWrongCount++;
            session.repeatedCards.add(session.current.id);
            session.queue.splice(session.idx + 1, 0, session.current);
        } else {
            session.retryWrongCount++;
        }
        
        if (inp) inp.disabled = true;
        const btnCheckType = document.getElementById('btnCheckType');
        if (btnCheckType) btnCheckType.classList.add('hidden');
        showCorrectionPhase(val, corr);
    }
}

/**
 * Zeigt die Korrektur-Phase an
 */
function showCorrectionPhase(userInput, correctAnswer) {
    correctionMode = true;
    
    const normalInputArea = document.getElementById('normalInputArea');
    const correctionArea = document.getElementById('correctionArea');
    
    if (normalInputArea) normalInputArea.style.display = 'none';
    if (correctionArea) correctionArea.style.display = 'block';
    
    /*
    const comparisonContainer = document.getElementById('comparisonContainer');
    if (comparisonContainer) {
        comparisonContainer.innerHTML = createComparisonHTML(userInput, correctAnswer);
    }
    */
    
    const correctAnswerText = document.getElementById('correctAnswerText');
    if (correctAnswerText) correctAnswerText.textContent = correctAnswer;
    
    const correctionInput = document.getElementById('correctionInput');
    if (correctionInput) {
        correctionInput.value = '';
        correctionInput.disabled = false;
        correctionInput.classList.remove('correct');
    }
    
    const correctionSuccess = document.getElementById('correctionSuccess');
    if (correctionSuccess) correctionSuccess.style.display = 'none';
    
    const btnConfirmCorrection = document.getElementById('btnConfirmCorrection');
    if (btnConfirmCorrection) btnConfirmCorrection.style.display = 'inline-flex';
    
    setTimeout(() => {
        if (correctionInput) correctionInput.focus();
    }, 100);
    
    // BUGFIX: lastLearnedAt setzen damit Karte nicht als "nie gelernt" gilt
    const now = Date.now();
    session.current.box = Math.max(1, (session.current.box || 1) - 1);
    session.current.lastLearnedAt = now;
    save();
}

/**
 * Bestätigt die Korrektur-Eingabe
 */
function confirmCorrection() {
    const correctionInput = document.getElementById('correctionInput');
    const val = correctionInput ? correctionInput.value.trim() : '';
    const corr = session.a.trim();
    
    if (val.toLowerCase() === corr.toLowerCase()) {
        if (correctionInput) correctionInput.classList.add('correct');
        if (correctionInput) correctionInput.disabled = true;
        
        const correctionSuccess = document.getElementById('correctionSuccess');
        if (correctionSuccess) correctionSuccess.style.display = 'block';
        
        const btnConfirmCorrection = document.getElementById('btnConfirmCorrection');
        if (btnConfirmCorrection) btnConfirmCorrection.style.display = 'none';
        
        const btnNextType = document.getElementById('btnNextType');
        if (btnNextType) {
            btnNextType.classList.remove('hidden');
            btnNextType.focus();
        }
        
        triggerConfetti();
    } else {
        if (correctionInput) {
            correctionInput.style.animation = 'none';
            setTimeout(() => {
                correctionInput.style.animation = 'shake 0.3s';
            }, 10);
        }
        showNotification('Noch nicht ganz richtig. Schau genau hin!', 'warning');
    }
}

function nextCard() { 
    session.idx++; 
    correctionMode = false;
    loadCard(); 
}

function finishSession() {
    const duration = (Date.now() - session.startTime) / 1000;
    data.lastSessionDuration = duration;
    data.totalTimeSeconds += duration;
    // einzigartige Karten zählen (Wiederholungen nicht doppelt)
    data.totalReviews += session.uniqueCards || session.queue.length;
    save();

    // Hilfsfelder entfernen, damit sie nicht in localStorage persistiert werden
    session.queue.forEach(c => { delete c._sessionStartBox; });

    showSummary();
}

function endSession() {
    const duration = (Date.now() - session.startTime) / 1000;
    data.lastSessionDuration = duration;
    data.totalTimeSeconds += duration;
    data.totalReviews += session.queue.length;
    save();
    
    document.getElementById('activeSession').style.display = 'none';
    const bottomNav = document.querySelector('.bottom-nav');
    const header = document.querySelector('header');
    if (bottomNav) bottomNav.classList.remove('hidden-nav');
    if (header) header.classList.remove('hidden');
    
    const statsNavItem = document.querySelectorAll('.nav-item')[2];
    if (statsNavItem) nav('statsContent', statsNavItem);
    updateStatsUI();
}

/**
 * Sitzungs-Zusammenfassung anzeigen (pädagogisches Feedback am Session-Ende)
 */
function showSummary() {
    document.getElementById('activeSession').style.display = 'none';
    const bottomNav = document.querySelector('.bottom-nav');
    const header = document.querySelector('header');
    if (bottomNav) bottomNav.classList.remove('hidden-nav');
    if (header) header.classList.remove('hidden');

    const total = session.uniqueCards || 0;
    const firstWrong = session.firstWrongCount || 0;
    const direct = Math.max(0, total - firstWrong);          // beim 1. Versuch richtig
    const learned = session.retryCorrectCount || 0;           // nach Wiederholung richtig
    const accuracy = total > 0 ? Math.round((direct / total) * 100) : 0;
    const duration = data.lastSessionDuration || 0;

    // Emoji & Titel je nach Genauigkeit beim 1. Versuch
    let emoji = '🎉', title = 'Super gemacht!';
    if (total === 0) { emoji = '👋'; title = 'Sitzung beendet'; }
    else if (accuracy === 100) { emoji = '🏆'; title = 'Perfekt!'; }
    else if (accuracy >= 80) { emoji = '🎉'; title = 'Super gemacht!'; }
    else if (accuracy >= 50) { emoji = '💪'; title = 'Weiter so!'; }
    else { emoji = '🌱'; title = 'Übung macht den Meister'; }

    const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    setText('summaryEmoji', emoji);
    setText('summaryTitle', title);
    setText('summarySubtitle',
        total > 0
            ? `${direct} von ${total} Karten sofort richtig, ${learned} nach Wiederholung gelernt.`
            : 'Keine Karten gelernt.');
    setText('summaryAccuracy', accuracy + '%');
    setText('summaryAccuracySub',
        `${direct} richtig · ${firstWrong} beim 1. Versuch falsch`);
    setText('summaryCorrect', direct);
    setText('summaryRetries', learned);
    setText('summaryTime', formatTime(duration));
    setText('summaryMastered', session.masteredThisSession || 0);

    const summary = document.getElementById('sessionSummary');
    if (summary) summary.style.display = 'block';

    // Bei Top-Ergebnis Konfetti zur Belohnung
    if (accuracy >= 80 && total > 0) {
        triggerConfetti({ type: 'celebration', intensity: 3 });
    }
}

function closeSummary() {
    const summary = document.getElementById('sessionSummary');
    if (summary) summary.style.display = 'none';
    updateStatsUI();
    const statsNavItem = document.querySelectorAll('.nav-item')[2];
    if (statsNavItem) nav('statsContent', statsNavItem);
}

function restartSession() {
    const summary = document.getElementById('sessionSummary');
    if (summary) summary.style.display = 'none';
    startSession();
}

function flipCard() { 
    const card = document.getElementById('flashcard');
    if (card) card.classList.toggle('flipped'); 
}

function toggleHint(e) { 
    e.stopPropagation(); 
    const hintFront = document.getElementById('hintFront');
    const btnHintFront = document.getElementById('btnHintFront');
    if (hintFront) hintFront.style.display = 'block'; 
    if (btnHintFront) btnHintFront.classList.add('hidden'); 
}

function toggleTypeHint() { 
    const hintType = document.getElementById('hintType');
    const btnHintType = document.getElementById('btnHintType');
    if (hintType) hintType.style.display = 'block'; 
    if (btnHintType) btnHintType.classList.add('hidden'); 
}

function speak(e, type) {
    e.stopPropagation();
    const txt = type === 'q' ? session.q : session.a;
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = /[äöüß]/i.test(txt) ? 'de-DE' : 'en-US';
    window.speechSynthesis.speak(u);
}

// =============================================
// STATS UI
// =============================================
function updateStatsFilter() {
    const sel = document.getElementById('statsScope');
    if (!sel) return;
    
    sel.innerHTML = '';
    const optAll = document.createElement('option');
    optAll.value = 'all';
    optAll.textContent = 'Alle Karten (Global)';
    sel.appendChild(optAll);
    
    if (curFolder) {
        const folder = data.folders.find(f => f.id === curFolder);
        if (folder) {
            const optCur = document.createElement('option');
            optCur.value = 'cur';
            optCur.textContent = `Akt. Ordner: ${folder.name}`;
            sel.appendChild(optCur);
            sel.value = 'cur';
        }
    } else {
        sel.value = 'all';
    }
    sel.onchange = updateStatsUI;
}

function updateStatsUI() {
    const scope = document.getElementById('statsScope')?.value || 'all';
    let pool = [];
    if (scope === 'cur' && curFolder) {
        const validIds = getFolderIdsRecursive(curFolder);
        pool = data.cards.filter(c => validIds.includes(c.folderId));
    } else {
        pool = data.cards;
    }

    let boxes = [0, 0, 0, 0, 0, 0];
    pool.forEach(c => boxes[Math.min(Math.max(c.box || 1, 1), 5)]++);
    const total = pool.length;
    const mastered = boxes[5];
    const percent = total > 0 ? Math.round((mastered / total) * 100) : 0;

    const statsTotal = document.getElementById('statsTotal');
    const statsMastered = document.getElementById('statsMastered');
    if (statsTotal) statsTotal.textContent = total;
    if (statsMastered) statsMastered.textContent = `${mastered} (${percent}%) gemeistert`;

    // Update redesigned box chart with percentage-based progress bars
    // Each box bar shows the percentage of cards in that box relative to total cards
    for (let i = 1; i <= 5; i++) {
        const boxRow = document.querySelector(`.box-row[data-box="${i}"]`);
        if (!boxRow) continue;
        
        const boxValueEl = boxRow.querySelector('.box-value');
        const boxProgressEl = boxRow.querySelector('.box-progress-fill');
        
        const count = boxes[i];
        
        // Empty state class
        boxRow.classList.toggle('empty', count === 0);
        
        // Animate count
        if (boxValueEl) {
            const currentValue = parseInt(boxValueEl.dataset.count) || 0;
            if (currentValue !== count) {
                const startTime = performance.now();
                const diff = count - currentValue;
                
                function updateCount(currentTime) {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / 400, 1);
                    const easeOut = 1 - Math.pow(1 - progress, 3);
                    const current = Math.round(currentValue + diff * easeOut);
                    boxValueEl.textContent = current;
                    if (progress < 1) {
                        requestAnimationFrame(updateCount);
                    }
                }
                requestAnimationFrame(updateCount);
                boxValueEl.dataset.count = count;
            }
        }
        
        // Animate progress bar - percentage relative to total cards
        if (boxProgressEl) {
            const percentage = total > 0 ? (boxes[i] / total) * 100 : 0;
            boxProgressEl.style.width = `${percentage}%`;
        }
    }

    const perfLastSession = document.getElementById('perfLastSession');
    const perfAvgTime = document.getElementById('perfAvgTime');
    if (perfLastSession) perfLastSession.textContent = formatTime(data.lastSessionDuration);
    const avgTime = data.totalReviews > 0 ? (data.totalTimeSeconds / data.totalReviews).toFixed(1) : "--";
    if (perfAvgTime) perfAvgTime.textContent = avgTime + "s";

    const masteredCards = pool.filter(c => c.box === 5 && c.lastMasteredAt && c.createdAt);
    const perfTimeToMaster = document.getElementById('perfTimeToMaster');
    if (masteredCards.length > 0) {
        let totalDays = 0;
        let validCount = 0;
        masteredCards.forEach(c => {
            if (c.createdAt) {
                const diffMs = c.lastMasteredAt - c.createdAt;
                if (diffMs > 0) {
                    const diffDays = diffMs / (1000 * 60 * 60 * 24);
                    totalDays += diffDays;
                    validCount++;
                }
            }
        });
        if (validCount > 0) {
            const avgDays = (totalDays / validCount).toFixed(1);
            if (perfTimeToMaster) perfTimeToMaster.textContent = avgDays + " Tage";
        } else {
            if (perfTimeToMaster) perfTimeToMaster.textContent = "--";
        }
    } else {
        if (perfTimeToMaster) perfTimeToMaster.textContent = "--";
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const masteredToday = pool.filter(c => c.lastMasteredAt && c.lastMasteredAt >= todayStart.getTime()).length;
    const perfMasteredToday = document.getElementById('perfMasteredToday');
    if (perfMasteredToday) perfMasteredToday.textContent = masteredToday;
}

// =============================================
// NAVIGATION & MODALS
// =============================================
function nav(id, el) {
    document.querySelectorAll('.content-area').forEach(d => d.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (el) el.classList.add('active');
    
    const mainFab = document.getElementById('mainFab');
    if (mainFab) mainFab.style.display = id === 'manageContent' ? 'flex' : 'none';
    
    if (id === 'statsContent') {
        updateStatsFilter();
        updateStatsUI();
    }
}

function showModal(id) { 
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('show');
        if (id === 'importModal') {
            const fb = document.getElementById('importFeedback');
            if (fb) fb.style.display = 'none';
        }
    }
}

function hideModal(id) { 
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('show'); 
}

function toggleFab() { 
    const menu = document.getElementById('fabMenu');
    if (menu) menu.classList.toggle('active'); 
}

// =============================================
// CONFETTI
// =============================================
function resizeCanvas() {
    if (confettiCanvas) {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
    }
}

window.addEventListener('resize', resizeCanvas);

// Konfetti-Partikel mit erweiterten Eigenschaften
let streak = 0; // Interne Streak-Variable für intensiveres Konfetti
let lastConfettiTime = 0;

/**
 * Trigger eine spektakuläre Konfetti-Animation
 * @param {Object} options - Konfigurationsoptionen
 * @param {string} options.type - Typ des Konfettis ('celebration', 'streak', 'mastery', 'explosion')
 * @param {number} options.intensity - Intensität 1-5
 * @param {string} options.color - Hauptfarbe (optional)
 */
function triggerConfetti(options = {}) {
    if (!ctx) return;
    
    const now = Date.now();
    const type = options.type || (streak > 3 ? 'streak' : 'celebration');
    const intensity = options.intensity || Math.min(1 + streak * 0.5, 5);
    
    // Streak erhöhen (max 10)
    if (now - lastConfettiTime < 3000) {
        streak = Math.min(streak + 1, 10);
    } else {
        streak = Math.max(streak - 1, 0);
    }
    lastConfettiTime = now;
    
    const w = window.innerWidth;
    const h = window.innerHeight;
    const count = Math.floor(50 * intensity);
    
    // Farbpaletten je nach Typ
    const colorPalettes = {
        celebration: ['#ff0080', '#ff8c00', '#40e0d0', '#ee82ee', '#00ff7f'],
        streak: ['#ffd700', '#ff6347', '#7fff00', '#00bfff', '#ff1493'],
        mastery: ['#ffd700', '#ffa500', '#ff6347', '#ff4500', '#dc143c'],
        explosion: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#8b00ff']
    };
    
    const colors = colorPalettes[type] || colorPalettes.celebration;
    
    // Partikel generieren
    for (let i = 0; i < count; i++) {
        const confetti = {
            // Position
            x: type === 'explosion' ? w / 2 + (Math.random() - 0.5) * w * 0.3 : Math.random() * w,
            y: type === 'explosion' ? h / 2 : h + 20 + Math.random() * 100,
            
            // Geschwindigkeit
            vx: (Math.random() - 0.5) * 8 * intensity,
            vy: -((Math.random() * 12 + 8) * intensity),
            
            // Physik
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 15,
            gravity: 0.15 + Math.random() * 0.1,
            drag: 0.98 + Math.random() * 0.02,
            
            // Größe & Form
            size: Math.random() * 10 + 5,
            shape: ['rect', 'circle', 'triangle', 'star'][Math.floor(Math.random() * 4)],
            
            // Farbe
            color: colors[Math.floor(Math.random() * colors.length)],
            opacity: 1,
            fadeRate: 0.005 + Math.random() * 0.005,
            
            // Spezial
            life: 150 + Math.random() * 100,
            wobble: Math.random() * 10,
            wobbleSpeed: 0.05 + Math.random() * 0.05
        };
        
        confettiParticles.push(confetti);
    }
    
    // Explosion-Effekt bei hohen Intensitäten
    if (intensity >= 4) {
        for (let i = 0; i < 30; i++) {
            confettiParticles.push({
                x: w / 2,
                y: h / 2,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 20,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 20,
                gravity: 0.2,
                drag: 0.97,
                size: Math.random() * 8 + 4,
                shape: 'circle',
                color: colors[Math.floor(Math.random() * colors.length)],
                opacity: 1,
                fadeRate: 0.01,
                life: 80,
                wobble: 0,
                wobbleSpeed: 0
            });
        }
    }
    
    // Konfetti-Animation starten
    if (!confettiRunning) {
        confettiRunning = true;
        requestAnimationFrame(animateConfetti);
    }
}

/**
 * Zeichne verschiedene Konfetti-Formen
 */
function drawConfettiShape(ctx, shape, size, color, opacity) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    switch (shape) {
        case 'rect':
            ctx.fillRect(-size/2, -size/4, size, size/2);
            // Glanz-Effekt
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(-size/2, -size/4, size, size/6);
            break;
            
        case 'circle':
            ctx.beginPath();
            ctx.arc(0, 0, size/2, 0, Math.PI * 2);
            ctx.fill();
            // Glanz-Effekt
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath();
            ctx.arc(-size/6, -size/6, size/6, 0, Math.PI * 2);
            ctx.fill();
            break;
            
        case 'triangle':
            ctx.beginPath();
            ctx.moveTo(0, -size/2);
            ctx.lineTo(size/2, size/2);
            ctx.lineTo(-size/2, size/2);
            ctx.closePath();
            ctx.fill();
            break;
            
        case 'star':
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
                const x = Math.cos(angle) * size/2;
                const y = Math.sin(angle) * size/2;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            break;
    }
    
    ctx.restore();
}

/**
 * Haupt-Animationsschleife für Konfetti
 */
function animateConfetti() {
    if (!ctx || !confettiCanvas) return;
    
    // Canvas mit leichtem Fade leeren (Trail-Effekt)
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    
    // Partikel aktualisieren und zeichnen
    for (let i = confettiParticles.length - 1; i >= 0; i--) {
        const p = confettiParticles[i];
        
        // Physik aktualisieren
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.rotation += p.rotationSpeed;
        
        // Wobble-Effekt (seitliches Schaukeln)
        p.wobble += p.wobbleSpeed;
        p.x += Math.sin(p.wobble) * 0.5;
        
        // Lebensdauer und Opazität
        p.life--;
        if (p.life < 30) {
            p.opacity = p.life / 30;
        }
        
        // Zeichnen (nur wenn im sichtbaren Bereich)
        if (p.y > -50 && p.y < confettiCanvas.height + 50 && p.x > -50 && p.x < confettiCanvas.width + 50) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            
            drawConfettiShape(ctx, p.shape, p.size, p.color, p.opacity);
            
            ctx.restore();
        }
        
        // Partikel entfernen wenn abgelaufen
        if (p.life <= 0) {
            confettiParticles.splice(i, 1);
        }
    }
    
    // Sekundär-Effekt: Leichte Partikel (Glow)
    if (confettiParticles.length > 20) {
        ctx.save();
        ctx.globalAlpha = 0.1;
        for (let i = 0; i < 10; i++) {
            const p = confettiParticles[Math.floor(Math.random() * confettiParticles.length)];
            if (p) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();
            }
        }
        ctx.restore();
    }
    
    // Animation fortsetzen, solange noch Partikel vorhanden
    if (confettiParticles.length > 0) {
        requestAnimationFrame(animateConfetti);
    } else {
        confettiRunning = false;
    }
}

// =============================================
// EXPORT / IMPORT / RESET
// =============================================
async function resetAll() {
    const confirmed = await showConfirm('ACHTUNG: Alle Daten werden unwiderruflich gelöscht!\n\nMöchtest du wirklich fortfahren?');
    if (confirmed) {
        safeLocalStorage('remove', DATA_KEY);
        safeLocalStorage('remove', BACKUP_KEY);
        location.reload();
    }
}

function escapeCSV(str) {
    if (!str) return '';
    str = str.replace(/"/g, '""');
    if (str.includes(';') || str.includes(',') || str.includes('"')) {
        str = '"' + str + '"';
    }
    return str;
}

function exportData(type) {
    const exportPayload = {
        ...data,
        exportedAt: Date.now(),
        exportType: 'manual'
    };
    const str = type === 'json' 
        ? JSON.stringify(exportPayload, null, 2) 
        : "Front;Back;Box;Hint\n" + data.cards.map(c => 
            `${escapeCSV(c.front)};${escapeCSV(c.back)};${c.box};${escapeCSV(c.hint || '')}`
        ).join('\n');
    const blob = new Blob([str], { type: type === 'json' ? 'application/json' : 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ultracards-backup-${new Date().toISOString().split('T')[0]}.${type}`;
    a.click();
    showNotification('Backup heruntergeladen!', 'success');
}

function importData(inp) {
    const f = inp.files[0];
    if (!f) return;
    
    const r = new FileReader();
    r.onload = e => {
        try {
            const d = JSON.parse(e.target.result);
            
            if (!d.cards || !Array.isArray(d.cards)) {
                throw new Error('Ungültiges Format: Keine Karten gefunden');
            }
            
            if (data.cards.length > 0) {
                showConfirm(`Achtung: Du hast bereits ${data.cards.length} Karten.\n\nDer Import wird deine bestehenden Daten ERGÄNZEN (Duplikate werden übersprungen).\n\nFortfahren?`)
                    .then(confirmed => {
                        if (!confirmed) return;
                        processImport(d);
                    });
            } else {
                processImport(d);
            }
        } catch (err) {
            showNotification('Fehler beim Import: ' + err.message, 'error');
        }
    };
    r.readAsText(f);
    inp.value = '';
}

function processImport(d) {
    let addedCards = 0;
    let addedFolders = 0;
    
    const migrated = migrateData(d);
    const folderIdMap = {}; // Mapping: old ID -> new ID
    
    // Rekursive Funktion zum Verarbeiten von Ordnern (Eltern zuerst)
    function processFolder(oldFolder) {
        // Prüfen ob bereits verarbeitet
        if (folderIdMap[oldFolder.id]) return;
        
        // Zuerst Parent-Ordner verarbeiten falls nötig
        if (oldFolder.parentId && !folderIdMap[oldFolder.parentId]) {
            const parentFolder = migrated.folders.find(f => f.id === oldFolder.parentId);
            if (parentFolder) {
                processFolder(parentFolder);
            }
        }
        
        // Neue Parent-ID ermitteln
        const newParentId = oldFolder.parentId ? folderIdMap[oldFolder.parentId] : null;
        
        // Prüfen ob Ordner bereits existiert (nach Name und Parent)
        const existingFolder = data.folders.find(f => 
            f.name === oldFolder.name && 
            (f.parentId || '') === (newParentId || '')
        );
        
        if (!existingFolder) {
            // Neuen Ordner erstellen
            const newId = genId();
            folderIdMap[oldFolder.id] = newId;
            
            data.folders.push({
                id: newId,
                name: oldFolder.name,
                parentId: newParentId
            });
            addedFolders++;
        } else {
            // Ordner existiert bereits, Mapping auf existierende ID
            folderIdMap[oldFolder.id] = existingFolder.id;
        }
    }
    
    // Alle Ordner verarbeiten
    migrated.folders.forEach(f => processFolder(f));
    
    // Karten importieren mit korrektem folderId-Mapping
    migrated.cards.forEach(oldCard => {
        const newFolderId = folderIdMap[oldCard.folderId] || null;
        
        // Duplikatsprüfung: front, back UND folderId
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
    showNotification(`Import erfolgreich: ${addedCards} Karten, ${addedFolders} Ordner hinzugefügt`, 'success');
    renderManage();
}

// =============================================
// PWA INITIALISIERUNG
// =============================================
function initPWA() {
    if ('serviceWorker' in navigator) {
        console.log('Service Worker Unterstützung vorhanden');
    }
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        if (!localStorage.getItem('installBannerDismissed')) {
            setTimeout(() => {
                const banner = document.getElementById('installBanner');
                if (banner) banner.style.display = 'block';
            }, 3000);
        }
    });
    
    window.addEventListener('appinstalled', () => {
        const banner = document.getElementById('installBanner');
        if (banner) banner.style.display = 'none';
        deferredPrompt = null;
        showNotification('App erfolgreich installiert!', 'success');
    });
}

async function installPWA() {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        console.log('User accepted install');
    }
    
    deferredPrompt = null;
    const banner = document.getElementById('installBanner');
    if (banner) banner.style.display = 'none';
}

function dismissInstall() {
    const banner = document.getElementById('installBanner');
    if (banner) banner.style.display = 'none';
    localStorage.setItem('installBannerDismissed', 'true');
}

// =============================================
// INITIALISIERUNG
// =============================================
// =============================================
// KEYBOARD SHORTCUTS
// =============================================
document.addEventListener('keydown', function(e) {
    // STRG+S - Speichern (falls ein Formular offen ist)
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        // Prüfen ob ein Card-Modal offen ist
        const cardModal = document.getElementById('cardModal');
        if (cardModal && cardModal.classList.contains('show')) {
            saveCard();
        }
    }
    
    // ESC - Modal schließen oder Session beenden
    if (e.key === 'Escape') {
        // Modals schließen
        document.querySelectorAll('.modal.show').forEach(modal => {
            hideModal(modal.id);
        });
        
        // Bottom Sheet schließen
        closeMoveSheet();
    }
    
    // Während aktiver Learning-Session
    const activeSession = document.getElementById('activeSession');
    if (activeSession && activeSession.style.display === 'block') {
        if (session.method === 'flip') {
            // Leertaste - Karte umdrehen
            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                flipCard();
            }
            // Pfeil links - Wiederholen
            if (e.key === 'ArrowLeft') {
                rate(false);
            }
            // Pfeil rechts - Gewusst
            if (e.key === 'ArrowRight') {
                rate(true);
            }
        } else {
            // Typ-Mode: Enter zum Prüfen/Weiter
            if (e.key === 'Enter') {
                const correctionInput = document.getElementById('correctionInput');
                if (correctionInput && correctionMode) {
                    confirmCorrection();
                }
            }
        }
    }
    
    // ALT+1 - Karten-Tab
    if (e.altKey && e.key === '1') {
        e.preventDefault();
        nav('manageContent', document.querySelector('.nav-item:first-child'));
    }
    // ALT+2 - Lernen-Tab
    if (e.altKey && e.key === '2') {
        e.preventDefault();
        nav('learnContent', document.querySelectorAll('.nav-item')[1]);
    }
    // ALT+3 - Statistik-Tab  
    if (e.altKey && e.key === '3') {
        e.preventDefault();
        nav('statsContent', document.querySelectorAll('.nav-item')[2]);
    }
    
    // / - Suchfeld fokussieren
    if (e.key === '/' && !e.ctrlKey && !e.altKey) {
        const activeEl = document.activeElement;
        const searchBox = document.getElementById('searchBox');
        if (searchBox && activeEl !== searchBox && 
            activeEl.tagName !== 'INPUT' && activeEl.tagName !== 'TEXTAREA') {
            e.preventDefault();
            searchBox.focus();
        }
    }
    
    // N - Neue Karte (wenn auf Karten-Tab)
    if (e.key === 'n' && !e.ctrlKey && !e.altKey) {
        const activeEl = document.activeElement;
        if (activeEl.tagName !== 'INPUT' && activeEl.tagName !== 'TEXTAREA') {
            const manageContent = document.getElementById('manageContent');
            if (manageContent && manageContent.classList.contains('active')) {
                e.preventDefault();
                openNewCardModal();
            }
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    applyTheme();
    applyAccent();
    renderManage();
    updateStatsUI();
    updateBackupStatus();
    
    checkUrlImport();

    // Undo Toast Swipe
    const toast = document.getElementById('undoToast');
    if (toast) {
        let startY = 0;
        let isSwiping = false;

        toast.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            isSwiping = true;
        }, { passive: true });

        toast.addEventListener('touchmove', (e) => {
            if (!isSwiping) return;
            const diff = e.touches[0].clientY - startY;
            if (diff > 0) {
                e.preventDefault();
                toast.style.transform = `translateY(${diff}px)`;
            }
        }, { passive: false });

        toast.addEventListener('touchend', (e) => {
            if (!isSwiping) return;
            isSwiping = false;
            const diff = e.changedTouches[0].clientY - startY;
            if (diff > 60) {
                undoLastAction();
            } else {
                toast.style.transform = '';
            }
        });
    }

    // Search mit Debounce
    const searchBox = document.getElementById('searchBox');
    if (searchBox) {
        let searchTimeout = null;
        searchBox.addEventListener('input', (e) => {
            if (searchTimeout) clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                renderManage(e.target.value);
            }, 300);
        });
    }
    
    // Type Input Enter
    const typeInput = document.getElementById('typeInput');
    if (typeInput) {
        typeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const btnCheckType = document.getElementById('btnCheckType');
                if (btnCheckType && btnCheckType.classList.contains('hidden')) nextCard();
                else checkType();
            }
        });
    }
    
    // Correction Input Enter
    const correctionInput = document.getElementById('correctionInput');
    if (correctionInput) {
        correctionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                confirmCorrection();
            }
        });
    }
    
    // Modal Close on Overlay Click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            hideModal(e.target.id);
        }
    });
    
    // Auto Backup Interval
    setInterval(() => {
        createAutoBackup();
    }, AUTO_BACKUP_INTERVAL);
    
    // Canvas Resize
    resizeCanvas();
    
    // FAB Menu Auto-Close bei Klick außerhalb
    const fabMenu = document.getElementById('fabMenu');
    const mainFab = document.getElementById('mainFab');
    if (fabMenu && mainFab) {
        document.addEventListener('click', (e) => {
            if (fabMenu.classList.contains('active') && 
                !fabMenu.contains(e.target) && 
                !mainFab.contains(e.target)) {
                fabMenu.classList.remove('active');
            }
        });
    }

    // Lern-Cockpit Einstellungen laden
    loadLearnSettings();
    
    // Lern-Cockpit Einstellungen speichern bei Änderung
    const learnSource = document.getElementById('learnSource');
    const learnStrategy = document.getElementById('learnStrategy');
    const learnMethod = document.getElementById('learnMethod');
    if (learnSource) learnSource.addEventListener('change', saveLearnSettings);
    if (learnStrategy) learnStrategy.addEventListener('change', saveLearnSettings);
    if (learnMethod) learnMethod.addEventListener('change', saveLearnSettings);

    // PWA Init
    initPWA();
    
    console.log('Vokabeltrainer Ultra Edition geladen!');
});
