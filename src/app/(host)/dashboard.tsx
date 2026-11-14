import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LayoutDashboard, Landmark, Star, ParkingSquare, QrCode, ClipboardList, TrendingUp, MessageSquare } from 'lucide-react-native';
import parkingService, { HostDashboardMetrics } from '../../services/parkingService';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/Card';
import Spinner from '../../components/Spinner';

export default function HostDashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [metrics, setMetrics] = useState<HostDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardMetrics = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await parkingService.getHostDashboard();
      setMetrics(data);
    } catch (err) {
      console.error('Error fetching host dashboard metrics', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardMetrics();
  }, [fetchDashboardMetrics]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardMetrics(true);
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return styles.activeBadge;
      case 'PENDING':
        return styles.pendingBadge;
      case 'FINISHED':
        return styles.finishedBadge;
      default:
        return styles.defaultBadge;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'En Uso (Ocupada)';
      case 'PENDING':
        return 'Reservada';
      case 'FINISHED':
        return 'Finalizada Reciente';
      default:
        return status;
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActiveOrRecentReservations = () => {
    if (!metrics?.recentReservations) return [];
    return metrics.recentReservations.filter((res) => {
      if (res.status === 'PENDING' || res.status === 'ACTIVE') return true;
      if (res.status === 'FINISHED' && res.endTime) {
        const diffMs = Date.now() - new Date(res.endTime).getTime();
        return diffMs <= 10 * 60 * 1000; // 10 minutes
      }
      return false;
    });
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loaderContainer}>
          <Spinner size="large" />
          <Text style={styles.loadingText}>Cargando panel...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
          }
        >
          {/* Header Summary */}
          <View style={styles.header}>
            <Text style={styles.welcomeText}>¡Hola, {user?.name.split(' ')[0]}!</Text>
            <Text style={styles.subtext}>Resumen de rendimiento de tu negocio</Text>
          </View>
 
          {/* Quick QR Scanner Trigger */}
          <TouchableOpacity
            style={styles.scanActionBtn}
            onPress={() => router.push('/(host)/scan')}
          >
            <View style={styles.scanActionLeft}>
              <QrCode size={24} color="#10b981" />
              <View style={styles.scanActionTextCol}>
                <Text style={styles.scanActionTitle}>Escáner Check-In / Out</Text>
                <Text style={styles.scanActionSub}>Registrar entrada o salida con el celular</Text>
              </View>
            </View>
            <TrendingUp size={20} color="#10b981" />
          </TouchableOpacity>
 
          {/* Grid Cards Stats */}
          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Landmark size={20} color="#10b981" />
              </View>
              <Text style={styles.statLabel}>Ganancias Totales</Text>
              <Text style={styles.statVal}>
                S/. {metrics?.totalEarnings ? metrics.totalEarnings.toFixed(2) : '0.00'}
              </Text>
            </Card>
 
            <Card style={styles.statCard}>
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(251, 191, 36, 0.1)' }]}>
                <Star size={20} color="#fbbf24" fill="#fbbf24" />
              </View>
              <Text style={styles.statLabel}>Valoración Media</Text>
              <Text style={styles.statVal}>
                {metrics?.averageRating ? metrics.averageRating.toFixed(1) : 'Nuevo'}
              </Text>
            </Card>
 
            <Card style={styles.statCard}>
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <ParkingSquare size={20} color="#3b82f6" />
              </View>
              <Text style={styles.statLabel}>Cocheras Activas</Text>
              <Text style={styles.statVal}>{metrics?.totalSpaces || 0}</Text>
            </Card>
 
            <Card style={styles.statCard}>
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
                <ClipboardList size={20} color="#a855f7" />
              </View>
              <Text style={styles.statLabel}>Alquileres</Text>
              <Text style={styles.statVal}>{metrics?.totalReservationsCompleted || 0}</Text>
            </Card>
          </View>
 
          {/* Live activity section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Actividad de Cocheras en Vivo</Text>
            <TouchableOpacity onPress={() => router.push('/(host)/spaces')}>
              <Text style={styles.sectionLink}>Ver cocheras</Text>
            </TouchableOpacity>
          </View>
 
          {getActiveOrRecentReservations().length > 0 ? (
            getActiveOrRecentReservations().map((res) => (
              <Card key={res.reservationId} style={styles.resCard}>
                <View style={styles.resRow}>
                  <View style={styles.resLeft}>
                    <Text style={styles.resSpaceName} numberOfLines={1}>{res.parkingSpaceTitle}</Text>
                    <Text style={styles.resDriverName}>Conductor: {res.driverName}</Text>
                    <Text style={styles.resTime}>{formatDateTime(res.createdAt)}</Text>
                  </View>
                  
                  <View style={styles.resRight}>
                    <Text style={[styles.badgeBase, getStatusBadgeStyle(res.status)]}>
                      {getStatusLabel(res.status)}
                    </Text>
                    <Text style={styles.resPrice}>
                      S/. {res.pricePerHour ? res.pricePerHour.toFixed(2) : '0.00'}/h
                    </Text>
                  </View>
                </View>

                <View style={styles.resDivider} />

                <View style={styles.resActions}>
                  <TouchableOpacity
                    style={styles.chatBtn}
                    onPress={() => router.push(`/chat/${res.reservationId}`)}
                  >
                    <MessageSquare size={14} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.chatBtnText}>
                      {res.status === 'PENDING' || res.status === 'ACTIVE' 
                        ? 'Chat con Conductor' 
                        : 'Ver Chat (Historial)'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <ClipboardList size={40} color="#374151" />
              <Text style={styles.emptyText}>No hay cocheras ocupadas ni reservadas en este momento.</Text>
            </Card>
          )}
        </ScrollView>
      )}
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    marginTop: Platform.OS === 'ios' ? 10 : 0,
  },
  welcomeText: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
  },
  subtext: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  scanActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0e1d17',
    borderWidth: 1,
    borderColor: '#065f46',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  scanActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scanActionTextCol: {
    gap: 2,
  },
  scanActionTitle: {
    color: '#34d399',
    fontSize: 16,
    fontWeight: '800',
  },
  scanActionSub: {
    color: '#6ee7b7',
    fontSize: 11,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  statVal: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionLink: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
  },
  resCard: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
  },
  resRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resLeft: {
    flex: 1,
    marginRight: 10,
    gap: 2,
  },
  resSpaceName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  resDriverName: {
    color: '#94a3b8',
    fontSize: 12,
  },
  resTime: {
    color: '#64748b',
    fontSize: 11,
  },
  resRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  badgeBase: {
    fontSize: 10,
    fontWeight: '700',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  activeBadge: {
    backgroundColor: '#065f46',
    color: '#34d399',
  },
  pendingBadge: {
    backgroundColor: '#78350f',
    color: '#fcd34d',
  },
  finishedBadge: {
    backgroundColor: '#1e293b',
    color: '#94a3b8',
  },
  defaultBadge: {
    backgroundColor: '#1f2937',
    color: '#d1d5db',
  },
  resPrice: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
  },
  resDivider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 10,
  },
  resActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chatBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 30,
    gap: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    fontSize: 13,
  },
});
