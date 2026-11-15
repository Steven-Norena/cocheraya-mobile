import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Linking, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Calendar, MapPin, MessageSquare, QrCode } from 'lucide-react-native';
import { cocheraFonts, useCocheraTheme } from '../../constants/cocheraya';
import { useAuth } from '../../context/AuthContext';
import reservationService, { type QRResponse, type ReservationResponse } from '../../services/reservationService';
import walletService from '../../services/walletService';
import { formatSoles } from '../../services/presentation';

const labels = { PENDING: 'Pendiente', ACTIVE: 'En curso', FINISHED: 'Finalizada', CANCELLED: 'Cancelada', EXPIRED: 'Expirada' };
const ongoing = (item: ReservationResponse) => item.status === 'PENDING' || item.status === 'ACTIVE';

function dateLabel(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export default function ReservationsScreen() {
  const colors = useCocheraTheme();
  const router = useRouter();
  const { refreshBalance } = useAuth();
  const [reservations, setReservations] = useState<ReservationResponse[]>();
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [ticketId, setTicketId] = useState<number>();
  const [qr, setQr] = useState<{ key: string; data?: QRResponse }>();
  const [qrRetry, setQrRetry] = useState(0);
  const [cancelId, setCancelId] = useState<number>();
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [totals, setTotals] = useState<Record<number, number>>({});
  const request = useRef<AbortController | null>(null);
  const previousOngoing = useRef<string>(undefined);
  const refreshBalanceRef = useRef(refreshBalance);
  useEffect(() => { refreshBalanceRef.current = refreshBalance; }, [refreshBalance]);

  const reload = useCallback(async (foreground = false) => {
    if (request.current && !foreground) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    try {
      const data = await reservationService.getMyReservations(controller.signal);
      if (controller.signal.aborted) return;
      const current = data.filter(ongoing).map(item => item.id + ':' + item.status).sort().join(',');
      if (previousOngoing.current !== undefined && previousOngoing.current !== current) {
        void refreshBalanceRef.current();
      }
      previousOngoing.current = current;
      setReservations(data);
      setFailed(false);
    } catch {
      if (!controller.signal.aborted) setFailed(true);
    } finally {
      if (request.current === controller) {
        request.current = null;
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void reload(true);
    const timer = setInterval(() => { void reload(); }, 5000);
    return () => { clearInterval(timer); request.current?.abort(); request.current = null; };
  }, [reload]));

  const current = reservations?.filter(ongoing).sort((a, b) => Number(b.status === 'ACTIVE') - Number(a.status === 'ACTIVE')) ?? [];
  const history = reservations?.filter(item => !ongoing(item)).sort((a, b) => b.reservedAt.localeCompare(a.reservedAt)) ?? [];
  const finishedKey = history.filter(item => item.status === 'FINISHED').map(item => item.id).sort((a, b) => a - b).join(',');
  const ticket = current.find(item => item.id === ticketId);
  const qrKey = ticket ? [ticket.id, ticket.status, qrRetry].join(',') : '';
  const ticketReservation = ticket?.id;

  useEffect(() => {
    if (!finishedKey) return;
    const controller = new AbortController();
    const missing = new Set(finishedKey.split(',').map(Number));
    const found: Record<number, number> = {};
    async function getTotals() {
      let page = 0;
      while (missing.size && !controller.signal.aborted) {
        const response = await walletService.getTransactionsByType('CHARGE', page, 50, controller.signal);
        for (const item of response.content) {
          if (item.reservationId && missing.delete(item.reservationId)) {
            found[item.reservationId] = Math.abs(item.amount);
          }
        }
        if (++page >= response.totalPages) break;
      }
      if (!controller.signal.aborted) setTotals(found);
    }
    void getTotals().catch(() => undefined);
    return () => controller.abort();
  }, [finishedKey]);

  useEffect(() => {
    if (!ticketReservation) return;
    let disposed = false;
    void reservationService.generateQr(ticketReservation)
      .then(data => { if (!disposed) setQr({ key: qrKey, data }); })
      .catch(() => { if (!disposed) setQr({ key: qrKey }); });
    return () => { disposed = true; };
  }, [qrKey, ticketReservation]);

  async function cancelReservation() {
    if (cancelId === undefined || cancelling) return;
    setCancelling(true);
    setActionError('');
    setNotice('');
    try {
      await reservationService.cancel(cancelId);
      setCancelId(undefined);
      setNotice('Reserva cancelada. La cochera se liberó sin cobro.');
      void refreshBalance();
      await reload(true);
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      setActionError(message || 'No se pudo cancelar la reserva.');
    } finally {
      setCancelling(false);
    }
  }

  const text = { color: colors.ink, fontFamily: cocheraFonts.regular };
  const muted = { color: colors.secondary, fontFamily: cocheraFonts.regular };
  const heading = { color: colors.ink, fontFamily: cocheraFonts.bold };
  const accent = { color: colors.accent, fontFamily: cocheraFonts.bold };
  const surface = { backgroundColor: colors.surface, borderColor: colors.outline };
  const openChat = (id: number) => router.push({ pathname: '/chat/[id]', params: { id: String(id) } });
  const qrLoading = qr?.key !== qrKey;
  const qrImage = !qrLoading ? qr?.data?.qrImageBase64 : undefined;

  function arrival(item: ReservationResponse) {
    const query = encodeURIComponent(item.parkingSpace.address);
    void Linking.openURL('https://www.google.com/maps/search/?api=1&query=' + query)
      .catch(() => setActionError('No pudimos abrir la dirección en el mapa.'));
  }

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <FlatList
        data={history}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => {
          setRefreshing(true);
          void reload(true);
        }} />}
        ListHeaderComponent={(
          <View style={styles.section}>
            <Text accessibilityRole="header" style={[heading, styles.pageTitle]}>Mis reservas</Text>
            {notice ? <Text accessibilityLiveRegion="polite" style={[text, { color: colors.success }]}>{notice}</Text> : null}
            {failed ? (
              <View style={[styles.card, surface]}>
                <Text accessibilityRole="alert" style={text}>No pudimos actualizar tus reservas.</Text>
                <Pressable accessibilityRole="button" style={styles.smallAction} onPress={() => void reload(true)}><Text style={accent}>Reintentar</Text></Pressable>
              </View>
            ) : !reservations ? <ActivityIndicator color={colors.accent} /> : null}
            {current.length > 0 && <Text accessibilityRole="header" style={[heading, styles.sectionTitle]}>Tu próxima llegada</Text>}
            {actionError && cancelId === undefined ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{actionError}</Text> : null}
            {current.map(item => (
              <View key={item.id} style={[styles.card, surface, { borderColor: colors.accent }]}>
                <View style={styles.headingRow}>
                  <Text style={[heading, styles.spaceTitle]}>{item.parkingSpace.title}</Text>
                  <Text style={[styles.badge, { color: colors.accent, backgroundColor: colors.selected }]}>{labels[item.status]}</Text>
                </View>
                <Text style={muted}>{item.parkingSpace.address}</Text>
                <Text style={muted}>{formatSoles(item.parkingSpace.pricePerHour)} por hora</Text>
                {item.status === 'PENDING' && item.expiresAt && <Text style={[text, { color: colors.warning }]}>Llega antes de {dateLabel(item.expiresAt)}.</Text>}
                <View style={styles.actions}>
                  <Pressable accessibilityRole="button" style={[styles.action, { backgroundColor: colors.accent }]} onPress={() => { setTicketId(item.id); setQrRetry(value => value + 1); }}>
                    <QrCode size={18} color={colors.onAccent} />
                    <Text style={{ color: colors.onAccent, fontFamily: cocheraFonts.bold }}>{item.status === 'ACTIVE' ? 'Mostrar QR de salida' : 'Mostrar QR'}</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" style={[styles.action, { backgroundColor: colors.selected }]} onPress={() => arrival(item)}>
                    <MapPin size={18} color={colors.accent} /><Text style={accent}>Cómo llegar</Text>
                  </Pressable>
                </View>
                <View style={styles.actions}>
                  <Pressable accessibilityRole="button" style={styles.smallAction} onPress={() => openChat(item.id)}>
                    <MessageSquare size={16} color={colors.accent} /><Text style={accent}>Chat</Text>
                  </Pressable>
                  {item.status === 'PENDING' && (
                    <Pressable accessibilityRole="button" style={styles.smallAction} onPress={() => { setActionError(''); setCancelId(item.id); }}>
                      <Text style={[heading, { color: colors.danger }]}>Cancelar reserva</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
            {history.length > 0 && <Text accessibilityRole="header" style={[heading, styles.sectionTitle]}>Historial</Text>}
            {reservations?.length === 0 && (
              <View style={[styles.card, surface]}>
                <Calendar size={26} color={colors.accent} /><Text style={heading}>Aún no tienes reservas</Text>
                <Pressable accessibilityRole="button" style={styles.smallAction} onPress={() => router.push('/(driver)/map')}>
                  <Text style={accent}>Buscar cochera</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
        renderItem={({ item }) => (
          <View style={[styles.card, surface, styles.historyCard]}>
            <View style={styles.headingRow}>
              <Text style={[heading, styles.spaceTitle]}>{item.parkingSpace.title}</Text>
              <Text style={[styles.badge, {
                color: item.status === 'FINISHED' ? colors.success : colors.secondary,
                backgroundColor: item.status === 'FINISHED' ? colors.successBg : colors.field,
              }]}>{labels[item.status]}</Text>
            </View>
            <Text style={muted}>{dateLabel(item.endTime ?? item.reservedAt)}</Text>
            <View style={styles.headingRow}>
              {totals[item.id] !== undefined ? <Text style={heading}>Total {formatSoles(totals[item.id])}</Text>
                : item.status === 'FINISHED' ? (
                  <Pressable accessibilityRole="button" style={styles.smallAction} onPress={() => router.push('/(driver)/wallet')}>
                    <Text style={accent}>Ver cobro en Billetera</Text>
                  </Pressable>
                ) : <Text style={muted}>Sin cobro</Text>}
              <Pressable accessibilityRole="button" style={styles.smallAction} onPress={() => openChat(item.id)}><Text style={accent}>Ver chat</Text></Pressable>
            </View>
          </View>
        )}
      />

      <Modal visible={Boolean(ticket)} transparent animationType="fade" onRequestClose={() => setTicketId(undefined)}>
        <View style={styles.overlay}>
          <View style={[styles.dialog, surface]}>
            <Text accessibilityRole="header" style={[heading, styles.pageTitle]}>{ticket?.status === 'ACTIVE' ? 'QR de salida' : 'QR de entrada'}</Text>
            <Text style={muted}>Muéstrale este código al anfitrión de la cochera.</Text>
            {qrLoading ? <ActivityIndicator color={colors.accent} /> : qrImage ? (
              <Image style={styles.qr} accessibilityLabel="Código QR de la reserva" resizeMode="contain"
                source={{ uri: qrImage.startsWith('data:') ? qrImage : 'data:image/png;base64,' + qrImage }} />
            ) : (
              <Pressable accessibilityRole="button" style={styles.smallAction} onPress={() => setQrRetry(value => value + 1)}>
                <Text style={accent}>No se pudo cargar el QR. Reintentar</Text>
              </Pressable>
            )}
            {!qrLoading && qr?.data?.code ? <Text selectable style={muted}>{qr.data.code}</Text> : null}
            <Pressable accessibilityRole="button" style={[styles.action, { backgroundColor: colors.accent }]} onPress={() => setTicketId(undefined)}>
              <Text style={{ color: colors.onAccent, fontFamily: cocheraFonts.bold }}>Cerrar QR</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={cancelId !== undefined} transparent animationType="fade" onRequestClose={() => !cancelling && setCancelId(undefined)}>
        <View style={styles.overlay}>
          <View style={[styles.dialog, surface]}>
            <Text accessibilityRole="header" style={[heading, styles.pageTitle]}>¿Cancelar reserva?</Text>
            <Text style={muted}>La cochera se liberará sin cobro.</Text>
            {actionError ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{actionError}</Text> : null}
            <Pressable accessibilityRole="button" disabled={cancelling} style={[styles.action, { backgroundColor: colors.selected }]} onPress={() => void cancelReservation()}>
              <Text style={[heading, { color: colors.danger }]}>{cancelling ? 'Cancelando…' : 'Sí, cancelar reserva'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={cancelling} style={styles.smallAction} onPress={() => { setActionError(''); setCancelId(undefined); }}>
              <Text style={accent}>Conservar reserva</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, paddingBottom: 28 },
  section: { gap: 12 },
  pageTitle: { fontSize: 26, letterSpacing: -.5 },
  sectionTitle: { fontSize: 18 },
  card: { padding: 14, gap: 7, borderWidth: 1, borderRadius: 15 },
  historyCard: { marginTop: 8 },
  headingRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 7 },
  spaceTitle: { flexGrow: 1, flexShrink: 1, fontSize: 17 },
  badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 20, fontFamily: cocheraFonts.bold, fontSize: 12, flexShrink: 0 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  action: { minHeight: 48, paddingHorizontal: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  smallAction: { minHeight: 48, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', paddingHorizontal: 5, gap: 6 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#211d3575' },
  dialog: { width: '100%', maxWidth: 420, padding: 16, borderWidth: 1, borderRadius: 17, gap: 10 },
  qr: { width: '100%', maxWidth: 232, height: 232, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 9 },
});
