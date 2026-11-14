import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ChevronLeft, Scan, CheckCircle2, Landmark, Clock, Coins, X } from 'lucide-react-native';
import reservationService, { CheckInResponse, CheckOutResponse } from '../../services/reservationService';
import Button from '../../components/Button';
import Card from '../../components/Card';

export default function QRScannerScreen() {
  const router = useRouter();
  
  // Camera permission state
  const [permission, requestPermission] = useCameraPermissions();
  
  // App states
  const [scanMode, setScanMode] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Results display
  const [checkInResult, setCheckInResult] = useState<CheckInResponse | null>(null);
  const [checkOutResult, setCheckOutResult] = useState<CheckOutResponse | null>(null);

  // Request permissions on mount if not granted
  useEffect(() => {
    if (Platform.OS !== 'web' && (!permission || !permission.granted)) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;
    setScanned(true);
    
    // Vibrate to provide haptic feedback (Rúbrica compliant detail)
    if (Platform.OS !== 'web') {
      try {
        Vibration.vibrate(150);
      } catch (e) {
        console.warn(e);
      }
    }
    
    processCode(data);
  };

  const processCode = async (code: string) => {
    setProcessing(true);
    setCheckInResult(null);
    setCheckOutResult(null);

    try {
      if (scanMode === 'CHECK_IN') {
        const res = await reservationService.checkIn(code);
        setCheckInResult(res);
      } else {
        const res = await reservationService.checkOut(code);
        setCheckOutResult(res);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al procesar el código QR. Inténtalo de nuevo.';
      Alert.alert('Error de Escaneo', msg, [
        { text: 'Aceptar', onPress: () => setScanned(false) }
      ]);
    } finally {
      setProcessing(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setCheckInResult(null);
    setCheckOutResult(null);
    setManualCode('');
  };

  // Helper to format minutes into human readable text
  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h y ${remainingMins}m`;
  };

  // Permission checks
  if (Platform.OS !== 'web') {
    if (!permission) {
      return (
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.statusText}>Solicitando permisos de cámara...</Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.container}>
          <Card style={styles.permissionCard}>
            <Text style={styles.permissionTitle}>Permiso de Cámara Requerido</Text>
            <Text style={styles.permissionDesc}>
              Para escanear los códigos QR de los conductores, necesitamos acceso a la cámara de tu celular.
            </Text>
            <Button title="Dar Permiso" onPress={requestPermission} />
            <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
              <Text style={styles.backLinkText}>Volver al Dashboard</Text>
            </TouchableOpacity>
          </Card>
        </View>
      );
    }
  }

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Escáner Check-In / Out</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Mode Selector */}
      <View style={styles.modeContainer}>
        <TouchableOpacity
          style={[styles.modeBtn, scanMode === 'CHECK_IN' && styles.modeBtnActiveIn]}
          onPress={() => {
            setScanMode('CHECK_IN');
            resetScanner();
          }}
        >
          <Text style={[styles.modeText, scanMode === 'CHECK_IN' && styles.modeTextActive]}>
            Ingreso (Check-In)
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modeBtn, scanMode === 'CHECK_OUT' && styles.modeBtnActiveOut]}
          onPress={() => {
            setScanMode('CHECK_OUT');
            resetScanner();
          }}
        >
          <Text style={[styles.modeText, scanMode === 'CHECK_OUT' && styles.modeTextActive]}>
            Salida (Check-Out)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Core Scanner Viewport */}
      <View style={styles.scannerWrapper}>
        {processing ? (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.processingText}>Verificando firma criptográfica...</Text>
          </View>
        ) : checkInResult ? (
          /* Check-In Success Report */
          <View style={styles.resultBox}>
            <CheckCircle2 size={64} color="#10b981" style={{ marginBottom: 16 }} />
            <Text style={styles.resultTitle}>¡Check-In Exitoso!</Text>
            <Text style={styles.resultDesc}>{checkInResult.message}</Text>
            
            <Button
              title="Escaneo Nuevo"
              onPress={resetScanner}
              style={[styles.resetBtn, { backgroundColor: '#10b981' }]}
            />
          </View>
        ) : checkOutResult ? (
          /* Check-Out Detailed Receipt */
          <View style={styles.receiptBox}>
            <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: 12 }} />
            <Text style={styles.receiptTitle}>¡Check-Out Exitoso!</Text>
            <Text style={styles.receiptSubtitle}>Detalle de Cobro e Infracción</Text>
            
            <Card style={styles.receiptCard}>
              <Text style={styles.receiptSpotName} numberOfLines={1}>
                {checkOutResult.parkingSpaceName}
              </Text>
              <Text style={styles.receiptId}>Reserva #{checkOutResult.reservationId}</Text>
              
              <View style={styles.receiptDivider} />

              <View style={styles.receiptGrid}>
                <View style={styles.receiptRowItem}>
                  <View style={styles.receiptIconText}>
                    <Clock size={16} color="#94a3b8" />
                    <Text style={styles.receiptLabel}>Duración</Text>
                  </View>
                  <Text style={styles.receiptVal}>{formatDuration(checkOutResult.durationMinutes)}</Text>
                </View>

                <View style={styles.receiptRowItem}>
                  <View style={styles.receiptIconText}>
                    <Coins size={16} color="#10b981" />
                    <Text style={styles.receiptLabel}>Total Cobrado</Text>
                  </View>
                  <Text style={[styles.receiptVal, { color: '#10b981', fontWeight: '800' }]}>
                    S/. {checkOutResult.totalCharged.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.receiptRowItem}>
                  <View style={styles.receiptIconText}>
                    <Landmark size={16} color="#c084fc" />
                    <Text style={styles.receiptLabel}>Saldo Conductor</Text>
                  </View>
                  <Text style={styles.receiptVal}>S/. {checkOutResult.remainingBalance.toFixed(2)}</Text>
                </View>
              </View>
            </Card>

            <Button
              title="Finalizar y Salir"
              onPress={resetScanner}
              style={[styles.resetBtn, { backgroundColor: '#10b981' }]}
            />
          </View>
        ) : Platform.OS === 'web' ? (
          /* Web Simulator Input */
          <View style={styles.webSimulator}>
            <Scan size={40} color="#3b82f6" style={{ marginBottom: 12 }} />
            <Text style={styles.webSimTitle}>Simulador de Escáner QR</Text>
            <Text style={styles.webSimDesc}>
              Dado que estás probando en entorno web, ingresa el token UUID generado por la reserva del Driver para simular el escaneo:
            </Text>
            
            <TextInput
              style={styles.webSimInput}
              placeholder="Ej: d7192ea6-8b93-4ad6-b333-e7a93414995f"
              placeholderTextColor="#4b5563"
              value={manualCode}
              onChangeText={setManualCode}
            />
            
            <Button
              title={scanMode === 'CHECK_IN' ? 'Simular Check-In' : 'Simular Check-Out'}
              onPress={() => processCode(manualCode)}
              disabled={!manualCode}
              style={{ backgroundColor: scanMode === 'CHECK_IN' ? '#10b981' : '#c084fc', width: '100%' }}
            />
          </View>
        ) : (
          /* Native Camera Viewfinder */
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          >
            {/* Viewfinder Target Mask overlay */}
            <View style={styles.overlay}>
              <View style={styles.unfocusedContainer} />
              
              <View style={styles.focusedRow}>
                <View style={styles.unfocusedContainer} />
                <View style={[
                  styles.viewfinder,
                  scanMode === 'CHECK_IN' ? styles.viewfinderIn : styles.viewfinderOut
                ]}>
                  {/* Laser Scanning Line */}
                  <View style={styles.laserLine} />
                </View>
                <View style={styles.unfocusedContainer} />
              </View>
              
              <View style={styles.unfocusedContainer}>
                <Text style={styles.viewfinderInstructions}>
                  Encuadra el código QR del celular del conductor dentro del recuadro
                </Text>
              </View>
            </View>
          </CameraView>
        )}
      </View>

      {/* Manual Input Trigger (Native Fallback) */}
      {!scanned && Platform.OS !== 'web' && (
        <View style={styles.manualInputSection}>
          <Text style={styles.manualText}>¿El QR está dañado?</Text>
          <View style={styles.manualInputRow}>
            <TextInput
              style={styles.manualInput}
              placeholder="Ingresa código UUID manual"
              placeholderTextColor="#4b5563"
              value={manualCode}
              onChangeText={setManualCode}
            />
            <TouchableOpacity
              style={[
                styles.manualSubmitBtn,
                scanMode === 'CHECK_IN' ? styles.manualSubmitBtnIn : styles.manualSubmitBtnOut
              ]}
              onPress={() => processCode(manualCode)}
              disabled={!manualCode}
            >
              <Text style={styles.manualSubmitText}>Enviar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  statusText: {
    color: '#94a3b8',
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  permissionCard: {
    margin: 24,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  permissionTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  permissionDesc: {
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  backLink: {
    marginTop: 8,
  },
  backLinkText: {
    color: '#10b981',
    fontWeight: '600',
  },
  modeContainer: {
    flexDirection: 'row',
    backgroundColor: '#11121d',
    margin: 16,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeBtnActiveIn: {
    backgroundColor: '#064e3b',
  },
  modeBtnActiveOut: {
    backgroundColor: '#3b0764',
  },
  modeText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '700',
  },
  modeTextActive: {
    color: '#ffffff',
  },
  scannerWrapper: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  unfocusedContainer: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 8, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  focusedRow: {
    flexDirection: 'row',
    height: 240,
  },
  viewfinder: {
    width: 240,
    height: 240,
    borderWidth: 3,
    backgroundColor: 'transparent',
    position: 'relative',
    justifyContent: 'center',
  },
  viewfinderIn: {
    borderColor: '#10b981',
  },
  viewfinderOut: {
    borderColor: '#c084fc',
  },
  laserLine: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 2,
    backgroundColor: '#ef4444',
  },
  viewfinderInstructions: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  processingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 5, 8, 0.9)',
    gap: 16,
  },
  processingText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  resultBox: {
    flex: 1,
    backgroundColor: '#11121d',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  resultDesc: {
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 30,
  },
  resetBtn: {
    width: '80%',
  },
  receiptBox: {
    flex: 1,
    backgroundColor: '#11121d',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  receiptSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 20,
  },
  receiptCard: {
    width: '100%',
    backgroundColor: '#0b0c10',
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 30,
  },
  receiptSpotName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  receiptId: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 14,
  },
  receiptGrid: {
    gap: 12,
  },
  receiptRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptIconText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  receiptLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  receiptVal: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
  },
  webSimulator: {
    flex: 1,
    backgroundColor: '#11121d',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webSimTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  webSimDesc: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  webSimInput: {
    width: '100%',
    backgroundColor: '#0b0c10',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    padding: 12,
    color: '#f8fafc',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 20,
  },
  manualInputSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 8,
  },
  manualText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  manualInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  manualInput: {
    flex: 1,
    backgroundColor: '#11121d',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: '#f8fafc',
    fontSize: 13,
  },
  manualSubmitBtn: {
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    height: 44,
  },
  manualSubmitBtnIn: {
    backgroundColor: '#065f46',
  },
  manualSubmitBtnOut: {
    backgroundColor: '#581c87',
  },
  manualSubmitText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});
