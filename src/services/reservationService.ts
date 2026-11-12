import api from './api';

export interface ReservationResponse {
  id: number;
  status: 'PENDING' | 'ACTIVE' | 'FINISHED' | 'EXPIRED' | 'CANCELLED';
  reservedAt: string;
  startTime?: string;
  endTime?: string;
  expiresAt?: string;
  parkingSpace: {
    id: number;
    title: string;
    address: string;
    pricePerHour: number;
  };
  driver: {
    id: number;
    name: string;
    email: string;
  };
}

export interface QRResponse {
  code: string;
  qrImageBase64: string;
  reservationId: number;
}

export interface CheckInResponse {
  message: string;
  timestamp: string;
}

export interface CheckOutResponse {
  durationMinutes: number;
  totalCharged: number;
  remainingBalance: number;
  parkingSpaceName: string;
  reservationId: number;
}

export const reservationService = {
  async create(parkingSpaceId: number): Promise<ReservationResponse> {
    const response = await api.post<ReservationResponse>('/reservations', { parkingSpaceId });
    return response.data;
  },

  async getMyReservations(signal?: AbortSignal): Promise<ReservationResponse[]> {
    const response = await api.get<ReservationResponse[]>('/reservations/mine', { signal });
    return response.data;
  },

  async getDetails(id: number, signal?: AbortSignal): Promise<ReservationResponse> {
    const response = await api.get<ReservationResponse>(`/reservations/${id}`, { signal });
    return response.data;
  },

  async cancel(id: number): Promise<void> {
    await api.delete(`/reservations/${id}`);
  },

  async getByParkingSpace(parkingSpaceId: number, signal?: AbortSignal): Promise<ReservationResponse[]> {
    const response = await api.get<ReservationResponse[]>(`/reservations/by-parking-space/${parkingSpaceId}`, { signal });
    return response.data;
  },

  async generateQr(reservationId: number): Promise<QRResponse> {
    const response = await api.post<QRResponse>(`/check-in-out/${reservationId}/qr`);
    return response.data;
  },

  async checkIn(code: string): Promise<CheckInResponse> {
    const response = await api.post<CheckInResponse>('/check-in-out/check-in', { code });
    return response.data;
  },

  async checkOut(code: string): Promise<CheckOutResponse> {
    const response = await api.post<CheckOutResponse>('/check-in-out/check-out', { code });
    return response.data;
  }
};

export default reservationService;
