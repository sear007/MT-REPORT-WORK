export enum WorkType {
  HAND_HOLE_TO_POLE = 'ហូល ➡️ បង្គោល',
  HAND_HOLE_TO_HAND_HOLE = 'ហូល ➡️ ហូល',
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface WorkData {
  name: string;
  type: WorkType | null;
  pointA: GeoLocation | null;
  pointB: GeoLocation | null;
  photos: File[];
  distance?: number;
}

export interface AppConfig {
  telegramBotToken: string;
  telegramChatId: string;
  googleMapsApiKey?: string;
}