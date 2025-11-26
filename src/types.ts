
export interface ServiceItem {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string; // URL to an image or empty for default
  urlInternal: string;
  urlExternal?: string;
  category: string;
}

export interface User {
  username: string;
  passwordHash: string | null; // null means no password set yet
}

export interface Asset {
  id: string;
  type: 'icon' | 'wallpaper';
  data: string; // Base64 string or URL
  createdAt: number;
}

export interface AppConfig {
  // Deprecated single user fields (kept for migration)
  userName?: string;
  authHash?: string | null;
  // Deprecated header color (kept for migration)
  headerColor?: string;

  // New multi-user support
  users: User[];
  enableGuestAccess?: boolean; // New field
  
  backgroundImageUrl: string;
  backgroundBlur: number; // px value
  cardMinWidth: number; // px value
  
  // Colors
  categoryColor: string;
  cardTitleColor: string;
  cardDescColor: string;
  clockColor: string;
  headerTitleColor: string; // Separated
  headerGreetingColor: string; // Separated
}

export enum NetworkMode {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
}

export interface Category {
  id: string;
  name: string;
}
