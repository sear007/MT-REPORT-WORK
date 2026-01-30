export enum WorkType {
  HAND_HOLE_TO_POLE = 'Hand Hole ➡️ Pole',
  HAND_HOLE_TO_HAND_HOLE = 'Hand Hole ➡️ Hand Hole',
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface AppConfig {
  telegramBotToken: string;
  telegramChatId: string;
  googleMapsApiKey?: string;
}

export interface WorkData {
  name: string;
  type: WorkType | null;
  pointA: GeoLocation | null;
  pointB: GeoLocation | null;
  photos: File[];
  distance?: number;
}
