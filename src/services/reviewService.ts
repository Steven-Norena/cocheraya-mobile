import api from './api';

export interface ReviewResponse {
  id: number;
  reviewerName: string;
  revieweeName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ParkingSpaceReviewsResponse {
  parkingSpaceId: number;
  averageRating: number;
  totalReviews: number;
  reviews: ReviewResponse[];
}

export interface CreateReviewRequest {
  reservationId: number;
  rating: number;
  comment: string;
}

export const reviewService = {
  async create(data: CreateReviewRequest): Promise<ReviewResponse> {
    const response = await api.post<ReviewResponse>('/reviews', data);
    return response.data;
  },

  async getByParkingSpace(parkingSpaceId: number, signal?: AbortSignal): Promise<ParkingSpaceReviewsResponse> {
    const response = await api.get<ParkingSpaceReviewsResponse>(`/reviews/by-parking-space/${parkingSpaceId}`, { signal });
    return response.data;
  },

  async getByUser(userId: number, signal?: AbortSignal): Promise<ReviewResponse[]> {
    const response = await api.get<ReviewResponse[]>(`/reviews/by-user/${userId}`, { signal });
    return response.data;
  }
};

export default reviewService;
