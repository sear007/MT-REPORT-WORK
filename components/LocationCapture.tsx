import React from 'react';
import { MapPin, CheckCircle, CircleDot } from 'lucide-react';
import { GeoLocation } from '../types';

interface LocationCaptureProps {
  label: string;
  value: GeoLocation | null;
  isActive: boolean;
  onActivate: () => void;
  color?: string;
  icon?: React.ReactNode;
}

export const LocationCapture: React.FC<LocationCaptureProps> = ({ 
  label, 
  value, 
  isActive,
  onActivate,
  color = "#de8d22",
  icon
}) => {
  const isHex = color.startsWith('#');

  // Dynamic Styles
  const containerStyle = isActive 
    ? (isHex 
        ? { borderColor: color, backgroundColor: `${color}0d`, boxShadow: `0 0 0 2px ${color}33` } // Hex styles (0d = 5% opacity, 33 = 20%)
        : {} // Class-based handled below
      )
    : {};

  // Class construction for non-hex colors (backward compatibility)
  const containerClasses = `w-full group relative overflow-hidden p-3 rounded-xl border-2 transition-all duration-200 text-left ${
    isActive 
      ? (isHex ? '' : `border-${color}-500 ring-2 ring-${color}-200 bg-${color}-50`) 
      : 'border-slate-200 hover:bg-slate-50'
  }`;

  const iconContainerStyle = {
    backgroundColor: isActive ? (isHex ? color : undefined) : undefined,
    color: isActive ? (isHex ? 'white' : undefined) : undefined
  };

  const iconContainerClasses = `w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
    isActive 
      ? (isHex ? '' : `bg-${color}-600 text-white`) 
      : 'bg-slate-100 text-slate-400'
  }`;

  const labelStyle = {
    color: isActive ? (isHex ? color : undefined) : undefined
  };

  const labelClasses = `text-xs font-bold uppercase tracking-wider ${
    isActive 
      ? (isHex ? '' : `text-${color}-700`) 
      : 'text-slate-500'
  }`;

  return (
    <button 
      onClick={onActivate}
      type="button"
      className={containerClasses}
      style={containerStyle}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className={iconContainerClasses}
            style={iconContainerStyle}
          >
            {icon || <MapPin className="w-4 h-4" />}
          </div>
          <div>
            <div 
              className={labelClasses}
              style={labelStyle}
            >
              {label}
            </div>
            {value ? (
              <div className="font-mono font-medium text-slate-800 text-sm">
                {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
              </div>
            ) : (
              <div className="text-sm text-slate-400 italic">មិនទាន់កំណត់</div>
            )}
          </div>
        </div>
        
        {value ? (
           <CheckCircle 
             className={`w-5 h-5 ${!isHex ? (isActive ? `text-${color}-600` : 'text-green-500') : ''}`} 
             style={{ color: isHex ? (isActive ? color : '#22c55e') : undefined }}
           />
        ) : (
           <CircleDot className={`w-5 h-5 text-slate-300`} />
        )}
      </div>
    </button>
  );
};