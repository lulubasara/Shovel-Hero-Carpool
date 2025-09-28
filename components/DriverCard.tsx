
import React from 'react';
import { Driver } from '../types';

interface DriverCardProps {
  driver: Driver;
  onBook?: (driverId: string) => void;
  isBooking?: boolean;
}

const LineIcon: React.FC = () => (
  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
    <path d="M10 2C5.582 2 2 5.582 2 10s3.582 8 8 8c4.419 0 8-3.582 8-8s-3.581-8-8-8zm4.453 10.742c-.035.342-.267.63-.58.743-.312.112-.71.112-1.078.014-.368-.098-.702-.277-1.015-.52a6.49 6.49 0 01-.52-.455c-.015-.015-.029-.03-.044-.044a.97.97 0 01-.133-.147l-.104-.133c-.147-.206-.278-.425-.395-.658-.118-.232-.207-.483-.267-.74-.06-.257-.089-.52-.089-.783s.03-.526.089-.783c.06-.257.15-.508.267-.74.117-.233.248-.452.395-.658l.104-.133c.015-.015.029-.03.044-.044a5.95 5.95 0 01.653-.6c.313-.242.647-.421 1.015-.52.368-.098.766-.098 1.078.014.313.113.545.4.58.742.034.342-.059.69-.267.92-.208.232-.505.34-.817. ২৯২-.178-.028-.34-.1-.486-.205-.147-.104-.267-.25-.357-.424-.03-.06-.06-.118-.074-.19a.46.46 0 00-.104-.234c-.03-.045-.074-.075-.118-.09-.104-.03-.223-.015-.312.044-.09.06-.148.148-.178.25-.03.104-.015.223.03.327.044.104.118.19.208.25.178.118.396.178.627.163.313-.015.612-.178.803-.424.208-.232.3-.578.267-.92zM7.547 6.258c.035-.342.267-.63.58-.742.313-.112.71-.112 1.078-.014.368.098.702.277 1.015-.52.313.243.564.535.755.878.19.342.312.725.356 1.137.045.412.015.83-.089 1.234a4.42 4.42 0 01-.37 1.151c-.162.385-.38.74-.653 1.06-.272.32-.592.593-.95.803-.357.21-.755.355-1.18.424-.424.07-.852.07-1.278-.014a4.94 4.94 0 01-1.205-.384 4.83 4.83 0 01-1.078-.71c-.342-.313-.64-.67-.878-1.078a5.18 5.18 0 01-.6-1.39c-.118-.498-.133-.995-.044-1.477.09-.483.278-.95.55-1.362.273-.412.612-.77.995-1.045.383-.274.81-.483 1.263-.612.453-.13.92-.162 1.376-.089h.014c.28-.015.53-.015.755.03.224.044.424.118.592.223.163.104.295.235.384.395.09.163.133.34.133.535s-.044.37-.133.533c-.09.163-.222.294-.384.398-.168.104-.368.178-.592.223-.225.045-.475.045-.755.03-.342-.015-.67-.089-.966-.222-.296-.133-.547-.327-.74-.567-.207-.24-.356-.52-.44-.833a1.9 1.9 0 01-.06-1.078c.03-.327.148-.627.356-.877.208-.25.47-.44.769-.567.299-.126.627-.178.966-.147.208.014.4.074.565.162.163.09.295.207.384.356.12.207.163.44.133.684-.03.243-.133.47-.295.64-.162.17-.37.298-.6.384a2.2 2.2 0 01-.783.147c-.55.015-1.045-.163-1.42-.52-.375-.357-.594-.848-.594-1.377z" fillRule="evenodd" clipRule="evenodd"></path>
  </svg>
);

const DriverCard: React.FC<DriverCardProps> = ({ driver, onBook, isBooking }) => {
  const isFull = driver.seatsAvailable <= 0;
  const isDeparted = driver.status === 'departed';
  
  const cardClasses = `driver-card bg-white p-5 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 items-center ${isDeparted ? 'opacity-70 bg-gray-100' : ''}`;

  const renderStatusAndButton = () => {
    if (isDeparted) {
      return <div className="px-3 py-1 bg-gray-500 text-white text-sm font-bold rounded-full">已發車</div>;
    }
    if (isFull) {
      return <div className="px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full">客滿</div>;
    }
    return (
      <>
        <div className="px-3 py-1 bg-green-500 text-white text-sm font-bold rounded-full mb-2">剩餘 {driver.seatsAvailable} / {driver.seatsTotal} 位</div>
        {onBook && (
          <button 
              className="btn btn-primary mt-2 py-2 px-4 rounded-md w-full md:w-auto" 
              onClick={() => onBook(driver.id)}
              disabled={isBooking}>
              {isBooking ? '預訂中...' : '預訂座位'}
          </button>
        )}
      </>
    );
  };

  return (
    <div className={cardClasses}>
      <div className="col-span-1">
        <p className="font-bold text-lg">{driver.name}</p>
        <p className="text-sm text-gray-500">{driver.carModel} <span className="text-gray-400 font-mono">{driver.licensePlate || ''}</span></p>
        <div className="flex items-center mt-2">
          <LineIcon />
          <span className="text-sm font-medium text-gray-700">{driver.lineId}</span>
        </div>
      </div>
      <div className="col-span-1">
        <p><span className="font-semibold">從:</span> {driver.startLocation}</p>
        <p><span className="font-semibold">到:</span> {driver.endLocation}</p>
      </div>
      <div className="col-span-1 flex flex-col items-center md:items-end">
        {renderStatusAndButton()}
      </div>
      
      {driver.remarks && driver.remarks.trim() !== '' && (
        <div className="mt-2 col-span-1 md:col-span-3 border-t pt-2">
          <p className="text-sm text-gray-600"><span className="font-semibold">備註:</span> {driver.remarks}</p>
        </div>
      )}

      {driver.passengers && driver.passengers.length > 0 && (
        <div className="mt-2 col-span-1 md:col-span-3 border-t pt-2">
          <h4 className="font-semibold text-sm text-gray-600">已預訂乘客:</h4>
          <div className="flex flex-wrap">
            {driver.passengers.map(p => <span key={p.userId} className="passenger-tag">{p.lineId}</span>)}
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverCard;