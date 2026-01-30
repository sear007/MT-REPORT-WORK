import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, RefreshCw, Layers, Globe, Ruler, ArrowRightLeft } from 'lucide-react';
import { GeoLocation } from '../types';
import { calculateDistance } from '../utils/geo';

// Fix for default Leaflet marker icons
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons for A and B
const createLabelIcon = (label: string, color: string) => L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: ${color}; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${label}</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

interface LocationPickerMapProps {
  pointA: GeoLocation | null;
  pointB: GeoLocation | null;
  activeTarget: 'A' | 'B';
  onLocationUpdate: (target: 'A' | 'B', lat: number, lng: number) => void;
  onTargetChange: (target: 'A' | 'B') => void;
}

// ------------------------------------------------------------------
// 🔧 FIX: UPDATED CONTROLLER WITH FLIGHT LOCK
// ------------------------------------------------------------------
const MapController = ({ 
  activeTarget, 
  pointA, 
  pointB, 
  onLocationUpdate 
}: { 
  activeTarget: 'A' | 'B'; 
  pointA: GeoLocation | null; 
  pointB: GeoLocation | null;
  onLocationUpdate: (target: 'A' | 'B', lat: number, lng: number) => void;
}) => {
  const map = useMap();
  const isFirstLoad = useRef(true);
  
  // 🔒 Lock: Prevents overwriting data while map is auto-flying
  const isFlying = useRef(false);

  // 1. Initial Geolocation
  useEffect(() => {
    if (isFirstLoad.current) {
      map.locate().on("locationfound", (e) => {
        if (!pointA && !pointB) {
          map.flyTo(e.latlng, 18);
          onLocationUpdate(activeTarget, e.latlng.lat, e.latlng.lng);
        }
      });
      isFirstLoad.current = false;
    }
  }, [map]);

  // 2. Fly to active target when it changes (THE FIX)
  useEffect(() => {
    const targetLoc = activeTarget === 'A' ? pointA : pointB;
    
    if (targetLoc) {
      // ✅ ENGAGE LOCK: Don't update coordinates while flying
      isFlying.current = true;
      
      map.flyTo([targetLoc.latitude, targetLoc.longitude], map.getZoom(), {
        duration: 1.5 // Smooth flight
      });

      // ✅ RELEASE LOCK: When flight finishes, allow updates again
      map.once('moveend', () => {
        isFlying.current = false;
      });
    }
  }, [activeTarget]); 

  // 3. Track Center
  useMapEvents({
    dragstart: () => {
      // If user grabs the map, break the lock immediately so they can edit
      isFlying.current = false;
    },
    move: () => {
      // 🛑 If flying, DO NOT update data. This prevents the "overwrite" bug.
      if (isFlying.current) return;

      const center = map.getCenter();
      onLocationUpdate(activeTarget, center.lat, center.lng);
    }
  });

  return null;
};
// ------------------------------------------------------------------


// Component to fix map gray tiles
const MapRefresher = () => {
  const map = useMap();
  
  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    map.invalidateSize();
    map.eachLayer((layer) => {
      if ((layer as any).redraw) (layer as any).redraw();
    });
  };

  return (
    <button 
      onClick={handleRefresh}
      className="bg-white p-3 rounded-full shadow-xl border border-slate-200 active:scale-95 transition-transform text-slate-600"
      title="ផ្ទុកផែនទីឡើងវិញ"
      type="button"
    >
      <RefreshCw className="w-6 h-6" />
    </button>
  );
};

