const CACHE_NAME = 'calceletrica-v2'; // <--- Subi para v5 para forçar a atualização!

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js', // O cérebro
  './dados.js',  // As tabelas de engenharia
  './manifest.json',
  './icons/icon-192x192.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap'
];

// 1. INSTALAÇÃO
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. ATIVAÇÃO (Limpeza de cache velho)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. INTERCEPTAÇÃO (Offline First)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});



