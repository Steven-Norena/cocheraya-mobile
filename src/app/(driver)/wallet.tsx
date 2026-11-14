import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Landmark, RefreshCw } from 'lucide-react-native';
import walletService, { WalletTransactionResponse } from '../../services/walletService';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Spinner from '../../components/Spinner';

export default function WalletScreen() {
  const { balance, refreshBalance } = useAuth();
  
  const [transactions, setTransactions] = useState<WalletTransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'TOPUP' | 'CHARGE'>('ALL');

  const fetchWalletData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      await refreshBalance();
      
      let res;
      if (activeTab === 'ALL') {
        res = await walletService.getTransactions(0, 20);
      } else {
        res = await walletService.getTransactionsByType(activeTab, 0, 20);
      }
      
      setTransactions(res.content);
    } catch (err) {
      console.error('Error fetching wallet data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, refreshBalance]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWalletData(true);
  };

  const handleTopUp = async (amountVal?: number) => {
    const amt = amountVal || parseFloat(topUpAmount);
    
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Monto Inválido', 'Por favor ingresa un monto mayor a 0 para recargar.');
      return;
    }

    setIsSubmitting(true);
    try {
      await walletService.topUp(amt);
      await refreshBalance();
      setTopUpAmount('');
      Alert.alert('Recarga Exitosa', `Se han recargado S/. ${amt.toFixed(2)} a tu billetera.`);
      fetchWalletData(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al procesar la recarga.';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTransactionItem = ({ item }: { item: WalletTransactionResponse }) => {
    const isTopUp = item.typeLabel === 'TOPUP' || item.amount > 0;
    
    return (
      <View style={styles.txItem}>
        <View style={styles.txLeft}>
          <View style={[styles.txIconWrapper, isTopUp ? styles.txIconTopup : styles.txIconCharge]}>
            {isTopUp ? (
              <ArrowUpRight size={18} color="#10b981" />
            ) : (
              <ArrowDownLeft size={18} color="#c084fc" />
            )}
          </View>
          <View style={styles.txDetails}>
            <Text style={styles.txDescription} numberOfLines={1}>{item.description}</Text>
            <Text style={styles.txDate}>{formatDateTime(item.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.txRight}>
          <Text style={[styles.txAmount, isTopUp ? styles.txAmountPositive : styles.txAmountNegative]}>
            {isTopUp ? '+' : ''}S/. {item.amount.toFixed(2)}
          </Text>
          <Text style={styles.txBalanceAfter}>Saldo: S/. {item.balanceAfter.toFixed(2)}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTransactionItem}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a855f7" />
        }
        ListHeaderComponent={
          <>
            {/* Balance Card */}
            <Card style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <View style={styles.balanceLabelRow}>
                  <Wallet size={18} color="#c084fc" />
                  <Text style={styles.balanceLabel}>Saldo Disponible</Text>
                </View>
                <TouchableOpacity onPress={onRefresh}>
                  <RefreshCw size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <Text style={styles.balanceText}>
                S/. {(balance || 0).toFixed(2)}
              </Text>
              
              <Text style={styles.cardSubText}>Moneda de Pago: Sol Peruano (PEN)</Text>
            </Card>

            {/* Quick TopUp Section */}
            <Card style={styles.topUpCard}>
              <Text style={styles.sectionTitle}>Simular Recarga de Saldo</Text>
              <Text style={styles.sectionSubtitle}>Agrega fondos simulados para poder realizar reservas.</Text>

              {/* Predefined Amounts */}
              <View style={styles.presetButtons}>
                {[10, 20, 50, 100].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={styles.presetBtn}
                    onPress={() => handleTopUp(amt)}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.presetText}>+ S/. {amt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom Amount Form */}
              <View style={styles.customAmountForm}>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencySymbol}>S/.</Text>
                  <TextInput
                    style={styles.customInput}
                    placeholder="Monto personalizado"
                    placeholderTextColor="#4b5563"
                    keyboardType="numeric"
                    value={topUpAmount}
                    onChangeText={setTopUpAmount}
                    editable={!isSubmitting}
                  />
                </View>
                
                <Button
                  title="Recargar"
                  onPress={() => handleTopUp()}
                  loading={isSubmitting}
                  style={styles.topUpSubmitBtn}
                />
              </View>
            </Card>

            {/* Transactions Header / Filter tabs */}
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Historial de Movimientos</Text>
              
              <View style={styles.filterTabs}>
                {(['ALL', 'TOPUP', 'CHARGE'] as const).map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.filterTab, activeTab === tab && styles.filterTabActive]}
                    onPress={() => {
                      setActiveTab(tab);
                      setLoading(true);
                    }}
                  >
                    <Text style={[styles.filterTabText, activeTab === tab && styles.filterTabTextActive]}>
                      {tab === 'ALL' ? 'Todos' : tab === 'TOPUP' ? 'Recargas' : 'Pagos'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {loading && <ActivityIndicator size="small" color="#a855f7" style={{ marginVertical: 20 }} />}
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Landmark size={48} color="#374151" />
              <Text style={styles.emptyTitle}>Sin transacciones</Text>
              <Text style={styles.emptySubtitle}>
                No registras movimientos en tu billetera. Recarga saldo para empezar.
              </Text>
            </View>
          ) : null
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0c10',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  balanceCard: {
    backgroundColor: '#16132b',
    borderWidth: 1,
    borderColor: '#4c2d82',
    padding: 24,
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceLabel: {
    color: '#a78bfa',
    fontSize: 14,
    fontWeight: '600',
  },
  balanceText: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '900',
    marginVertical: 12,
  },
  cardSubText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
  },
  topUpCard: {
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 16,
  },
  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetBtn: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: '#1e1b4b',
    borderWidth: 1,
    borderColor: '#4c1d95',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  presetText: {
    color: '#c084fc',
    fontWeight: '700',
    fontSize: 13,
  },
  customAmountForm: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b0c10',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
  },
  currencySymbol: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 6,
  },
  customInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
    height: '100%',
    paddingVertical: 0,
  },
  topUpSubmitBtn: {
    paddingHorizontal: 24,
    height: 46,
  },
  historyHeader: {
    marginBottom: 12,
  },
  historyTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    paddingBottom: 8,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: 'transparent',
  },
  filterTabActive: {
    backgroundColor: '#1e293b',
  },
  filterTabText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#f8fafc',
  },
  txItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#11121d',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  txIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txIconTopup: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  txIconCharge: {
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
  },
  txDetails: {
    flex: 1,
  },
  txDescription: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  txDate: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  txAmountPositive: {
    color: '#10b981',
  },
  txAmountNegative: {
    color: '#c084fc',
  },
  txBalanceAfter: {
    fontSize: 10,
    color: '#475569',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    color: '#64748b',
    textAlign: 'center',
    fontSize: 12,
  },
});