const MyLocationButton = () => {
  const map = useMap();
  const [loading, setLoading] = useState(false);
  
  const handleClick = () => {
    setLoading(true);
    map.locate().on("locationfound", (e) => {
      map.flyTo(e.latlng, map.getZoom());
      setLoading(false);
    }).on("locationerror", () => setLoading(false));
  };

  return (
    <button 
      onClick={handleClick}
      className="bg-white p-3 rounded-full shadow-xl border border-slate-200 active:scale-95 transition-transform"
      title="រកទីតាំងរបស់ខ្ញុំ"
      type="button"
    >
      <Navigation className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} style={{ color: '#de8d22' }} />
    </button>
  );
}

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({ 
  pointA, 
  pointB, 
  activeTarget,
  onLocationUpdate,
  onTargetChange
}) => {
  const defaultCenter = { lat: 11.5564, lng: 104.9282 };
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('satellite');
  
  const distance = (pointA && pointB) ? calculateDistance(pointA, pointB) : 0;

  const tileLayer = mapStyle === 'street' 
    ? {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: '&copy; OpenStreetMap',
        maxNativeZoom: 19
      }
    : {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: 'Tiles &copy; Esri',
        maxNativeZoom: 19
      };

  return (
    <div className="relative w-full aspect-square sm:h-[400px] bg-slate-100 rounded-xl overflow-hidden border-2 border-slate-300 shadow-inner isolate">
      <MapContainer 
        center={[defaultCenter.lat, defaultCenter.lng]} 
        zoom={18} 
        maxZoom={22}
        scrollWheelZoom="center" // Keeps center fixed during scroll zoom
        touchZoom="center"       // Keeps center fixed during pinch zoom
        doubleClickZoom="center" // Keeps center fixed during double click zoom
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution={tileLayer.attribution}
          url={tileLayer.url}
          maxNativeZoom={tileLayer.maxNativeZoom}
          maxZoom={22}
        />

        <MapController 
          activeTarget={activeTarget}
          pointA={pointA}
          pointB={pointB}
          onLocationUpdate={onLocationUpdate}
        />

        {/* Marker for Point A (Only if not active) */}
        {pointA && activeTarget !== 'A' && (
          <Marker 
            position={[pointA.latitude, pointA.longitude]}
            icon={createLabelIcon('A', '#de8d22')}
            eventHandlers={{
              click: () => onTargetChange('A')
            }}
          >
          </Marker>
        )}

        {/* Marker for Point B (Only if not active) */}
        {pointB && activeTarget !== 'B' && (
          <Marker 
            position={[pointB.latitude, pointB.longitude]}
            icon={createLabelIcon('B', '#4f46e5')}
            eventHandlers={{
              click: () => onTargetChange('B')
            }}
          >
          </Marker>
        )}

        {/* Connection Line */}
        {pointA && pointB && (
          <Polyline 
            positions={[
              [pointA.latitude, pointA.longitude],
              [pointB.latitude, pointB.longitude]
            ]}
            pathOptions={{ color: '#fbbf24', dashArray: '10, 10', opacity: 0.8, weight: 4 }}
          />
        )}

        {/* Controls */}
        <div className="absolute bottom-4 right-4 z-[400] flex flex-col gap-2">
            <button
                type="button"
                onClick={() => setMapStyle(s => s === 'street' ? 'satellite' : 'street')}
                className="bg-white p-3 rounded-full shadow-xl border border-slate-200 active:scale-95 transition-transform text-slate-700"
                title={mapStyle === 'street' ? "ប្តូរទៅផ្កាយរណប" : "ប្តូរទៅផែនទី"}
            >
                {mapStyle === 'street' ? <Globe className="w-6 h-6 text-[#de8d22]" /> : <Layers className="w-6 h-6 text-green-600" />}
            </button>
            
            <button
                type="button"
                onClick={() => onTargetChange(activeTarget === 'A' ? 'B' : 'A')}
                className="bg-white p-3 rounded-full shadow-xl border border-slate-200 active:scale-95 transition-transform"
                title={`ប្តូរទៅចំណុច ${activeTarget === 'A' ? 'B' : 'A'}`}
            >
               <div className="relative">
                  <ArrowRightLeft className="w-6 h-6 text-slate-700" />
                  <span 
                    className="absolute -bottom-2 -right-2 text-[10px] font-bold px-1 rounded-full text-white"
                    style={{ backgroundColor: activeTarget === 'A' ? '#4f46e5' : '#de8d22' }}
                  >
                    {activeTarget === 'A' ? 'B' : 'A'}
                  </span>
               </div>
            </button>

            <MyLocationButton />
            <MapRefresher />
        </div>

      </MapContainer>

      {/* Center Crosshair */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[400] pointer-events-none -mt-[17px]">
        {activeTarget === 'A' ? (
           <div className="flex flex-col items-center">
             <div className="w-8 h-8 rounded-full border-2 border-white text-white flex items-center justify-center font-bold shadow-lg" style={{ backgroundColor: '#de8d22' }}>A</div>
             <div className="w-2 h-2 bg-black/50 rounded-full blur-[1px]"></div>
           </div>
        ) : (
          <div className="flex flex-col items-center">
             <div className="w-8 h-8 rounded-full bg-indigo-600 border-2 border-white text-white flex items-center justify-center font-bold shadow-lg">B</div>
             <div className="w-2 h-2 bg-black/50 rounded-full blur-[1px]"></div>
           </div>
        )}
      </div>

      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-[400] bg-white/80 backdrop-blur-sm p-2 flex justify-between items-center text-xs border-b border-slate-200">
        <span className="font-bold text-slate-700">
          កំពុងកែ: ចំណុច {activeTarget}
        </span>
        {distance > 0 && (
          <span className="flex items-center gap-1 bg-orange-100 px-2 py-0.5 rounded font-mono font-bold" style={{ color: '#de8d22' }}>
            <Ruler className="w-3 h-3" /> {distance.toFixed(2)}m
          </span>
        )}
      </div>
    </div>
  );
};