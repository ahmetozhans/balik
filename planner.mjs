export const fish = {
  mirmir: { name: 'Mırmır', bait: 'Kırmızı kurt veya kum kurdu', rig: 'Yemli dip takımı' },
  istavrit: { name: 'İstavrit', bait: 'Tüylü çapari', rig: 'İstavrit çaparisi' },
  levrek: { name: 'Levrek', bait: 'Küçük silikon veya karides', rig: 'Hafif spin veya yemli takım' },
  mezgit: { name: 'Mezgit' }, kefal: { name: 'Kefal' }, izmarit: { name: 'İzmarit' },
  isparoz: { name: 'İsparoz' }, gumus: { name: 'Gümüş balığı' }, zargana: { name: 'Zargana' },
  lufer: { name: 'Lüfer' }, palamut: { name: 'Palamut' }, sazan: { name: 'Sazan' },
  turna: { name: 'Turna' }, golGumus: { name: 'Göl gümüşü' }, tatliLevrek: { name: 'Tatlı su levreği' }
};

export const spots = [
  {
    name: 'Gemsaz', district: 'Gemlik', lat: 40.41696, lon: 29.10061, fish: 'mirmir',
    evidence: 'Gemsaz kıyısında 2010 tarihli mırmır avı anlatımı var.',
    source: 'https://oltaatlasi.com/meralar/bursa-gemlik-gemsaz-acik-halk-plaji/',
    hours: 'night', months: [6, 7, 8, 9], localRecord: true
  },
  {
    name: 'Mudanya Sahili', district: 'Mudanya', lat: 40.376, lon: 28.882, fish: 'istavrit',
    evidence: 'Mudanya kıyı rehberi istavrit için sabah erken ve geceyi öne çıkarıyor.',
    source: 'https://www.baliksende.com/nokta/bursa/mudanya/mudanya',
    hours: 'edges'
  },
  {
    name: 'Yeniköy kıyısı', district: 'Karacabey', lat: 40.396111, lon: 28.381666, fish: 'levrek',
    evidence: 'Karacabey kıyı rehberi levreği olası hedef olarak gösteriyor. Yeniköy’e özel av kaydı yok.',
    source: 'https://www.balikav.com/mera/karacabey-sahili',
    hours: 'night'
  }
];

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
  if (now < rise || now >= set) return true;
  return preferred === 'edges' && Math.min(now - rise, set - now) <= 90 * 60000;
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
