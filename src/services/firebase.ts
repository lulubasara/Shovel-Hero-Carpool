import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
    getAuth, 
    Auth, 
    signInAnonymously,
} from 'firebase/auth';
import { 
    getFirestore, Firestore, doc, setDoc, getDoc, onSnapshot, collection, 
    getDocs, deleteDoc, serverTimestamp, runTransaction, arrayUnion, 
    arrayRemove, query, where, updateDoc, Unsubscribe, CollectionReference, DocumentReference
} from 'firebase/firestore';
import { Driver, PassengerInfo } from '../types';

let app: FirebaseApp;
export let db: Firestore;
export let auth: Auth;
export let appId: string;

export const initializeFirebase = async () => {
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };
    
    appId = import.meta.env.VITE_APP_ID || 'default-carpool-app';

    if (!firebaseConfig.apiKey) {
        throw new Error("Firebase configuration is missing. Please create a .env file based on .env.example and provide your Firebase project credentials. When deploying to Vercel, set these as environment variables.");
    }

    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    
    try {
        await signInAnonymously(auth);
    } catch (error) {
        console.error("Anonymous sign-in failed:", error);
        throw new Error("無法連接到認證服務。應用程式無法啟動，請檢查您的網路連線或 Firebase 設定。");
    }

    // Run seeding in the background; don't block app initialization
    seedInitialData();
};

const getDriversCollection = (): CollectionReference => collection(db, `/artifacts/${appId}/public/data/drivers`);
const getDriverDoc = (driverId: string): DocumentReference => doc(db, `/artifacts/${appId}/public/data/drivers`, driverId);

export const listenToDrivers = (callback: (drivers: Driver[]) => void): Unsubscribe => {
    const driversCol = getDriversCollection();
    const q = query(driversCol, where("status", "in", ["active", "full", "departed"]));
    return onSnapshot(q, (snapshot) => {
        const drivers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver));
        callback(drivers);
    });
};

export const listenToDriver = (driverId: string, callback: (driver: Driver | null) => void): Unsubscribe => {
    const driverDoc = getDriverDoc(driverId);
    return onSnapshot(driverDoc, (doc) => {
        callback(doc.exists() ? { id: doc.id, ...doc.data() } as Driver : null);
    });
};

export const requestRide = async (driverId: string, passenger: PassengerInfo): Promise<void> => {
    const driverRef = getDriverDoc(driverId);
    await runTransaction(db, async (transaction) => {
        const driverDoc = await transaction.get(driverRef);
        if (!driverDoc.exists()) { throw new Error("Vehicle information does not exist!"); }
        const data = driverDoc.data() as Driver;
        if (data.passengers && data.passengers.some(p => p.userId === passenger.userId)) {
            throw new Error("You have already booked this trip and cannot book again.");
        }
        if (data.seatsAvailable > 0) {
            transaction.update(driverRef, { 
                seatsAvailable: data.seatsAvailable - 1,
                passengers: arrayUnion(passenger),
            });
        } else { 
            throw new Error("Sorry, this vehicle is full.");
        }
    });
};

export const cancelPassengerBooking = async (driverId: string, passenger: PassengerInfo): Promise<void> => {
    const driverRef = getDriverDoc(driverId);
    await runTransaction(db, async (transaction) => {
        const driverDoc = await transaction.get(driverRef);
        if (!driverDoc.exists()) { throw new Error("Could not find your trip data."); }
        const data = driverDoc.data() as Driver;
        if (data.passengers && data.passengers.some(p => p.userId === passenger.userId)) {
            transaction.update(driverRef, {
                seatsAvailable: data.seatsAvailable + 1,
                passengers: arrayRemove(passenger),
            });
        } else {
            throw new Error("Could not find the passenger's booking record.");
        }
    });
};

export const addOrUpdateDriver = async (userId: string, driverData: Partial<Driver>): Promise<void> => {
    const driverRef = getDriverDoc(userId);
    const driversColRef = getDriversCollection();
    
    if (driverData.lineId) {
        const q = query(driversColRef, where("lineId", "==", driverData.lineId));
        const querySnapshot = await getDocs(q);
        let isDuplicate = false;
        querySnapshot.forEach((doc) => {
            if (doc.id !== userId) { isDuplicate = true; }
        });
        if (isDuplicate) {
            throw new Error('This LINE ID is already in use by another driver.');
        }
    }

    const driverDoc = await getDoc(driverRef);
    const existingPassengers = driverDoc.exists() ? (driverDoc.data() as Driver).passengers : [];
    const newTotalSeats = driverData.seatsTotal ?? 0;

    if (driverDoc.exists() && newTotalSeats < existingPassengers.length) {
        throw new Error(`Total seats (${newTotalSeats}) cannot be less than the number of booked passengers (${existingPassengers.length}).`);
    }

    const dataToSet: any = {
        ...driverData,
        updatedAt: serverTimestamp(),
    };
    
    if(driverDoc.exists()){
        dataToSet.passengers = existingPassengers;
        dataToSet.seatsAvailable = newTotalSeats - existingPassengers.length;
    } else {
        dataToSet.passengers = [];
        dataToSet.seatsAvailable = newTotalSeats;
        dataToSet.status = 'active';
    }

    await setDoc(driverRef, dataToSet, { merge: true });
};

export const deleteDriver = async (userId: string): Promise<void> => {
    const driverRef = getDriverDoc(userId);
    await deleteDoc(driverRef);
};

export const updateDriverStatus = async (userId: string, status: 'departed'): Promise<void> => {
    const driverRef = getDriverDoc(userId);
    await updateDoc(driverRef, { status });
};

export const updateDriverLocation = async (userId: string, coords: { latitude: number, longitude: number } | null): Promise<void> => {
    const driverRef = getDriverDoc(userId);
    await updateDoc(driverRef, {
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
    });
};

const seedInitialData = async () => {
    try {
      const driversColRef = getDriversCollection();
      const snapshot = await getDocs(driversColRef);
      if (snapshot.empty) {
          console.log("No drivers found, adding a sample driver...");
          const sampleDriverId = 'sample-driver-01';
          const sampleDriverRef = doc(db, `/artifacts/${appId}/public/data/drivers`, sampleDriverId);
          const sampleDriverData = {
              name: "陳師傅 (教學範例)",
              lineId: "carpool-demo",
              carModel: "Toyota RAV4",
              licensePlate: "ABC-1234",
              startLocation: "台北101",
              endLocation: "桃園國際機場",
              seatsTotal: 3,
              seatsAvailable: 3,
              remarks: "可放大件行李，車內禁菸，謝謝。",
              passengers: [],
              status: 'active',
              updatedAt: serverTimestamp(),
              latitude: 25.033964,
              longitude: 121.564468,
          };
          await setDoc(sampleDriverRef, sampleDriverData);
      }
    } catch(error) {
        console.error("Could not seed initial data. This might happen if Firestore rules are restrictive.", error);
    }
};