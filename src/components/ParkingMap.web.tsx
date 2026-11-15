import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { LayerGroup, Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cocheraFonts, useCocheraTheme } from '../constants/cocheraya';
import { formatSoles } from '../services/presentation';
import type { ParkingMapProps } from './ParkingMap.types';

const OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_CREDIT = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const CARTO_KEY = process.env.EXPO_PUBLIC_CARTO_API_KEY?.trim();
type Leaflet = typeof import('leaflet');
type LoadedMap = { map: LeafletMap; pins: LayerGroup; leaflet: Leaflet };

export default function ParkingMap({ latitude, longitude, radius, spaces, selectedId, onSelect }: ParkingMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState<LoadedMap>();
  const [unavailable, setUnavailable] = useState(false);
  const [retry, setRetry] = useState(0);
  const colors = useCocheraTheme();

  useEffect(() => {
    let disposed = false;
    let map: LeafletMap | undefined;
    let observer: ResizeObserver | undefined;
    void import('leaflet').then(leaflet => {
      if (disposed || !container.current) return;
      map = leaflet.map(container.current, { scrollWheelZoom: false });
      const instance = map;
      const fallback = leaflet.tileLayer(OSM, { attribution: OSM_CREDIT })
        .on('tileerror', () => setUnavailable(true));
      if (CARTO_KEY) {
        const url = 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=' + encodeURIComponent(CARTO_KEY);
        const carto = leaflet.tileLayer(url, { attribution: OSM_CREDIT + ' &copy; <a href="https://carto.com/attributions">CARTO</a>' });
        carto.on('tileerror', () => {
          if (!instance.hasLayer(carto)) return;
          carto.remove();
          fallback.addTo(instance);
        }).addTo(instance);
      } else {
        fallback.addTo(instance);
      }
      observer = new ResizeObserver(() => instance.invalidateSize());
      observer.observe(container.current);
      setLoaded({ map, pins: leaflet.layerGroup().addTo(map), leaflet });
    }).catch(() => {
      if (!disposed) setUnavailable(true);
    });
    return () => {
      disposed = true;
      observer?.disconnect();
      map?.remove();
    };
  }, [retry]);

  useEffect(() => {
    if (!loaded) return;
    const bounds = loaded.leaflet.latLng(latitude, longitude).toBounds(radius * 2);
    loaded.map.fitBounds(bounds, { padding: [28, 28], maxZoom: 16, animate: false });
  }, [loaded, latitude, longitude, radius]);

  useEffect(() => {
    if (!loaded) return;
    const { leaflet, pins } = loaded;
    pins.clearLayers();
    for (const space of spaces) {
      const selected = space.id === selectedId;
      const price = formatSoles(space.pricePerHour);
      const label = document.createElement('span');
      label.textContent = price;
      Object.assign(label.style, {
        background: selected ? colors.accent : colors.surface, color: selected ? colors.onAccent : colors.ink,
        border: '1px solid ' + colors.outline, borderRadius: '99px', padding: '5px 8px', whiteSpace: 'nowrap',
        fontWeight: '700', boxShadow: '0 1px 4px #211d3540',
      });
      leaflet.marker([space.latitude, space.longitude], {
        icon: leaflet.divIcon({ html: label, className: 'cocheraya-map-price', iconSize: [70, 30], iconAnchor: [35, 29] }),
        title: space.title + ', ' + price + ' por hora',
        zIndexOffset: selected ? 1000 : 0,
      }).on('click', () => onSelect(space.id)).addTo(pins);
    }
  }, [loaded, colors, onSelect, selectedId, spaces]);

  return (
    <>
      <div ref={container} aria-label="Mapa de cocheras" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
      {unavailable && (
        <View style={{ position: 'absolute', top: 8, right: 8, left: 54, padding: 8, borderRadius: 8, backgroundColor: colors.surface }}>
          <Text style={{ color: colors.ink, fontFamily: cocheraFonts.medium }}>El mapa no pudo cargar. Puedes seguir usando la lista.</Text>
          <Text accessibilityRole="button" onPress={() => {
            setLoaded(undefined);
            setUnavailable(false);
            setRetry(value => value + 1);
          }} style={{ color: colors.accent, fontFamily: cocheraFonts.bold, paddingVertical: 10 }}>Recargar mapa</Text>
        </View>
      )}
    </>
  );
}
