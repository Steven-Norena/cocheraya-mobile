const PEN = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

export const formatSoles = (amount: number) => PEN.format(amount);

export const parkingZones = [
  { name: 'Miraflores', latitude: -12.1221, longitude: -77.0298 },
  { name: 'Barranco', latitude: -12.1464, longitude: -77.0219 },
  { name: 'San Isidro', latitude: -12.0955, longitude: -77.0340 },
  { name: 'Surco', latitude: -12.1380, longitude: -77.0088 },
  { name: 'Chorrillos', latitude: -12.1692, longitude: -77.0245 },
];

export function distanceMeters(lat: number, lng: number, toLat: number, toLng: number) {
  const radians = Math.PI / 180;
  const a = Math.sin((toLat - lat) * radians / 2) ** 2
    + Math.cos(lat * radians) * Math.cos(toLat * radians) * Math.sin((toLng - lng) * radians / 2) ** 2;
  return 12_742_000 * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function formatDistance(distance: number) {
  return distance < 1000 ? Math.round(distance) + ' m' : (distance / 1000).toLocaleString('es-PE', { maximumFractionDigits: 1 }) + ' km';
}
