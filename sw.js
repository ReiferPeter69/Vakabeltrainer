/**
 * Service Worker für Lernkarten Ultra Edition
 * Version: 2.0.0
 * 
 * Bietet:
 * - Offline-Funktionalität
 * - Caching von Assets
 * - Background Sync (für zukünftige Features)
 */

const CACHE_NAME = 'ultracards-v2.1.0';
const RUNTIME_CACHE = 'ultracards-runtime-v2.1.0';

// Assets die beim Installieren gecacht werden
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './app.js',
    './manifest.json',
    './icons/icon-512.svg'
];

// Externe CDN-Assets
const EXTERNAL_ASSETS = [
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Dateitypen die immer aus dem Cache kommen
const CACHE_FIRST_PATTERNS = [
    /\.css$/,
    /\.js$/,
    /\.svg$/,
    /\.png$/,
    /\.jpg$/,
    /\.jpeg$/,
    /\.gif$/,
    /\.webp$/,
    /\.woff2?$/,
    /font-awesome/
];

// Netzwerk-first Patterns (für API-Calls, etc.)
const NETWORK_FIRST_PATTERNS = [
    /\/api\//
];

/**
 * Install Event - Cache essentielle Assets
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Installiere Service Worker...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching lokale Assets...');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => {
                console.log('[SW] Lokale Assets gecacht');
                // Externe Assets im Hintergrund cachen
                return caches.open(RUNTIME_CACHE);
            })
            .then((cache) => {
                console.log('[SW] Caching externe Assets im Hintergrund...');
                // Externe Assets einzeln cachen (fehlertolerant)
                return Promise.allSettled(
                    EXTERNAL_ASSETS.map(url => 
                        fetch(url)
                            .then(response => {
                                if (response.ok) {
                                    cache.put(url, response);
                                }
                            })
                            .catch(err => console.log('[SW] Konnte nicht cachen:', url, err))
                    )
                );
            })
            .then(() => {
                console.log('[SW] Installation abgeschlossen');
                return self.skipWaiting();
            })
            .catch(err => {
                console.error('[SW] Installationsfehler:', err);
            })
    );
});

/**
 * Activate Event - Alte Caches löschen
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Aktiviere Service Worker...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            // Lösche alte Caches
                            return name.startsWith('ultracards-') && 
                                   name !== CACHE_NAME && 
                                   name !== RUNTIME_CACHE;
                        })
                        .map((name) => {
                            console.log('[SW] Lösche alten Cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Aktivierung abgeschlossen');
                return self.clients.claim();
            })
    );
});

/**
 * Fetch Event - Cache-Strategien
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Nur GET-Requests behandeln
    if (request.method !== 'GET') {
        return;
    }
    
    // Ignoriere non-http(s) Requests
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // Chrome-Extensions ignorieren
    if (url.protocol === 'chrome-extension:') {
        return;
    }
    
    // Wähle Strategie basierend auf Request-Typ
    event.respondWith(
        handleRequest(request)
    );
});

/**
 * Haupt-Request-Handler
 */
async function handleRequest(request) {
    const url = new URL(request.url);
    
    // Cache-First für statische Assets
    if (isCacheFirst(url)) {
        return cacheFirst(request);
    }
    
    // Netzwerk-First für API-Calls
    if (isNetworkFirst(url)) {
        return networkFirst(request);
    }
    
    // Stale-While-Revalidate für alles andere
    return staleWhileRevalidate(request);
}

/**
 * Prüft ob URL Cache-First Strategie braucht
 */
function isCacheFirst(url) {
    const fullUrl = url.href;
    return CACHE_FIRST_PATTERNS.some(pattern => pattern.test(fullUrl));
}

/**
 * Prüft ob URL Network-First Strategie braucht
 */
function isNetworkFirst(url) {
    const fullUrl = url.href;
    return NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(fullUrl));
}

/**
 * Cache-First Strategie
 * 1. Aus Cache laden
 * 2. Falls nicht vorhanden, aus Netzwerk laden und cachen
 */
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Netzwerkfehler für:', request.url);
        // Fallback für Font-Awesome CSS
        if (request.url.includes('font-awesome')) {
            return createFallbackResponse('/* Font Awesome Offline Fallback */');
        }
        throw error;
    }
}

