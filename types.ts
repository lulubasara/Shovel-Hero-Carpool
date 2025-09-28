import { FieldValue } from 'firebase/firestore';

export interface PassengerInfo {
  userId: string;
  lineId: string;
}

export interface Driver {
  id: string;
  name: string;
  lineId: string;
  carModel: string;
  licensePlate?: string;
  startLocation: string;
  endLocation: string;
  seatsTotal: number;
  seatsAvailable: number;
  remarks?: string;
  passengers: PassengerInfo[];
  status: 'active' | 'departed' | 'full';
  updatedAt?: FieldValue;
  latitude?: number;
  longitude?: number;
}

export type ModalType = 'alert' | 'confirm' | 'input';