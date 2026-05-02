/**
 * Lernkarten Ultra Edition - Main Application
 * Version: 3.0.1
 * 
 * Verbesserungen in v3.0.1:
 * - Backup-Schutz beim Speichern
 * - Import-ID-Mapping Fix
 * - Service Worker Cache-Update
 */

// =============================================
// KONFIGURATION & KONSTANTEN
// =============================================
const DB_VERSION = 3;
const BACKUP_KEY = 'ultraBackup';
const DATA_KEY = 'ultraData';
const THEME_KEY = 'ultraTheme';
const AUTO_BACKUP_INTERVAL = 5 * 60 * 1000; // 5 Minuten
const STORAGE_WARNING_THRESHOLD = 0.8; // 80% des Speichers

// =============================================
// STATE & DATA
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
let session = { queue: [], idx: 0, method: 'flip', dir: 'mixed', current: null, q: '', a: '', startTime: 0, cardStartTime: 0, timeSpent: 0 };

// Multi Select State
let isSelectMode = false;
let selectedIds = new Set();

// Edit Card State
let editingCardId = null;

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

// Confetti State (Memory Leak Fix)
let confettiAnimationId = null;
let particles = [];

// Online/Offline State
let isOnline = navigator.onLine;

// Farbpaletten
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
    { id: 'gray', name: 'Grau', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' }
];

// =============================================
// UTILITY FUNKTIONEN
// =============================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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

