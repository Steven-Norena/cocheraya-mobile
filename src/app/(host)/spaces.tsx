import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Trash2, ShieldAlert, Star, Power, Settings } from 'lucide-react-native';
import parkingService, { ParkingSpace } from '../../services/parkingService';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Spinner from '../../components/Spinner';

export default function HostSpacesScreen() {
  const router = useRouter();
  
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchMySpaces = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await parkingService.getMine();
      setSpaces(data);
    } catch (err) {
      console.error('Error loading host spaces', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMySpaces();
  }, [fetchMySpaces]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMySpaces(true);
  };

  const handleToggleStatus = async (space: ParkingSpace) => {
    const newStatus = space.status === 'AVAILABLE' ? 'OCCUPIED' : 'AVAILABLE';
    setUpdatingId(space.id);
    try {
      await parkingService.changeAvailability(space.id, newStatus);
      Alert.alert(
        'Estado Actualizado',
        `La cochera "${space.title}" ahora está ${newStatus === 'AVAILABLE' ? 'Disponible' : 'Ocupada'}.`
      );
      fetchMySpaces(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'No se pudo cambiar la disponibilidad.';
      Alert.alert('Error', msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = (id: number, title: string) => {
    Alert.alert(
      'Eliminar Cochera',
      `¿Estás seguro de que deseas eliminar permanentemente la cochera "${title}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await parkingService.delete(id);
              Alert.alert('Eliminado', 'La cochera ha sido eliminada con éxito.');
              fetchMySpaces();
            } catch (err: any) {
              const msg = err.response?.data?.message || 'No se pudo eliminar la cochera.';
              Alert.alert('Error', msg);
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <Badge label="Disponible" status="success" />;
      case 'OCCUPIED':
        return <Badge label="Ocupada" status="danger" />;
      case 'RESERVED':
        return <Badge label="Reservada" status="warning" />;
      default:
        return <Badge label={status} status="default" />;
    }
  };

  const renderSpaceItem = ({ item }: { item: ParkingSpace }) => {
    const isAvailable = item.status === 'AVAILABLE';
    const isUpdating = updatingId === item.id;

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerTitleCol}>
            <Text style={styles.spaceTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.spaceAddress} numberOfLines={1}>📍 {item.address}</Text>
          </View>
          {getStatusBadge(item.status)}
        </View>

        {item.photoUrl && (
          <Image source={{ uri: item.photoUrl }} style={styles.spaceImage} />
        )}

        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Precio por hora</Text>
            <Text style={styles.priceText}>S/. {item.pricePerHour.toFixed(2)}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Calificación</Text>
            <View style={styles.stars}>
              <Star size={14} color="#fbbf24" fill="#fbbf24" />
              <Text style={styles.ratingText}>
                {item.averageRating ? item.averageRating.toFixed(1) : 'Nuevo'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Feature tags */}
        {item.features && item.features.length > 0 && (
          <View style={styles.featuresList}>
            {item.features.map((feat, idx) => (
              <Text key={idx} style={styles.featureBadge}>
                {feat}
              </Text>
            ))}
          </View>
        )}

        {/* Control Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              isAvailable ? styles.btnDisable : styles.btnEnable
            ]}
            onPress={() => handleToggleStatus(item)}
            disabled={isUpdating || item.status === 'RESERVED'}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Power size={16} color="#ffffff" style={styles.btnIcon} />
                <Text style={styles.btnText}>
                  {item.status === 'RESERVED'
                    ? 'Reservada'
                    : isAvailable
                    ? 'Pausar Alquiler'
                    : 'Activar Alquiler'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.id, item.title)}
            disabled={item.status === 'RESERVED'}
          >
            <Trash2 size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loaderContainer}>
          <Spinner size="large" />
          <Text style={styles.loadingText}>Cargando tus cocheras...</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={spaces}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderSpaceItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <ShieldAlert size={60} color="#374151" />
                <Text style={styles.emptyTitle}>No has publicado cocheras</Text>
                <Text style={styles.emptySubtitle}>
                  Comienza a ganar dinero alquilando tu espacio de estacionamiento vacío.
                </Text>
              </View>
            }
          />

          {/* Floating Action Button (FAB) for adding new spaces */}
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push('/(host)/add')}
          >
            <Plus size={24} color="#0b0c10" />
          </TouchableOpacity>
        </>
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
  listContainer: {
    padding: 16,
    paddingBottom: 90, // Margin for FAB
  },
  card: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerTitleCol: {
    flex: 1,
    marginRight: 10,
  },
  spaceTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  spaceAddress: {
    color: '#94a3b8',
    fontSize: 12,
  },
  spaceImage: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  priceText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '800',
  },
  stars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 8,
  },
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  featureBadge: {
    color: '#34d399',
    backgroundColor: '#064e3b',
    fontSize: 11,
    fontWeight: '600',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnDisable: {
    backgroundColor: '#ef4444', // Red button to pause/disable
  },
  btnEnable: {
    backgroundColor: '#10b981', // Emerald button to enable/activate
  },
  btnIcon: {
    marginRight: 6,
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10b981', // Emerald highlight for host interactions
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
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
});
