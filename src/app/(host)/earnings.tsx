import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Landmark, ArrowUpRight, TrendingUp, RefreshCw, BarChart3 } from 'lucide-react-native';
import walletService, { WalletTransactionResponse, EarningsSummaryResponse } from '../../services/walletService';
import Card from '../../components/Card';
import Spinner from '../../components/Spinner';

export default function HostEarningsScreen() {
  const [earningsSummary, setEarningsSummary] = useState<EarningsSummaryResponse | null>(null);
  const [transactions, setTransactions] = useState<WalletTransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEarningsData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      // Load Host Earnings Summary (totalEarned, earningsThisMonth, transactionCount)
      const summary = await walletService.getEarnings();
      setEarningsSummary(summary);
      
      // Load Transaction Ledger (page = 0, size = 30)
      const res = await walletService.getTransactions(0, 30);
      
      // Filter host transactions: usually earnings are deposits/charges made to the host wallet,
      // which have positive amount in their history (or type CHARGE if credited).
      setTransactions(res.content);
    } catch (err) {
      console.error('Error fetching host earnings details', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEarningsData();
  }, [fetchEarningsData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEarningsData(true);
  };

  const formatDateOnly = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  const formatTimeOnly = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderTransactionItem = ({ item }: { item: WalletTransactionResponse }) => {
    return (
      <View style={styles.ledgerRow}>
        <View style={styles.ledgerRowTop}>
          <View style={styles.ledgerLeft}>
            <View style={styles.earningIconBox}>
              <ArrowUpRight size={16} color="#10b981" />
            </View>
            <View style={styles.ledgerInfo}>
              <Text style={styles.ledgerDescription} numberOfLines={1}>{item.description}</Text>
              {item.parkingSpaceName && (
                <Text style={styles.ledgerSpaceName}>🅿️ {item.parkingSpaceName}</Text>
              )}
              <Text style={styles.ledgerDate}>
                📅 {item.startTime ? formatDateOnly(item.startTime) : formatDateOnly(item.createdAt)}
              </Text>
            </View>
          </View>

          <View style={styles.ledgerRight}>
            <Text style={styles.earningAmount}>
              + S/. {item.amount.toFixed(2)}
            </Text>
            <Text style={styles.balanceAfterText}>Saldo: S/. {item.balanceAfter.toFixed(2)}</Text>
          </View>
        </View>

        {item.startTime && item.endTime && (
          <View style={styles.auditBlock}>
            <Text style={styles.auditText}>
              🔑 Entrada: <Text style={styles.auditTime}>{formatTimeOnly(item.startTime)}</Text>
            </Text>
            <Text style={styles.auditText}>
              🚗 Salida: <Text style={styles.auditTime}>{formatTimeOnly(item.endTime)}</Text>
            </Text>
            <Text style={styles.auditText}>
              ⏱️ Duración: <Text style={{ fontWeight: 'bold', color: '#10b981' }}>{item.durationMinutes} min</Text>
              {item.reservationId ? `  |  🆔 Reserva #${item.reservationId}` : ''}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTransactionItem}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
        ListHeaderComponent={
          <>
            {/* Earnings Executive Board */}
            <Card style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <View style={styles.summaryTitleRow}>
                  <Landmark size={18} color="#34d399" />
                  <Text style={styles.summaryTitle}>Billetera Recaudadora</Text>
                </View>
                <TouchableOpacity onPress={onRefresh}>
                  <RefreshCw size={14} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <Text style={styles.totalEarnedText}>
                S/. {earningsSummary?.totalEarned ? earningsSummary.totalEarned.toFixed(2) : '0.00'}
              </Text>
              <Text style={styles.totalEarnedLabel}>Ganancias Acumuladas</Text>

              <View style={styles.divider} />

              <View style={styles.gridStats}>
                <View style={styles.gridCol}>
                  <Text style={styles.gridLabel}>Este Mes</Text>
                  <Text style={styles.gridVal}>
                    S/. {earningsSummary?.earningsThisMonth ? earningsSummary.earningsThisMonth.toFixed(2) : '0.00'}
                  </Text>
                </View>
                <View style={styles.gridCol}>
                  <Text style={styles.gridLabel}>Nro. Cobros</Text>
                  <Text style={styles.gridVal}>
                    {earningsSummary?.transactionCount || 0}
                  </Text>
                </View>
              </View>
            </Card>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Libro de Ingresos (Ledger)</Text>
              <BarChart3 size={16} color="#94a3b8" />
            </View>

            {loading && <ActivityIndicator size="small" color="#10b981" style={{ marginVertical: 20 }} />}
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <Card style={styles.emptyCard}>
              <TrendingUp size={48} color="#374151" />
              <Text style={styles.emptyTitle}>Sin ganancias registradas</Text>
              <Text style={styles.emptySubtitle}>
                Cuando un conductor complete el check-out en una de tus cocheras, verás el abono reflejado aquí al instante.
              </Text>
            </Card>
          ) : null
        }
      />
    </View>
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
  summaryCard: {
    backgroundColor: '#0d1a15',
    borderWidth: 1,
    borderColor: '#065f46',
    padding: 24,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryTitle: {
    color: '#6ee7b7',
    fontSize: 13,
    fontWeight: '700',
  },
  totalEarnedText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 8,
  },
  totalEarnedLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#065f46',
    marginVertical: 16,
  },
  gridStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridCol: {
    flex: 1,
  },
  gridLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  gridVal: {
    color: '#34d399',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
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
  ledgerRow: {
    backgroundColor: '#11121d',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  ledgerRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  auditBlock: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    gap: 4,
  },
  auditText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  auditTime: {
    color: '#e2e8f0',
    fontWeight: '600',
  },
  ledgerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  earningIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ledgerInfo: {
    flex: 1,
    gap: 2,
  },
  ledgerDescription: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  ledgerSpaceName: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '600',
  },
  ledgerDate: {
    color: '#64748b',
    fontSize: 10,
  },
  ledgerRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  earningAmount: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '800',
  },
  balanceAfterText: {
    color: '#475569',
    fontSize: 10,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 30,
    gap: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    color: '#64748b',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
  },
});
