import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Driver } from '../types';
import { listenToDrivers, requestRide } from '../services/firebase';
import DriverCard from './DriverCard';
import Modal from './Modal';
import MapView from './MapView';

interface PassengerViewProps {
  user: User; // Now expects a non-null user from anonymous auth
}

const PassengerView: React.FC<PassengerViewProps> = ({ user }) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    type: 'alert' | 'input',
    message: string,
    onConfirm?: (value?: string) => void
  }>({ type: 'alert', message: '' });
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [bookingDriverId, setBookingDriverId] = useState<string | null>(null);
  
  useEffect(() => {
    const unsubscribe = listenToDrivers((fetchedDrivers) => {
      setDrivers(fetchedDrivers);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleBookingInitiation = (driverId: string) => {
    setSelectedDriverId(driverId);
    setModalConfig({
      type: 'input',
      message: '請輸入您的 LINE ID 以便司機聯繫：',
      onConfirm: handleBookingRequest
    });
    setModalOpen(true);
  };

  const handleBookingRequest = async (passengerLineId?: string) => {
    if (!passengerLineId || passengerLineId.trim() === '' || !selectedDriverId) {
      return;
    }
    const driverToBook = selectedDriverId;
    setBookingDriverId(driverToBook);
    try {
      await requestRide(driverToBook, { userId: user.uid, lineId: passengerLineId.trim() });
      setModalConfig({
        type: 'alert',
        message: '預訂成功！司機將會看到您的 LINE ID。'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '預訂時發生錯誤，請重試。';
      setModalConfig({ type: 'alert', message: errorMessage });
    } finally {
      setModalOpen(true); // Re-opens the modal as an alert
      setSelectedDriverId(null);
      setBookingDriverId(null);
    }
  };
  
  return (
    <>
      <Modal
        isOpen={modalOpen}
        type={modalConfig.type}
        message={modalConfig.message}
        onClose={() => setModalOpen(false)}
        onConfirm={modalConfig.onConfirm}
      />
      <div id="passenger-view">
        <div className="flex justify-between items-center mb-6">
          <div className="bg-gray-200 p-1 rounded-full flex">
              <button onClick={() => setViewMode('list')} className={`px-4 py-1 text-sm font-semibold rounded-full transition-colors duration-300 ${viewMode === 'list' ? 'bg-white shadow' : 'text-gray-600'}`}>
                  列表模式
              </button>
              <button onClick={() => setViewMode('map')} className={`px-4 py-1 text-sm font-semibold rounded-full transition-colors duration-300 ${viewMode === 'map' ? 'bg-white shadow' : 'text-gray-600'}`}>
                  地圖模式
              </button>
          </div>
          <div id="car-count" className="text-lg font-semibold bg-white py-2 px-4 rounded-full shadow-sm">
            {loading ? '尋找中...' : `線上車輛：${drivers.length} 台`}
          </div>
        </div>

        {viewMode === 'list' ? (
          <div id="driver-list" className="space-y-4">
            {loading ? (
              <div className="text-center text-gray-500 py-10">
                <p>正在載入可用的車輛...</p>
              </div>
            ) : drivers.length === 0 ? (
              <div className="text-center text-gray-500 py-10 bg-white rounded-lg shadow">
                <p>目前沒有可用的車輛，請稍後再試。</p>
              </div>
            ) : (
              drivers.map(driver => (
                <DriverCard 
                  key={driver.id} 
                  driver={driver} 
                  onBook={handleBookingInitiation}
                  isBooking={bookingDriverId === driver.id}
                />
              ))
            )}
          </div>
        ) : (
          <div id="map-container" className="rounded-lg overflow-hidden shadow-lg">
            <MapView 
              drivers={drivers.filter(d => d.latitude && d.longitude)} 
              onBook={handleBookingInitiation} 
            />
          </div>
        )}
      </div>
    </>
  );
};

export default PassengerView;
