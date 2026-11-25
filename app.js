const $ = id => document.getElementById(id);
const forecastHours = 'wind_speed_10m,wind_gusts_10m,pressure_msl,temperature_2m,precipitation_probability,cloud_cover,wind_direction_10m';
const marineHours = 'wave_height,sea_surface_temperature,ocean_current_velocity,wave_period,ocean_current_direction';
const starterSpots = [
  { id: 'mudanya', name: 'Mudanya', lat: 40.379, lon: 28.884 },
  { id: 'gemlik', name: 'Gemlik', lat: 40.431, lon: 29.150 },
  { id: 'tirilye', name: 'Tirilye', lat: 40.396, lon: 28.797 },
  { id: 'iznik', name: 'İznik Gölü', lat: 40.427, lon: 29.489, water: 'fresh' },
  { id: 'uluabat', name: 'Uluabat Gölü', lat: 40.161, lon: 28.627, water: 'fresh' }
];
const fish = {
  levrek: { name: 'Levrek', months: [1, 2, 3, 9, 10, 11, 12], temp: 16, bait: 'Silikon balık veya küçük minnow', rig: 'Hafif spin' },
  istavrit: { name: 'İstavrit', months: [4, 5, 6, 7, 8, 9, 10, 11], temp: 19, bait: 'Tüylü veya silikonlu köstek', rig: 'İstavrit çaparisi' },
  lufer: { name: 'Lüfer', months: [9, 10, 11, 12], temp: 17, bait: 'Kaşık veya ince profilli minnow', rig: 'Spin takımı' },
  palamut: { name: 'Palamut', months: [8, 9, 10, 11], temp: 21, bait: 'Metal jig veya uzun minnow', rig: 'Kıyıdan spin' },
  mirmir: { name: 'Mırmır', months: [5, 6, 7, 8, 9, 10], bait: 'Kum kurdu veya boru kurdu', rig: 'Kumluk kıyıda yemli dip takımı' },
  mezgit: { name: 'Mezgit', months: [1, 2, 3, 10, 11, 12], bait: 'Karides parçası veya kum kurdu', rig: 'Yemli dip takımı' },
  kefal: { name: 'Kefal', months: [4, 5, 6, 7, 8, 9, 10], bait: 'Ekmek veya hamur', rig: 'Şamandıralı ince takım' },
  izmarit: { name: 'İzmarit', months: [4, 5, 6, 9, 10, 11], bait: 'Kum kurdu veya karides', rig: 'İnce çapari veya kısa köstekli dip takımı' },
  isparoz: { name: 'İsparoz', months: [5, 6, 7, 8, 9, 10], bait: 'Kum kurdu veya karides', rig: 'İnce dip takımı' },
  gumus: { name: 'Gümüş balığı', months: [1, 2, 3, 10, 11, 12], bait: 'Ekmek kırıntısı veya mikro çapari', rig: 'Şamandıralı ince takım' },
  zargana: { name: 'Zargana', months: [6, 7, 8, 9, 10], bait: 'Balık şeridi veya küçük kaşık', rig: 'Yüzey şamandırası' },
  golGumus: { name: 'Göl gümüşü', water: 'fresh', months: [4, 5, 6, 7, 8, 9, 10], bait: 'Küçük ekmek parçası', rig: 'İnce şamandıralı takım' },
  sazan: { name: 'Sazan', water: 'fresh', months: [5, 6, 7, 8, 9, 10], bait: 'Mısır veya boilie', rig: 'Dip takımı' },
  turna: { name: 'Turna', water: 'fresh', months: [4, 5, 9, 10, 11], bait: 'Kaşık veya silikon', rig: 'Çelik telli spin takımı' },
  tatliLevrek: { name: 'Tatlı su levreği', water: 'fresh', months: [5, 6, 7, 8, 9, 10], bait: 'Küçük silikon', rig: 'Hafif spin' }
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
let bottomRequest;
let bottomMapRequest;
let bottomPointRequest;

let bottom = { text: '' };
const layerCatalogs = new Map();
const bottomSources = [
  { url: 'https://drive.emodnet-geology.eu/geoserver/gtk/wms', type: 'substrate' },
  { url: 'https://ows.emodnet-seabedhabitats.eu/geoserver/emodnet_view/wms', type: 'grass' }
];

function wmsUrl(source, params) {
  return source.url + '?' + new URLSearchParams({ SERVICE: 'WMS', VERSION: '1.3.0', ...params });
}

async function bottomLayers(source, signal) {
  if (layerCatalogs.has(source.type)) return layerCatalogs.get(source.type);
  const response = await fetch(wmsUrl(source, { REQUEST: 'GetCapabilities' }), { signal });
  if (!response.ok) throw new Error('EMODnet katman listesi alınamadı');
  const xml = new DOMParser().parseFromString(await response.text(), 'application/xml');
  if (xml.documentElement.localName !== 'WMS_Capabilities') throw new Error('Beklenmeyen katman yanıtı');
  const layers = [...xml.getElementsByTagNameNS('*', 'Layer')].flatMap(layer => {
    const child = name => [...layer.children].find(item => item.localName === name)?.textContent.trim() || '';
    const name = child('Name');
    const title = child('Title');
    const queryable = layer.closest('[queryable]')?.getAttribute('queryable');
    return name && queryable === '1' ? [{ name, title }] : [];
  });
  const candidates = layers.filter(({ name, title }) => source.type === 'substrate'
    ? /substrat/i.test(name + ' ' + title) && /250[ ,._]?000|250k/i.test(name + ' ' + title)
    : /seagrass|posidonia|cymodocea|zostera/i.test(name + ' ' + title) &&
      !/potential|suitability|probability|confidence|model|sample|point/i.test(name + ' ' + title));
  if (!candidates.length) throw new Error('Sorgulanabilir EMODnet katmanı bulunamadı');
  layerCatalogs.set(source.type, candidates);
  return candidates;
}

function classifyBottom(properties) {
  const values = Object.entries(properties).filter(([key, value]) =>
    typeof value === 'string' && /substr|folk|sediment|class|legend|description|label|^name$/i.test(key));
  for (const [, value] of values) {
    const label = value.trim();
    if (/mixed|heterogeneous/i.test(label)) return 'Karışık zemin';
    if (/muddy sand|sand and mud/i.test(label)) return 'Çamurlu kum';
    if (/sandy mud|mud and sandy mud/i.test(label)) return 'Kumlu çamur';
    if (/rock|bedrock/i.test(label)) return 'Kaya / sert zemin';
    if (/gravel|coarse sediment/i.test(label)) return 'Çakıl / iri tortu';
    if (/mud|clay|silt/i.test(label)) return 'Çamur / ince tortu';
    if (/\bsands?\b/i.test(label)) return 'Kum';
  }
  return '';
}

async function queryBottom(source, spot, signal) {
  const layers = await bottomLayers(source, signal);
  const name = [...new Set(layers.map(layer => layer.name))].slice(0, 4).join(',');
  const delta = .005;
  // EPSG:4326 uses latitude, longitude axis order in WMS 1.3.
  const response = await fetch(wmsUrl(source, {
    REQUEST: 'GetFeatureInfo', CRS: 'EPSG:4326', LAYERS: name, QUERY_LAYERS: name,
    BBOX: [spot.lat - delta, spot.lon - delta, spot.lat + delta, spot.lon + delta].join(','),
    STYLES: '', WIDTH: 101, HEIGHT: 101, I: 50, J: 50, FORMAT: 'image/png',
    INFO_FORMAT: 'application/json', FEATURE_COUNT: 5
  }), { signal });
  if (!response.ok) throw new Error('Dip verisi alınamadı');
  const data = await response.json();
  if (!Array.isArray(data.features)) throw new Error('Beklenmeyen dip verisi');
  if (source.type === 'grass') {
    const recorded = data.features.some(item => item.properties &&
      Object.entries(item.properties).some(([key, value]) => /habitat|species|class|eunis|^name$/i.test(key) &&
        /seagrass|posidonia|cymodocea|zostera/i.test(String(value)) &&
        !/unknown|absence|no seagrass|potential|suitability/i.test(String(value))));
    return recorded ? 'Deniz çayırı kaydı' : '';
  }
  return data.features.map(item => classifyBottom(item.properties || {})).find(Boolean) || '';
}

function bottomResult(results) {
  const labels = results.flatMap(result => result.status === 'fulfilled' && result.value ? [result.value] : []);
  const partial = results.some(result => result.status === 'rejected');
  return { label: labels.join(' + '), text: labels.length
    ? labels.join(' · ') + ' · EMODnet' + (partial ? ' · Bazı katmanlar sorgulanamadı.' : '')
    : partial ? 'Dip verisi doğrulanamadı. Bazı katmanlara erişilemiyor.'
      : 'Bu koordinatta dip sınıfı kaydı bulunamadı.' };
}

async function renderBottomMap() {
  bottomMapRequest?.abort();
  bottomPointRequest?.abort();
  const detail = $('bottom-map');
  const plot = $('bottom-map-image');
  const status = $('bottom-map-status');
  const legend = $('bottom-map-legend');
  plot.replaceChildren();
  legend.replaceChildren();
  if (!detail.open || activeSpot.water === 'fresh') return;
  const controller = new AbortController();
  bottomMapRequest = controller;
  const timer = setTimeout(() => controller.abort(), 12000);
  status.textContent = 'EMODnet harita katmanları yükleniyor…';
  const { lat, lon } = activeSpot;
  const dLat = Math.min(.025, 90 - Math.abs(lat));
  const dLon = Math.min(.05, 180 - Math.abs(lon));
  if (dLat <= 0 || dLon <= 0) {
    clearTimeout(timer);
    status.textContent = 'Bu koordinat için harita açılamadı.';
    return;
  }
  const bbox = [lat - dLat, lon - dLon, lat + dLat, lon + dLon].join(',');
  try {
    const results = await Promise.allSettled(bottomSources.map(async source => ({
      source, layers: await bottomLayers(source, controller.signal)
    })));
    if (bottomMapRequest !== controller || !detail.open) return;
    const available = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
    if (!available.length) {
      status.textContent = 'Harita katmanlarına şu an erişilemiyor.';
      return;
    }
    let loadedImages = 0;
    let failedImages = 0;
    for (const { source, layers } of available) {
      const names = [...new Set(layers.map(layer => layer.name))].slice(0, 4);
      const image = el('img', '');
      image.alt = '';
      image.onload = () => { loadedImages++; };
      image.onerror = () => {
        failedImages++;
        if (failedImages === available.length && !loadedImages && plot.contains(image)) {
          status.textContent = 'Harita görüntüsü alınamadı. Nokta sorgusunu yine de deneyebilirsin.';
        }
      };
      image.src = wmsUrl(source, { REQUEST: 'GetMap', CRS: 'EPSG:4326', BBOX: bbox,
        WIDTH: 640, HEIGHT: 420, LAYERS: names.join(','), STYLES: '', TRANSPARENT: 'TRUE', FORMAT: 'image/png' });
      plot.append(image);
      for (const name of names) {
        const link = el('a', (source.type === 'substrate' ? 'Zemin' : 'Çayır') + ' renk anahtarı');
        link.href = wmsUrl(source, { REQUEST: 'GetLegendGraphic', VERSION: '1.1.1', FORMAT: 'image/png', LAYER: name });
        link.target = '_blank';
        link.rel = 'noopener';
        legend.append(link);
      }
    }
    const target = el('button', '');
    target.type = 'button';
    target.setAttribute('aria-label', 'Haritada dip verisi sorgula');
    target.onclick = async event => {
      const bounds = target.getBoundingClientRect();
      const x = event.detail ? Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)) : .5;
      const y = event.detail ? Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)) : .5;
      const point = { lat: lat + dLat * (1 - 2 * y), lon: lon + dLon * (2 * x - 1) };
      target.style.setProperty('--pin-x', 100 * x + '%');
      target.style.setProperty('--pin-y', 100 * y + '%');
      bottomPointRequest?.abort();
      const query = new AbortController();
      bottomPointRequest = query;
      const timeout = setTimeout(() => query.abort(), 12000);
      status.textContent = 'Seçilen nokta sorgulanıyor…';
      try {
        const values = await Promise.allSettled(bottomSources.map(source => queryBottom(source, point, query.signal)));
        if (bottomPointRequest !== query || !plot.contains(target)) return;
        status.textContent = point.lat.toFixed(5) + ', ' + point.lon.toFixed(5) + ' · ' + bottomResult(values).text;
      } finally { clearTimeout(timeout); }
    };
    plot.append(target);
    status.textContent = 'EMODnet · Mera merkezde. Dip bilgisini görmek için haritada bir noktaya dokun.' +
      (available.length < bottomSources.length ? ' Bazı katmanlar yüklenemedi.' : '');
  } finally { clearTimeout(timer); }
}

