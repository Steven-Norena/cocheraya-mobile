import api from './api';

export interface WalletResponse {
  userId: number;
  balance: number;
  updatedAt: string;
}

export interface WalletTransactionResponse {
  id: number;
  typeLabel: string;
  amountDisplay: string;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
  reservationId?: number;
  parkingSpaceName?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
}

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

export interface EarningsSummaryResponse {
  totalEarned: number;
  earningsThisMonth: number;
  transactionCount: number;
}

export const walletService = {
  async getBalance(signal?: AbortSignal): Promise<WalletResponse> {
    const response = await api.get<WalletResponse>('/wallet/balance', { signal });
    return response.data;
  },

  async topUp(amount: number): Promise<WalletResponse> {
    const response = await api.post<WalletResponse>('/wallet/top-up', { amount });
    return response.data;
  },

  async getTransactions(
    page: number = 0, 
    size: number = 10, 
    signal?: AbortSignal
  ): Promise<PageResponse<WalletTransactionResponse>> {
    const response = await api.get<PageResponse<WalletTransactionResponse>>('/wallet/transactions', {
      params: { page, size },
      signal,
    });
    return response.data;
  },

  async getTransactionsByType(
    type: 'TOPUP' | 'CHARGE' | 'REFUND',
    page: number = 0,
    size: number = 10,
    signal?: AbortSignal
  ): Promise<PageResponse<WalletTransactionResponse>> {
    const response = await api.get<PageResponse<WalletTransactionResponse>>(`/wallet/transactions/${type}`, {
      params: { page, size },
      signal,
    });
    return response.data;
  },

  async getEarnings(signal?: AbortSignal): Promise<EarningsSummaryResponse> {
    const response = await api.get<EarningsSummaryResponse>('/wallet/earnings', { signal });
    return response.data;
  }
};

export default walletService;
