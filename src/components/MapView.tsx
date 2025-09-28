import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import L from 'leaflet';
import { Driver } from '../types';

// Fix for default icon issue with bundlers like Vite/Webpack
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});


interface MapViewProps {
  drivers: Driver[];
  onBook: (driverId: string) => void;
}

const MapView: React.FC<MapViewProps> = ({ drivers, onBook }) => {
  const position: [number, number] = [23.6978, 120.9605]; // Center of Taiwan

  return (
    <MapContainer center={position} zoom={8} scrollWheelZoom={true} style={{ height: '60vh', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MarkerClusterGroup>
        {drivers.map(driver => (
          (driver.latitude && driver.longitude) && (
            <Marker key={driver.id} position={[driver.latitude, driver.longitude]}>
              <Popup>
                <div className="text-left">
                  <p className="font-bold text-md">{driver.name}</p>
                  <p className="text-sm text-gray-600">{driver.carModel}</p>
                  <p className="text-sm"><span className="font-semibold">從:</span> {driver.startLocation}</p>
                  <p className="text-sm"><span className="font-semibold">到:</span> {driver.endLocation}</p>
                  <p className="text-sm font-bold text-green-600">剩餘 {driver.seatsAvailable} / {driver.seatsTotal} 位</p>
                  <button 
                    className="btn btn-primary mt-2 py-1 px-3 rounded-md w-full text-sm" 
                    onClick={() => onBook(driver.id)}>
                    預訂座位
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
};

export default MapView;
