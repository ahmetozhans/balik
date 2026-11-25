export const fish = {
  mirmir: { name: 'Mırmır', bait: 'Kırmızı kurt veya kum kurdu', rig: 'Yemli dip takımı' },
  istavrit: { name: 'İstavrit', bait: 'Tüylü çapari', rig: 'İstavrit çaparisi' },
  levrek: { name: 'Levrek', bait: 'Küçük silikon veya karides', rig: 'Hafif spin veya yemli takım' },
  mezgit: { name: 'Mezgit' }, kefal: { name: 'Kefal', bait: 'Ekmek içi veya hamur', rig: 'Şamandıralı takım' }, izmarit: { name: 'İzmarit', bait: 'Kum kurdu veya ince çapari', rig: 'Kısa köstekli dip takımı' },
  isparoz: { name: 'İsparoz', bait: 'Kum kurdu', rig: 'İnce dip takımı' }, gumus: { name: 'Gümüş balığı', bait: 'Mikro çapari', rig: 'İnce şamandıralı takım' }, zargana: { name: 'Zargana' },
  lufer: { name: 'Lüfer (çinekop, sarıkanat)', bait: 'İnce kaşık veya minnow', rig: 'Spin takımı' },
  palamut: { name: 'Palamut', bait: 'Palamut kaşığı veya metal jig', rig: 'Kıyıdan spin' },
  kupes: { name: 'Kupes', bait: 'Karides parçası', rig: 'Hafif yemli takım' }, kolyoz: { name: 'Kolyoz', bait: 'İstavrit tipi çapari', rig: 'Çapari' }, tekir: { name: 'Tekir', bait: 'Kum kurdu', rig: 'Yemli dip takımı' },
  karagoz: { name: 'Karagöz' }, sargoz: { name: 'Sargoz' }, iskorpit: { name: 'İskorpit' },
  dil: { name: 'Dil balığı' }, sarpa: { name: 'Sarpa' }, cipura: { name: 'Çipura' },
  melanurya: { name: 'Melanurya' }, sardalya: { name: 'Sardalya' }, barbun: { name: 'Barbun' },
  uskumru: { name: 'Uskumru' }, eskina: { name: 'Eşkina' },
  sazan: { name: 'Sazan', inland: true },
  turna: { name: 'Turna', inland: true }, golGumus: { name: 'Göl gümüşü', inland: true }, tatliLevrek: { name: 'Tatlı su levreği', inland: true }
};

const mudanyaSource = 'https://www.baliksende.com/nokta/bursa/mudanya/mudanya';
const gemlikSource = 'https://www.baliksende.com/nokta/bursa/gemlik/gemlik';

export const spots = [
  {
    name: 'Gemsaz', district: 'Gemlik', lat: 40.41696, lon: 29.10061,
    targets: [{ fish: 'mirmir', evidence: 'Gemsaz kıyısında 2010 tarihli mırmır avı anlatımı var.',
      source: 'https://oltaatlasi.com/meralar/bursa-gemlik-gemsaz-acik-halk-plaji/',
      hours: 'night', months: [6, 7, 8, 9], localRecord: true }]
  },
  {
    name: 'Mudanya Sahili', district: 'Mudanya', lat: 40.376, lon: 28.882,
    targets: [
      ['istavrit', 'edges'], ['gumus', 'day'], ['izmarit', 'twilight'], ['lufer', 'evening'],
      ['isparoz', 'twilight'], ['kupes', 'day'], ['kolyoz', 'twilight'], ['kefal', 'day'], ['tekir', 'day']
    ].map(([id, hours]) => ({ fish: id, hours, source: mudanyaSource,
      evidence: 'Mudanya kıyı rehberinde bu tür geçiyor. Saat önerisi rehber ve hava-deniz modeline dayanıyor.' }))
  },
  {
    name: 'Gemlik Sahili', district: 'Gemlik', lat: 40.4306, lon: 29.1533,
    targets: [{ fish: 'palamut', hours: 'twilight', source: gemlikSource,
      evidence: 'Bölge rehberi Gemlik çevresini palamut göç güzergâhına yakın gösteriyor. Bu noktaya ait av kaydı yok.' }]
  },
  {
    name: 'Yeniköy kıyısı', district: 'Karacabey', lat: 40.396111, lon: 28.381666,
    targets: [{ fish: 'levrek', hours: 'night', source: 'https://www.balikav.com/mera/karacabey-sahili',
      evidence: 'Karacabey kıyı rehberi levreği olası hedef olarak gösteriyor. Yeniköy’e özel av kaydı yok.' }]
  }
];

