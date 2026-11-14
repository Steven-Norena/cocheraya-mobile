import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { MapPin, Compass, Shield, Navigation, Star, Info, Wallet } from 'lucide-react-native';
import parkingService, { ParkingSpace } from '../../services/parkingService';
import reservationService from '../../services/reservationService';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import Badge from '../../components/Badge';

// Conditional import of react-native-maps to prevent web crash
let MapView: any;
let Marker: any;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
  } catch (e) {
    console.warn('Failed to load react-native-maps', e);
  }
}

const DEFAULT_LIMA_COORDS = {
  latitude: -12.1219,
  longitude: -77.0299,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

const WebIframe = 'iframe' as any;

export default function MapScreen() {
  const { user, balance, refreshBalance } = useAuth();
  const router = useRouter();
  const mapRef = useRef<any>(null);

  // States
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [parkingSpaces, setParkingSpaces] = useState<ParkingSpace[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<ParkingSpace | null>(null);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [reserving, setReserving] = useState(false);

  // Ask for location permissions on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permiso de ubicación denegado. Usando ubicación predeterminada (Miraflores, Lima).');
          setLoadingLocation(false);
          fetchNearbySpaces(DEFAULT_LIMA_COORDS.latitude, DEFAULT_LIMA_COORDS.longitude);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(loc.coords);
        setLoadingLocation(false);
        fetchNearbySpaces(loc.coords.latitude, loc.coords.longitude);
      } catch (err) {
        console.error('Error fetching location', err);
        setErrorMsg('No se pudo obtener la ubicación en tiempo real. Usando Lima por defecto.');
        setLoadingLocation(false);
        fetchNearbySpaces(DEFAULT_LIMA_COORDS.latitude, DEFAULT_LIMA_COORDS.longitude);
      }
    })();
  }, []);

  // Web postMessage listener for Leaflet map marker clicks
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleMessage = (event: any) => {
      if (event.data && event.data.type === 'markerPress') {
        const space = parkingSpaces.find(s => s.id === event.data.spaceId);
        if (space) {
          setSelectedSpace(space);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [parkingSpaces]);

  const fetchNearbySpaces = async (lat: number, lng: number) => {
    setLoadingSpaces(true);
    try {
      const data = await parkingService.searchNearby({ lat, lng, radius: 5000 });
      // Only show available spaces in driver search
      const availableOnly = data.filter(space => space.status === 'AVAILABLE');
      setParkingSpaces(availableOnly);
    } catch (err) {
      console.error('Error searching nearby spaces', err);
    } finally {
      setLoadingSpaces(false);
    }
  };

  const handleRecenter = async () => {
    try {
      setLoadingLocation(true);
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(loc.coords);
      
      const region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      };

      if (mapRef.current) {
        mapRef.current.animateToRegion(region, 1000);
      }
      
      fetchNearbySpaces(loc.coords.latitude, loc.coords.longitude);
    } catch (err) {
      Alert.alert('Error', 'No se pudo obtener la ubicación actual.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleReserve = async (space: ParkingSpace) => {
    if (Platform.OS === 'web') {
      if (!balance || balance < space.pricePerHour) {
        const confirmGoToWallet = window.confirm(
          `Saldo Insuficiente\n\nTu saldo actual es de S/. ${(balance || 0).toFixed(2)}. Necesitas recargar tu billetera para reservar esta cochera (Mínimo S/. ${space.pricePerHour.toFixed(2)} para iniciar).\n\n¿Deseas ir a la Billetera para recargar?`
        );
        if (confirmGoToWallet) {
          router.push('/(driver)/wallet');
        }
        return;
      }

      const confirmReserve = window.confirm(
        `Confirmar Reserva\n\n¿Deseas reservar la cochera "${space.title}" por S/. ${space.pricePerHour.toFixed(2)} por hora?`
      );
      if (confirmReserve) {
        setReserving(true);
        try {
          await reservationService.create(space.id);
          await refreshBalance();
          setSelectedSpace(null);
          window.alert('¡Éxito! Cochera reservada correctamente. Generando tu ticket QR.');
          router.push('/(driver)/reservations');
        } catch (err: any) {
          const msg = err.response?.data?.message || 'No se pudo crear la reserva.';
          window.alert('Error: ' + msg);
        } finally {
          setReserving(false);
        }
      }
      return;
    }

    if (!balance || balance < space.pricePerHour) {
      Alert.alert(
        'Saldo Insuficiente',
        `Tu saldo actual es de S/. ${(balance || 0).toFixed(2)}. Necesitas recargar tu billetera para reservar esta cochera (Mínimo S/. ${space.pricePerHour.toFixed(2)} para iniciar).`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ir a Billetera', onPress: () => router.push('/(driver)/wallet') }
        ]
      );
      return;
    }

    Alert.alert(
      'Confirmar Reserva',
      `¿Deseas reservar la cochera "${space.title}" por S/. ${space.pricePerHour.toFixed(2)} por hora?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reservar',
          onPress: async () => {
            setReserving(true);
            try {
              await reservationService.create(space.id);
              await refreshBalance();
              setSelectedSpace(null);
              Alert.alert('¡Éxito!', 'Cochera reservada correctamente. Generando tu ticket QR.');
              router.push('/(driver)/reservations');
            } catch (err: any) {
              const msg = err.response?.data?.message || 'No se pudo crear la reserva.';
              Alert.alert('Error', msg);
            } finally {
              setReserving(false);
            }
          }
        }
      ]
    );
  };

  // Render Map view according to Platform
  const renderMap = () => {
    const activeLat = location?.latitude || DEFAULT_LIMA_COORDS.latitude;
    const activeLng = location?.longitude || DEFAULT_LIMA_COORDS.longitude;

    if (Platform.OS === 'web' || !MapView) {
      // Real Leaflet Map for Web View Development
      const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #0a0a0f;
    }
    .leaflet-control-zoom {
      border: 1px solid #1e1b4b !important;
    }
    .leaflet-bar a {
      background-color: #11121d !important;
      color: #a855f7 !important;
      border-bottom: 1px solid #1e1b4b !important;
    }
    .leaflet-bar a:hover {
      background-color: #1e1b4b !important;
      color: #c084fc !important;
    }
    .leaflet-control-attribution {
      font-size: 9px !important;
      background: rgba(10, 10, 15, 0.7) !important;
      color: #94a3b8 !important;
    }
    .leaflet-control-attribution a {
      color: #a855f7 !important;
    }
    .leaflet-tooltip {
      background-color: #6b21a8 !important;
      border: 1.5px solid #a855f7 !important;
      color: #ffffff !important;
      font-weight: bold !important;
      border-radius: 20px !important;
      padding: 4px 8px !important;
      font-size: 11px !important;
      box-shadow: 0 2px 5px rgba(0,0,0,0.5) !important;
    }
    .leaflet-tooltip-active {
      background-color: #10b981 !important;
      border: 1.5px solid #34d399 !important;
    }
    .user-icon {
      background: #3b82f6;
      border: 2px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.4);
    }
    .pin-icon {
      background: #8b5cf6;
      border: 2px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.4);
    }
    .pin-icon-active {
      background: #10b981;
      border: 2px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.4);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: true
    }).setView([${activeLat}, ${activeLng}], 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20
    }).addTo(map);

    // User location marker
    var userIcon = L.divIcon({
      className: 'user-icon',
      iconSize: [14, 14]
    });
    L.marker([${activeLat}, ${activeLng}], { icon: userIcon }).addTo(map).bindPopup("Tu ubicación");

    // Parking spaces
    var spaces = ${JSON.stringify(parkingSpaces.map(s => ({ id: s.id, lat: s.latitude, lng: s.longitude, price: s.pricePerHour, title: s.title })))};
    spaces.forEach(function(space) {
      var active = ${selectedSpace ? selectedSpace.id : 'null'} === space.id;
      
      var pinIcon = L.divIcon({
        className: active ? 'pin-icon-active' : 'pin-icon',
        iconSize: [12, 12]
      });

      var marker = L.marker([space.lat, space.lng], { icon: pinIcon }).addTo(map);
      
      marker.bindTooltip("S/. " + space.price.toFixed(1), {
        permanent: true,
        direction: 'top',
        className: active ? 'leaflet-tooltip leaflet-tooltip-active' : 'leaflet-tooltip',
        offset: [0, -6]
      });

      marker.on('click', function() {
        window.parent.postMessage({ type: 'markerPress', spaceId: space.id }, '*');
      });
    });
  </script>
</body>
</html>
      `;

      return (
        <View style={styles.webMapContainer}>
          <WebIframe
            srcDoc={mapHtml}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Simulador de Mapa (Web Dev)"
          />

          <View style={styles.webMapNotice}>
            <Compass size={18} color="#a855f7" />
            <Text style={styles.webMapNoticeText}>Mapa Interactivo (Web Dev - Leaflet)</Text>
          </View>
        </View>
      );
    }

    return (
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: activeLat,
          longitude: activeLng,
          latitudeDelta: DEFAULT_LIMA_COORDS.latitudeDelta,
          longitudeDelta: DEFAULT_LIMA_COORDS.longitudeDelta,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        customMapStyle={darkMapStyle}
      >
        {parkingSpaces.map((space) => (
          <Marker
            key={space.id}
            coordinate={{ latitude: space.latitude, longitude: space.longitude }}
            onPress={() => setSelectedSpace(space)}
            pinColor="#a855f7"
          >
            <View style={[
              styles.nativeMarkerContainer,
              selectedSpace?.id === space.id && styles.nativeMarkerActive
            ]}>
              <Text style={styles.nativeMarkerPrice}>S/.{space.pricePerHour.toFixed(1)}</Text>
            </View>
          </Marker>
        ))}
      </MapView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hola, {user?.name.split(' ')[0]}</Text>
          <Text style={styles.locationSubText}>
            {location ? '📍 Ubicación GPS activa' : '📍 Usando ubicación por defecto'}
          </Text>
        </View>
        
        <View style={styles.balanceContainer}>
          <Wallet size={16} color="#c084fc" />
          <Text style={styles.balanceText}>S/. {(balance || 0).toFixed(2)}</Text>
        </View>
      </View>

      {/* Map Content */}
      <View style={styles.mapWrapper}>
        {loadingLocation ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#a855f7" />
            <Text style={styles.loadingText}>Obteniendo coordenadas GPS...</Text>
          </View>
        ) : (
          renderMap()
        )}

        {/* Floating actions */}
        {!loadingLocation && (
          <View style={styles.floatingContainer}>
            <TouchableOpacity style={styles.floatingBtn} onPress={handleRecenter}>
              <Navigation size={22} color="#f8fafc" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Detail drawer when space is selected */}
      {selectedSpace && (
        <View style={styles.drawer}>
          <View style={styles.drawerHandle} />
          
          <ScrollView contentContainerStyle={styles.drawerScroll}>
            <View style={styles.drawerHeader}>
              <View style={styles.titleWrapper}>
                <Text style={styles.drawerTitle} numberOfLines={1}>{selectedSpace.title}</Text>
                <Text style={styles.drawerAddress} numberOfLines={1}>📍 {selectedSpace.address}</Text>
              </View>
              <View style={styles.priceBadge}>
                <Text style={styles.priceText}>S/. {selectedSpace.pricePerHour.toFixed(2)}</Text>
                <Text style={styles.priceUnit}>/ hora</Text>
              </View>
            </View>

            {/* Photo preview */}
            {selectedSpace.photoUrl && (
              <Image source={{ uri: selectedSpace.photoUrl }} style={styles.spaceImage} />
            )}

            <View style={styles.ratingRow}>
              <View style={styles.stars}>
                <Star size={16} color="#fbbf24" fill="#fbbf24" />
                <Text style={styles.ratingText}>
                  {selectedSpace.averageRating ? selectedSpace.averageRating.toFixed(1) : 'Nuevo'}
                </Text>
              </View>
              <Badge label="DISPONIBLE" status="success" />
            </View>

            <Text style={styles.descriptionText}>{selectedSpace.description}</Text>

            <View style={styles.featuresList}>
              {selectedSpace.features && selectedSpace.features.map((feat, idx) => (
                <View key={idx} style={styles.featureItem}>
                  <Shield size={14} color="#a855f7" />
                  <Text style={styles.featureText}>{feat}</Text>
                </View>
              ))}
            </View>

            <View style={styles.actionRow}>
              <Button
                title="Reservar Ahora"
                onPress={() => handleReserve(selectedSpace)}
                loading={reserving}
                style={styles.reserveBtn}
              />
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelectedSpace(null)}
              >
                <Text style={styles.closeText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// Retro dark map custom JSON style for react-native-maps
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#181824' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#181824' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#11221c' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b9a76' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2b2b3d' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#212130' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca3af' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3f2b69' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f1635' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f3e5f5' }]
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2f3948' }]
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#09090e' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#515c6d' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#17263c' }]
  }
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0c10',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#0b0c10',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  locationSubText: {
    fontSize: 12,
    color: '#a855f7',
    marginTop: 2,
    fontWeight: '600',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1b4b',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3b0764',
  },
  balanceText: {
    color: '#c084fc',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: '#0b0c10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
  },
  floatingContainer: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    gap: 12,
  },
  floatingBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#a855f7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  drawer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    maxHeight: '48%',
    backgroundColor: '#11121d',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#312e81',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 20,
  },
  drawerHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#374151',
    borderRadius: 3,
    alignSelf: 'center',
    marginVertical: 12,
  },
  drawerScroll: {
    paddingBottom: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleWrapper: {
    flex: 1,
    marginRight: 12,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 4,
  },
  drawerAddress: {
    fontSize: 13,
    color: '#94a3b8',
  },
  priceBadge: {
    alignItems: 'flex-end',
    backgroundColor: '#1e1b4b',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4338ca',
  },
  priceText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#c084fc',
  },
  priceUnit: {
    fontSize: 12,
    color: '#94a3b8',
  },
  spaceImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stars: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  ratingText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  descriptionText: {
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 20,
    marginBottom: 12,
  },
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1b4b',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#312e81',
  },
  featureText: {
    color: '#c084fc',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reserveBtn: {
    flex: 1,
  },
  closeBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#1f2937',
  },
  closeText: {
    color: '#94a3b8',
    fontWeight: '600',
  },

  // Web simulator styles
  webMapContainer: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  webGridOverlay: {
    position: 'absolute',
    width: '200%',
    height: '200%',
    borderColor: '#1e1b4b',
    borderWidth: 0.5,
    borderStyle: 'dashed',
    opacity: 0.3,
  },
  webUserPin: {
    position: 'absolute',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webUserPinCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
    borderWidth: 2,
    borderColor: '#f8fafc',
  },
  webUserPinPulse: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(59, 130, 246, 0.4)',
  },
  webMarker: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6b21a8',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#a855f7',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  webMarkerActive: {
    backgroundColor: '#10b981',
    borderColor: '#34d399',
    transform: [{ scale: 1.1 }],
  },
  webMarkerText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 3,
  },
  webMapNotice: {
    position: 'absolute',
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11121d',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  webMapNoticeText: {
    color: '#94a3b8',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '600',
  },
  nativeMarkerContainer: {
    backgroundColor: '#6b21a8',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#c084fc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeMarkerActive: {
    backgroundColor: '#10b981',
    borderColor: '#34d399',
  },
  nativeMarkerPrice: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '700',
  },
});
