import { fish, spots, localDay, localTime, combineForecast, pickWindow, pickWeatherWindow, hasFutureHour, inGuideSeason, forecastTargets, supportsTarget, mapsUrl } from './planner.mjs';

const $ = id => document.getElementById(id);
const number = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });
const clock = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const logKey = 'mera:log';
let forecasts = [];
let acquiredAt = 0;
let activeRequest;
let lastRenderMinute;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function link(text, href) {
  const node = element('a', text);
  node.href = href;
  node.target = '_blank';
  node.rel = 'noopener';
  return node;
}

function readArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

let records = readArray(logKey);

function renderLog() {
  const output = $('records');
  output.replaceChildren();
  const count = records.reduce((sum, record) => sum + (Number(record.count) || 0), 0);
  $('log-summary').textContent = records.length ? records.length + ' av kaydı · ' + count + ' balık' : 'Henüz av kaydı yok.';
  for (const record of records) {
    const card = element('article', undefined, 'card log-entry');
    card.append(element('h2', (fish[record.fish]?.name || record.fish) + ' · ' + record.count + ' adet'),
      element('p', record.spot + ' · ' + String(record.date).replace('T', ' '), 'muted'));
    if (record.bait) card.append(element('p', record.bait));
    if (record.note) card.append(element('p', record.note));
    if (typeof record.photo === 'string' && /^data:image\/(jpeg|png|webp);base64,/i.test(record.photo)) {
      const photo = element('img');
      photo.src = record.photo;
      photo.alt = 'Av fotoğrafı';
      photo.loading = 'lazy';
      card.append(photo);
    }
    output.append(card);
  }
}

function initializeSelectors() {
  const sea = element('optgroup');
  const inland = element('optgroup');
  sea.label = 'Deniz balıkları';
  inland.label = 'Tatlı su balıkları';
  for (const [id, species] of Object.entries(fish).sort((a, b) => a[1].name.localeCompare(b[1].name, 'tr'))) {
    (species.inland ? inland : sea).append(new Option(species.name, id));
  }
  $('target').append(sea, inland);
  const form = $('log-form');
  const spotNames = new Set([...spots.map(spot => spot.name), 'Mudanya', 'Mudanya · Deniz noktası', 'Gemlik',
    'Tirilye', 'İznik Gölü', 'Uluabat Gölü', ...readArray('mera:spots').map(spot => spot.name), ...records.map(record => record.spot)]);
  for (const name of spotNames) if (name) form.elements.spot.add(new Option(name, name));
  for (const [id, species] of Object.entries(fish)) form.elements.fish.add(new Option(species.name, id));
  form.elements.date.value = localTime();
}

function saveRecord(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const next = [{ id: crypto.randomUUID(), spot: data.get('spot'), fish: data.get('fish'),
    date: data.get('date'), count: data.get('count'), bait: data.get('bait'), note: data.get('note') }, ...records];
  try { localStorage.setItem(logKey, JSON.stringify(next)); }
  catch { $('log-status').textContent = 'Kayıt kaydedilemedi. Cihaz depolamasını kontrol et.'; return; }
  records = next;
  form.reset();
  form.elements.date.value = localTime();
  $('log-status').textContent = 'Av kaydı eklendi.';
  renderLog();
}

async function getJson(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Tahmin isteği başarısız');
  return response.json();
}

async function forecast(spot, signal) {
  const coords = new URLSearchParams({ latitude: spot.lat, longitude: spot.lon, timezone: 'Europe/Istanbul', forecast_days: 3 });
  const [weather, marine] = await Promise.all([
    getJson('https://api.open-meteo.com/v1/forecast?' + coords +
      '&hourly=wind_speed_10m,precipitation_probability&daily=sunrise,sunset', signal),
    getJson('https://marine-api.open-meteo.com/v1/marine?' + coords + '&hourly=wave_height&cell_selection=sea', signal)
  ]);
  return { spot, hours: combineForecast(weather, marine) };
}