function calculateStorageUsed() {
    try {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length * 2;
            }
        }
        return total;
    } catch (e) {
        return 0;
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function checkStorageWarning() {
    const used = calculateStorageUsed();
    const maxStorage = 5 * 1024 * 1024;
    const percentage = used / maxStorage;
    
    const warningEl = document.getElementById('storageWarning');
    const storageUsedEl = document.getElementById('storageUsed');
    
    if (storageUsedEl) {
        storageUsedEl.textContent = formatBytes(used);
    }
    
    if (percentage > STORAGE_WARNING_THRESHOLD && warningEl) {
        warningEl.classList.add('show');
    } else if (warningEl) {
        warningEl.classList.remove('show');
    }
}

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

function formatDate(timestamp) {
    if (!timestamp) return '--';
    const date = new Date(timestamp);
    return date.toLocaleDateString('de-DE') + ' ' + date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function genId() { 
    return Date.now().toString(36) + Math.random().toString(36).substr(2); 
}

// =============================================
// ONLINE/OFFLINE HANDLING
// =============================================

function updateOnlineStatus() {
    isOnline = navigator.onLine;
    const indicator = document.getElementById('offlineIndicator');
    
    if (indicator) {
        if (isOnline) {
            indicator.classList.remove('show');
        } else {
            indicator.classList.add('show');
            showNotification('Du bist offline. Änderungen werden lokal gespeichert.', 'warning');
        }
    }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

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
    
    if (data.lastBackup) {
        lastBackupEl.textContent = formatDate(data.lastBackup);
        badge.classList.remove('warning', 'error');
        statusSpan.textContent = 'OK';
    } else {
        lastBackupEl.textContent = 'Nie';
        badge.classList.add('warning');
        statusSpan.textContent = 'Neu';
    }

    document.getElementById('totalCardsCount').textContent = data.cards.length;
    document.getElementById('totalFoldersCount').textContent = data.folders.length;
    document.getElementById('dbVersion').textContent = data.version || 1;
    
    checkStorageWarning();
}

// =============================================
// DATEN-MIGRATION
// =============================================

function migrateData(oldData) {
    let migrated = { ...oldData };
    
    if (!migrated.version || migrated.version < 2) {
        migrated.version = 2;
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
    
    if (migrated.version < 3) {
        migrated.version = DB_VERSION;
        migrated.cards = migrated.cards.map(card => ({
            ...card,
            color: card.color || null
        }));
        migrated.folders = migrated.folders.map(folder => ({
            ...folder,
            color: folder.color || null
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
            // Backup erfolgreich
        } else {
            createSampleData();
        }
    }
}

function createSampleData() {
    const fid = Date.now().toString();
    data = {
        folders: [{ id: fid, name: 'Beispiel: Spanisch', parentId: null, color: null }],
        cards: [{ id: 'c1', front: 'Haus', back: 'Casa', hint: 'Gebäude', box: 1, folderId: fid, createdAt: Date.now(), color: null }],
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
        checkStorageWarning();
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
    document.getElementById('streakCount').innerText = data.streak || 0;
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

    if (isSelectMode && selectedIds.size > 0) {
        actions.classList.add('active');
        fab.classList.add('hidden'); 
        menu.classList.remove('active');
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
    toast.classList.remove('show');
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
// DELETE ACTIONS
// =============================================
function delCard(id) {
    if (confirm('Löschen?')) {
        const card = data.cards.find(c => c.id === id);
        if(card) {
            triggerUndoToast("Karte gelöscht", { type: 'singleCard', item: card });
            data.cards = data.cards.filter(c => c.id !== id);
            save(); renderManage(); 
        }
    }
}

function delFolder(e, id) {
    e.stopPropagation(); 
    if (confirm('Ordner und Inhalt löschen?')) {
        const deletedItems = [];
        const collectItems = (fid) => {
            const folder = data.folders.find(f => f.id === fid);
            if(folder) deletedItems.push(folder);
            data.cards.filter(c => c.folderId === fid).forEach(c => deletedItems.push(c));
            data.folders.filter(f => f.parentId === fid).forEach(s => collectItems(s.id));
        };
        collectItems(id);

        triggerUndoToast("Ordner gelöscht", { type: 'bulk', items: deletedItems });

        const rec = (fid) => {
            data.cards = data.cards.filter(c => c.folderId !== fid);
            data.folders.filter(f => f.parentId === fid).forEach(s => rec(s.id));
            data.folders = data.folders.filter(f => f.id !== fid);
        };
        rec(id); save(); renderManage();
    }
}

// =============================================
// BULK ACTIONS
// =============================================
function bulkDeleteSelected() {
    if (selectedIds.size === 0) return;
    if (confirm(`${selectedIds.size} Element(e) wirklich löschen?`)) {
        const deletedItems = [];
        selectedIds.forEach(id => {
            const folder = data.folders.find(f => f.id === id);
            if (folder) {
                const collectRecursive = (fid) => {
                    deletedItems.push(folder);
                    data.cards.filter(c => c.folderId === fid).forEach(c => deletedItems.push(c));
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
                if (card) deletedItems.push(card);
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
    
    const collected = collectFolderData(folderId);
    const folderCount = countFoldersRecursive(folderId);
    const cardCount = countCardsRecursive(folderId);
    
    document.getElementById('shareFolderName').textContent = folder.name;
    document.getElementById('shareStats').textContent = `${folderCount} Ordner, ${cardCount} Karten`;
    document.getElementById('shareLinkContainer').style.display = 'none';
    
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
        const base64 = btoa(unescape(encodeURIComponent(json)));
        
        if (base64.length > 6000) {
            showNotification('Ordner zu groß für Link - nutze Datei-Download', 'warning');
            return;
        }
        
        const url = window.location.origin + window.location.pathname + '?import=' + base64;
        
        document.getElementById('shareLinkInput').value = url;
        document.getElementById('shareLinkContainer').style.display = 'block';
    } catch (e) {
        showNotification('Fehler beim Erstellen des Links', 'error');
        console.error(e);
    }
}

async function copyShareLink() {
    const input = document.getElementById('shareLinkInput');
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
            const json = decodeURIComponent(escape(atob(importData)));
            const parsed = JSON.parse(json);
            
            if (parsed.type === 'ultracards-folder' && parsed.folders && parsed.cards) {
                pendingImportData = parsed;
                document.getElementById('urlImportName').textContent = parsed.name;
                document.getElementById('urlImportStats').textContent = `${parsed.cards.length} Karten`;
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
    
    pendingImportData.folders.forEach(folder => {
        const exists = data.folders.some(f => f.name === folder.name && f.parentId === folder.parentId);
        if (!exists) {
            data.folders.push({
                id: folder.id,
                name: folder.name,
                parentId: null
            });
        }
    });
    
    pendingImportData.cards.forEach(card => {
        data.cards.push(card);
    });
    
    save();
    renderManage();
    hideModal('urlImportModal');
    clearUrlParam();
    pendingImportData = null;
    
    showNotification(`"${importName}" erfolgreich importiert!`, 'success');
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
    
    document.getElementById('designTargetName').textContent = type === 'folder' 
        ? `Ordner: ${item.name}`
        : `Karte: ${item.front}`;
    
    const palette = document.getElementById('colorPalette');
    palette.innerHTML = '';
    
    COLOR_PALETTE.forEach(color => {
        const div = document.createElement('div');
        div.className = 'color-option' + (item.color === color.id ? ' selected' : '');
        div.style.background = color.color;
        div.title = color.name;
        div.onclick = () => selectColor(color.id);
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
    event.target.classList.add('selected');
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
    list.innerHTML = '';

    nav.classList.add('hidden-nav');
    
    const optRoot = document.createElement('div');
    optRoot.className = 'folder-select-item';
    optRoot.innerHTML = '<i class="fas fa-home"></i> <strong>Startseite</strong>';
    optRoot.onclick = () => executeMove(null);
    list.appendChild(optRoot);

    const renderFolderOptions = (parentId, level) => {
        const children = data.folders.filter(f => f.parentId === parentId);
        children.forEach(f => {
            if (selectedIds.has(f.id)) return;

            const div = document.createElement('div');
            div.className = 'folder-select-item';
            div.style.paddingLeft = (12 + level * 20) + 'px';
            div.innerHTML = `<i class="fas fa-folder"></i> ${escapeHtml(f.name)}`;
            div.onclick = () => executeMove(f.id);
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
    sheet.classList.remove('show');
    nav.classList.remove('hidden-nav');
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
    if(!card) return;

    editingCardId = id;
    document.getElementById('inpFront').value = card.front;
    document.getElementById('inpBack').value = card.back;
    document.getElementById('inpHint').value = card.hint || '';
    
    document.getElementById('cardModalTitle').innerText = "Karte bearbeiten";
    document.getElementById('btnSaveCard').innerText = "Änderungen speichern";
    
    showModal('cardModal');
}

function openNewCardModal() {
    editingCardId = null;
    document.getElementById('inpFront').value = '';
    document.getElementById('inpBack').value = '';
    document.getElementById('inpHint').value = '';
    
    document.getElementById('cardModalTitle').innerText = "Neue Karte";
    document.getElementById('btnSaveCard').innerText = "Speichern";
    
    showModal('cardModal');
}

function saveCard() {
    const f = document.getElementById('inpFront').value.trim();
    const b = document.getElementById('inpBack').value.trim();
    const h = document.getElementById('inpHint').value.trim();

    if (!f || !b) { alert('Bitte Vorder- und Rückseite ausfüllen!'); return; }

    if (editingCardId) {
        const card = data.cards.find(c => c.id === editingCardId);
        if (card) {
            const exists = data.cards.some(c => 
                c.id !== editingCardId &&
                c.folderId === curFolder && 
                c.front.toLowerCase() === f.toLowerCase() && 
                c.back.toLowerCase() === b.toLowerCase()
            );
            if (exists) { alert('Eine Karte mit diesem Inhalt existiert bereits in diesem Ordner!'); return; }
            
            card.front = f; card.back = b; card.hint = h;
        }
        editingCardId = null;
    } else {
        const exists = data.cards.some(c => c.folderId === curFolder && c.front.toLowerCase() === f.toLowerCase() && c.back.toLowerCase() === b.toLowerCase());
        if (exists) { alert('Duplikat!'); return; }
        data.cards.push({ id: genId(), front: f, back: b, hint: h, box: 1, folderId: curFolder, createdAt: Date.now(), color: null });
    }

    save(); hideModal('cardModal'); renderManage();
    showNotification('Karte gespeichert!', 'success');
}

// =============================================
// UI RENDERING
// =============================================
function renderManage(filter = '') {
    const list = document.getElementById('itemList'); 
    list.innerHTML = '';
    
    const fragment = document.createDocumentFragment();
    const bc = document.getElementById('breadcrumbContainer'); bc.innerHTML = '';

    if (curFolder) {
        let path = [], curr = data.folders.find(f => f.id === curFolder);
        while (curr) { path.unshift(curr); curr = data.folders.find(f => f.id === curr.parentId); }
        const home = document.createElement('span'); home.innerHTML = '<i class="fas fa-home"></i>';
        home.onclick = () => setFolder(null); home.style.cursor = 'pointer'; bc.appendChild(home);
        path.forEach(f => {
            bc.innerHTML += ' <span style="color:var(--text-muted)">/</span> ';
            const sp = document.createElement('span'); sp.textContent = f.name;
            if (f.id !== curFolder) { sp.style.cursor = 'pointer'; sp.onclick = () => setFolder(f.id); }
            bc.appendChild(sp);
        });
        document.getElementById('currentFolderTitle').textContent = path[path.length - 1].name;

        const parentObj = data.folders.find(f => f.id === curFolder);
        const parentId = parentObj ? parentObj.parentId : null;
        const liBack = document.createElement('li'); 
        liBack.className = 'list-item';
        liBack.style.background = 'rgba(0,0,0,0.03)';
        liBack.innerHTML = `
            <div class="item-icon" style="background:var(--text-muted); color:white"><i class="fas fa-level-up-alt"></i></div>
            <div class="item-content"><div class="item-title">.. (Ebene höher)</div></div>
        `;
        liBack.onclick = () => setFolder(parentId);
        fragment.appendChild(liBack);

    } else {
        document.getElementById('currentFolderTitle').textContent = 'Startseite';
    }

    const subs = data.folders.filter(f => f.parentId === curFolder && f.name.toLowerCase().includes(filter.toLowerCase()));
    const cards = data.cards.filter(c => c.folderId === curFolder && (c.front.toLowerCase().includes(filter.toLowerCase()) || c.back.toLowerCase().includes(filter.toLowerCase())));

    document.getElementById('folderStats').textContent = `${subs.length} Ordner, ${cards.length} Karten`;
    document.getElementById('emptyState').classList.toggle('hidden', (subs.length > 0 || cards.length > 0) || curFolder !== null);

    subs.forEach(f => {
        const isSelected = selectedIds.has(f.id);
        const li = document.createElement('li'); li.className = `list-item ${isSelected ? 'selected' : ''}`;
        const colorInfo = getItemColor(f, 'folder');
        
        let actionsHtml = '';
        if (!isSelectMode) {
            actionsHtml = `
                <div class="item-actions">
                    <i class="fas fa-palette action-icon action-design" onclick="openDesignModal('folder', '${escapeHtml(f.id)}', event)" title="Farbe"></i>
                    <i class="fas fa-share-alt action-icon" style="color: var(--primary);" onclick="openShareModal('${escapeHtml(f.id)}', event)" title="Teilen"></i>
                    <i class="fas fa-trash action-icon action-del" onclick="event.stopPropagation(); delFolder(event, '${escapeHtml(f.id)}')" title="Löschen"></i>
                </div>
            `;
        }

        li.innerHTML = `
            <div class="selection-checkbox" onclick="toggleSelection('${escapeHtml(f.id)}', event)">
                ${isSelected ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <div class="item-icon" style="background: ${colorInfo.bg}; color: ${colorInfo.color};"><i class="fas fa-folder"></i></div>
            <div class="item-content"><div class="item-title">${escapeHtml(f.name)}</div></div>
            ${actionsHtml}
        `;
        li.onclick = (e) => {
            if (isSelectMode) toggleSelection(f.id, e);
            else setFolder(f.id);
        };
        fragment.appendChild(li);
    });

    cards.forEach(c => {
        const isSelected = selectedIds.has(c.id);
        const li = document.createElement('li'); li.className = `list-item ${isSelected ? 'selected' : ''}`;
        const colorInfo = getItemColor(c, 'card');
        
        let actionsHtml = '';
        if (!isSelectMode) {
            actionsHtml = `
                <div class="item-actions">
                    <i class="fas fa-palette action-icon action-design" onclick="openDesignModal('card', '${escapeHtml(c.id)}', event)" title="Farbe"></i>
                    <i class="fas fa-pen action-icon action-edit" onclick="openEditCard('${escapeHtml(c.id)}', event)"></i>
                    <i class="fas fa-trash action-icon action-del" onclick="event.stopPropagation(); delCard('${escapeHtml(c.id)}')"></i>
                </div>
            `;
        }

        li.innerHTML = `
            <div class="selection-checkbox" onclick="toggleSelection('${escapeHtml(c.id)}', event)">
                ${isSelected ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <div class="item-icon" style="background: ${colorInfo.bg}; color: ${colorInfo.color};"><i class="fas fa-sticky-note"></i></div>
            <div class="item-content"><div class="item-title">${escapeHtml(c.front)}</div><div style="font-size:0.8rem; color:var(--text-muted)">Box ${c.box || 1}</div></div>
            ${actionsHtml}
        `;
        li.onclick = (e) => { if (isSelectMode) toggleSelection(c.id, e); };
        fragment.appendChild(li);
    });

    list.appendChild(fragment);
    updateLearnSource();
}

function setFolder(id) { curFolder = id; renderManage(); }

// =============================================
// ACTIONS
// =============================================
function addFolder() {
    const n = document.getElementById('inpFolder').value.trim();
    if (n) { 
        data.folders.push({ id: genId(), name: n, parentId: curFolder, color: null }); 
        save(); 
        hideModal('folderModal'); 
        document.getElementById('inpFolder').value = ''; 
        renderManage(); 
        showNotification('Ordner erstellt!', 'success');
    }
}

function runImport() {
    const lines = document.getElementById('inpImport').value.split('\n');
    let addedCount = 0; let skipCount = 0; let errorCount = 0;

    lines.forEach(l => {
        let parts = l.split(';');
        if (parts.length < 2) parts = l.split('\t');
        const fRaw = parts[0]; const bRaw = parts[1]; const hRaw = parts[2];

        if (fRaw && bRaw) { 
            const f = fRaw.trim(); const b = bRaw.trim(); const h = hRaw ? hRaw.trim() : '';
            const exists = data.cards.some(c => c.folderId === curFolder && c.front.toLowerCase() === f.toLowerCase() && c.back.toLowerCase() === b.toLowerCase());
            if (!exists) {
                data.cards.push({ id: genId(), front: f, back: b, hint: h, box: 1, folderId: curFolder, createdAt: Date.now(), color: null }); addedCount++;
            } else { skipCount++; }
        } else { if (l.trim() !== '') errorCount++; }
    });
    
    save(); document.getElementById('inpImport').value = '';
    const fb = document.getElementById('importFeedback');
    fb.style.display = 'block';
    let msg = `<span style="color:var(--success)">✅ ${addedCount} importiert</span>`;
    if (skipCount > 0) msg += `<br><span style="color:var(--warning)">⚠️ ${skipCount} Duplikate übersprungen</span>`;
    if (errorCount > 0) msg += `<br><span style="color:var(--danger)">❌ ${errorCount} fehlerhafte Zeilen</span>`;
    fb.innerHTML = msg;
    if (errorCount === 0 && addedCount > 0) { setTimeout(() => { hideModal('importModal'); renderManage(); }, 2000); }
}

// =============================================
// THEME
// =============================================
function toggleTheme() {
    try {
        const b = document.body;
        const t = b.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        b.setAttribute('data-theme', t);
        document.getElementById('themeIcon').className = t === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        localStorage.setItem(THEME_KEY, t);
    } catch (e) {
        console.log('Theme konnte nicht gespeichert werden:', e);
    }
}

function applyTheme() {
    try {
        const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
        document.body.setAttribute('data-theme', savedTheme);
        document.getElementById('themeIcon').className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    } catch (e) {
        console.log('Theme konnte nicht geladen werden:', e);
    }
}

// =============================================
// LEARNING ENGINE
// =============================================
function updateLearnSource() {
    const s = document.getElementById('learnSource'); s.innerHTML = '';
    if (curFolder) s.innerHTML += `<option value="current">Aktueller Ordner (+Unterordner)</option>`;
    s.innerHTML += `<option value="all">Alle Karten</option>`;
}

function setDirection(d) {
    session.dir = d;
    ['btnMix', 'btnFront', 'btnBack'].forEach(b => document.getElementById(b).classList.remove('active'));
    if (d === 'mixed') document.getElementById('btnMix').classList.add('active');
    if (d === 'front') document.getElementById('btnFront').classList.add('active');
    if (d === 'back') document.getElementById('btnBack').classList.add('active');
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

    if (src === 'all') pool = [...data.cards];
    else {
        if (curFolder) {
            const validFolderIds = getFolderIdsRecursive(curFolder);
            pool = data.cards.filter(c => validFolderIds.includes(c.folderId));
        } else {
            pool = data.cards.filter(c => c.folderId === null); 
        }
    }

    if(pool.length === 0) { alert("Keine Karten."); return; }

    if (strat === 'leitner') {
        pool.sort((a, b) => { const boxA = a.box || 1; const boxB = b.box || 1; if (boxA === boxB) return Math.random() - 0.5; return boxA - boxB; });
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
    
    document.getElementById('manageContent').classList.remove('active');
    document.getElementById('learnContent').classList.remove('active');
    document.querySelector('.bottom-nav').classList.add('hidden');
    document.querySelector('header').classList.add('hidden');
    document.getElementById('activeSession').style.display = 'block';

    document.getElementById('flipWrapper').style.display = session.method === 'flip' ? 'block' : 'none';
    document.getElementById('typingWrapper').style.display = session.method === 'type' ? 'block' : 'none';
    loadCard();
}

function loadCard() {
    if (session.idx >= session.queue.length) return finishSession();
    session.cardStartTime = Date.now();

    const c = session.queue[session.idx];
    session.current = c;
    let isFront = true;
    if (session.dir === 'back') isFront = false;
    else if (session.dir === 'mixed') isFront = Math.random() > 0.5;

    session.q = isFront ? c.front : c.back;
    session.a = isFront ? c.back : c.front;
    const lblQ = isFront ? 'Vorderseite' : 'Rückseite';
    const lblA = isFront ? 'Rückseite' : 'Vorderseite';

    document.getElementById('sessionProgress').textContent = `${session.idx + 1} / ${session.queue.length}`;
    document.getElementById('progressBar').style.width = `${((session.idx) / session.queue.length) * 100}%`;

    if (session.method === 'flip') {
        const el = document.getElementById('flashcard');
        el.classList.remove('flipped', 'shake');
        setTimeout(() => {
            document.getElementById('labelQ').textContent = lblQ;
            document.getElementById('textQ').textContent = session.q;
            document.getElementById('labelA').textContent = lblA;
            document.getElementById('textA').textContent = session.a;
            document.getElementById('boxBadge').textContent = `Box ${c.box || 1}`;
            document.getElementById('boxBadge').style.background = `var(--box-${c.box || 1})`;
            const hBtn = document.getElementById('btnHintFront');
            const hBox = document.getElementById('hintFront');
            hBox.style.display = 'none';
            if (c.hint) { hBtn.classList.remove('hidden'); hBox.textContent = c.hint; }
            else hBtn.classList.add('hidden');
        }, 200);
    } else {
        document.getElementById('typeLabelQ').textContent = lblQ;
        document.getElementById('typeTextQ').textContent = session.q;
        document.getElementById('typeInput').value = '';
        document.getElementById('typeInput').disabled = false;
        document.getElementById('typeInput').focus();
        document.getElementById('typeFeedback').style.display = 'none';
        document.getElementById('btnCheckType').classList.remove('hidden');
        document.getElementById('btnNextType').classList.add('hidden');
        const hBtn = document.getElementById('btnHintType');
        const hBox = document.getElementById('hintType');
        hBox.style.display = 'none';
        if (c.hint) { hBtn.classList.remove('hidden'); hBox.textContent = c.hint; }
        else hBtn.classList.add('hidden');
    }
}

function rate(success) {
    const c = session.current;
    const now = Date.now();
    const cardDuration = (now - session.cardStartTime) / 1000;
    session.timeSpent += cardDuration;

    if (success) {
        triggerConfetti();
        c.box = Math.min((c.box || 1) + 1, 5);
        if (c.box === 5) c.lastMasteredAt = now;
        incrementStreak();
    } else {
        c.box = 1;
        if (session.method === 'flip') document.getElementById('flashcard').classList.add('shake');
    }
    save();
    session.idx++;
    setTimeout(loadCard, success ? 500 : 800); 
}

function checkType() {
    const now = Date.now();
    const cardDuration = (now - session.cardStartTime) / 1000;
    session.timeSpent += cardDuration;

    const inp = document.getElementById('typeInput');
    const val = inp.value.trim().toLowerCase();
    const corr = session.a.trim().toLowerCase();
    const isCorr = val === corr;
    inp.disabled = true;
    document.getElementById('btnCheckType').classList.add('hidden');
    const fb = document.getElementById('typeFeedback');
    fb.style.display = 'block';
    if (isCorr) {
        fb.innerHTML = `<div style="color:var(--success); font-weight:bold"><i class="fas fa-check"></i> Richtig!</div>`;
        triggerConfetti();
        session.current.box = Math.min((session.current.box || 1) + 1, 5);
        if (session.current.box === 5) session.current.lastMasteredAt = now;
        incrementStreak();
        save();
        setTimeout(() => { session.idx++; loadCard(); }, 1200);
    } else {
        document.getElementById('btnNextType').classList.remove('hidden');
        document.getElementById('btnNextType').focus();
        fb.innerHTML = `<div style="color:var(--danger); font-weight:bold"><i class="fas fa-times"></i> Falsch</div><div style="color:var(--text-muted)">Lösung: ${escapeHtml(session.a)}</div>`;
        session.current.box = 1; save();
    }
}

function nextCard() { session.idx++; loadCard(); }
function finishSession() { endSession(); }

function endSession() {
    const duration = (Date.now() - session.startTime) / 1000;
    data.lastSessionDuration = duration;
    data.totalTimeSeconds += duration;
    data.totalReviews += session.queue.length;
    save();
    
    document.getElementById('activeSession').style.display = 'none';
    document.querySelector('.bottom-nav').classList.remove('hidden');
    document.querySelector('header').classList.remove('hidden');
    nav('statsContent', document.querySelectorAll('.nav-item')[2]);
    updateStatsUI();
}

function flipCard() { document.getElementById('flashcard').classList.toggle('flipped'); }
function toggleHint(e) { e.stopPropagation(); document.getElementById('hintFront').style.display = 'block'; document.getElementById('btnHintFront').classList.add('hidden'); }
function toggleTypeHint() { document.getElementById('hintType').style.display = 'block'; document.getElementById('btnHintType').classList.add('hidden'); }

// =============================================
// STATS UI
// =============================================
function formatTime(seconds) {
    if(!seconds) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0'+s : s}`;
}

function updateStatsFilter() {
    const sel = document.getElementById('statsScope');
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

    let max = Math.max(...boxes.slice(1)) || 1;
    for (let i = 1; i <= 5; i++) {
        const h = (boxes[i] / max) * 100;
        const col = document.querySelector(`.box-col[data-box="${i}"]`);
        if (col) {
            col.style.height = Math.max(h, 5) + '%';
            col.querySelector('.box-count').textContent = boxes[i];
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
        masteredCards.forEach(c => {
            const diffMs = c.lastMasteredAt - c.createdAt;
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            totalDays += diffDays;
        });
        const avgDays = (totalDays / masteredCards.length).toFixed(1);
        if (perfTimeToMaster) perfTimeToMaster.textContent = avgDays + " Tage";
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
// UTILS
// =============================================
function nav(id, el) {
    document.querySelectorAll('.content-area').forEach(d => d.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    el.classList.add('active');
    document.getElementById('mainFab').style.display = id === 'manageContent' ? 'flex' : 'none';
    if(id === 'statsContent') {
        updateStatsFilter();
        updateStatsUI();
    }
}

function showModal(id) { 
    document.getElementById(id).classList.add('show'); 
    if(id === 'importModal') document.getElementById('importFeedback').style.display = 'none';
}

function hideModal(id) { document.getElementById(id).classList.remove('show'); }
function toggleFab() { document.getElementById('fabMenu').classList.toggle('active'); }

function speak(e, type) {
    e.stopPropagation();
    const txt = type === 'q' ? session.q : session.a;
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = /[äöüß]/i.test(txt) ? 'de-DE' : 'en-US';
    window.speechSynthesis.speak(u);
}

// =============================================
// CONFETTI (MIT MEMORY LEAK FIX)
// =============================================
const confettiCanvas = document.getElementById('confettiCanvas');
const ctx = confettiCanvas.getContext('2d');

function resizeCanvas() { 
    confettiCanvas.width = window.innerWidth; 
    confettiCanvas.height = window.innerHeight; 
}
window.addEventListener('resize', resizeCanvas); 
resizeCanvas();

function triggerConfetti() {
    if (confettiAnimationId) {
        cancelAnimationFrame(confettiAnimationId);
    }
    particles = [];
    
    for (let i = 0; i < 100; i++) {
        particles.push({
            x: window.innerWidth / 2, y: window.innerHeight / 2,
            vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20,
            life: 100, color: `hsl(${Math.random() * 360}, 100%, 50%)`, size: Math.random() * 10 + 5
        });
    }
    animateConfetti();
}

function animateConfetti() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; 
        p.y += p.vy; 
        p.vy += 0.5; 
        p.life--;
        
        ctx.fillStyle = p.color; 
        ctx.fillRect(p.x, p.y, p.size, p.size);
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
    
    if (particles.length > 0) {
        confettiAnimationId = requestAnimationFrame(animateConfetti);
    } else {
        confettiAnimationId = null;
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
}

// =============================================
// EXPORT / IMPORT / RESET
// =============================================
function resetAll() { 
    if (confirm('ACHTUNG: Alle Daten werden unwiderruflich gelöscht!\n\nMöchtest du wirklich fortfahren?')) { 
        safeLocalStorage('remove', DATA_KEY);
        safeLocalStorage('remove', BACKUP_KEY);
        location.reload(); 
    } 
}

function exportData(type) {
    const exportPayload = {
        ...data,
        exportedAt: Date.now(),
        exportType: 'manual'
    };
    const str = type === 'json' ? JSON.stringify(exportPayload, null, 2) : "Front;Back;Box;Hint\n" + data.cards.map(c => `"${c.front}";"${c.back}";${c.box};${c.hint || ''}`).join('\n');
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
                if (!confirm(`Achtung: Du hast bereits ${data.cards.length} Karten.\n\nDer Import wird deine bestehenden Daten ERGÄNZEN (Duplikate werden übersprungen).\n\nFortfahren?`)) {
                    return;
                }
            }
            
            const migrated = migrateData(d);
            
            let addedCards = 0;
            let addedFolders = 0;
            const folderIdMap = {};
            
            migrated.folders.forEach(newFolder => {
                let existingFolder = data.folders.find(f => f.name === newFolder.name);
                
                if (!existingFolder) {
                    const newId = genId();
                    folderIdMap[newFolder.id] = newId;
                    data.folders.push({
                        id: newId,
                        name: newFolder.name,
                        parentId: newFolder.parentId,
                        color: newFolder.color || null
                    });
                    addedFolders++;
                } else {
                    folderIdMap[newFolder.id] = existingFolder.id;
                }
            });
            
            migrated.cards.forEach(newCard => {
                const targetFolderId = folderIdMap[newCard.folderId] || newCard.folderId;
                
                const exists = data.cards.some(c => 
                    c.front === newCard.front && 
                    c.back === newCard.back &&
                    c.folderId === targetFolderId
                );
                
                if (!exists) {
                    data.cards.push({
                        id: genId(),
                        front: newCard.front,
                        back: newCard.back,
                        hint: newCard.hint || '',
                        box: newCard.box || 1,
                        folderId: targetFolderId,
                        createdAt: newCard.createdAt || Date.now(),
                        color: newCard.color || null
                    });
                    addedCards++;
                }
            });
            
            save(); 
            showNotification(`Import erfolgreich: ${addedCards} Karten, ${addedFolders} Ordner hinzugefügt`, 'success');
            renderManage();
            
        } catch (err) { 
            alert('Fehler beim Import: ' + err.message); 
        }
    };
    r.readAsText(f);
    inp.value = '';
}

// =============================================
// PWA INSTALLATION & SERVICE WORKER
// =============================================
let deferredPrompt = null;

function initPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => {
                console.log('Service Worker registriert:', reg.scope);
                
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showNotification('Neue Version verfügbar! Seite neu laden.', 'warning');
                        }
                    });
                });
            })
            .catch(err => console.log('SW Registrierung fehlgeschlagen:', err));
    }
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        if (!localStorage.getItem('installBannerDismissed')) {
            setTimeout(() => {
                document.getElementById('installBanner').style.display = 'block';
            }, 3000);
        }
    });
    
    window.addEventListener('appinstalled', () => {
        document.getElementById('installBanner').style.display = 'none';
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
    document.getElementById('installBanner').style.display = 'none';
}

function dismissInstall() {
    document.getElementById('installBanner').style.display = 'none';
    localStorage.setItem('installBannerDismissed', 'true');
}

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    applyTheme();
    renderManage();
    updateStatsUI();
    updateBackupStatus();
    updateOnlineStatus();
    
    checkUrlImport();

    const toast = document.getElementById('undoToast');
    let startY = 0;
    let isSwiping = false;

    toast.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        isSwiping = true;
    }, {passive: true});

    toast.addEventListener('touchmove', (e) => {
        if(!isSwiping) return;
        const diff = e.touches[0].clientY - startY;
        
        if (diff > 0) {
            e.preventDefault();
            toast.style.transform = `translateY(${diff}px)`;
        }
    }, {passive: false});

    toast.addEventListener('touchend', (e) => {
        if(!isSwiping) return;
        isSwiping = false;
        const diff = e.changedTouches[0].clientY - startY;
        if (diff > 60) {
            undoLastAction();
        } else {
            toast.style.transform = '';
        }
    });

    document.getElementById('searchBox').addEventListener('input', (e) => renderManage(e.target.value));
    document.getElementById('typeInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            if (document.getElementById('btnCheckType').classList.contains('hidden')) nextCard();
            else checkType();
        }
    });
    window.onclick = (e) => { if (e.target.classList.contains('modal')) hideModal(e.target.id); };
    
    setInterval(() => {
        createAutoBackup();
    }, AUTO_BACKUP_INTERVAL);
    
    initPWA();
});