
import { ServiceItem, AppConfig } from './types';

export const AUTH_EXPIRATION_DAYS = 7;

export const DEFAULT_CONFIG: AppConfig = {
  // Empty users array implies first user will be admin
  users: [],
  enableGuestAccess: false,
  backgroundImageUrl: "/default-wallpaper.jpg", // 本地壁纸，放在 public 目录下
  backgroundBlur: 16, // default 16px
  cardMinWidth: 180,

  // Colors
  categoryColor: '#ffffff',
  cardTitleColor: '#1d1d1f',
  cardDescColor: '#4b5563',
  clockColor: '#ffffff',
  headerTitleColor: '#1f2937', // dark gray
  headerGreetingColor: '#1f2937', // dark gray
};

export const DEFAULT_SERVICES: ServiceItem[] = [
  // Infrastructure
  {
    id: '1',
    name: '路由器',
    description: 'UniFi Gateway',
    urlInternal: 'http://192.168.1.1',
    urlExternal: '',
    category: '基础设施',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/2859/2859740.png'
  },
  {
    id: '2',
    name: 'NAS 存储',
    description: 'Synology DS920+',
    urlInternal: 'http://192.168.1.10:5000',
    urlExternal: 'https://nas.example.com',
    category: '基础设施',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/9678/9678145.png'
  },
  {
    id: '21',
    name: 'Proxmox VE',
    description: '虚拟化平台',
    urlInternal: 'https://192.168.1.2:8006',
    category: '基础设施',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/2172/2172843.png'
  },

  // Multimedia
  {
    id: '3',
    name: 'Plex',
    description: '家庭影院',
    urlInternal: 'http://192.168.1.10:32400',
    urlExternal: 'https://app.plex.tv',
    category: '多媒体',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/5977/5977591.png'
  },
  {
    id: '31',
    name: 'Emby',
    description: '备用媒体库',
    urlInternal: 'http://192.168.1.10:8096',
    category: '多媒体',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/2504/2504965.png'
  },
  {
    id: '32',
    name: 'Jellyfin',
    description: '开源媒体中心',
    urlInternal: 'http://192.168.1.10:8097',
    category: '多媒体',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/566/566093.png'
  },
  {
    id: '33',
    name: 'Sonarr',
    description: '剧集管理',
    urlInternal: 'http://192.168.1.10:8989',
    category: '多媒体',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/4221/4221419.png'
  },
  {
    id: '34',
    name: 'Radarr',
    description: '电影管理',
    urlInternal: 'http://192.168.1.10:7878',
    category: '多媒体',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/2503/2503508.png'
  },

  // Smart Home
  {
    id: '4',
    name: 'Home Assistant',
    description: '智能家居中枢',
    urlInternal: 'http://192.168.1.15:8123',
    urlExternal: 'https://hass.example.com',
    category: '智能家居',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/11542/11542718.png'
  },
  {
    id: '41',
    name: 'Node-RED',
    description: '自动化流程',
    urlInternal: 'http://192.168.1.15:1880',
    category: '智能家居',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/10606/10606089.png'
  },

  // Dev Tools
  {
    id: '5',
    name: 'Docker',
    description: 'Portainer',
    urlInternal: 'http://192.168.1.10:9000',
    urlExternal: '',
    category: '开发工具',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/919/919853.png'
  },
  {
    id: '51',
    name: 'GitLab',
    description: '代码托管',
    urlInternal: 'http://gitlab.local',
    category: '开发工具',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/11518/11518876.png'
  },
  {
    id: '52',
    name: 'Jenkins',
    description: 'CI/CD 构建',
    urlInternal: 'http://jenkins.local',
    category: '开发工具',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/4400/4400481.png'
  },
  {
    id: '53',
    name: 'VS Code Web',
    description: '在线编辑器',
    urlInternal: 'http://vscode.local',
    category: '开发工具',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/906/906324.png'
  },

  // Social & News
  {
    id: '6',
    name: 'ChatGPT',
    description: 'OpenAI',
    urlInternal: 'https://chat.openai.com',
    category: '互联网',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/12222/12222588.png'
  },
  {
    id: '61',
    name: 'GitHub',
    description: '开源社区',
    urlInternal: 'https://github.com',
    category: '互联网',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/2111/2111432.png'
  },
  {
    id: '62',
    name: 'YouTube',
    description: '视频流媒体',
    urlInternal: 'https://youtube.com',
    category: '互联网',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png'
  },
  {
    id: '63',
    name: 'Twitter',
    description: 'X',
    urlInternal: 'https://twitter.com',
    category: '互联网',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/5969/5969020.png'
  },

  // Downloads
  {
    id: '7',
    name: 'qBittorrent',
    description: '下载工具',
    urlInternal: 'http://192.168.1.10:8080',
    category: '下载',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/12118/12118802.png'
  },
  {
    id: '71',
    name: 'Transmission',
    description: '轻量下载',
    urlInternal: 'http://192.168.1.10:9091',
    category: '下载',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/9544/9544975.png'
  },
  {
    id: '8',
    name: '监控',
    description: 'Frigate NVR',
    urlInternal: 'http://frigate.local',
    category: '安防',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3616/3616927.png'
  }
];

export const STORAGE_KEYS = {
  SERVICES: 'nexus_services',
  CONFIG: 'nexus_config',
  AUTH_DATA: 'nexus_auth_data',
  ASSETS: 'nexus_assets', // New key for asset library
  NETWORK_MODE: 'nexus_network_mode'
};
