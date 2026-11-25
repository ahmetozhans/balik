const $ = id => document.getElementById(id);
const forecastHours = 'wind_speed_10m,pressure_msl,temperature_2m';
const marineHours = 'wave_height,sea_surface_temperature,ocean_current_velocity';
const starterSpots = [
  { id: 'mudanya', name: 'Mudanya', lat: 40.379, lon: 28.884 },
  { id: 'gemlik', name: 'Gemlik', lat: 40.431, lon: 29.150 },
  { id: 'tirilye', name: 'Tirilye', lat: 40.396, lon: 28.797 }
];
const fish = {
  levrek: { name: 'Levrek', months: [1, 2, 3, 9, 10, 11, 12], temp: 16, bait: 'Silikon balık veya küçük minnow', rig: 'Hafif spin' },
  istavrit: { name: 'İstavrit', months: [4, 5, 6, 7, 8, 9, 10, 11], temp: 19, bait: 'Tüylü veya silikonlu köstek', rig: 'İstavrit çaparisi' },
  lufer: { name: 'Lüfer', months: [9, 10, 11, 12], temp: 17, bait: 'Kaşık veya ince profilli minnow', rig: 'Spin takımı' },
  palamut: { name: 'Palamut', months: [8, 9, 10, 11], temp: 21, bait: 'Metal jig veya uzun minnow', rig: 'Kıyıdan spin' }
};
const dateFormat = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'medium', timeStyle: 'short' });
const dayFormat = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', weekday: 'short', month: 'short', day: 'numeric' });
const clockFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});
function localTime() {
  const parts = Object.fromEntries(clockFormat.formatToParts(new Date()).map(part => [part.type, part.value]));
  return parts.year + '-' + parts.month + '-' + parts.day + 'T' + parts.hour + ':' + parts.minute;
}
function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}
function el(tag, text, className) {
  const item = document.createElement(tag);
  item.textContent = text;
  if (className) item.className = className;
  return item;
}
function fillSelect(select, items, selected) {
  select.replaceChildren(...items.map(([id, label]) => new Option(label, id)));
  if (items.some(([id]) => id === selected)) select.value = selected;
}
let spots = [...starterSpots, ...read('mera:spots', [])];
let records = read('mera:log', []);
let activeSpot = spots.find(spot => spot.id === read('mera:active', 'mudanya')) || spots[0];
let hours = [];
let request;
let selectedView = 'today';
const speciesOptions = Object.entries(fish).map(([id, item]) => [id, item.name]);
fillSelect($('species'), speciesOptions, read('mera:species', 'levrek'));
fillSelect($('log-fish'), speciesOptions);
$('log-form').elements.date.value = localTime();
function refreshSpots() {
  fillSelect($('spot'), spots.map(spot => [spot.id, spot.name]), activeSpot.id);
}
function renderMap() {
  const { lat, lon } = activeSpot;
  $('map-link').href = 'https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lon + '#map=13/' + lat + '/' + lon;
  if (selectedView !== 'spots') return;
  const box = [Math.max(-180, lon - .065), Math.max(-90, lat - .045), Math.min(180, lon + .065), Math.min(90, lat + .045)];
  const url = 'https://www.openstreetmap.org/export/embed.html?bbox=' + box.join('%2C') + '&layer=mapnik&marker=' + lat + '%2C' + lon;
  if ($('map').src !== url) $('map').src = url;
}
function urls(spot) {
  const query = new URLSearchParams({ latitude: spot.lat, longitude: spot.lon, timezone: 'Europe/Istanbul', forecast_days: 7 });
  return [
    'https://api.open-meteo.com/v1/forecast?' + query + '&hourly=' + forecastHours + '&daily=sunrise,sunset',
    'https://marine-api.open-meteo.com/v1/marine?' + query + '&hourly=' + marineHours + '&cell_selection=sea'
  ];
}
async function getData(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Tahmin alınamadı');
  return response.json();
}
function combine(weather, marine) {
  const indexes = new Map((marine?.hourly?.time || []).map((time, index) => [time, index]));
  const days = new Map(weather.daily.time.map((day, index) => [day, index]));
  return weather.hourly.time.map((time, index) => {
    const marineIndex = indexes.get(time);
    const day = days.get(time.slice(0, 10));
    return {
      time, wind: weather.hourly.wind_speed_10m[index], pressure: weather.hourly.pressure_msl[index],
      wave: marine?.hourly?.wave_height?.[marineIndex], water: marine?.hourly?.sea_surface_temperature?.[marineIndex],
      current: marine?.hourly?.ocean_current_velocity?.[marineIndex],
      sunrise: weather.daily.sunrise[day], sunset: weather.daily.sunset[day]
    };
  });
}
async function loadForecast() {
  request?.abort();
  const controller = new AbortController();
  request = controller;
  const spot = activeSpot;
  const key = 'mera:forecast:' + spot.id;
  const cached = read(key, null);
  hours = cached?.hours || [];
  $('status').textContent = spot.name + ' için tahmin yükleniyor…';
  renderForecast();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const [weatherUrl, marineUrl] = urls(spot);
    const marinePromise = getData(marineUrl, controller.signal).catch(() => null);
    const weather = await getData(weatherUrl, controller.signal);
    const marine = await marinePromise;
    if (request !== controller) return;
    hours = combine(weather, marine);
    write(key, { hours, at: Date.now() });
    $('status').textContent = hours.some(item => Number.isFinite(item.wave) || Number.isFinite(item.water))
      ? 'Kaynak: Open-Meteo hava ve deniz tahmini.'
      : 'Deniz verisi bulunamadı. Puan yalnızca mevcut verilerle hesaplandı.';
  } catch {
    if (request !== controller) return;
    $('status').textContent = cached
      ? 'Bağlantı yok. Son kayıt: ' + dateFormat.format(cached.at)
      : 'Tahmin alınamadı. Bağlantını kontrol edip tekrar dene.';
  } finally {
    clearTimeout(timer);
    if (request === controller) renderForecast();
  }
}
function score(hour, species) {
  const month = Number(hour.time.slice(5, 7));
  const time = Date.parse(hour.time + '+03:00');
  const closeToTwilight = [hour.sunrise, hour.sunset].some(edge =>
    Math.abs(time - Date.parse(edge + '+03:00')) <= 90 * 60 * 1000
  );
  const factors = [
    [species.months.includes(month) ? 82 : 36, 3, 'sezon'],
    [closeToTwilight ? 88 : 46, 3, 'gün doğumu ve batımı'],
    [Number.isFinite(hour.wind) ? Math.max(0, 95 - hour.wind * 2.4) : null, 2, 'rüzgâr'],
    [Number.isFinite(hour.wave) ? Math.max(0, 87 - hour.wave * 33) : null, 2, 'dalga'],
    [Number.isFinite(hour.water) ? Math.max(0, 95 - Math.abs(hour.water - species.temp) * 9) : null, 3, 'su sıcaklığı']
  ].filter(([value]) => value !== null);
  return {
    value: Math.round(factors.reduce((total, [value, weight]) => total + value * weight, 0)
      / factors.reduce((total, [, weight]) => total + weight, 0)),
    factors
  };
}
function best(items, species) {
  return items.reduce((winner, item) => {
    const result = score(item, species);
    return !winner || result.value > winner.result.value ? { item, result } : winner;
  }, null);
}
function format(value, unit) {
  return Number.isFinite(value) ? new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(value) + ' ' + unit : '—';
}
function renderForecast() {
  const today = $('today-content');
  const plan = $('plan-content');
  today.replaceChildren();
  plan.replaceChildren();
  const now = localTime();
  const upcoming = hours.filter(item => item.time.slice(0, 13) >= now.slice(0, 13));
  const todaysHours = upcoming.filter(item => item.time.slice(0, 10) === now.slice(0, 10));
  const species = fish[$('species').value];
  if (!upcoming.length) {
    const refresh = el('button', 'Tahmini yenile');
    refresh.onclick = loadForecast;
    today.append(el('p', 'Görüntülenecek güncel saatlik tahmin yok.'), refresh);
    plan.append(el('p', 'Görüntülenecek tahmin yok.'));
    return;
  }
  if (!todaysHours.length) today.append(el('p', 'Bugün için kalan saat bulunmuyor. 7 Gün ekranını aç.'));
  const top = best(todaysHours, species);
  if (top) {
    const card = el('article', '');
    card.append(
      el('h2', activeSpot.name + ' · ' + species.name),
      el('div', top.result.value + ' / 100', 'score'),
      el('p', 'En iyi görünen saat: ' + top.item.time.slice(11, 16)),
      el('p', species.bait + ' · ' + species.rig),
      el('small', 'Av puanı deneysel bir göstergedir. Etkenler: ' + top.result.factors.map(([value, , name]) => name + ' ' + Math.round(value)).join(' · '))
    );
    today.append(card);
    const ranking = el('article', '');
    ranking.append(el('h2', 'Bugün hangi balık?'));
    const ranked = Object.values(fish).map(item => [item, best(todaysHours, item)]).sort((a, b) => b[1].result.value - a[1].result.value);
    for (const [item, peak] of ranked) {
      ranking.append(el('p', item.name + ' · ' + peak.result.value + ' puan · ' + peak.item.time.slice(11, 16)));
    }
    today.append(ranking);
    const table = el('table', '');
    table.createTHead().insertRow().append(...['Saat', 'Puan', 'Rüzgâr', 'Dalga', 'Basınç', 'Su', 'Akıntı'].map(title => el('th', title)));
    const body = table.createTBody();
    for (const hour of todaysHours) {
      const columns = [hour.time.slice(11, 16), score(hour, species).value, format(hour.wind, 'km/sa'),
        format(hour.wave, 'm'), format(hour.pressure, 'hPa'), format(hour.water, '°C'), format(hour.current, 'm/sn')];
      body.insertRow().append(...columns.map(value => el('td', value)));
    }
    const wrapper = el('div', '', 'card scroll');
    wrapper.append(el('h2', 'Saatlik koşullar'), table);
    today.append(wrapper);
  }
  const dates = new Map();
  for (const item of upcoming) {
    const date = item.time.slice(0, 10);
    if (!dates.has(date)) dates.set(date, []);
    dates.get(date).push(item);
  }
  for (const [date, items] of dates) {
    const top = best(items, species);
    const card = el('article', '');
    card.append(el('h2', dayFormat.format(new Date(date + 'T12:00:00+03:00'))),
      el('p', species.name + ' · ' + top.item.time.slice(11, 16) + ' · ' + top.result.value + ' / 100'));
    plan.append(card);
  }
}
function renderFish() {
  const guide = $('fish-content');
  const months = new Intl.DateTimeFormat('tr-TR', { timeZone: 'UTC', month: 'long' });
  for (const item of Object.values(fish)) {
    const card = el('article', '');
    card.append(el('h2', item.name), el('p', 'Yem: ' + item.bait), el('p', 'Takım: ' + item.rig),
      el('small', 'Puanlamada öne çıkan aylar: ' + item.months.map(month => months.format(new Date(Date.UTC(2026, month - 1, 15)))).join(', ')));
    guide.append(card);
  }
}
function changeSpot(spot) {
  activeSpot = spot;
  write('mera:active', spot.id);
  refreshSpots();
  renderMap();
  loadForecast();
}
function renderLog() {
  const list = $('log-content');
  list.replaceChildren();
  if (!records.length) list.append(el('p', 'Henüz av kaydın yok.', 'muted'));
  for (const entry of records) {
    const card = el('article', '');
    card.append(el('h2', (fish[entry.fish]?.name || entry.fish) + ' · ' + entry.count + ' adet'),
      el('p', entry.spot + ' · ' + dateFormat.format(new Date(entry.date + ':00+03:00'))),
      el('p', entry.bait), el('p', entry.note));
    if (entry.photo) {
      const photo = el('img', '', 'entry-photo');
      photo.src = entry.photo;
      photo.alt = 'Av kaydı fotoğrafı';
      card.append(photo);
    }
    const remove = el('button', 'Kaydı sil');
    remove.onclick = () => {
      const next = records.filter(record => record.id !== entry.id);
      if (!write('mera:log', next)) return;
      records = next;
      renderLog();
    };
    card.append(remove);
    list.append(card);
  }
}
async function resizePhoto(file) {
  if (!file?.size) return '';
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 850 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', .67);
  } finally { URL.revokeObjectURL(url); }
}
$('log-form').onsubmit = async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const spot = activeSpot.name;
  const submit = form.querySelector('button');
  submit.disabled = true;
  try {
    const photo = await resizePhoto(data.get('photo'));
    const next = [{ id: crypto.randomUUID(), date: data.get('date'), fish: data.get('fish'),
      count: data.get('count'), bait: data.get('bait'), note: data.get('note'), spot, photo }, ...records];
    if (!write('mera:log', next)) throw new Error('Yerel depolama dolu veya erişilemiyor.');
    records = next;
    form.reset();
    form.elements.date.value = localTime();
    $('log-status').textContent = 'Av kaydı eklendi.';
    renderLog();
  } catch (error) {
    $('log-status').textContent = 'Av kaydedilemedi. ' + (error.name === 'EncodingError' ? 'Fotoğraf biçimi açılamadı.' : error.message);
  } finally { submit.disabled = false; }
};
$('spot-form').onsubmit = event => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const name = data.get('name').trim();
  if (!name) return;
  const spot = { id: crypto.randomUUID(), name, lat: Number(data.get('lat')), lon: Number(data.get('lon')) };
  const next = [...spots, spot];
  if (!write('mera:spots', next.slice(starterSpots.length))) {
    $('gps-status').textContent = 'Mera kaydedilemedi. Cihaz depolamasını kontrol et.';
    return;
  }
  spots = next;
  form.reset();
  $('gps-status').textContent = spot.name + ' kaydedildi.';
  changeSpot(spot);
};
$('gps').onclick = () => {
  if (!navigator.geolocation) {
    $('gps-status').textContent = 'Konum alınamıyor. Uygulamayı HTTPS üzerinden aç veya koordinatı elle gir.';
    return;
  }
  $('gps-status').textContent = 'Konum aranıyor…';
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    $('spot-form').elements.lat.value = coords.latitude.toFixed(5);
    $('spot-form').elements.lon.value = coords.longitude.toFixed(5);
    $('gps-status').textContent = 'Konum alındı. Bir ad verip kaydet.';
  }, () => { $('gps-status').textContent = 'Konum alınamadı. Konum iznini ve bağlantını kontrol et.'; }, { timeout: 10000 });
};
$('spot').onchange = () => changeSpot(spots.find(spot => spot.id === $('spot').value));
$('species').onchange = () => {
  write('mera:species', $('species').value);
  renderForecast();
};
const tabs = document.querySelectorAll('nav button');
for (const tab of tabs) {
  tab.onclick = () => {
    selectedView = tab.dataset.view;
    for (const item of tabs) {
      $(item.dataset.view).hidden = item !== tab;
      if (item === tab) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    }
    renderMap();
  };
}
refreshSpots();
renderMap();
renderFish();
renderLog();
loadForecast();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
