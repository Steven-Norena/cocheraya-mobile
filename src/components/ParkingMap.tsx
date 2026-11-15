import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { cocheraFonts, useCocheraTheme } from '../constants/cocheraya';
import { formatSoles } from '../services/presentation';
import type { ParkingMapProps } from './ParkingMap.types';

export default function ParkingMap({ latitude, longitude, radius, spaces, selectedId, onSelect }: ParkingMapProps) {
  const map = useRef<MapView>(null);
  const colors = useCocheraTheme();
  const delta = radius * 2 / 100000;

  useEffect(() => {
    map.current?.animateToRegion({ latitude, longitude, latitudeDelta: delta, longitudeDelta: delta });
  }, [latitude, longitude, delta]);

  return (
    <MapView ref={map} style={StyleSheet.absoluteFill} initialRegion={{ latitude, longitude, latitudeDelta: delta, longitudeDelta: delta }}>
      {spaces.map(space => {
        const selected = space.id === selectedId;
        const price = formatSoles(space.pricePerHour);
        return (
          <Marker key={space.id} coordinate={{ latitude: space.latitude, longitude: space.longitude }}
            title={space.title + ', ' + price + ' por hora'}
            onPress={() => onSelect(space.id)} zIndex={selected ? 2 : 1}>
            <View style={[styles.marker, { backgroundColor: selected ? colors.accent : colors.surface, borderColor: colors.outline }]}>
              <Text style={{ fontFamily: cocheraFonts.bold, color: selected ? colors.onAccent : colors.ink }}>{price}</Text>
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  marker: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 18, borderWidth: 1 },
});
