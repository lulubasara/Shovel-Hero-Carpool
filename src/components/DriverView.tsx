
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import { Driver, PassengerInfo } from '../types';
import {
  listenToDriver,
  addOrUpdateDriver,
  deleteDriver,
  updateDriverStatus,
  cancelPassengerBooking,
  updateDriverLocation,
} from '../services/firebase';
import Modal from './Modal';

interface DriverViewProps {
  user: User;
  switchToPassengerView: () => void;
}

const initialFormData: Partial<Driver> = { 
  name: '', 
  lineId: '', 
  carModel: '', 
  licensePlate: '', 
  startLocation: '', 
  endLocation: '', 
  seatsTotal: 1, 
  remarks: '' 
};

const DriverView: React.FC<DriverViewProps> = ({ user, switchToPassengerView }) => {
  // `driver` holds the canonical data from Firestore
  const [driver, setDriver] = useState<Driver | null>(null);
  // `formData` holds the state for the form inputs, isolated from real-time updates
  const [formData, setFormData] = useState<Partial<Driver>>(initialFormData);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    type: 'alert' | 'confirm',
    message: string,
    onConfirm?: (confirmed: boolean) => void
  }>({ type: 'alert', message: '' });

  const formIsDirty = useRef(false);
  const locationWatcherId = useRef<number | null>(null);
  const lastLocationUpdateTime = useRef<number>(0);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Effect to listen to the driver's document in Firestore
  useEffect(() => {
    const unsubscribe = listenToDriver(user.uid, setDriver);
    return () => unsubscribe();
  }, [user.uid]);

  // Effect to sync Firestore data to the local form state, without overwriting user input
  useEffect(() => {
    if (driver && !formIsDirty.current) {
      // If the form hasn't been touched, sync it with the latest data from the DB
      setFormData({
        name: driver.name,
        lineId: driver.lineId,
        carModel: driver.carModel,
        licensePlate: driver.licensePlate,
        startLocation: driver.startLocation,
        endLocation: driver.endLocation,
        seatsTotal: driver.seatsTotal,
        remarks: driver.remarks,
      });
    } else if (!driver) {
      // If the driver document is deleted, reset the form
      setFormData(initialFormData);
      formIsDirty.current = false;
    }
  }, [driver]);


  const stopSharingLocation = useCallback(async (clearFromDb = false) => {
    if (locationWatcherId.current !== null) {
      navigator.geolocation.clearWatch(locationWatcherId.current);
      locationWatcherId.current = null;
    }
    setIsSharingLocation(false);
    if (clearFromDb && user) {
      try {
        await updateDriverLocation(user.uid, null);
      } catch (error) {
        console.error("Failed to clear location from DB", error);
      }
    }
  }, [user]);

  const startSharingLocation = useCallback(() => {
    if (!navigator.geolocation) {
        setLocationError('您的瀏覽器不支援地理位置功能。');
        return;
    }
    setLocationError(null);
    setIsSharingLocation(true);
    
    locationWatcherId.current = navigator.geolocation.watchPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            // Throttle updates to once every 15 seconds to avoid spamming Firestore
            if (Date.now() - lastLocationUpdateTime.current > 15000) {
                try {
                    await updateDriverLocation(user.uid, { latitude, longitude });
                    lastLocationUpdateTime.current = Date.now();
                } catch (error) {
                    console.error("Failed to update location:", error);
                }
            }
        },
        (error) => {
            switch (error.code) {
                case error.PERMISSION_DENIED: setLocationError("您已拒絕位置資訊存取權限。"); break;
                case error.POSITION_UNAVAILABLE: setLocationError("無法取得目前位置資訊。"); break;
                case error.TIMEOUT: setLocationError("取得位置資訊超時。"); break;
                default: setLocationError("取得位置資訊時發生未知錯誤。"); break;
            }
            stopSharingLocation();
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [user.uid, stopSharingLocation]);

  useEffect(() => {
    return () => {
      stopSharingLocation(false);
    };
  }, [stopSharingLocation]);

  const handleToggleLocationSharing = () => {
    if (isSharingLocation) {
      stopSharingLocation(true);
    } else {
      startSharingLocation();
    }
  };

  const showAlert = (message: string) => {
    setModalConfig({ type: 'alert', message });
    setModalOpen(true);
  };

  const showConfirm = (message: string, onConfirm: (confirmed: boolean) => void) => {
    setModalConfig({ type: 'confirm', message, onConfirm });
    setModalOpen(true);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    formIsDirty.current = true; // Mark form as edited by the user
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: id === 'seatsTotal' ? parseInt(value) || 1 : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addOrUpdateDriver(user.uid, { ...formData, status: 'active' });
      formIsDirty.current = false;
      showAlert(`您的行程已成功${!driver ? '發布' : '更新'}！`);
      switchToPassengerView();
    } catch (error) {
      const message = error instanceof Error ? error.message : '操作失敗，請稍後再試。';
      showAlert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRide = () => {
    showConfirm('您確定要取消這個行程嗎？此操作將會從列表中移除您的車輛。', async (confirmed) => {
      if (confirmed) {
        setIsSubmitting(true);
        await stopSharingLocation(false);
        try {
          await deleteDriver(user.uid);
          showAlert('您的行程已成功取消。');
          switchToPassengerView();
        } catch (error) {
          showAlert('取消行程失敗，請稍後再試。');
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  const handleDepart = () => {
    showConfirm('您確定車輛已發車嗎？此操作會將您的狀態更新為「已發車」。', async (confirmed) => {
      if (confirmed) {
        setIsSubmitting(true);
        await stopSharingLocation(true);
        try {
          await updateDriverStatus(user.uid, 'departed');
          showAlert('您的車輛已標示為發車。');
          switchToPassengerView();
        } catch (error) {
          showAlert('標示發車時發生錯誤，請稍後再試。');
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };
  
  const handleArrive = () => {
    showConfirm('您確定已到達目的地嗎？此操作將會完成並移除此行程。', async (confirmed) => {
        if (confirmed) {
            setIsSubmitting(true);
            await stopSharingLocation(false); // Stop watching, no need to update DB
            try {
                await deleteDriver(user.uid);
                showAlert('行程已順利完成，感謝您的貢獻！');
                switchToPassengerView();
            } catch (error) {
                showAlert('完成行程時發生錯誤，請稍後再試。');
            } finally {
                setIsSubmitting(false);
            }
        }
    });
  };


  const handleCancelPassenger = (passenger: PassengerInfo) => {
    showConfirm(`您確定要取消乘客 "${passenger.lineId}" 的預訂嗎？`, async (confirmed) => {
      if (confirmed) {
        setIsSubmitting(true);
        try {
          await cancelPassengerBooking(user.uid, passenger);
          showAlert('已成功取消該乘客的預訂。');
        } catch (error) {
          const message = error instanceof Error ? error.message : '取消預訂時發生錯誤。';
          showAlert(message);
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  const status = driver?.status ?? 'new';
  const formDisabled = status === 'departed';

  const getFormTitle = () => {
    switch (status) {
      case 'new': return '分享您的行程';
      case 'departed': return '您的行程正在進行中';
      case 'active':
      case 'full':
        // When status is 'active' or 'full', driver is guaranteed to be non-null.
        // Add an explicit check to satisfy TypeScript's strict null checks.
        if (!driver) return '管理您的行程';
        return driver.seatsAvailable <= 0 ? '您的車輛已客滿' : '編輯您的行程';
      default: return '管理您的行程';
    }
  };

  return (
    <>
      <Modal
        isOpen={modalOpen}
        type={modalConfig.type}
        message={modalConfig.message}
        onClose={() => setModalOpen(false)}
        onConfirm={modalConfig.onConfirm as any}
      />
      <div id="driver-view">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-center">{getFormTitle()}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
             <input id="name" type="text" placeholder="您的稱呼" className="w-full p-3 border rounded-md" required value={formData.name || ''} onChange={handleChange} disabled={formDisabled || isSubmitting} />
             <input id="lineId" type="text" placeholder="您的 LINE ID (必填，不可重複發布行程)" className="w-full p-3 border rounded-md" required value={formData.lineId || ''} onChange={handleChange} disabled={formDisabled || isSubmitting} />
             <input id="carModel" type="text" placeholder="車輛型號 (例如：Toyota Altis)" className="w-full p-3 border rounded-md" required value={formData.carModel || ''} onChange={handleChange} disabled={formDisabled || isSubmitting} />
             <input id="licensePlate" type="text" placeholder="車牌號碼 (例如：ABC-1234)" className="w-full p-3 border rounded-md" required value={formData.licensePlate || ''} onChange={handleChange} disabled={formDisabled || isSubmitting} />
             <input id="startLocation" type="text" placeholder="出發地點" className="w-full p-3 border rounded-md" required value={formData.startLocation || ''} onChange={handleChange} disabled={formDisabled || isSubmitting} />
             <input id="endLocation" type="text" placeholder="目的地" className="w-full p-3 border rounded-md" required value={formData.endLocation || ''} onChange={handleChange} disabled={formDisabled || isSubmitting} />
             <input id="seatsTotal" type="number" min="1" max="6" placeholder="提供座位數" className="w-full p-3 border rounded-md" required value={formData.seatsTotal || 1} onChange={handleChange} disabled={formDisabled || isSubmitting} />
             <textarea id="remarks" placeholder="備註 (例如：限女性、可攜帶寵物、禁菸)" className="w-full p-3 border rounded-md" rows={3} value={formData.remarks || ''} onChange={handleChange} disabled={formDisabled || isSubmitting}></textarea>

            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <button type="button" className="btn btn-secondary p-3 rounded-md w-full" onClick={switchToPassengerView} disabled={isSubmitting}>返回首頁</button>
              {(status === 'new' || status === 'active' || status === 'full') && !formDisabled && <button type="submit" className="btn btn-primary p-3 rounded-md w-full" disabled={isSubmitting}>{status === 'new' ? '發布行程' : '更新行程資訊'}</button>}
              {(status === 'active' || status === 'full') && (driver?.seatsAvailable ?? 0) <= 0 && <button type="button" onClick={handleDepart} className="btn bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-md w-full" disabled={isSubmitting}>已發車</button>}
              {status === 'departed' && <button type="button" onClick={handleArrive} className="btn bg-green-600 hover:bg-green-700 text-white p-3 rounded-md w-full" disabled={isSubmitting}>已到達 (完成行程)</button>}
              {(status === 'active' || status === 'full') && <button type="button" onClick={handleCancelRide} className="btn btn-danger p-3 rounded-md w-full" disabled={isSubmitting}>取消行程</button>}
            </div>
          </form>

          {(status !== 'new') && (
             <div className="mt-8 border-t pt-4">
                <h3 className="text-xl font-bold mb-4 text-center text-gray-700">已預訂乘客資訊</h3>
                <div className="space-y-2">
                    {driver && driver.passengers.length > 0 ? (
                      driver.passengers.map(p => (
                        <div key={p.userId} className="flex justify-between items-center bg-gray-100 p-2 rounded-md">
                            <span className="passenger-tag !mt-0 !mr-0">{p.lineId}</span>
                            <button type="button" className="text-sm font-bold text-red-600 hover:text-red-800" onClick={() => handleCancelPassenger(p)} disabled={status === 'departed' || isSubmitting}>取消</button>
                        </div>
                      ))
                    ) : (
                        <p className="text-gray-500 text-center">目前尚無乘客預訂。</p>
                    )}
                </div>
            </div>
          )}

          {(status === 'active' || status === 'full') && (
            <div className="mt-8 border-t pt-4 text-center">
                <h3 className="text-xl font-bold mb-4 text-gray-700">即時位置分享</h3>
                <p className="text-sm text-gray-500 mb-4">
                    {isSharingLocation
                        ? '您的位置正在分享至地圖上，乘客可以看到您的即時位置。'
                        : '開始分享您的即時位置，讓乘客更容易找到您。'}
                </p>
                <button
                    type="button"
                    onClick={handleToggleLocationSharing}
                    className={`btn ${isSharingLocation ? 'btn-danger' : 'btn-primary'} p-3 rounded-md w-full max-w-xs mx-auto`}
                    disabled={isSubmitting}
                >
                    {isSharingLocation ? '停止分享位置' : '開始分享位置'}
                </button>
                {locationError && <p className="text-red-500 text-sm mt-2">{locationError}</p>}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DriverView;
