import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Image,
  RefreshControl,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Calendar, QrCode, Clock, Info, ShieldAlert, CheckCircle2, XCircle, MessageSquare } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import reservationService, { ReservationResponse, QRResponse } from '../../services/reservationService';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Spinner from '../../components/Spinner';

export default function ReservationsScreen() {
  const { refreshBalance } = useAuth();
  const router = useRouter();
  
  const [reservations, setReservations] = useState<ReservationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // QR Modal State
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);
  const [qrData, setQrData] = useState<QRResponse | null>(null);
  const [selectedResForQr, setSelectedResForQr] = useState<ReservationResponse | null>(null);

  const fetchReservations = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await reservationService.getMyReservations();
      // Sort reservations so ACTIVE and PENDING are on top, then descending by reservation date
      const sorted = [...data].sort((a, b) => {
        const priority: Record<string, number> = { ACTIVE: 3, PENDING: 2, FINISHED: 1, EXPIRED: 0, CANCELLED: 0 };
        const aVal = priority[a.status] ?? 0;
        const bVal = priority[b.status] ?? 0;
        if (aVal !== bVal) return bVal - aVal;
        return new Date(b.reservedAt).getTime() - new Date(a.reservedAt).getTime();
      });
      setReservations(sorted);
    } catch (err) {
      console.error('Error fetching reservations', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Poll in the background to automatically update status when Checked-In/Checked-Out by the Host
  useEffect(() => {
    fetchReservations();

    const interval = setInterval(async () => {
      try {
        const data = await reservationService.getMyReservations();
        const sorted = [...data].sort((a, b) => {
          const priority: Record<string, number> = { ACTIVE: 3, PENDING: 2, FINISHED: 1, EXPIRED: 0, CANCELLED: 0 };
          const aVal = priority[a.status] ?? 0;
          const bVal = priority[b.status] ?? 0;
          if (aVal !== bVal) return bVal - aVal;
          return new Date(b.reservedAt).getTime() - new Date(a.reservedAt).getTime();
        });

        setReservations(prev => {
          const prevActive = prev.find(r => r.status === 'PENDING' || r.status === 'ACTIVE');
          const newActive = sorted.find(r => r.status === 'PENDING' || r.status === 'ACTIVE');
          
          const statusChanged = 
            prevActive?.status !== newActive?.status || 
            prevActive?.id !== newActive?.id ||
            prev.length !== sorted.length;

          if (statusChanged) {
            refreshBalance();
            if (newActive?.status === 'ACTIVE' && prevActive?.status === 'PENDING') {
              setSelectedResForQr(newActive);
              // Silent reload QR code
              reservationService.generateQr(newActive.id).then(setQrData).catch(console.error);
            } else if (!newActive) {
              setQrModalVisible(false);
            }
            return sorted;
          }
          return prev;
        });
      } catch (err) {
        // Silent error
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchReservations, refreshBalance]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReservations(true);
  };

  const handleCancel = (id: number) => {
    Alert.alert(
      'Cancelar Reserva',
      '¿Estás seguro de que deseas cancelar esta reserva? Liberará la cochera de inmediato y no tendrá costo.',
      [
        { text: 'Atrás', style: 'cancel' },
        {
          text: 'Sí, Cancelar',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(id);
            try {
              await reservationService.cancel(id);
              Alert.alert('Reserva Cancelada', 'La cochera ha sido liberada correctamente.');
              fetchReservations();
              refreshBalance();
            } catch (err: any) {
              const msg = err.response?.data?.message || 'No se pudo cancelar la reserva.';
              Alert.alert('Error', msg);
            } finally {
              setCancellingId(null);
            }
          }
        }
      ]
    );
  };

  const handleShowQr = async (res: ReservationResponse) => {
    setSelectedResForQr(res);
    setQrModalVisible(true);
    setLoadingQr(true);
    setQrData(null);
    try {
      const qr = await reservationService.generateQr(res.id);
      setQrData(qr);
    } catch (err: any) {
      console.error('Error generating QR', err);
      Alert.alert('Error', 'No se pudo generar el código QR de check-in/out.');
      setQrModalVisible(false);
    } finally {
      setLoadingQr(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge label="Pendiente" status="warning" />;
      case 'ACTIVE':
        return <Badge label="En Curso" status="primary" />;
      case 'FINISHED':
        return <Badge label="Finalizada" status="success" />;
      case 'CANCELLED':
        return <Badge label="Cancelada" status="danger" />;
      default:
        return <Badge label="Expirada" status="default" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock size={20} color="#fbbf24" />;
      case 'ACTIVE':
        return <QrCode size={20} color="#c084fc" />;
      case 'FINISHED':
        return <CheckCircle2 size={20} color="#10b981" />;
      case 'CANCELLED':
        return <XCircle size={20} color="#ef4444" />;
      default:
        return <ShieldAlert size={20} color="#94a3b8" />;
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderReservationCard = ({ item }: { item: ReservationResponse }) => {
    const isPending = item.status === 'PENDING';
    const isActive = item.status === 'ACTIVE';

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            {getStatusIcon(item.status)}
            <Text style={styles.spaceTitle} numberOfLines={1}>
              {item.parkingSpace.title}
            </Text>
          </View>
          {getStatusBadge(item.status)}
        </View>

        <Text style={styles.spaceAddress}>📍 {item.parkingSpace.address}</Text>

        <View style={styles.divider} />

        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Tarifa por Hora</Text>
            <Text style={styles.infoVal}>S/. {item.parkingSpace.pricePerHour.toFixed(2)}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Reservado El</Text>
            <Text style={styles.infoVal}>{formatDateTime(item.reservedAt)}</Text>
          </View>
        </View>

        {(isActive || item.status === 'FINISHED') && (
          <View style={styles.infoGridExtended}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Hora Entrada</Text>
              <Text style={styles.infoVal}>{formatDateTime(item.startTime)}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Hora Salida</Text>
              <Text style={styles.infoVal}>{formatDateTime(item.endTime)}</Text>
            </View>
          </View>
        )}

        {isPending && item.expiresAt && (
          <View style={styles.alertRow}>
            <Info size={14} color="#f59e0b" />
            <Text style={styles.alertText}>
              Expira si no haces Check-In antes de: {formatDateTime(item.expiresAt)}
            </Text>
          </View>
        )}

        {/* Action buttons */}
        {(isPending || isActive) && (
          <View style={styles.actions}>
            {isPending && (
              <TouchableOpacity
                style={[styles.btn, styles.btnOutline]}
                onPress={() => handleCancel(item.id)}
                disabled={cancellingId === item.id}
              >
                {cancellingId === item.id ? (
                  <ActivityIndicator size="small" color="#94a3b8" />
                ) : (
                  <Text style={styles.btnOutlineText}>Cancelar</Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.btn, styles.btnChat, { flex: isPending ? 0.8 : 1 }]}
              onPress={() => router.push(`/chat/${item.id}`)}
            >
              <MessageSquare size={16} color="#ffffff" style={isPending ? {} : styles.btnIcon} />
              {!isPending && <Text style={styles.btnText}>Chat</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btn,
                isActive ? styles.btnActive : styles.btnPrimary,
                { flex: isPending ? 1.5 : 1 }
              ]}
              onPress={() => handleShowQr(item)}
            >
              <QrCode size={16} color="#ffffff" style={styles.btnIcon} />
              <Text style={styles.btnText}>
                {isActive ? 'Ver QR de Salida' : 'Ver QR de Entrada'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!(isPending || isActive) && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnChat, { flex: 1 }]}
              onPress={() => router.push(`/chat/${item.id}`)}
            >
              <MessageSquare size={16} color="#94a3b8" style={styles.btnIcon} />
              <Text style={[styles.btnText, { color: '#94a3b8' }]}>Ver Chat (Historial)</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loaderContainer}>
          <Spinner size="large" />
          <Text style={styles.loadingText}>Cargando reservas...</Text>
        </View>
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderReservationCard}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a855f7" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Calendar size={60} color="#374151" />
              <Text style={styles.emptyTitle}>Sin reservas todavía</Text>
              <Text style={styles.emptySubtitle}>
                Busca cocheras disponibles en el mapa para realizar tu primera reserva.
              </Text>
            </View>
          }
        />
      )}

      {/* QR Code Ticket Modal */}
      <Modal
        visible={qrModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ticket Digital ParkShare</Text>
            <Text style={styles.modalSubtitle}>
              {selectedResForQr?.status === 'ACTIVE'
                ? 'Muestra este QR al dueño de la cochera para registrar tu SALIDA (Check-Out)'
                : 'Muestra este QR al dueño de la cochera para registrar tu INGRESO (Check-In)'}
            </Text>

            <View style={styles.qrWrapper}>
              {loadingQr ? (
                <View style={styles.qrLoader}>
                  <ActivityIndicator size="large" color="#a855f7" />
                  <Text style={styles.qrLoaderText}>Generando firma segura...</Text>
                </View>
              ) : qrData?.qrImageBase64 ? (
                <Image
                  source={{
                    uri: qrData.qrImageBase64.startsWith('data:')
                      ? qrData.qrImageBase64
                      : `data:image/png;base64,${qrData.qrImageBase64}`,
                  }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.errorText}>No se pudo cargar el QR</Text>
              )}
            </View>

            {qrData?.code && (
              <View style={styles.simulationCodeContainer}>
                <Text style={styles.simulationCodeLabel}>Código de Simulación (Mantén presionado para copiar):</Text>
                <Text selectable={true} style={styles.simulationCodeValue}>
                  {qrData.code}
                </Text>
              </View>
            )}

            <View style={styles.modalDetails}>
              <Text style={styles.modalSpaceName} numberOfLines={1}>
                {selectedResForQr?.parkingSpace.title}
              </Text>
              <Text style={styles.modalDetailsText}>
                Tarifa: S/. {selectedResForQr?.parkingSpace.pricePerHour.toFixed(2)} / hora
              </Text>
              <Text style={styles.modalDetailsText}>
                ID de Reserva: #{selectedResForQr?.id}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => {
                setQrModalVisible(false);
                fetchReservations(); // Refresh list on close
              }}
            >
              <Text style={styles.modalCloseBtnText}>Cerrar Ticket</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0c10',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b0c10',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  spaceTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    flex: 1,
  },
  spaceAddress: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#1f2937',
    marginVertical: 8,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  infoGridExtended: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    paddingTop: 8,
    marginTop: 8,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
  },
  infoVal: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#451a03',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#78350f',
  },
  alertText: {
    color: '#fcd34d',
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    minHeight: 40,
  },
  btnPrimary: {
    backgroundColor: '#a855f7',
  },
  btnActive: {
    backgroundColor: '#10b981',
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: '#4b5563',
    backgroundColor: 'transparent',
    flex: 1,
  },
  btnChat: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  btnOutlineText: {
    color: '#d1d5db',
    fontWeight: '600',
    fontSize: 14,
  },
  btnIcon: {
    marginRight: 6,
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },

  // Modal QR Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 8, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#11121d',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3b0764',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  qrWrapper: {
    width: 220,
    height: 220,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  qrLoader: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrLoaderText: {
    color: '#475569',
    fontSize: 11,
    marginTop: 8,
    fontWeight: '500',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  modalDetails: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  modalSpaceName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalDetailsText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: '100%',
    backgroundColor: '#1f2937',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 14,
  },
  simulationCodeContainer: {
    alignItems: 'center',
    backgroundColor: '#1e293b55',
    padding: 10,
    borderRadius: 10,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3b076455',
  },
  simulationCodeLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  simulationCodeValue: {
    color: '#c084fc',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
});
