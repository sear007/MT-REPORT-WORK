import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, CheckCircle, RefreshCw, Navigation } from 'lucide-react';
import { GeoLocation } from '../types';
import { Button } from './Button';

interface LocationCaptureProps {
  label: string;
  value: GeoLocation | null;
  onChange: (location: GeoLocation) => void;
  color?: string;
}

export const LocationCapture: React.FC<LocationCaptureProps> = ({ 
  label, 
  value, 
  onChange,
  color = "blue" 
}) => {
  const [status, setStatus] = useState<'IDLE' | 'SEARCHING' | 'LOCKED'>('IDLE');
  const [currentPos, setCurrentPos] = useState<GeoLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Determine status from props on mount/update
    if (value) {
      setStatus('LOCKED');
    } else if (status === 'LOCKED' && !value) {
      setStatus('IDLE');
    }
  }, [value]);

  useEffect(() => {
    return () => stopWatching();
  }, []);

  const stopWatching = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const startCapturing = () => {
    setError(null);
    setStatus('SEARCHING');
    setCurrentPos(null);

    if (!navigator.geolocation) {
      setError("GPS not supported on this device");
      setStatus('IDLE');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 0
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newPos = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
        setCurrentPos(newPos);
      },
      (err) => {
        // We don't stop watching on error, just notify
        console.warn("GPS Error", err);
        setError("Weak GPS signal. Retrying...");
      },
      options
    );
  };

  const confirmPosition = () => {
    if (currentPos) {
      onChange(currentPos);
      stopWatching();
      setStatus('LOCKED');
    }
  };

  const handleRetake = () => {
    stopWatching();
    onChange(null as any);
    setStatus('IDLE');
    setCurrentPos(null);
  };

  // 1. Locked State (Result)
  if (value) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm animate-in fade-in">
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className={`text-xs font-bold uppercase tracking-wider text-${color}-600`}>{label}</span>
            <div className="flex items-center gap-1.5 mt-1 text-slate-800 font-mono font-medium text-lg">
               <CheckCircle className="w-5 h-5 text-green-500" />
               {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
            </div>
          </div>
          <button 
            onClick={handleRetake}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
             <Navigation className="w-3 h-3" /> ±{Math.round(value.accuracy)}m
          </div>
        </div>
      </div>
    );
  }

  // 2. Searching State
  if (status === 'SEARCHING') {
    return (
      <div className="bg-white rounded-xl border-2 border-blue-100 p-4 shadow-md animate-in zoom-in-95">
        <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-2">
             <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
             <span className="font-bold text-slate-700">Locating {label}...</span>
           </div>
        </div>

        {error && <div className="text-xs text-orange-500 mb-2">{error}</div>}

        {currentPos ? (
          <div className="space-y-3">
             <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded">
               <div className="truncate">Lat: {currentPos.latitude}</div>
               <div className="truncate">Lng: {currentPos.longitude}</div>
             </div>

             <Button 
               fullWidth
               variant="primary"
               onClick={confirmPosition}
               icon={<MapPin className="w-4 h-4" />}
             >
               Use Current Position
             </Button>
          </div>
        ) : (
          <div className="py-4 text-center text-sm text-slate-400 italic">
            Acquiring satellites...
          </div>
        )}
      </div>
    );
  }

  // 3. Idle State
  return (
    <button 
      onClick={startCapturing}
      className={`w-full group relative overflow-hidden bg-white p-4 rounded-xl border-2 border-slate-200 border-dashed hover:border-${color}-500 hover:bg-${color}-50 transition-all duration-300 text-left`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full bg-${color}-100 flex items-center justify-center group-hover:scale-110 transition-transform`}>
          <MapPin className={`w-5 h-5 text-${color}-600`} />
        </div>
        <div>
          <div className="font-bold text-slate-700 group-hover:text-slate-900">Get {label} Location</div>
          <div className="text-xs text-slate-400">Tap to acquire GPS coordinates</div>
        </div>
      </div>
    </button>
  );
};
