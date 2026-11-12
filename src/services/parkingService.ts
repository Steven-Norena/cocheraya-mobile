import api from './api';

export interface ParkingSpace {
  id: number;
  title: string;
  description: string;
  address: string;
  pricePerHour: number;
  latitude: number;
  longitude: number;
  features: string[];
  photoUrl?: string;
  status: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED';
  hostId: number;
  averageRating?: number;
}

export interface SearchNearbyParams {
  lat: number;
  lng: number;
  radius: number;
}

export interface CreateParkingSpaceMetadata {
  title: string;
  description: string;
  address: string;
  pricePerHour: number;
  latitude: number;
  longitude: number;
  features: string[];
}

export interface MobilePhotoFile {
  uri: string;
  name: string;
  type: string;
  file?: File;
}

export interface HostDashboardMetrics {
  totalSpaces: number;
  totalReservationsCompleted: number;
  totalEarnings: number;
  averageRating: number;
  recentReservations: any[];
}

export const parkingService = {
  async searchNearby(params: SearchNearbyParams, signal?: AbortSignal): Promise<ParkingSpace[]> {
    const response = await api.get<ParkingSpace[]>('/parking-spaces/search-nearby', {
      params,
      signal,
    });
    return response.data;
  },

  async create(metadata: CreateParkingSpaceMetadata, photo?: MobilePhotoFile): Promise<ParkingSpace> {
    const formData = new FormData();
    formData.append('data', JSON.stringify(metadata));
    if (photo) {
      if (photo.file) {
        formData.append('photo', photo.file);
      } else {
        formData.append('photo', photo as any);
      }
    }
    const response = await api.post<ParkingSpace>('/parking-spaces', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async update(id: number, metadata: CreateParkingSpaceMetadata, photo?: MobilePhotoFile): Promise<ParkingSpace> {
    const formData = new FormData();
    formData.append('data', JSON.stringify(metadata));
    if (photo) {
      if (photo.file) {
        formData.append('photo', photo.file);
      } else {
        formData.append('photo', photo as any);
      }
    }
    const response = await api.put<ParkingSpace>(`/parking-spaces/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },


  async changeAvailability(id: number, status: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED'): Promise<ParkingSpace> {
    const response = await api.put<ParkingSpace>(`/parking-spaces/${id}/change-availability`, { status });
    return response.data;
  },

  async getMine(signal?: AbortSignal): Promise<ParkingSpace[]> {
    const response = await api.get<ParkingSpace[]>('/parking-spaces/mine', { signal });
    return response.data;
  },

  async getHostDashboard(signal?: AbortSignal): Promise<HostDashboardMetrics> {
    const response = await api.get<HostDashboardMetrics>('/parking-spaces/host-dashboard', { signal });
    return response.data;
  },

  async addToFavorites(id: number): Promise<void> {
    await api.post(`/parking-spaces/${id}/favorites`);
  },

  async removeFromFavorites(id: number): Promise<void> {
    await api.delete(`/parking-spaces/${id}/favorites`);
  },

  async getFavorites(signal?: AbortSignal): Promise<ParkingSpace[]> {
    const response = await api.get<ParkingSpace[]>('/parking-spaces/favorites', { signal });
    return response.data;
  },

  async getDetails(id: number, signal?: AbortSignal): Promise<ParkingSpace> {
    const response = await api.get<ParkingSpace>(`/parking-spaces/${id}`, { signal });
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/parking-spaces/${id}`);
  }
};

export default parkingService;