/**
 * Network-First Strategie
 * 1. Aus Netzwerk laden
 * 2. Falls fehlgeschlagen, aus Cache laden
 */
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

/**
 * Stale-While-Revalidate Strategie
 * 1. Sofort aus Cache antworten
 * 2. Im Hintergrund neu laden und Cache aktualisieren
 */
async function staleWhileRevalidate(request) {
    const cachedResponse = await caches.match(request);
    
    // Starte Netzwerk-Request im Hintergrund
    const networkPromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse.ok) {
                caches.open(RUNTIME_CACHE)
                    .then((cache) => cache.put(request, networkResponse.clone()));
            }
            return networkResponse;
        })
        .catch((error) => {
            console.log('[SW] Netzwerkfehler:', error);
            return null;
        });
    
    // Gib Cache-Antwort zurück falls vorhanden
    if (cachedResponse) {
        return cachedResponse;
    }
    
    // Falls nicht im Cache, warte auf Netzwerk
    const networkResponse = await networkPromise;
    
    if (networkResponse) {
        return networkResponse;
    }
    
    // Fallback für Navigation
    if (request.mode === 'navigate') {
        return caches.match('./index.html');
    }
    
    // Generischer Fallback
    return createFallbackResponse('Offline nicht verfügbar');
}

/**
 * Erstellt eine Fallback-Response
 */
function createFallbackResponse(content, contentType = 'text/plain') {
    return new Response(content, {
        status: 200,
        statusText: 'OK',
        headers: {
            'Content-Type': contentType
        }
    });
}

/**
 * Message Event - Kommunikation mit der App
 */
self.addEventListener('message', (event) => {
    const { type, payload } = event.data || {};
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CLEAR_CACHE':
            clearAllCaches()
                .then(() => {
                    event.ports[0].postMessage({ success: true });
                })
                .catch((error) => {
                    event.ports[0].postMessage({ success: false, error: error.message });
                });
            break;
            
        case 'GET_CACHE_SIZE':
            getCacheSize()
                .then((size) => {
                    event.ports[0].postMessage({ size });
                });
            break;
            
        default:
            console.log('[SW] Unbekannte Nachricht:', type);
    }
});

/**
 * Löscht alle Caches
 */
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(
        cacheNames
            .filter(name => name.startsWith('ultracards-'))
            .map(name => caches.delete(name))
    );
    console.log('[SW] Alle Caches gelöscht');
}

/**
 * Berechnet die Cache-Größe
 */
async function getCacheSize() {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    
    for (const name of cacheNames) {
        if (!name.startsWith('ultracards-')) continue;
        
        const cache = await caches.open(name);
        const keys = await cache.keys();
        
        for (const request of keys) {
            const response = await cache.match(request);
            if (response) {
                const blob = await response.clone().blob();
                totalSize += blob.size;
            }
        }
    }
    
    return totalSize;
}

/**
 * Background Sync (für zukünftige Offline-Sync Features)
 */
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        console.log('[SW] Background Sync: sync-data');
        // event.waitUntil(syncData());
    }
});

/**
 * Push Notifications (für zukünftige Erinnerungen)
 */
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    const data = event.data.json();
    
    const options = {
        body: data.body || 'Zeit zum Lernen!',
        icon: './icons/icon-192.svg',
        badge: './icons/icon-72.svg',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || './'
        },
        actions: [
            {
                action: 'learn',
                title: 'Jetzt lernen',
                icon: './icons/shortcut-learn.svg'
            },
            {
                action: 'dismiss',
                title: 'Später'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'Lernkarten', options)
    );
});

/**
 * Notification Click Handler
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const action = event.action;
    const data = event.notification.data || {};
    
    if (action === 'dismiss') {
        return;
    }
    
    // Öffne App
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Falls bereits ein Fenster offen ist, fokussiere es
                for (const client of clientList) {
                    if (client.url.includes('index.html') && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Sonst öffne neues Fenster
                if (clients.openWindow) {
                    return clients.openWindow(data.url || './');
                }
            })
    );
});

console.log('[SW] Service Worker geladen - Version 2.0.0');