export function supportsTarget(id) {
  return spots.some(spot => spot.targets.some(target => target.fish === id));
}

export function forecastTargets(forecasts, id) {
  return forecasts.flatMap(({ spot, hours }) =>
    spot.targets.filter(target => !id || id === target.fish).map(target => ({ spot: { ...spot, ...target }, hours })));
}

export function mapsUrl(spot) {
  return 'https://www.google.com/maps/search/?' + new URLSearchParams({ api: '1', query: spot.lat + ',' + spot.lon });
}

const localClock = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});

export function localTime(now = Date.now()) {
  return localClock.format(now).replace(' ', 'T');
}

export function localDay(offset, now = Date.now()) {
  return localTime(now + offset * 86400000).slice(0, 10);
}

const stamp = time => Date.parse(time + '+03:00');

export function combineForecast(weather, marine) {
  const water = new Map((marine?.hourly?.time || []).map((time, index) => [time, index]));
  const days = new Map(weather.daily.time.map((date, index) => [date, index]));
  return weather.hourly.time.map((time, index) => {
    const day = days.get(time.slice(0, 10));
    return {
      time, wind: weather.hourly.wind_speed_10m[index], rain: weather.hourly.precipitation_probability[index],
      wave: marine?.hourly?.wave_height?.[water.get(time)], sunrise: weather.daily.sunrise[day], sunset: weather.daily.sunset[day]
    };
  });
}

function lightMatches(hour, preferred) {
  const now = stamp(hour.time);
  const rise = stamp(hour.sunrise);
  const set = stamp(hour.sunset);
  if (![now, rise, set].every(Number.isFinite)) return false;
  const atNight = now < rise || now >= set;
  const twilight = Math.min(Math.abs(now - rise), Math.abs(now - set)) <= 90 * 60000;
  if (preferred === 'day') return !atNight;
  if (preferred === 'twilight') return twilight;
  if (preferred === 'evening') return Math.abs(now - set) <= 90 * 60000;
  return atNight || (preferred === 'edges' && twilight);
}

export function hasFutureHour(hours, date, now = Date.now()) {
  return hours.some(hour => hour.time.slice(0, 10) === date && stamp(hour.time) >= now);
}

export function inGuideSeason(spot, date) {
  return !spot.months || spot.months.includes(Number(date.slice(5, 7)));
}

export function pickWindow(spot, hours, date, now = Date.now()) {
  if (!inGuideSeason(spot, date)) return null;
  return chooseWindow(hours, date, now, hour => lightMatches(hour, spot.hours));
}

export function pickWeatherWindow(hours, date, now = Date.now()) {
  return chooseWindow(hours, date, now, () => true);
}

function chooseWindow(hours, date, now, eligible) {
  const candidates = hours.filter(hour => hour.time.slice(0, 10) === date && stamp(hour.time) >= now &&
    Number.isFinite(hour.wind) && Number.isFinite(hour.wave) && eligible(hour));
  const windows = candidates.map((hour, index) => {
    const next = candidates[index + 1];
    const selected = next && stamp(next.time) - stamp(hour.time) === 3600000 ? [hour, next] : [hour];
    return {
      start: hour.time, end: stamp(selected.at(-1).time) + 3600000, samples: selected,
      wind: Math.max(...selected.map(item => item.wind)), wave: Math.max(...selected.map(item => item.wave)),
      rain: selected.every(item => Number.isFinite(item.rain)) ? Math.max(...selected.map(item => item.rain)) : null
    };
  });
  const hasRain = windows.every(window => window.rain !== null);
  for (const window of windows) {
    window.cost = window.wind / 30 + window.wave / 1.5 + (hasRain ? window.rain / 100 : 0);
  }
  return windows.sort((a, b) => a.cost - b.cost || b.samples.length - a.samples.length)[0] || null;
}