function renderBottom() {
  $('bottom-panel').hidden = activeSpot.water === 'fresh';
  $('bottom-status').textContent = bottom.text;
}

async function loadBottom() {
  bottomRequest?.abort();
  const controller = new AbortController();
  bottomRequest = controller;
  const spot = activeSpot;
  bottom = { text: spot.water === 'fresh' ? '' : 'EMODnet dip verisi sorgulanıyor…' };
  renderBottom();
  if (spot.water === 'fresh') return;
  $('bottom-refresh').disabled = true;
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const results = await Promise.allSettled(bottomSources.map(source => queryBottom(source, spot, controller.signal)));
    if (bottomRequest !== controller) return;
    bottom = bottomResult(results);
    renderBottom();
    renderForecast();
  } finally {
    clearTimeout(timer);
    if (bottomRequest === controller) $('bottom-refresh').disabled = false;
  }
}
let activeSpot = spots.find(spot => spot.id === read('mera:active', 'mudanya')) || spots[0];
let mode = read('mera:mode', 'shore');
$('mode').value = mode;
$('wave-limit').value = read('mera:wave-limit', '') ?? '';
let heatRequest;
let hours = [];
let forecastState = 'loading';
function matchesMode(item) { return (item.water === 'fresh') === (mode === 'fresh'); }
function modeSpots() { return spots.filter(matchesMode); }
function refreshSpecies() {
  const filtered = Object.entries(fish).filter(([, item]) => matchesMode(item)).map(([id, item]) => [id, item.name]);
  fillSelect($('species'), filtered, read('mera:species:' + mode, read('mera:species', 'levrek')));
  fillSelect($('log-fish'), filtered, $('species').value);
}
if (!matchesMode(activeSpot)) activeSpot = modeSpots()[0];
let request;
let selectedView = 'today';
let selectedMetric = 'wind';
let comparisonRequest;
const metrics = {
  air: ['Hava sıcaklığı', '°C'], rain: ['Yağış ihtimali', '%'], clouds: ['Bulutluluk', '%'],
  wind: ['Rüzgâr', 'km/sa'], wave: ['Dalga', 'm'], pressure: ['Basınç', 'hPa'],
  water: ['Su sıcaklığı', '°C'], current: ['Akıntı', 'm/sn']
};
refreshSpecies();
$('log-form').elements.date.value = localTime();
function refreshSpots() {
  fillSelect($('spot'), modeSpots().map(spot => [spot.id, spot.name]), activeSpot.id);
  fillSelect($('compare-spot'), modeSpots().filter(spot => spot.id !== activeSpot.id).map(spot => [spot.id, spot.name]), $('compare-spot').value);
  clearComparison();
  resetHeat();
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
function fetchMarine(spot, url, signal) {
  return spot.water === 'fresh' ? Promise.resolve(null) : getData(url, signal).catch(() => null);
}
function combine(weather, marine) {
  const indexes = new Map((marine?.hourly?.time || []).map((time, index) => [time, index]));
  const days = new Map(weather.daily.time.map((day, index) => [day, index]));
  return weather.hourly.time.map((time, index) => {
    const marineIndex = indexes.get(time);
    const day = days.get(time.slice(0, 10));
    return {
      time, gust: weather.hourly.wind_gusts_10m?.[index], wind: weather.hourly.wind_speed_10m[index], pressure: weather.hourly.pressure_msl[index],
      air: weather.hourly.temperature_2m?.[index], rain: weather.hourly.precipitation_probability?.[index],
      clouds: weather.hourly.cloud_cover?.[index], windDirection: weather.hourly.wind_direction_10m?.[index],
      wavePeriod: marine?.hourly?.wave_period?.[marineIndex], currentDirection: marine?.hourly?.ocean_current_direction?.[marineIndex],
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
  forecastState = 'loading';
  $('status').textContent = spot.name + ' için tahmin yükleniyor…';
  renderForecast();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const [weatherUrl, marineUrl] = urls(spot);
    const marinePromise = fetchMarine(spot, marineUrl, controller.signal);
    const weather = await getData(weatherUrl, controller.signal);
    const marine = await marinePromise;
    if (request !== controller) return;
    hours = combine(weather, marine);
    const fetchedAt = Date.now();
    write(key, { hours, at: fetchedAt });
    forecastState = 'fresh';
    $('status').textContent = spot.water === 'fresh' ? 'Open-Meteo hava modeli · Göl su verisi yok' : hours.some(item => Number.isFinite(item.wave) || Number.isFinite(item.water))
      ? 'Open-Meteo hava ve deniz modeli'
      : 'Open-Meteo hava modeli · Deniz verisi eksik';
    $('status').textContent += ' · Alındı: ' + dateFormat.format(fetchedAt);
  } catch {
    if (request !== controller) return;
    forecastState = 'cached';
    $('status').textContent = cached
      ? 'Güncellenemedi · Son alınan tahmin: ' + dateFormat.format(cached.at)
      : 'Tahmin alınamadı. Bağlantını kontrol edip tekrar dene.';
  } finally {
    clearTimeout(timer);
    if (request === controller) renderForecast();
  }
}
function score(hour) {
  const factors = [
    [hour.wind, 40, 'rüzgâr'],
    [hour.gust, 55, 'rüzgâr hamlesi'],
    [hour.rain, 100, 'yağış ihtimali'],
    [hour.wave, 1.5, 'dalga']
  ].filter(([value]) => Number.isFinite(value));
  return { value: factors.length ? 100 - 100 * factors.reduce((sum, [value, range]) =>
    sum + Math.min(1, Math.max(0, value / range)), 0) / factors.length : 0 };
}
function best(items) {
  // Compare hours using fields available for every candidate.
  const usable = items.filter(hour => Number.isFinite(hour.wind) && (mode === 'fresh' || Number.isFinite(hour.wave)));
  const fields = ['gust', 'rain', 'wave'].filter(key => usable.every(hour => Number.isFinite(hour[key])));
  return usable.reduce((winner, item) => {
    const comparable = { wind: item.wind };
    for (const key of fields) comparable[key] = item[key];
    const result = score(comparable);
    return !winner || result.value > winner.result.value ? { item, result } : winner;
  }, null);
}
const habitatProfiles = {
  mirmir: { bottom: ['Kum', 'Çamurlu kum'], time: 'night', source: 'https://fishes-fnam.linnaeus.naturalis.nl/linnaeus_ng/app/views/species/taxon.php?id=109666' },
  levrek: { bottom: ['Kum', 'Kaya / sert zemin'], time: 'twilight', source: 'https://www.fishbase.org/Ecology/Dicentrarchus_labrax' },
  isparoz: { bottom: ['Deniz çayırı kaydı', 'Kum'], source: 'https://www.fishbase.org/Ecology/Diplodus_annularis' },
  istavrit: { time: 'edges', source: 'https://www.baliksende.com/nokta/bursa/mudanya/mudanya' }
};

function fishingLight(hour) {
  const stamp = Date.parse(hour.time + '+03:00');
  const sunrise = Date.parse(hour.sunrise + '+03:00');
  const sunset = Date.parse(hour.sunset + '+03:00');
  if (![stamp, sunrise, sunset].every(Number.isFinite)) return '';
  if (Math.min(Math.abs(stamp - sunrise), Math.abs(stamp - sunset)) <= 90 * 60000) return 'twilight';
  return stamp < sunrise || stamp > sunset ? 'night' : 'day';
}

function speciesSuggestions(items, dipLabel) {
  const grounds = dipLabel ? dipLabel.split(' + ') : [];
  const substrateKnown = grounds.some(ground => ground !== 'Deniz çayırı kaydı');
  return Object.entries(fish).filter(([, species]) => matchesMode(species)).flatMap(([key, species]) => {
    const profile = habitatProfiles[key];
    if (!profile) return [];
    const matchingGround = profile?.bottom?.find(ground => grounds.includes(ground));
    if (profile?.bottom && substrateKnown && !matchingGround) return [];
    const candidates = items.filter(hour => {
      if (!species.months.includes(Number(hour.time.slice(5, 7)))) return false;
      if (!profile?.time) return true;
      const light = fishingLight(hour);
      return light === profile.time || (profile.time === 'edges' && (light === 'twilight' || light === 'night'));
    });
    const peak = best(candidates);
    if (!peak) return [];
    const reasons = [matchingGround ? matchingGround + ' · EMODnet' : profile?.bottom
      ? 'Uyumlu dip kaydı yok' : 'Zemin eşleşmesi kullanılmadı', 'Bölgesel sezon rehberi'];
    if (profile?.time === 'night') reasons.push('Gece · av rehberi');
    if (profile?.time === 'twilight') reasons.push('Alacakaranlık · av rehberi');
    if (profile?.time === 'edges') reasons.push('Alacakaranlık veya gece · av rehberi');
    return [{ species, profile, peak, reasons, matchingGround }];
  }).sort((a, b) => Number(Boolean(b.matchingGround)) - Number(Boolean(a.matchingGround))
    || b.peak.result.value - a.peak.result.value);
}

function suggestionCard(items) {
  const card = el('article', '', 'species-card');
  card.append(el('h2', 'Bu merada hangi balık denenebilir?'));
  const results = speciesSuggestions(items, bottom.label);
  if (!results.length) {
    card.append(el('p', 'Kalan saatler için sezon, habitat ve koşul eşleşmesi bulunamadı.', 'muted'));
    return card;
  }
  for (const result of results.slice(0, 3)) {
    const item = el('div', '', 'species-pick');
    item.append(el('h3', result.species.name + ' · ' + result.peak.item.time.slice(11, 16)),
      el('p', conditionSummary(result.peak.item)),
      el('p', result.reasons.join(' · '), 'muted'),
      el('p', result.species.bait + ' · ' + result.species.rig));
    const source = el('a', 'Tür kaynağı');
    source.href = result.profile.source;
    source.target = '_blank';
    source.rel = 'noopener';
    item.append(source);
    card.append(item);
  }
  card.append(el('small', 'Habitat ve av rehberine göre deneme önerisi. Türün o anda merada bulunduğuna dair canlı kayıt yok.'));
  return card;
}
function conditionSummary(hour) {
  return 'Rüzgâr ' + format(hour.wind, 'km/sa') +
    (mode !== 'fresh' ? ' · Dalga ' + format(hour.wave, 'm') : '') +
    ' · Yağış ' + format(hour.rain, '%');
}
function format(value, unit) {
  return Number.isFinite(value) ? new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(value) + ' ' + unit : '—';
}
function renderMoon(day) {
  const noon = Date.parse(day + 'T12:00:00+03:00');
  const period = 29.53059;
  const elapsed = (noon - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;
  const age = ((elapsed % period) + period) % period;
  const phases = ['Yeni ay', 'Büyüyen hilal', 'İlk dördün', 'Büyüyen şişkin ay',
    'Dolunay', 'Küçülen şişkin ay', 'Son dördün', 'Küçülen hilal'];
  const phase = phases[Math.round(age / period * 8) % 8];
  // Approximate lunar transit from elongation and local mean solar noon.
  const transit = 15 - activeSpot.lon / 15 + age / period * 24;
  const clock = hour => {
    const minutes = ((Math.round(hour * 60) % 1440) + 1440) % 1440;
    return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
  };
  const window = hour => clock(hour - 1) + '–' + clock(hour + 1);
  const card = el('article', '');
  card.append(el('h2', 'Solunar av saatleri'),
    el('p', phase + ' · Ana pencereler ' + window(transit) + ' ve ' + window(transit + 12)),
    el('small', 'Ay evresi ve meranın boylamıyla yaklaşık hesaplanır. Ay doğuşu ve batışına bağlı kısa pencereler dahil değildir.'));
  $('moon-content').replaceChildren(card);
}
function renderWaveLimit(items) {
  $('boat-card').hidden = mode !== 'boat';
  const limit = $('wave-limit').valueAsNumber;
  const waves = items.filter(item => Number.isFinite(item.wave));
  const warnings = waves.filter(item => item.wave >= limit);
  let message = 'Kendi dalga eşiğini gir.';
  if (Number.isFinite(limit) && $('wave-limit').validity.valid) {
    message = !waves.length ? 'Kalan saatler için dalga verisi yok.' : warnings.length
      ? 'Eşik aşımı: ' + warnings.map(item => item.time.slice(11, 16) + ' (' + format(item.wave, 'm') + ')').join(', ')
      : 'Verisi olan kalan saatlerde girilen eşiğe ulaşılmıyor.';
  }
  $('wave-status').textContent = message;
}
function saveReminder(time, spot, species) {
  const stamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const escape = value => value.replace(/[\\;,]/g, '\\$&').replace(/[\r\n]/g, ' ');
  const start = new Date(time + '+03:00');
  const calendar = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mera//Av Takvimi//TR',
    'BEGIN:VEVENT', 'UID:' + crypto.randomUUID() + '@mera', 'DTSTAMP:' + stamp(new Date()),
    'DTSTART:' + stamp(start), 'DTEND:' + stamp(new Date(+start + 3600000)),
    'SUMMARY:' + escape(species + ' avı · ' + spot), 'BEGIN:VALARM', 'TRIGGER:-PT30M',
    'ACTION:DISPLAY', 'DESCRIPTION:Av saati yaklaşıyor', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
  const blob = new Blob([calendar], { type: 'text/calendar;charset=utf-8' });
  const anchor = el('a', '');
  anchor.download = 'mera-av-hatirlatmasi.ics';
  anchor.href = URL.createObjectURL(blob);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(anchor.href), 30000);
}
function resetHeat() {
  heatRequest?.abort();
  heatRequest = undefined;
  $('heat-button').disabled = false;
  $('heat-result').replaceChildren();
}
async function loadHeatMap() {
  resetHeat();
  const controller = new AbortController();
  heatRequest = controller;
  const button = $('heat-button');
  const result = $('heat-result');
  const now = Date.parse(localTime().slice(0, 13) + ':00+03:00');
  const nearby = modeSpots().sort((a, b) =>
    Math.hypot(a.lat - activeSpot.lat, a.lon - activeSpot.lon) -
    Math.hypot(b.lat - activeSpot.lat, b.lon - activeSpot.lon)).slice(0, 8);
  button.disabled = true;
  result.textContent = 'Mera puanları yükleniyor…';
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const entries = await Promise.allSettled(nearby.map(async spot => {
      const [weatherUrl, marineUrl] = urls(spot);
      const [weather, marine] = await Promise.all([
        getData(weatherUrl, controller.signal), fetchMarine(spot, marineUrl, controller.signal)
      ]);
      if (controller.signal.aborted) throw new Error('Zaman aşımı');
      const forecast = combine(weather, marine).filter(hour => {
        const time = Date.parse(hour.time + '+03:00');
        return time >= now && time < now + 86400000;
      });
      return { spot, forecast };
    }));
    if (heatRequest !== controller) return;
    const ready = entries.flatMap(entry => entry.status === 'fulfilled' && entry.value.forecast.length ? [entry.value] : []);
    if (!ready.length) {
      result.textContent = 'Harita için tahmin alınamadı.';
      return;
    }
    const maps = ready.map(entry => new Map(entry.forecast.map(hour => [hour.time, hour])));
    const shared = [...maps[0].keys()].filter(time => maps.every(map => map.has(time)));
    if (!shared.length) {
      result.textContent = 'Ortak tahmin saati bulunamadı.';
      return;
    }
    const common = shared.map(time => {
      const set = maps.map(map => map.get(time));
      return set.map(hour => ({
        ...hour, water: set.every(item => Number.isFinite(item.water)) ? hour.water : undefined,
        wave: set.every(item => Number.isFinite(item.wave)) ? hour.wave : undefined
      }));
    });
    const points = ready.flatMap(({ spot }, index) => {
      const peak = best(common.map(set => set[index]));
      return peak ? [{ spot, value: Math.round(peak.result.value) }] : [];
    });
    if (!points.length) {
      result.textContent = 'Harita için yeterli rüzgâr ve dalga verisi yok.';
      return;
    }
    result.replaceChildren(el('p', 'Koşul endeksi · ' + points.length + '/' + nearby.length + ' mera'));
    const plot = el('div', '', 'heat-map');
    plot.setAttribute('aria-label', 'Meraların yaklaşık konumları. Üst taraf kuzey.');
    const list = el('div', '', 'heat-list');
    const lats = points.map(({ spot }) => spot.lat);
    const lons = points.map(({ spot }) => spot.lon);
    const latMin = Math.min(...lats) - .02;
    const lonMin = Math.min(...lons) - .02;
    const latSpan = Math.max(...lats) + .02 - latMin;
    const lonSpan = Math.max(...lons) + .02 - lonMin;
    for (const { spot, value } of points) {
      const pin = el('button', value, 'heat-point');
      pin.style.left = (100 * (spot.lon - lonMin) / lonSpan) + '%';
      pin.style.top = (100 * (1 - (spot.lat - latMin) / latSpan)) + '%';
      pin.style.background = 'hsl(' + Math.round(value * 1.2) + ' 73% 68%)';
      pin.setAttribute('aria-label', spot.name + ' ' + value + ' puan');
      pin.onclick = () => changeSpot(spot);
      plot.append(pin);
      list.append(el('p', spot.name + ' · ' + value + ' / 100'));
    }
    result.append(plot, list);
  } finally {
    clearTimeout(timer);
    if (heatRequest === controller) button.disabled = false;
  }
}
function metricCard(items) {
  const card = el('article', '');
  const buttons = el('div', '', 'metrics');
  const chart = el('div', '', 'chart');
  const heading = el('h3', '');
  card.append(el('h2', 'Deniz ve hava'), buttons, heading, chart);
  const visibleMetrics = Object.entries(metrics).filter(([key]) =>
    mode !== 'fresh' || !['wave', 'water', 'current'].includes(key));
  if (!visibleMetrics.some(([key]) => key === selectedMetric)) selectedMetric = 'wind';
  const compass = degrees => Number.isFinite(degrees)
    ? ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'][Math.round(degrees / 45) % 8] : '';
  const current = items[0];
  const hints = { wave: Number.isFinite(current.wavePeriod) ? format(current.wavePeriod, 'sn') : '',
    wind: compass(current.windDirection), current: compass(current.currentDirection) };
  for (const [key, [name, unit]] of visibleMetrics) {
    const button = el('button', '');
    button.dataset.metric = key;
    button.append(el('small', name), el('strong', format(current[key], unit)));
    if (hints[key]) button.append(el('small', hints[key]));
    button.onclick = () => {
      selectedMetric = key;
      showMetric();
    };
    buttons.append(button);
  }
  function showMetric() {
    const [name, unit] = metrics[selectedMetric];
    heading.textContent = name + ' · Saatlik';
    heading.style.marginTop = '14px';
    for (const button of buttons.children) {
      button.setAttribute('aria-pressed', String(button.dataset.metric === selectedMetric));
    }
    const values = items.map(item => item[selectedMetric]).filter(Number.isFinite);
    const baseline = selectedMetric === 'pressure' && values.length ? Math.floor(Math.min(...values)) - 1 : Math.min(0, ...values);
    const max = Math.max(1, ...values.map(value => value - baseline));
    chart.replaceChildren();
    for (const item of items) {
      const value = item[selectedMetric];
      const row = el('div', '', 'chart-row');
      const bar = Number.isFinite(value) ? el('progress', '') : el('span', '');
      if (Number.isFinite(value)) {
        bar.max = max;
        bar.value = value - baseline;
        bar.setAttribute('aria-hidden', 'true');
      }
      row.append(el('span', item.time.slice(11, 16)), bar, el('span', format(value, unit)));
      chart.append(row);
    }
  }
  showMetric();
  return card;
}
function clearComparison() {
  comparisonRequest?.abort();
  comparisonRequest = undefined;
  $('compare-button').disabled = false;
  $('compare-result').replaceChildren();
}
async function compareSpots() {
  clearComparison();
  const other = spots.find(spot => spot.id === $('compare-spot').value);
  if (!other) return;
  const selected = activeSpot;
  const output = $('compare-result');
  const controller = new AbortController();
  comparisonRequest = controller;
  const timer = setTimeout(() => controller.abort(), 12000);
  $('compare-button').disabled = true;
  output.textContent = 'Tahminler karşılaştırılıyor…';
  try {
    const forecasts = await Promise.all([selected, other].map(async spot => {
      const [weatherUrl, marineUrl] = urls(spot);
      const [weather, marine] = await Promise.all([
        getData(weatherUrl, controller.signal),
        fetchMarine(spot, marineUrl, controller.signal)
      ]);
      return combine(weather, marine);
    }));
    if (comparisonRequest !== controller) return;
    if (controller.signal.aborted) throw new Error('Tahmin zaman aşımına uğradı');
    const start = localTime().slice(0, 13);
    const secondByTime = new Map(forecasts[1].map(hour => [hour.time, hour]));
    const shared = forecasts[0].filter(hour => hour.time.slice(0, 13) >= start && secondByTime.has(hour.time));
    if (!shared.length) {
      output.textContent = 'Karşılaştırılabilecek ortak tahmin saati bulunamadı.';
      return;
    }
    const pairs = shared.map(hour => [hour, secondByTime.get(hour.time)]);
    const fields = ['wave', 'gust', 'rain'];
    const comparable = pairs.map(pair => pair.map(hour => {
      const copy = { ...hour };
      for (const key of fields) {
        if (!pair.every(item => Number.isFinite(item[key]))) copy[key] = undefined;
      }
      return copy;
    }));
    output.replaceChildren(el('p', 'Ortak saatlerde hava ve deniz karşılaştırması'));
    for (const [index, spot] of [selected, other].entries()) {
      const peak = best(comparable.map(pair => pair[index]));
      output.append(el('p', spot.name + ' · ' + (peak ? dateFormat.format(new Date(peak.item.time + '+03:00')) + ' · ' + conditionSummary(peak.item) : 'Eksik model verisi')));
    }
  } catch {
    if (comparisonRequest === controller) output.textContent = 'Karşılaştırma yüklenemedi. Tekrar deneyebilirsin.';
  } finally {
    clearTimeout(timer);
    if (comparisonRequest === controller) $('compare-button').disabled = false;
  }
}
function renderForecast() {
  const today = $('today-content');
  const plan = $('plan-content');
  today.replaceChildren();
  plan.replaceChildren();
  $('today').querySelector('h1').textContent = activeSpot.name + ' · Bugün';
  const now = localTime();
  const upcoming = hours.filter(item => item.time.slice(0, 13) >= now.slice(0, 13));
  const todaysHours = upcoming.filter(item => item.time.slice(0, 10) === now.slice(0, 10));
  const speciesKey = $('species').value;
  const species = fish[speciesKey];
  renderMoon(now.slice(0, 10));
  renderWaveLimit(forecastState === 'fresh' ? todaysHours : []);
  if (!upcoming.length || forecastState !== 'fresh') {
    const card = el('article', '', 'hero');
    card.append(el('h2', forecastState === 'loading' ? 'Tahmin yükleniyor…' : 'Güncel tahmin alınamadı'));
    if (upcoming.length) {
      card.append(el('p', 'Son alınan tahmin · ' + upcoming[0].time.slice(11, 16)),
        el('p', conditionSummary(upcoming[0]), 'muted'));
    }
    const refresh = el('button', 'Tahmini yenile');
    refresh.disabled = forecastState === 'loading';
    refresh.onclick = loadForecast;
    card.append(refresh);
    today.append(card);
    plan.append(el('p', 'Plan için güncel tahmin bekleniyor.'));
    return;
  }

  const hero = el('article', '', 'hero');
  const top = best(todaysHours);
  if (top) {
    hero.append(el('h2', 'Bugün daha sakin görünen saat'), el('div', top.item.time.slice(11, 16), 'trip-time'),
      el('p', conditionSummary(top.item)), el('small', 'Saat önerisi hava ve deniz koşullarına göre sıralanır.'));
  } else {
    hero.append(el('h2', 'Bugün için saat önerisi yok'),
      el('p', 'Kalan saatler için öneriye yetecek rüzgâr ve dalga verisi bulunamadı.'));
  }
  if (mode !== 'fresh') {
    const official = el('a', 'MGM deniz tahmini');
    official.href = 'https://www.mgm.gov.tr/deniz/';
    official.target = '_blank';
    official.rel = 'noopener';
    hero.append(el('div', '', 'official-link'));
    hero.lastElementChild.append(official);
  }
  today.append(hero);

  if (todaysHours.length) {
    const cards = el('div', '', 'quick-conditions');
    const next = todaysHours[0];
    const fields = [['Rüzgâr', format(next.wind, 'km/sa')], [mode === 'fresh' ? 'Hamle' : 'Dalga',
      mode === 'fresh' ? format(next.gust, 'km/sa') : format(next.wave, 'm')], ['Yağış', format(next.rain, '%')]];
    for (const [label, value] of fields) {
      const item = el('div', '', 'quick-condition');
      item.append(el('small', label), el('strong', value));
      cards.append(item);
    }
    const details = el('details', '');
    details.append(el('summary', 'Saatlik hava ve deniz grafikleri'), metricCard(todaysHours));
    today.append(el('h2', 'Saat ' + next.time.slice(11, 16) + ' tahmini', 'section-heading'), cards, details);
  }

  const guide = el('article', '');
  guide.append(el('h2', species.name), el('p', species.bait + ' · ' + species.rig));
  if (bottom.label) guide.append(el('p', 'Dip · ' + bottom.label + ' · EMODnet', 'muted'));
  const trips = records.filter(entry => entry.spot === activeSpot.name && entry.fish === speciesKey);
  if (trips.length) guide.append(el('small', 'Av defterin · ' + trips.filter(entry => Number(entry.count) > 0).length +
    ' sonuç veren av / ' + trips.length + ' kayıt'));
  today.append(suggestionCard(todaysHours), guide);

  const dates = new Map();
  for (const item of upcoming) {
    const date = item.time.slice(0, 10);
    if (!dates.has(date)) dates.set(date, []);
    dates.get(date).push(item);
  }
  for (const [date, items] of dates) {
    const pick = best(items);
    const card = el('article', '', 'plan-day');
    card.append(el('h2', dayFormat.format(new Date(date + 'T12:00:00+03:00'))));
    const speciesPick = speciesSuggestions(items, bottom.label)[0];
    if (speciesPick) card.append(el('p', 'Tür önerisi · ' + speciesPick.species.name + ' · ' + speciesPick.peak.item.time.slice(11, 16), 'muted'));
    if (pick) {
      card.append(el('p', pick.item.time.slice(11, 16) + ' · ' + conditionSummary(pick.item)));
      const reminder = el('button', 'Takvime ekle', 'calendar-button');
      reminder.onclick = () => saveReminder(pick.item.time, activeSpot.name, species.name);
      card.append(reminder);
    } else card.append(el('p', 'Saat önerisi için eksik model verisi.', 'muted'));
    plan.append(card);
  }
}
function renderFish() {
  const guide = $('fish-content');
  const months = new Intl.DateTimeFormat('tr-TR', { timeZone: 'UTC', month: 'long' });
  guide.replaceChildren();
  const selected = Number($('season').value);
  for (const item of Object.values(fish).filter(item => matchesMode(item) && (!selected || item.months.includes(selected)))) {
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
  loadBottom();
  renderBottomMap();
  loadForecast();
}
function renderLog() {
  const list = $('log-content');
  list.replaceChildren();
  const stats = $('log-stats');
  stats.replaceChildren();
  if (records.length) {
    const total = records.reduce((sum, entry) => sum + Number(entry.count), 0);
    const successful = records.filter(entry => Number(entry.count) > 0).length;
    const card = el('article', '');
    card.append(el('h2', 'Av özeti'), el('p', records.length + ' kayıt · ' + successful + ' sonuç veren kayıt · ' + total + ' balık'));
    stats.append(card);
  }
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
  const spot = { id: crypto.randomUUID(), name, lat: Number(data.get('lat')), lon: Number(data.get('lon')), water: mode === 'fresh' ? 'fresh' : 'sea' };
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
$('bottom-refresh').onclick = loadBottom;
$('bottom-map').ontoggle = renderBottomMap;
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
$('compare-button').onclick = compareSpots;
$('compare-spot').onchange = clearComparison;
const calendar = new Intl.DateTimeFormat('tr-TR', { month: 'long', timeZone: 'UTC' });
for (let month = 0; month < 12; month++) {
  $('season').add(new Option(calendar.format(new Date(Date.UTC(2026, month, 15))), String(month + 1)));
}
$('season').onchange = renderFish;
$('species').onchange = () => {
  clearComparison();
  resetHeat();
  write('mera:species:' + mode, $('species').value);
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
$('mode').onchange = () => {
  mode = $('mode').value;
  write('mera:mode', mode);
  refreshSpecies();
  changeSpot(matchesMode(activeSpot) ? activeSpot : modeSpots()[0]);
  renderFish();
};
$('wave-limit').onchange = () => {
  write('mera:wave-limit', $('wave-limit').value);
  renderForecast();
};
$('heat-button').onclick = loadHeatMap;
refreshSpots();
renderMap();
renderFish();
renderLog();
loadBottom();
loadForecast();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
