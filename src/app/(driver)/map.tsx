import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Compass, List, Map as MapIcon, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import ParkingMap from '../../components/ParkingMap';
import { cocheraFonts, useCocheraTheme } from '../../constants/cocheraya';
import { useAuth } from '../../context/AuthContext';
import parkingService, { type ParkingSpace } from '../../services/parkingService';
import reservationService from '../../services/reservationService';
import { distanceMeters, formatDistance, formatSoles, parkingZones } from '../../services/presentation';

type SearchState = { key: string; spaces: ParkingSpace[]; error: boolean };
const normalize = (text: string) => text.toLocaleLowerCase('es-PE').normalize('NFD').replace(/\p{Diacritic}/gu, '');

export default function MapScreen() {
  const colors = useCocheraTheme();
  const router = useRouter();
  const { balance, refreshBalance } = useAuth();
  const { height } = useWindowDimensions();
  const submitting = useRef(false);
  const [center, setCenter] = useState(parkingZones[0]);
  const [radius, setRadius] = useState(2000);
  const [query, setQuery] = useState('');
  const [priceFirst, setPriceFirst] = useState(false);
  const [covered, setCovered] = useState(false);
  const [list, setList] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number>();
  const [detail, setDetail] = useState(false);
  const [locationNotice, setLocationNotice] = useState('');
  const [locating, setLocating] = useState(false);
  const [confirm, setConfirm] = useState<ParkingSpace>();
  const [reservationError, setReservationError] = useState('');
  const [reserving, setReserving] = useState(false);
  const [result, setResult] = useState<SearchState>();
  const [retry, setRetry] = useState(0);

  const { latitude, longitude } = center;
  const key = [latitude, longitude, radius, retry].join(',');
  const loading = result?.key !== key;
  const failed = !loading && result.error;
  const search = normalize(query.trim());
  const matches = (loading ? [] : result.spaces)
    .filter(space => space.status === 'AVAILABLE' && normalize(space.title + ' ' + space.address).includes(search)
      && (!covered || space.features?.some(feature => normalize(feature) === 'techado')))
    .map(space => ({ space, distance: distanceMeters(latitude, longitude, space.latitude, space.longitude) }))
    .sort((a, b) => priceFirst ? a.space.pricePerHour - b.space.pricePerHour || a.distance - b.distance : a.distance - b.distance);
  const selected = matches.find(item => item.space.id === selectedId) ?? matches[0];

  const select = useCallback((id: number) => {
    setSelectedId(id);
    setDetail(false);
    setReservationError('');
  }, []);

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    void parkingService.searchNearby({ lat: latitude, lng: longitude, radius }, controller.signal)
      .then(spaces => {
        if (!controller.signal.aborted) setResult({ key, spaces, error: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ key, spaces: [], error: true });
      });
    return () => controller.abort();
  }, [key, latitude, longitude, radius]));

  function changeZone(next: typeof center) {
    setCenter(next);
    setSelectedId(undefined);
    setDetail(false);
    setLocationNotice('');
    setReservationError('');
  }

  async function locate() {
    setLocating(true);
    setLocationNotice('');
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error();
      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, reject) => { timeout = setTimeout(reject, 8000); }),
      ]);
      changeZone({ name: 'Mi ubicación', latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch {
      setLocationNotice('No pudimos obtener tu ubicación. Puedes seguir buscando por zona.');
    } finally {
      clearTimeout(timeout);
      setLocating(false);
    }
  }

  async function reserve() {
    if (!confirm || submitting.current) return;
    submitting.current = true;
    setReserving(true);
    setReservationError('');
    try {
      await reservationService.create(confirm.id);
      void refreshBalance();
      setResult(current => current && { ...current, spaces: current.spaces.filter(space => space.id !== confirm.id) });
      setSelectedId(undefined);
      setDetail(false);
      setConfirm(undefined);
      router.push('/(driver)/reservations');
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      setReservationError(message || 'No se pudo reservar la cochera. Intenta de nuevo.');
    } finally {
      submitting.current = false;
      setReserving(false);
    }
  }

  const text = { color: colors.ink, fontFamily: cocheraFonts.regular };
  const subdued = { color: colors.secondary, fontFamily: cocheraFonts.regular };
  const heading = { color: colors.ink, fontFamily: cocheraFonts.bold };
  const border = { borderColor: colors.outline };
  const actionText = { color: colors.accent, fontFamily: cocheraFonts.bold };
  const missingBalance = confirm !== undefined && balance !== null && balance < confirm.pricePerHour;

  return (
    <ScrollView style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <View style={styles.search}>
          <Text style={[heading, styles.title]}>Encuentra una cochera</Text>
          <View style={[styles.searchField, border, { backgroundColor: colors.surface }]}>
            <Search color={colors.accent} size={19} />
            <TextInput value={query} onChangeText={value => { setQuery(value); setDetail(false); }}
              style={[text, styles.input]} placeholder="Busca por nombre o calle" placeholderTextColor={colors.secondary}
              accessibilityLabel="Buscar por nombre o calle" returnKeyType="search" />
          </View>
          <View style={styles.controls}>
            <Pressable accessibilityRole="button" accessibilityLabel={'Zona y filtros, ' + center.name} onPress={() => setFiltersOpen(true)}
              style={[styles.chip, border, { backgroundColor: colors.surface }]}>
              <SlidersHorizontal color={colors.accent} size={16} /><Text style={actionText}>{center.name} · Filtros</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => void locate()} disabled={locating}
              style={[styles.chip, border, { backgroundColor: colors.surface }]} accessibilityLabel="Usar mi ubicación">
              {locating ? <ActivityIndicator size="small" color={colors.accent} /> : <Compass size={17} color={colors.accent} />}
              <Text style={actionText}>{locating ? 'Ubicando…' : 'Mi ubicación'}</Text>
            </Pressable>
          </View>
          {locationNotice ? <Text accessibilityLiveRegion="polite" style={subdued}>{locationNotice}</Text> : null}
          <View style={styles.resultHeader}>
            <Text accessibilityLiveRegion="polite" style={heading}>
              {loading ? 'Buscando cocheras…' : failed ? 'Cocheras' : matches.length + (matches.length === 1 ? ' cochera' : ' cocheras')}
            </Text>
            <Pressable style={styles.inlineAction} accessibilityRole="button" onPress={() => setList(value => !value)}>
              {list ? <MapIcon size={17} color={colors.accent} /> : <List size={17} color={colors.accent} />}
              <Text style={actionText}>{list ? 'Ver mapa' : 'Ver lista'}</Text>
            </Pressable>
          </View>
        </View>

        {failed ? (
          <View style={styles.message}>
            <Text accessibilityRole="alert" style={text}>No se pudieron cargar las cocheras de esta zona.</Text>
            <Pressable accessibilityRole="button" style={styles.inlineAction} onPress={() => setRetry(value => value + 1)}><Text style={actionText}>Reintentar</Text></Pressable>
          </View>
        ) : !loading && matches.length === 0 ? (
          <Text style={[subdued, styles.message]}>No hay cocheras con esos filtros. Prueba otra zona o amplía el radio.</Text>
        ) : null}

        {list ? (
          <View style={styles.resultList}>
            {matches.map(({ space, distance }) => (
              <Pressable key={space.id} accessibilityRole="button" style={[styles.resultRow, border, { backgroundColor: colors.surface }]}
                onPress={() => { select(space.id); setList(false); }}>
                <View style={styles.resultCopy}>
                  <Text style={[heading, styles.resultName]}>{space.title}</Text>
                  <Text style={subdued}>{space.address}</Text>
                  <Text style={subdued}>{formatDistance(distance)}{space.features?.[0] ? ' · ' + space.features[0] : ''}</Text>
                </View>
                <Text style={actionText}>{formatSoles(space.pricePerHour)} / h</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <>
            <View style={[styles.map, border, { height: Math.round(Math.min(440, Math.max(235, height * .38))), backgroundColor: colors.field }]}>
              <ParkingMap latitude={latitude} longitude={longitude} radius={radius} spaces={matches.map(item => item.space)}
                selectedId={selected?.space.id} onSelect={select} />
            </View>
            {selected && (
              <View style={[styles.sheet, border, { backgroundColor: colors.surface }]}>
                <View style={styles.resultTop}>
                  <Text style={[heading, styles.sheetName]}>{selected.space.title}</Text>
                  <Text style={[actionText, styles.sheetPrice]}>{formatSoles(selected.space.pricePerHour)} / h</Text>
                </View>
                <Text style={subdued}>{selected.space.address} · {formatDistance(selected.distance)}</Text>
                {detail && (
                  <View style={styles.details}>
                    {selected.space.photoUrl ? <Image source={{ uri: selected.space.photoUrl }} style={styles.photo} accessibilityLabel={selected.space.title} /> : null}
                    <Text style={text}>{selected.space.description}</Text>
                    {selected.space.features?.length ? <Text style={subdued}>{selected.space.features.join(' · ')}</Text> : null}
                    <Pressable accessibilityRole="button" style={[styles.solid, { backgroundColor: colors.accent }]}
                      onPress={() => { setReservationError(''); setConfirm(selected.space); }}>
                      <Text style={{ color: colors.onAccent, fontFamily: cocheraFonts.bold }}>Reservar cochera</Text>
                    </Pressable>
                  </View>
                )}
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: detail }}
                  style={[styles.solid, { backgroundColor: detail ? colors.selected : colors.accent }]} onPress={() => setDetail(value => !value)}>
                  <Text style={{ color: detail ? colors.accent : colors.onAccent, fontFamily: cocheraFonts.bold }}>{detail ? 'Ocultar detalle' : 'Ver detalle'}</Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </View>

      <Modal visible={filtersOpen} transparent animationType="fade" onRequestClose={() => setFiltersOpen(false)}>
        <View style={styles.overlay}>
          <ScrollView keyboardShouldPersistTaps="handled" style={[styles.dialog, { backgroundColor: colors.surface }]} contentContainerStyle={styles.dialogBody}>
            <View style={styles.resultTop}>
              <Text accessibilityRole="header" style={[heading, styles.dialogTitle]}>Zona y filtros</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar filtros" style={styles.iconButton} onPress={() => setFiltersOpen(false)}><X size={21} color={colors.ink} /></Pressable>
            </View>
            <Text style={heading}>Zona de búsqueda</Text>
            <View style={styles.controls}>{parkingZones.map(zone => (
              <Pressable key={zone.name} accessibilityRole="button" accessibilityState={{ selected: zone.name === center.name }}
                onPress={() => changeZone(zone)} style={[styles.chip, border, { backgroundColor: zone.name === center.name ? colors.selected : colors.surface }]}>
                <Text style={text}>{zone.name}</Text>
              </Pressable>
            ))}</View>
            <Text style={heading}>Radio de búsqueda</Text>
            <View style={styles.controls}>{[500, 1000, 2000, 5000].map(value => (
              <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: radius === value }} onPress={() => { setRadius(value); setDetail(false); }}
                style={[styles.chip, border, { backgroundColor: radius === value ? colors.selected : colors.surface }]}>
                <Text style={text}>{formatDistance(value)}</Text>
              </Pressable>
            ))}</View>
            <View style={styles.controls}>
              <Pressable accessibilityRole="switch" accessibilityState={{ checked: covered }} onPress={() => setCovered(value => !value)}
                style={[styles.chip, border, { backgroundColor: covered ? colors.selected : colors.surface }]}><Text style={text}>Solo techadas</Text></Pressable>
              <Pressable accessibilityRole="switch" accessibilityState={{ checked: priceFirst }} onPress={() => setPriceFirst(value => !value)}
                style={[styles.chip, border, { backgroundColor: priceFirst ? colors.selected : colors.surface }]}><Text style={text}>Menor precio</Text></Pressable>
            </View>
            <Pressable accessibilityRole="button" style={[styles.solid, { backgroundColor: colors.accent }]} onPress={() => setFiltersOpen(false)}>
              <Text style={{ color: colors.onAccent, fontFamily: cocheraFonts.bold }}>Ver resultados</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={confirm !== undefined} transparent animationType="fade" onRequestClose={() => !reserving && setConfirm(undefined)}>
        <View style={styles.overlay}>
          <View style={[styles.dialog, styles.dialogBody, { backgroundColor: colors.surface }]}>
            <Text accessibilityRole="header" style={[heading, styles.dialogTitle]}>{missingBalance ? 'Saldo insuficiente' : 'Confirmar reserva'}</Text>
            {confirm && <Text style={text}>{confirm.title} · {formatSoles(confirm.pricePerHour)} por hora</Text>}
            {reservationError ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{reservationError}</Text> : null}
            <Pressable accessibilityRole="button" disabled={reserving} style={[styles.solid, { backgroundColor: colors.accent }]} onPress={() => {
              if (missingBalance) { setConfirm(undefined); router.push('/(driver)/wallet'); }
              else void reserve();
            }}>
              <Text style={{ color: colors.onAccent, fontFamily: cocheraFonts.bold }}>
                {missingBalance ? 'Ir a Billetera' : reserving ? 'Reservando…' : 'Confirmar reserva'}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={reserving} style={styles.inlineAction} onPress={() => setConfirm(undefined)}>
              <Text style={actionText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, alignItems: 'center', paddingBottom: 16 },
  content: { width: '100%', maxWidth: 760 },
  search: { paddingHorizontal: 16, paddingTop: 14, gap: 9 },
  title: { fontSize: 25, letterSpacing: -.7 },
  searchField: { flexDirection: 'row', alignItems: 'center', minHeight: 48, borderRadius: 12, borderWidth: 1, gap: 8, paddingHorizontal: 12 },
  input: { minHeight: 46, flex: 1, fontSize: 16 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { minHeight: 48, paddingHorizontal: 11, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  inlineAction: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 4 },
  map: { position: 'relative', overflow: 'hidden', borderRadius: 14, borderWidth: 1, marginHorizontal: 12 },
  sheet: { marginHorizontal: 12, marginTop: 7, gap: 7, padding: 13, borderRadius: 16, borderWidth: 1 },
  resultTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  resultList: { paddingHorizontal: 16, gap: 7 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  resultCopy: { flex: 1, gap: 4 },
  resultName: { fontSize: 16 },
  sheetName: { flex: 1, fontSize: 18 },
  sheetPrice: { fontSize: 16 },
  message: { paddingHorizontal: 16, paddingBottom: 10 },
  details: { gap: 7 },
  photo: { width: '100%', height: 136, borderRadius: 9 },
  solid: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 11, paddingHorizontal: 10 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#211d3575' },
  dialog: { width: '100%', maxWidth: 460, maxHeight: '85%', flexGrow: 0, borderRadius: 18 },
  dialogBody: { padding: 16, gap: 10 },
  dialogTitle: { fontSize: 20, flex: 1 },
  iconButton: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
});
