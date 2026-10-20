/* 엘라라의 전설 서비스워커
 * - 내비게이션: network-first, 오프라인이면 캐시된 index.html
 * - 같은 출처 정적 자산: stale-while-revalidate (NETWORK_FIRST_DESTINATIONS에 든 종류는 network-first)
 * - 프리캐시는 셸(index.html·manifest·스타일·아이콘)과 js/ 아래 모든 ES 모듈(첫 방문 직후 오프라인 실행용).
 *   js/에 모듈을 추가하면 PRECACHE_URLS에도 추가한다(tools/smoke.mjs가 누락을 검사).
 * 배포 내용이 바뀌어 캐시를 강제로 비워야 하면 CACHE_VERSION을 올린다.
 */
const CACHE_VERSION = 'v1';
const CACHE_NAME = `legend-of-elara-${CACHE_VERSION}`;
const CACHE_PREFIX = 'legend-of-elara-';
// 해시 없는 파일명으로 배포되는 스크립트/스타일은 버전이 섞이지 않도록 network-first로 처리한다.
const NETWORK_FIRST_DESTINATIONS = ['script', 'style'];
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/content/dialogs.js',
  './js/content/enemies.js',
  './js/content/items.js',
  './js/content/quests.js',
  './js/content/stages.js',
  './js/engine/audio.js',
  './js/engine/autodirector.js',
  './js/engine/camera.js',
  './js/engine/input.js',
  './js/engine/save.js',
  './js/engine/utils.js',
  './js/entities/drops.js',
  './js/entities/enemy.js',
  './js/entities/npc.js',
  './js/entities/player.js',
  './js/entities/projectile.js',
  './js/main.js',
  './js/ui/dialog.js',
  './js/ui/hud.js',
  './js/ui/inventory.js',
  './js/ui/screens.js',
  './js/world/maps.js',
  './js/world/tiles.js',
  './js/world/world.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// 캐시 쓰기 promise를 돌려주고, 호출하는 쪽에서 event.waitUntil()로 이벤트 수명 안에 묶는다.
function putInCache(request, response) {
  if (!response || !response.ok || response.type === 'opaque') return Promise.resolve();
  const copy = response.clone();
  return caches
    .open(CACHE_NAME)
    .then((cache) => cache.put(request, copy))
    .catch(() => {});
}

async function networkFirst(event) {
  const { request } = event;
  try {
    const response = await fetch(request);
    event.waitUntil(putInCache(request, response));
    return response;
  } catch (err) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function networkFirstNavigation(event) {
  const { request } = event;
  try {
    const response = await fetch(request);
    event.waitUntil(putInCache(request, response));
    return response;
  } catch (err) {
    const cache = await caches.open(CACHE_NAME);
    const cached = (await cache.match(request, { ignoreSearch: true })) || (await cache.match('./index.html'));
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(event) {
  const { request } = event;
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request).then(async (response) => {
    await putInCache(request, response);
    return response;
  });
  // 캐시 히트든 아니든 네트워크 갱신과 캐시 쓰기가 끝날 때까지 워커를 유지한다.
  event.waitUntil(network.catch(() => {}));
  if (cached) return cached;
  return network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // 범위(scope) 밖 요청은 건드리지 않는다.
  if (!url.href.startsWith(self.registration.scope)) return;
  // Range 요청(오디오/비디오 스트리밍)은 브라우저 기본 처리에 맡긴다.
  if (request.headers.has('range')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event));
    return;
  }
  if (NETWORK_FIRST_DESTINATIONS.includes(request.destination)) {
    event.respondWith(networkFirst(event));
    return;
  }
  event.respondWith(staleWhileRevalidate(event));
});
