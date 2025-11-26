
import { ServiceItem, AppConfig } from './types';

export const AUTH_EXPIRATION_DAYS = 7;

export const DEFAULT_CONFIG: AppConfig = {
  // Empty users array implies first user will be admin
  users: [],
  enableGuestAccess: false,
  backgroundImageUrl: "/default-wallpaper.jpg", // 本地壁纸，放在 public 目录下
  backgroundBlur: 16, // default 16px
  cardMinWidth: 180,

  // Category order (empty means auto-sort alphabetically)
  categoryOrder: [],

  // Colors
  categoryColor: '#ffffff',
  cardTitleColor: '#1d1d1f',
  cardDescColor: '#4b5563',
  clockColor: '#ffffff',
  headerTitleColor: '#1f2937', // dark gray
  headerGreetingColor: '#1f2937', // dark gray
};

export const DEFAULT_SERVICES: ServiceItem[] = [];

export const STORAGE_KEYS = {
  SERVICES: 'nexus_services',
  CONFIG: 'nexus_config',
  AUTH_DATA: 'nexus_auth_data',
  ASSETS: 'nexus_assets', // New key for asset library
  NETWORK_MODE: 'nexus_network_mode'
};
