import { GeoLocation } from '../types';

export const calculateDistance = (p1: GeoLocation, p2: GeoLocation): number => {
  const R = 6371e3; // Earth radius in meters
  const lat1 = p1.latitude * Math.PI / 180;
  const lat2 = p2.latitude * Math.PI / 180;
  const deltaLat = (p2.latitude - p1.latitude) * Math.PI / 180;
  const deltaLon = (p2.longitude - p1.longitude) * Math.PI / 180;

  const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
            
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c; // Distance in meters
};
