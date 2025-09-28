import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, initializeFirebase } from './services/firebase';
import PassengerView from './components/PassengerView';
import DriverView from './components/DriverView';

type View = 'passenger' | 'driver';

declare global {
  interface Window {
    __app_id?: string;
    __firebase_config?: string;
  }
}

const App: React.FC = () => {
  const [view, setView] = useState<View>('passenger');
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: () => void;

    const init = async () => {
      try {
        await initializeFirebase();
        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
          setIsInitialized(true);
        });
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('初始化時發生未知錯誤。');
        }
        setIsInitialized(true);
      }
    };

    init();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const renderContent = () => {
    if (!user) return null; // Wait for anonymous auth
    if (view === 'passenger') {
      return <PassengerView user={user} />;
    }
    return <DriverView user={user} switchToPassengerView={() => setView('passenger')} />;
  };

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-4xl">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
          <p className="font-bold">應用程式啟動失敗</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-4xl text-center">
        <p>正在初始化應用程式...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <header className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-700">鏟子英雄順風車即時媒合系統</h1>
        <p className="text-gray-500 mt-2">快速、簡單、安全的共乘體驗</p>
      </header>
      
      {view === 'passenger' && (
        <>
            <div id="announcement" className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-8" role="alert">
                <p className="font-bold text-lg text-center">【重要公告】</p>
                <p className="text-center">光復鄉限定救災專用，非誠勿擾。</p>
            </div>

            <nav className="bg-white p-4 rounded-lg shadow-md mb-8 flex justify-between items-center">
              <span className="text-gray-600 hidden sm:block">點擊下方列表預訂您的行程！</span>
              <button className="btn btn-primary py-2 px-6 rounded-md w-full sm:w-auto" onClick={() => setView('driver')}>
                我是司機 / 發布行程
              </button>
            </nav>
        </>
      )}

      {renderContent()}
    </div>
  );
};

export default App;