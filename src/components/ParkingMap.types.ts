import type { ParkingSpace } from '../services/parkingService';

export interface ParkingMapProps {
  latitude: number;
  longitude: number;
  radius: number;
  spaces: ParkingSpace[];
  selectedId?: number;
  onSelect: (id: number) => void;
}