function metric(label, value, unit) {
  const item = element('div');
  item.append(element('dt', label), element('dd', Number.isFinite(value) ? number.format(value) + ' ' + unit : '—'));
  return item;
}

function recommendation(spot, window) {
  const species = fish[spot.fish];
  const card = element('article', undefined, 'card recommendation');
  const heading = element('div', undefined, 'recommendation-heading');
  const location = element('div');
  location.append(element('p', spot.district, 'district'), element('h3', spot.name));
  heading.append(location, element('span', species.name, 'species'));
  const when = window.start.slice(11, 16) + '–' + clock.format(window.end);
  const metrics = element('dl', undefined, 'conditions');
  metrics.append(metric('Rüzgâr', window.wind, 'km/sa'), metric('Dalga', window.wave, 'm'), metric('Yağış ihtimali', window.rain, '%'));
  const details = element('details');
  details.append(element('summary', 'Neden bu öneri?'), element('p', spot.evidence),
    element('p', 'Atış noktasının dibi bilinmiyor. Saat aralığındaki en yüksek model değerleri gösteriliyor.'), link('Av kaynağını aç', spot.source));
  const actions = element('div', undefined, 'card-actions');
  actions.append(link('Merayı Google Maps’te aç', mapsUrl(spot)));
  const saved = records.filter(record => record.fish === spot.fish && record.spot === spot.name);
  if (saved.length) details.append(element('p', 'Av defterin: ' + saved.filter(record => Number(record.count) > 0).length + '/' + saved.length + ' kayıt sonuç verdi.'));
  card.append(heading, element('div', when, 'window'), element('p', species.bait + ' · ' + species.rig, 'tackle'), metrics, details, actions);
  return card;
}

function plansFor(eligible, date, now, weatherOnly = false) {
  return eligible.flatMap(({ spot, hours }) => {
    const window = weatherOnly ? pickWeatherWindow(hours, date, now) : pickWindow(spot, hours, date, now);
    return window ? [{ spot, window }] : [];
  }).sort((a, b) => a.window.cost - b.window.cost || Number(Boolean(b.spot.localRecord)) - Number(Boolean(a.spot.localRecord)));
}

function renderEmptyPlan(cards, eligible, date, offset, target, now) {
  const card = element('article', undefined, 'card empty');
  let reason = 'Sezon, ışık ve model verisi birlikte uygun bir tür önerisi vermedi.';
  if (target && !supportsTarget(target)) {
    reason = fish[target].inland ? 'Bu tatlı su türü av defterine eklenebilir. Av planı Bursa’nın deniz kıyılarını kapsıyor.'
      : 'Bu tür listede var. Bursa kıyısında saat önermek için yeterli mera ve av bilgisi yok.';
  } else if (!eligible.length) reason = 'Seçtiğin türün merası için tahmin alınamadı.';
  else if (!eligible.some(({ hours }) => hasFutureHour(hours, date, now))) {
    reason = offset === 0 ? 'Bugünün son tahmin saati geçti.' : 'Bu gün için henüz saatlik tahmin yok.';
  } else if (target && eligible.every(({ spot }) => !inGuideSeason(spot, date))) {
    reason = fish[target].name + ' için bu tarih uygulamanın rehber sezonu dışında.';
  }
  card.append(element('h3', 'Bu gün için tür önerisi yok'), element('p', reason, 'muted'));

  const dates = offset === 0 ? [date, localDay(1, now)] : [date];
  for (const candidateDate of dates) {
    const comparison = plansFor(eligible, candidateDate, now)[0];
    const alternative = comparison || plansFor(eligible, candidateDate, now, true)[0];
    if (!alternative) continue;
    const { spot, window } = alternative;
    const label = candidateDate === date && offset === 0 ? 'Bugün' : 'Yarın';
    const preview = element('div', undefined, 'empty-preview');
    const title = comparison ? label + ' · ' + fish[spot.fish].name : label + ' · Yalnızca hava ve deniz';
    preview.append(element('strong', title),
      element('p', spot.name + ' · ' + window.start.slice(11, 16) + '–' + clock.format(window.end)),
      element('small', 'Rüzgâr ' + number.format(window.wind) + ' km/sa · Dalga ' + number.format(window.wave) + ' m'),
      link('Merayı Google Maps’te aç', mapsUrl(spot)));
    card.append(preview);
    break;
  }

  if (offset === 0) {
    const next = element('button', 'Yarının planına geç', 'primary');
    next.type = 'button';
    next.onclick = () => { $('day').value = '1'; renderPlan(); };
    card.append(next);
  }
  if (target) {
    const all = element('button', 'Tüm türleri göster', 'quiet');
    all.type = 'button';
    all.onclick = () => { $('target').value = ''; renderPlan(); };
    card.append(all);
  }
  cards.append(card);
}

