const CACHE_NAME = 'calceletrica-v1'; // <--- MUDE AQUI para v2, v3... quando atualizar o código!

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './dados.js',
  './manifest.json',
  './icons/icon-192x192.png', // Certifique-se de ter essa imagem ou remova essa linha
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap'
];

// 1. INSTALAÇÃO: Força a atualização imediata
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Furar a fila
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. ATIVAÇÃO: Limpa versões antigas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); // Apaga cache velho
          }
        })
      );
    }).then(() => self.clients.claim()) // Assume controle
  );
});

// 3. INTERCEPTAÇÃO: Cache First (Offline First)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
