import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, MapPin, Camera, Sparkles, CheckSquare, Square } from 'lucide-react-native';
import parkingService, { CreateParkingSpaceMetadata, MobilePhotoFile } from '../../services/parkingService';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Card from '../../components/Card';

const STANDARD_FEATURES = ['Techado', 'Seguridad 24h', 'Acceso Camionetas', 'Iluminación', 'Cámaras'];

export default function AddSpaceScreen() {
  const router = useRouter();

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [pricePerHour, setPricePerHour] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [photo, setPhoto] = useState<MobilePhotoFile | null>(null);

  // Status states
  const [gettingLocation, setGettingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Handle GPS coordinate capture
  const handleGetGPSLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso Denegado', 'Por favor habilita los permisos de ubicación en la configuración del celular.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLatitude(loc.coords.latitude.toFixed(6));
      setLongitude(loc.coords.longitude.toFixed(6));
      Alert.alert('Coordenadas Obtenidas', 'Se han cargado la latitud y longitud de tu ubicación actual.');
    } catch (err) {
      console.error('Error getting location', err);
      Alert.alert('Error', 'No se pudo obtener la ubicación GPS actual.');
    } finally {
      setGettingLocation(false);
    }
  };

  const toggleFeature = (name: string) => {
    if (selectedFeatures.includes(name)) {
      setSelectedFeatures(selectedFeatures.filter((f) => f !== name));
    } else {
      setSelectedFeatures([...selectedFeatures, name]);
    }
  };

  // Image Selection using expo-image-picker
  const handleSelectPhoto = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            setPhoto({
              uri: reader.result as string,
              name: file.name,
              type: file.type,
              file: file,
            });
            Alert.alert('Foto Añadida', `Se ha seleccionado la foto: ${file.name}`);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permiso Denegado',
            'Se necesitan permisos para acceder a tu galería de imágenes para subir una foto de tu cochera.'
          );
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          const filename = asset.fileName || asset.uri.split('/').pop() || 'cochera.jpg';
          const fileType = asset.mimeType || 'image/jpeg';
          
          setPhoto({
            uri: asset.uri,
            name: filename,
            type: fileType,
          });
          Alert.alert('Foto Añadida', 'Se ha seleccionado la foto para la publicación.');
        }
      } catch (err) {
        console.error('Error picking image', err);
        Alert.alert('Error', 'No se pudo seleccionar la imagen de la galería.');
      }
    }
  };


  const handlePublish = async () => {
    const priceNum = parseFloat(pricePerHour);
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    // Form validations
    if (!title || !description || !address || isNaN(priceNum) || isNaN(latNum) || isNaN(lngNum)) {
      Alert.alert('Campos Incompletos', 'Por favor completa todos los campos requeridos con datos válidos.');
      return;
    }

    setSubmitting(true);

    const metadata: CreateParkingSpaceMetadata = {
      title,
      description,
      address,
      pricePerHour: priceNum,
      latitude: latNum,
      longitude: lngNum,
      features: selectedFeatures,
    };

    try {
      await parkingService.create(metadata, photo || undefined);
      Alert.alert('¡Publicación Exitosa!', 'Tu cochera ya está disponible para alquiler en el mapa.');
      router.replace('/(host)/spaces');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Ocurrió un error al crear la cochera.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Publicar Cochera</Text>
        <View style={{ width: 24 }} /> {/* Balancing spacer */}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Basic Metadata */}
        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Detalles Básicos</Text>

          <Input
            label="Título del Anuncio *"
            placeholder="Ej: Cochera Techada a 2 cdas de Larcomar"
            value={title}
            onChangeText={setTitle}
          />

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Descripción Detallada *</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe el acceso, tamaño, seguridad y referencias para llegar..."
              placeholderTextColor="#475569"
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <Input
            label="Dirección Física *"
            placeholder="Ej: Av. Larco 123, Miraflores"
            value={address}
            onChangeText={setAddress}
          />

          <Input
            label="Precio por Hora (S/.) *"
            placeholder="Ej: 5.00"
            keyboardType="numeric"
            value={pricePerHour}
            onChangeText={setPricePerHour}
          />
        </Card>

        {/* Location & GPS Coordinate Capture */}
        <Card style={styles.formCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ubicación GPS Exacta</Text>
            <Sparkles size={16} color="#10b981" />
          </View>
          <Text style={styles.cardDesc}>
            Para aparecer en las búsquedas en el mapa, ingresa las coordenadas de tu cochera. Puedes capturarlas automáticamente usando tu GPS.
          </Text>

          <View style={styles.coordinateRow}>
            <View style={{ flex: 1 }}>
              <Input
                label="Latitud *"
                placeholder="-12.1219"
                keyboardType="numeric"
                value={latitude}
                onChangeText={setLatitude}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Longitud *"
                placeholder="-77.0299"
                keyboardType="numeric"
                value={longitude}
                onChangeText={setLongitude}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.gpsBtn}
            onPress={handleGetGPSLocation}
            disabled={gettingLocation}
          >
            {gettingLocation ? (
              <ActivityIndicator size="small" color="#10b981" />
            ) : (
              <>
                <MapPin size={16} color="#10b981" style={{ marginRight: 8 }} />
                <Text style={styles.gpsBtnText}>Obtener Ubicación Actual (GPS)</Text>
              </>
            )}
          </TouchableOpacity>
        </Card>

        {/* Features selection */}
        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Características y Servicios</Text>
          <Text style={styles.cardDesc}>Selecciona las comodidades que ofrece tu cochera:</Text>

          <View style={styles.featuresChecklist}>
            {STANDARD_FEATURES.map((feat) => {
              const selected = selectedFeatures.includes(feat);
              return (
                <TouchableOpacity
                  key={feat}
                  style={styles.checklistRow}
                  onPress={() => toggleFeature(feat)}
                >
                  {selected ? (
                    <CheckSquare size={20} color="#10b981" />
                  ) : (
                    <Square size={20} color="#64748b" />
                  )}
                  <Text style={[styles.checklistLabel, selected && styles.checklistLabelActive]}>
                    {feat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Photo Selection */}
        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Fotos de la Cochera</Text>
          <Text style={styles.cardDesc}>Añade una foto clara para que los conductores identifiquen tu cochera.</Text>

          {photo ? (
            <View style={styles.photoPreviewBox}>
              <Text style={styles.photoFileName} numberOfLines={1}>📷 {photo.name}</Text>
              <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => setPhoto(null)}>
                <Text style={styles.photoRemoveText}>Quitar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.photoUploadBtn} onPress={handleSelectPhoto}>
              <Camera size={22} color="#94a3b8" />
              <Text style={styles.photoUploadText}>Tomar o Subir Foto</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Form Submission */}
        <Button
          title="Publicar en ParkShare"
          onPress={handlePublish}
          loading={submitting}
          style={styles.publishBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0c10',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#0b0c10',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
    gap: 16,
  },
  formCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  inputContainer: {
    marginBottom: 14,
  },
  label: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  textArea: {
    backgroundColor: '#0b0c10',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    padding: 12,
    color: '#f8fafc',
    fontSize: 14,
    textAlignVertical: 'top',
    height: 100,
  },
  coordinateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#065f46',
    backgroundColor: '#064e3b20',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 6,
  },
  gpsBtnText: {
    color: '#10b981',
    fontWeight: '700',
    fontSize: 14,
  },
  featuresChecklist: {
    gap: 10,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 12,
  },
  checklistLabel: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  checklistLabelActive: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  photoUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#4b5563',
    borderRadius: 12,
    paddingVertical: 20,
    gap: 10,
    backgroundColor: '#1e293b20',
  },
  photoUploadText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 14,
  },
  photoPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    borderRadius: 10,
  },
  photoFileName: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  photoRemoveBtn: {
    backgroundColor: '#7f1d1d',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  photoRemoveText: {
    color: '#fca5a5',
    fontWeight: '700',
    fontSize: 11,
  },
  publishBtn: {
    backgroundColor: '#10b981', // emerald host call to action
    marginTop: 8,
  },
});