function renderPlan(now = Date.now()) {
  lastRenderMinute = Math.floor(now / 60000);
  const target = $('target').value;
  const offset = Number($('day').value);
  const date = localDay(offset, now);
  const cards = $('recommendations');
  cards.replaceChildren();
  if (!forecasts.length) return;
  const eligible = forecastTargets(forecasts, target);
  $('status').textContent = 'Open-Meteo hava ve deniz tahmini · ' + clock.format(acquiredAt) +
    ' · ' + forecasts.length + '/' + spots.length + ' mera';
  const plans = plansFor(eligible, date, now);
  if (!plans.length) {
    renderEmptyPlan(cards, eligible, date, offset, target, now);
    return;
  }
  const shown = new Set();
  for (const plan of plans) {
    if (shown.has(plan.spot.name)) continue;
    shown.add(plan.spot.name);
    cards.append(recommendation(plan.spot, plan.window));
    if (shown.size === 3) break;
  }
}

async function loadPlan() {
  activeRequest?.abort();
  const controller = new AbortController();
  activeRequest = controller;
  const timer = setTimeout(() => controller.abort(), 15000);
  forecasts = [];
  $('recommendations').replaceChildren();
  $('refresh').disabled = true;
  $('status').textContent = 'Kıyı tahminleri yükleniyor…';
  try {
    const results = await Promise.allSettled(spots.map(spot => forecast(spot, controller.signal)));
    if (activeRequest !== controller) return;
    forecasts = results.flatMap(result => result.status === 'fulfilled' && result.value.hours.length ? [result.value] : []);
    acquiredAt = Date.now();
    if (forecasts.length) renderPlan();
    else $('status').textContent = 'Güncel tahmin alınamadı. Bağlantını kontrol edip yenileyebilirsin.';
  } finally {
    clearTimeout(timer);
    if (activeRequest === controller) $('refresh').disabled = false;
  }
}

initializeSelectors();
renderLog();
$('filters').addEventListener('submit', event => event.preventDefault());
$('filters').addEventListener('change', () => renderPlan());
$('refresh').addEventListener('click', loadPlan);
$('log-form').addEventListener('submit', saveRecord);

for (const button of document.querySelectorAll('nav button')) {
  button.addEventListener('click', () => {
    for (const tab of document.querySelectorAll('nav button')) {
      const active = tab === button;
      $(tab.dataset.view).hidden = !active;
      if (active) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    }
    if (button.dataset.view === 'plan') renderPlan();
    window.scrollTo(0, 0);
  });
}

function updateClock() {
  if (document.hidden || $('plan').hidden || !forecasts.length) return;
  const now = Date.now();
  if (now - acquiredAt >= 30 * 60000) loadPlan();
  else if (lastRenderMinute !== Math.floor(now / 60000)) renderPlan(now);
}

document.addEventListener('visibilitychange', updateClock);
setInterval(updateClock, 10000);
loadPlan();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
