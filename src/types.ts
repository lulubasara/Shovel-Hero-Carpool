// Fix: Add global type definitions for Vite environment variables
declare global {
  interface ImportMeta {
    readonly env: {
      readonly VITE_FIREBASE_API_KEY: string;
      readonly VITE_FIREBASE_AUTH_DOMAIN: string;
      readonly VITE_FIREBASE_PROJECT_ID: string;
      readonly VITE_FIREBASE_STORAGE_BUCKET: string;
      readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
      readonly VITE_FIREBASE_APP_ID: string;
      readonly VITE_APP_ID?: string;
    }
  }
}

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