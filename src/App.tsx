
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
   Settings, Plus, Check, Edit2, Box, LayoutGrid, Upload, Image as ImageIcon, Globe, Loader2, Download, Wifi, ArrowUp, LogOut, Trash2, Palette, Database, Users, UserCircle, Shield, FolderOpen, X, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { ServiceCard } from './components/ServiceCard';
import { Modal } from './components/Modal';
import { AuthOverlay } from './components/AuthOverlay';
import { ServiceItem, AppConfig, NetworkMode, User, Asset } from './types';
import { DEFAULT_SERVICES, DEFAULT_CONFIG, STORAGE_KEYS, AUTH_EXPIRATION_DAYS } from './constants';
import { hashPassword } from './utils';

function App() {
   // --- State ---
   // API Base URL - 使用当前域名,兼容开发和生产环境
   const API_BASE = import.meta.env.DEV
      ? 'http://localhost:3001/api'  // 开发环境
      : `${window.location.origin}/api`;  // 生产环境

   // --- State ---
   const [isLoading, setIsLoading] = useState(true);
   const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
   const [services, setServices] = useState<ServiceItem[]>(DEFAULT_SERVICES);
   const [assets, setAssets] = useState<Asset[]>([]); // New Asset State
   const [networkMode, setNetworkMode] = useState<NetworkMode>(NetworkMode.INTERNAL);
   const [isEditing, setIsEditing] = useState(false);

   // Auth State
   const [isAuthenticated, setIsAuthenticated] = useState(false);
   const [authInitialized, setAuthInitialized] = useState(false);
   const [currentUser, setCurrentUser] = useState<string>('');
   const [isGuest, setIsGuest] = useState(false);
   const [showLoginModal, setShowLoginModal] = useState(false);

   // Modals
   const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
   const [editingService, setEditingService] = useState<ServiceItem | null>(null);
   const [serviceToDelete, setServiceToDelete] = useState<string | null>(null); // New state for deletion confirmation
   const [assetToDelete, setAssetToDelete] = useState<string | null>(null); // State for asset deletion confirmation
   const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
   const [settingsTab, setSettingsTab] = useState<'appearance' | 'wallpaper' | 'users' | 'data' | 'assets' | 'categories'>('appearance');
   const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

   // Password Change State
   const [showPasswordModal, setShowPasswordModal] = useState(false);
   const [oldPassword, setOldPassword] = useState('');
   const [newPassword, setNewPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
   const [passwordError, setPasswordError] = useState('');
   const [passwordSuccess, setPasswordSuccess] = useState('');

   // Service Form State
   const [iconPreview, setIconPreview] = useState<string>('');
   const [fetchUrlInput, setFetchUrlInput] = useState('');

   // Icon Fetching State
   const [isFetchingIcons, setIsFetchingIcons] = useState(false);
   const [fetchedIcons, setFetchedIcons] = useState<string[]>([]);

   // Drag and Drop State
   const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
   const [draggedCategoryIndex, setDraggedCategoryIndex] = useState<number | null>(null);

   // Clock & Scroll State
   const [currentTime, setCurrentTime] = useState(new Date());
   const [showScrollTop, setShowScrollTop] = useState(false);
   const scrollContainerRef = useRef<HTMLDivElement>(null);

   // Layout State
   const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

   // Wallpaper State
   const [wallpaperError, setWallpaperError] = useState(false);
   const [failedWallpaperUrl, setFailedWallpaperUrl] = useState<string>(''); // 记住失败的URL

   // --- Initialization ---
   // --- Initialization ---
   useEffect(() => {
      const initData = async () => {
         try {
            // 1. Fetch Config & Services
            const dataRes = await fetch(`${API_BASE}/data`);
            let currentConfig = DEFAULT_CONFIG;

            if (dataRes.ok) {
               const serverData = await dataRes.json();
               if (serverData.config) {
                  currentConfig = { ...DEFAULT_CONFIG, ...serverData.config };
                  setConfig(currentConfig);
               }
               if (serverData.services) {
                  setServices(serverData.services);
               }
            }

            // 2. Fetch Assets
            const assetsRes = await fetch(`${API_BASE}/assets`);
            if (assetsRes.ok) {
               const serverAssets = await assetsRes.json();
               const formattedAssets = serverAssets.map((asset: any) => ({
                  id: asset.id,
                  type: asset.type,
                  data: asset.url,
                  createdAt: asset.createdAt
               }));
               setAssets(formattedAssets);
            }

            // 3. Local Settings (Network Mode)
            const storedNetworkMode = localStorage.getItem(STORAGE_KEYS.NETWORK_MODE);
            if (storedNetworkMode) {
               setNetworkMode(storedNetworkMode as NetworkMode);
            } else {
               // 默认使用外网模式
               setNetworkMode(NetworkMode.EXTERNAL);
            }

            // 4. Auth Check
            const authDataStr = localStorage.getItem(STORAGE_KEYS.AUTH_DATA);
            if (authDataStr) {
               try {
                  const authData = JSON.parse(authDataStr);
                  const now = Date.now();
                  const daysPassed = (now - authData.timestamp) / (1000 * 60 * 60 * 24);

                  if (daysPassed < AUTH_EXPIRATION_DAYS) {
                     // Check if user exists in the FETCHED config
                     if (currentConfig.users && currentConfig.users.some(u => u.username === authData.username)) {
                        setIsAuthenticated(true);
                        setCurrentUser(authData.username);
                        setIsGuest(false);
                     } else {
                        localStorage.removeItem(STORAGE_KEYS.AUTH_DATA);
                     }
                  } else {
                     localStorage.removeItem(STORAGE_KEYS.AUTH_DATA);
                  }
               } catch (e) {
                  localStorage.removeItem(STORAGE_KEYS.AUTH_DATA);
               }
            } else {
               // Guest Access Check
               if (currentConfig.enableGuestAccess && currentConfig.users.length > 0) {
                  setIsAuthenticated(true);
                  setIsGuest(true);
                  setCurrentUser('访客');
               }
            }

            setAuthInitialized(true);
         } catch (error) {
            console.error("Initialization error:", error);
         } finally {
            setIsLoading(false);
         }
      };

      initData();

      // Clock Timer
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);

      // Resize Listener
      const handleResize = () => setWindowWidth(window.innerWidth);
      window.addEventListener('resize', handleResize);

      // Mouse Move Listener for Spotlight Effect
      const handleMouseMove = (e: MouseEvent) => {
         const cards = document.getElementsByClassName('service-card');
         for (const card of cards) {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            (card as HTMLElement).style.setProperty('--mouse-x', `${x}px`);
            (card as HTMLElement).style.setProperty('--mouse-y', `${y}px`);
         }
      };
      window.addEventListener('mousemove', handleMouseMove);

      return () => {
         clearInterval(timer);
         window.removeEventListener('resize', handleResize);
         window.removeEventListener('mousemove', handleMouseMove);
      };
   }, []);

   // --- Scroll Listener ---
   useEffect(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const handleScroll = () => {
         if (container.scrollTop > 300) {
            setShowScrollTop(true);
         } else {
            setShowScrollTop(false);
         }
      };

      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
   }, [isAuthenticated]);

   const scrollToTop = () => {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
   };

   // --- Persistence ---
   const saveConfig = async (newConfig: AppConfig) => {
      setConfig(newConfig);
      try {
         await fetch(`${API_BASE}/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config: newConfig })
         });
      } catch (e) {
         console.error("Failed to save config", e);
      }
   };

   const saveServices = async (newServices: ServiceItem[]) => {
      setServices(newServices);
      try {
         await fetch(`${API_BASE}/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ services: newServices })
         });
      } catch (e) {
         console.error("Failed to save services", e);
      }
   };

   // 从服务器加载素材
   const loadAssetsFromServer = async () => {
      try {
         const response = await fetch(`${API_BASE}/assets`);
         if (response.ok) {
            const serverAssets = await response.json();
            // 转换服务器数据格式为前端格式
            const formattedAssets = serverAssets.map((asset: any) => ({
               id: asset.id,
               type: asset.type,
               data: asset.url, // 使用服务器URL而不是base64
               createdAt: asset.createdAt
            }));
            setAssets(formattedAssets);
         }
      } catch (error) {
         console.error('Failed to load assets from server:', error);
      }
   };

   const saveAssets = (newAssets: Asset[]) => {
      // 保留这个函数用于兼容性,但实际不做localStorage操作
      setAssets(newAssets);
   };

   // --- Asset Management Logic ---
   //  上传素材到服务器
   const addAsset = async (data: string, type: 'icon' | 'wallpaper'): Promise<string | null> => {
      try {
         // Check if it's a remote URL that needs to be downloaded by server
         if (data.startsWith('http') && !data.includes(API_BASE)) {
            const response = await fetch(`${API_BASE}/assets/upload-from-url`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ url: data, type })
            });

            if (response.ok) {
               const asset = await response.json();
               await loadAssetsFromServer();
               return asset.url;
            }
            // Fallback to client-side upload if server download fails (e.g. local network issue)
            // But usually server is better at this.
         }

         // Client-side upload (for local files or base64)
         let blob: Blob;

         if (data.startsWith('data:')) {
            // base64数据
            const response = await fetch(data);
            blob = await response.blob();
         } else if (data.startsWith('http')) {
            // 远程URL - 下载并上传
            const response = await fetch(data);
            blob = await response.blob();
         } else {
            console.error('Invalid data format');
            return null;
         }

         // 创建FormData
         const formData = new FormData();
         const extension = blob.type.split('/')[1] || 'png';
         formData.append('file', blob, `${type}.${extension}`);
         formData.append('type', type);

         // 上传到服务器
         const uploadResponse = await fetch(`${API_BASE}/assets/upload`, {
            method: 'POST',
            body: formData
         });

         if (uploadResponse.ok) {
            const asset = await uploadResponse.json();
            // 重新加载素材列表
            await loadAssetsFromServer();
            // 返回服务器URL
            return asset.url;
         }
         return null;
      } catch (error) {
         console.error('Failed to upload asset:', error);
         return null;
      }
   };

   // Validate image can load before adding as asset
   const validateAndAddAsset = (url: string, type: 'icon' | 'wallpaper'): Promise<boolean> => {
      return new Promise(async (resolve) => {
         const tryAdd = async (targetUrl: string) => {
            const img = new Image();
            img.onload = async () => {
               await addAsset(targetUrl, type);
               resolve(true);
            };
            img.onerror = async () => {
               // If direct load fails, try proxy
               if (!targetUrl.includes('/api/proxy-image')) {
                  const proxyUrl = `${API_BASE}/proxy-image?url=${encodeURIComponent(targetUrl)}`;
                  // Try proxy
                  const imgProxy = new Image();
                  imgProxy.onload = async () => {
                     await addAsset(proxyUrl, type);
                     resolve(true);
                  };
                  imgProxy.onerror = () => {
                     console.warn(`Failed to load ${type} (even with proxy):`, targetUrl);
                     resolve(false);
                  };
                  imgProxy.src = proxyUrl;
               } else {
                  console.warn(`Failed to load ${type}:`, targetUrl);
                  resolve(false);
               }
            };
            img.src = targetUrl;
         };
         tryAdd(url);
      });
   };
   const deleteAsset = async (id: string) => {
      setAssetToDelete(id);
   };

   const confirmDeleteAsset = async () => {
      if (assetToDelete) {
         try {
            // 找到要删除的素材
            const asset = assets.find(a => a.id === assetToDelete);
            if (asset) {
               // 从URL中提取文件名
               const filename = asset.data.split('/').pop();
               if (filename) {
                  const response = await fetch(`${API_BASE}/assets/${filename}`, {
                     method: 'DELETE'
                  });

                  if (response.ok) {
                     // 重新加载素材列表
                     await loadAssetsFromServer();
                  }
               }
            }
         } catch (error) {
            console.error('Failed to delete asset:', error);
         }
         setAssetToDelete(null);
      }
   };
   const cancelDeleteAsset = () => {
      setAssetToDelete(null);
   };
   // --- Auth Handlers ---
   const checkUserStatus = (username: string): 'LOGIN' | 'SETUP' => {
      if (!username) return 'LOGIN';
      const user = config.users?.find(u => u.username === username);
      if (user && user.passwordHash === null) return 'SETUP';
      return 'LOGIN';
   };

   const handleAuthenticate = async (password: string, inputUsername: string) => {
      // 0. First Run / Registration
      if (config.users.length === 0) {
         if (password.length < 4) return { success: false, isNewUser: false, needsPasswordSetup: true };
         const hashedPassword = await hashPassword(password);
         const newUser = { username: inputUsername, passwordHash: hashedPassword };
         const newConfig = { ...config, users: [newUser] };
         saveConfig(newConfig);
         loginSuccess(inputUsername);
         return { success: true, isNewUser: false, needsPasswordSetup: false };
      }

      const userIndex = config.users.findIndex(u => u.username === inputUsername);

      // 1. User not found
      if (userIndex === -1) {
         return { success: false, isNewUser: true, needsPasswordSetup: false };
      }

      const user = config.users[userIndex];

      // HASH PASSWORD
      const hashedPassword = await hashPassword(password);

      // 2. Setup Password (if null)
      if (user.passwordHash === null) {
         if (password.length >= 4) {
            const updatedUsers = [...config.users];
            updatedUsers[userIndex] = { ...user, passwordHash: hashedPassword };
            saveConfig({ ...config, users: updatedUsers });
            loginSuccess(inputUsername);
            return { success: true, isNewUser: false, needsPasswordSetup: true };
         } else {
            return { success: false, isNewUser: false, needsPasswordSetup: true };
         }
      }

      // 3. Validate Password
      if (user.passwordHash === hashedPassword) {
         loginSuccess(inputUsername);
         return { success: true, isNewUser: false, needsPasswordSetup: false };
      }

      return { success: false, isNewUser: false, needsPasswordSetup: false };
   };

   const loginSuccess = (username: string) => {
      setIsAuthenticated(true);
      setIsGuest(false);
      setCurrentUser(username);
      setShowLoginModal(false);
      localStorage.setItem(STORAGE_KEYS.AUTH_DATA, JSON.stringify({
         username,
         timestamp: Date.now()
      }));
   };

   const handleLogout = () => {
      setIsAuthenticated(false);
      setCurrentUser('');
      setIsEditing(false);
      setIsSettingsModalOpen(false);
      localStorage.removeItem(STORAGE_KEYS.AUTH_DATA);

      // If guest access is enabled, immediately revert to guest mode
      if (config.enableGuestAccess && config.users.length > 0) {
         setIsAuthenticated(true);
         setIsGuest(true);
         setCurrentUser('访客');
      }
   };

   // --- User Management ---
   const isAdmin = config.users.length > 0 && currentUser === config.users[0].username;

   const handleDeleteUser = (e: React.MouseEvent, usernameToDelete: string) => {
      e.stopPropagation();
      e.preventDefault();

      if (config.users.length <= 1) {
         alert('必须保留至少一个用户');
         return;
      }
      if (usernameToDelete === currentUser) {
         alert('无法删除当前登录用户');
         return;
      }
      if (window.confirm(`确定删除用户 "${usernameToDelete}" 吗？`)) {
         const newUsers = config.users.filter(u => u.username !== usernameToDelete);
         saveConfig({ ...config, users: newUsers });
      }
   };

   // --- Password Change Handler ---
   const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setPasswordError('');
      setPasswordSuccess('');

      // Validate inputs
      if (newPassword !== confirmPassword) {
         setPasswordError('两次输入的新密码不一致');
         return;
      }
      if (newPassword.length < 4) {
         setPasswordError('新密码至少需要 4 位');
         return;
      }

      // Find current user
      const user = config.users?.find((u: User) => u.username === currentUser);
      if (!user) {
         setPasswordError('未找到当前用户');
         return;
      }

      // Verify old password
      const hashedOldPassword = await hashPassword(oldPassword);
      if (user.passwordHash && user.passwordHash !== hashedOldPassword) {
         setPasswordError('旧密码错误');
         return;
      }

      // Update password
      const hashedNewPassword = await hashPassword(newPassword);
      const updatedUsers = config.users.map((u: User) =>
         u.username === currentUser ? { ...u, passwordHash: hashedNewPassword } : u
      );
      saveConfig({ ...config, users: updatedUsers });

      setPasswordSuccess('密码修改成功！');
      // Clear form after 2 seconds
      setTimeout(() => {
         setOldPassword('');
         setNewPassword('');
         setConfirmPassword('');
         setPasswordError('');
         setPasswordSuccess('');
         setShowPasswordModal(false);
      }, 2000);
   };

   // --- Image Upload & Asset Saving ---
   const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
         const reader = new FileReader();
         reader.onloadend = async () => {
            const result = reader.result as string;
            // 先显示预览（使用base64）
            setIconPreview(result);
            // 上传到服务器并获取URL
            const serverUrl = await addAsset(result, 'icon');
            // 如果上传成功，使用服务器URL替换base64
            if (serverUrl) {
               setIconPreview(serverUrl);
            }
         };
         reader.readAsDataURL(file);
      }
   };

   const handleWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
         const reader = new FileReader();
         reader.onloadend = async () => {
            const result = reader.result as string;
            // 先上传到服务器并获取URL
            const serverUrl = await addAsset(result, 'wallpaper');

            if (serverUrl) {
               // 使用服务器URL而不是base64
               saveConfig({ ...config, backgroundImageUrl: serverUrl });
            } else {
               // 上传失败，使用base64作为后备
               saveConfig({ ...config, backgroundImageUrl: result });
            }
         };
         reader.readAsDataURL(file);
      }
   };

   const handleRemoteWallpaperBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
      const val = e.target.value;

      // 只有当值改变时才处理
      if (!val || val === config.backgroundImageUrl) {
         return; // 没有改变，不需要保存
      }

      if (val.startsWith('http')) {
         saveConfig({ ...config, backgroundImageUrl: val });
         await validateAndAddAsset(val, 'wallpaper');
      } else if (val.startsWith('data:')) {
         // data URLs are already validated (from local upload)
         saveConfig({ ...config, backgroundImageUrl: val });
         await addAsset(val, 'wallpaper');
      }
   };

   // --- Icon Fetching ---
   const fetchWebsiteIcons = async (urlInput: string) => {
      if (!urlInput) return;
      setIsFetchingIcons(true);
      setFetchedIcons([]);

      try {
         const response = await fetch(`${API_BASE}/fetch-icon-candidates?url=${encodeURIComponent(urlInput)}`);
         if (response.ok) {
            const data = await response.json();
            if (data.icons && Array.isArray(data.icons)) {
               setFetchedIcons(data.icons);
            }
         }
      } catch (error) {
         console.warn("Failed fetch icons", error);
      } finally {
         setIsFetchingIcons(false);
      }
   };

   // --- CRUD ---
   const openServiceModal = (service: ServiceItem | null) => {
      setEditingService(service);
      setIconPreview(service?.iconUrl || '');
      setFetchedIcons([]);
      setFetchUrlInput(service?.urlExternal || service?.urlInternal || '');
      setIsServiceModalOpen(true);
   };

   const handleSaveService = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const newService: ServiceItem = {
         id: editingService ? editingService.id : Date.now().toString(),
         name: formData.get('name') as string,
         description: formData.get('description') as string,
         urlInternal: formData.get('urlInternal') as string,
         urlExternal: formData.get('urlExternal') as string,
         category: formData.get('category') as string || '其他',
         iconUrl: iconPreview || (formData.get('iconUrl') as string),
      };
      if (editingService) {
         saveServices(services.map(s => s.id === newService.id ? newService : s));
      } else {
         saveServices([...services, newService]);
      }
      setIsServiceModalOpen(false);
      setEditingService(null);
      setIconPreview('');
      setFetchedIcons([]);
   };

   const handleDeleteService = (id: string) => {
      setServiceToDelete(id);
   };

   const confirmDeleteService = () => {
      if (serviceToDelete) {
         saveServices(services.filter(s => s.id !== serviceToDelete));
         setServiceToDelete(null);
      }
   };

   const cancelDeleteService = () => {
      setServiceToDelete(null);
   };

   // --- Drag & Drop ---
   const handleDragStart = (e: React.DragEvent, id: string) => { setDraggedItemId(id); e.dataTransfer.effectAllowed = "move"; };
   const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
   const handleDropOnCard = (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (!draggedItemId || draggedItemId === targetId) return;
      const newServices = [...services];
      const draggedIndex = newServices.findIndex(s => s.id === draggedItemId);
      const targetIndex = newServices.findIndex(s => s.id === targetId);
      if (draggedIndex === -1 || targetIndex === -1) return;
      const draggedItem = newServices[draggedIndex];
      const targetItem = newServices[targetIndex];
      newServices.splice(draggedIndex, 1);
      if (draggedItem.category !== targetItem.category) { draggedItem.category = targetItem.category; }
      const newTargetIndex = newServices.findIndex(s => s.id === targetId);
      newServices.splice(newTargetIndex, 0, draggedItem);
      saveServices(newServices);
      setDraggedItemId(null);
   };
   const handleDropOnCategory = (e: React.DragEvent, category: string) => {
      e.preventDefault();
      if (!draggedItemId) return;
      const newServices = [...services];
      const draggedIndex = newServices.findIndex(s => s.id === draggedItemId);
      if (draggedIndex === -1) return;
      const draggedItem = newServices[draggedIndex];
      if (draggedItem.category !== category) { draggedItem.category = category; saveServices(newServices); }
      setDraggedItemId(null);
   };

   const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 6) return '凌晨好！';
      if (hour < 9) return '早上好！';
      if (hour < 12) return '上午好！';
      if (hour < 14) return '中午好！';
      if (hour < 17) return '下午好！';
      if (hour < 19) return '傍晚好！';
      return '晚上好！';
   };

   // --- Computed ---
   const categories = useMemo(() => {
      const cats = new Set<string>();
      services.forEach(s => cats.add(s.category));
      const allCategories = Array.from(cats);

      // Use custom order if available
      if (config.categoryOrder && config.categoryOrder.length > 0) {
         // Filter out categories that no longer exist
         const orderedExisting = config.categoryOrder.filter(cat => allCategories.includes(cat));
         // Add new categories that aren't in the order yet
         const newCategories = allCategories.filter(cat => !config.categoryOrder!.includes(cat));
         return [...orderedExisting, ...newCategories];
      }

      // Default: alphabetical sort
      return allCategories.sort();
   }, [services, config.categoryOrder]);

   const servicesByCategory = useMemo(() => {
      const grouped: Record<string, ServiceItem[]> = {};
      categories.forEach(cat => { grouped[cat] = services.filter(s => s.category === cat); });
      return grouped;
   }, [categories, services]);

   const layoutInfo = useMemo(() => {
      const gap = 16;
      const paddingX = windowWidth < 768 ? 32 : 96;
      const availableWidth = windowWidth - paddingX;
      const cardWidth = config.cardMinWidth || 180;

      let cols = Math.floor((availableWidth + gap) / (cardWidth + gap));
      if (cols < 1) cols = 1;
      const maxCols = windowWidth < 640 ? 2 : 5;
      if (cols > maxCols) cols = maxCols;

      const contentWidth = cols * cardWidth + (cols - 1) * gap;
      return { cols, contentWidth };
   }, [windowWidth, config.cardMinWidth]);

   const formatTime = (date: Date) => date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
   const formatDate = (date: Date) => date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });

   // Filter Assets for UI
   const iconAssets = assets.filter(a => a.type === 'icon');
   const wallpaperAssets = assets.filter(a => a.type === 'wallpaper');

   // Compute wallpaper URL with fallback
   const wallpaperUrl = useMemo(() => {
      const userWallpaper = config.backgroundImageUrl;
      const defaultWallpaper = '/default-wallpaper.jpg';

      // If user cleared wallpaper or it's empty, use default
      if (!userWallpaper || userWallpaper.trim() === '') {
         return defaultWallpaper;
      }

      // If this URL previously failed to load, use default
      if (userWallpaper === failedWallpaperUrl) {
         return defaultWallpaper;
      }

      return userWallpaper;
   }, [config.backgroundImageUrl, failedWallpaperUrl]);

   if (isLoading || !authInitialized) {
      return (
         <div className="flex h-screen w-full items-center justify-center bg-gray-900">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
         </div>
      );
   }

   return (
      <div className="relative h-screen w-full overflow-hidden font-sans text-[#1d1d1f] selection:bg-blue-500/30">
         <div
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
            style={{ backgroundImage: `url(${wallpaperUrl})` }}
         >
            <img
               src={wallpaperUrl}
               alt=""
               style={{ display: 'none' }}
               onError={() => {
                  setFailedWallpaperUrl(wallpaperUrl);
                  setWallpaperError(true);
               }}
               onLoad={() => setWallpaperError(false)}
            />
         </div>
         <div className="absolute inset-0 z-0 bg-white/10 transition-all duration-500" style={{ backdropFilter: `blur(${config.backgroundBlur}px)` }} />

         {(!isAuthenticated || showLoginModal) && (
            <AuthOverlay
               onAuthenticate={handleAuthenticate}
               checkUserStatus={checkUserStatus}
               userCount={config.users?.length || 0}
               onCancel={isAuthenticated ? () => setShowLoginModal(false) : undefined}
            />
         )}

         {isAuthenticated && (
            <div ref={scrollContainerRef} className={`relative z-10 h-full w-full overflow-y-auto custom-scrollbar scroll-smooth ${showLoginModal ? 'blur-sm pointer-events-none' : ''}`}>
               <header className="fixed top-0 left-0 right-0 h-16 z-40 px-6 md:px-8 flex items-center justify-between bg-white/30 backdrop-blur-xl border-b border-white/20 shadow-sm transition-all">
                  <div className="flex items-center gap-3">
                     <div className="bg-white/80 p-1.5 rounded-lg shadow-sm backdrop-blur-md">
                        <img src="/logo.png" alt="NexusHub" className="w-5 h-5" />
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[15px] font-bold leading-none tracking-tight" style={{ color: config.headerTitleColor || '#1f2937' }}>NexusHub</span>
                        <span className="text-[11px] leading-none mt-1 opacity-80" style={{ color: config.headerGreetingColor || '#1f2937' }}>
                           {isGuest ? '访客模式' : `${getGreeting()}`}
                        </span>
                     </div>
                  </div>

                  <div className="flex items-center gap-3">
                     <button
                        onClick={() => {
                           const newMode = networkMode === NetworkMode.INTERNAL ? NetworkMode.EXTERNAL : NetworkMode.INTERNAL;
                           setNetworkMode(newMode);
                           localStorage.setItem(STORAGE_KEYS.NETWORK_MODE, newMode);
                        }}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-white/50 hover:bg-white/80 backdrop-blur-md transition-all shadow-sm border border-white/20 text-[13px] font-medium text-gray-700 active:scale-95"
                     >
                        {networkMode === NetworkMode.INTERNAL ? <Wifi size={18} className="text-blue-600" /> : <Globe size={18} className="text-green-600" />}
                     </button>

                     {/* Admin Controls */}
                     {isAdmin && !isGuest && (
                        <>
                           <div className="h-6 w-[1px] bg-black/10 mx-1"></div>
                           <button
                              onClick={() => setIsEditing(!isEditing)}
                              className={`p-2 rounded-full transition-all h-10 w-10 flex items-center justify-center ${isEditing ? 'bg-blue-500 text-white shadow-md' : 'bg-white/50 text-gray-700 hover:bg-white/80'}`}
                           >
                              {isEditing ? <Check size={18} /> : <Edit2 size={18} />}
                           </button>
                        </>
                     )}

                     {/* Settings Button (Visible for Admin Only) */}
                     {isAdmin && !isGuest && (
                        <button
                           onClick={() => {
                              setIsSettingsModalOpen(true);
                              // Default collapse on mobile
                              if (window.innerWidth < 768) setIsSidebarCollapsed(true);
                              else setIsSidebarCollapsed(false);
                           }}
                           className="p-2 rounded-full h-10 w-10 flex items-center justify-center bg-white/50 text-gray-700 hover:bg-white/80 transition-all"
                        >
                           <Settings size={18} />

                        </button>
                     )}

                     {/* Login Button (Visible for Guest Only) */}
                     {isGuest && (
                        <button
                           onClick={() => setShowLoginModal(true)}
                           className="p-2 rounded-full h-10 w-10 flex items-center justify-center bg-white/50 text-gray-700 hover:bg-white/80 transition-all"
                           title="登录管理员"
                        >
                           <UserCircle size={18} />
                        </button>
                     )}

                     {isEditing && (
                        <button onClick={() => openServiceModal(null)} className="p-2 rounded-full h-10 w-10 flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all shadow-sm">
                           <Plus size={18} />
                        </button>
                     )}
                  </div>
               </header>

               <main className="pt-20 pb-20 px-4 md:px-12 w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col items-center justify-center py-12 md:py-16 select-none">
                     <h1 className="text-4xl md:text-5xl font-bold drop-shadow-lg tracking-tight mb-2" style={{ color: config.clockColor || '#ffffff' }}>{formatTime(currentTime)}</h1>
                     <p className="text-lg md:text-xl font-medium drop-shadow-md tracking-wide opacity-90" style={{ color: config.clockColor || '#ffffff' }}>{formatDate(currentTime)}</p>
                  </div>

                  <div className="space-y-12">
                     {(Object.entries(servicesByCategory) as [string, ServiceItem[]][]).map(([category, categoryServices]) => (
                        <div key={category} onDragOver={handleDragOver} onDrop={(e) => isEditing && handleDropOnCategory(e, category)} className="group/category mx-auto" style={{ width: layoutInfo.contentWidth > 0 ? `${layoutInfo.contentWidth}px` : '100%' }}>
                           <div className="flex items-center justify-start gap-3 mb-6 px-1">
                              <h2 className="text-2xl font-bold tracking-tight drop-shadow-md transition-colors duration-300" style={{ color: config.categoryColor || '#ffffff' }}>{category}</h2>
                           </div>
                           <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${layoutInfo.cols}, minmax(0, 1fr))` }}>
                              {categoryServices.map(service => (
                                 <ServiceCard key={service.id} item={service} mode={networkMode} isEditing={isEditing} titleColor={config.cardTitleColor} descColor={config.cardDescColor} onEdit={openServiceModal} onDelete={handleDeleteService} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDropOnCard} />
                              ))}
                           </div>
                        </div>
                     ))}
                     {services.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500/70">
                           <div className="p-6 bg-white/30 backdrop-blur-lg rounded-full mb-4 border border-white/20"><Box size={48} strokeWidth={1.5} /></div>
                           <p className="text-lg font-medium bg-white/30 backdrop-blur-md px-4 py-1 rounded-full">暂无服务，请点击右上角 + 添加</p>
                        </div>
                     )}
                  </div>
               </main>

               <div className={`fixed bottom-8 right-8 z-50 transition-all duration-300 transform ${showScrollTop ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
                  <button onClick={scrollToTop} className="p-3 rounded-full bg-white/30 backdrop-blur-xl border border-white/40 shadow-lg hover:bg-white/50 transition-all text-white active:scale-90">
                     <ArrowUp size={24} strokeWidth={2.5} />
                  </button>
               </div>

               <Modal isOpen={isServiceModalOpen} onClose={() => setIsServiceModalOpen(false)} title={editingService ? '编辑服务' : '添加服务'} maxWidth="max-w-[600px]">
                  {/* ... Service Form ... */}
                  <form onSubmit={handleSaveService} className="space-y-5">
                     <div className="grid grid-cols-4 items-center gap-4">
                        <label className="text-right text-[13px] font-medium text-gray-500">名称</label>
                        <div className="col-span-3"><input name="name" defaultValue={editingService?.name} required className="w-full bg-gray-50 border border-gray-200 rounded-[8px] px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" /></div>
                     </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <label className="text-right text-[13px] font-medium text-gray-500">描述</label>
                        <div className="col-span-3"><input name="description" defaultValue={editingService?.description} className="w-full bg-gray-50 border border-gray-200 rounded-[8px] px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" /></div>
                     </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <label className="text-right text-[13px] font-medium text-gray-500">分类</label>
                        <div className="col-span-3 relative">
                           <input name="category" defaultValue={editingService?.category || ''} placeholder="如：NAS, 开发, 娱乐..." list="category-suggestions" className="w-full bg-gray-50 border border-gray-200 rounded-[8px] px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                           <datalist id="category-suggestions">{categories.map(c => <option key={c} value={c} />)}</datalist>
                        </div>
                     </div>
                     <div className="border-t border-gray-100 pt-4">
                        <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-4">链接配置</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4 mb-3">
                           <label className="text-left md:text-right text-[13px] font-medium text-gray-500">内网地址</label>
                           <div className="md:col-span-3"><input name="urlInternal" defaultValue={editingService?.urlInternal} placeholder="http://192.168.x.x（可选）" className="w-full bg-gray-50 border border-gray-200 rounded-[8px] px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono" /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4">
                           <label className="text-left md:text-right text-[13px] font-medium text-gray-500">外网地址</label>
                           <div className="md:col-span-3"><input name="urlExternal" defaultValue={editingService?.urlExternal} required placeholder="https://example.com（必填）" className="w-full bg-gray-50 border border-gray-200 rounded-[8px] px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono" /></div>
                        </div>
                     </div>
                     <div className="border-t border-gray-100 pt-4">
                        <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-4">图标配置</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                           <div className="flex flex-row md:flex-col items-center md:items-end gap-4 md:gap-2">
                              <label className="text-[13px] font-medium text-gray-500">预览</label>
                              <div className="w-16 h-16 rounded-[16px] bg-white border border-gray-200 flex items-center justify-center p-2 shadow-sm overflow-hidden">
                                 {iconPreview ? <img src={iconPreview} alt="Preview" className="w-full h-full object-contain" /> : <ImageIcon className="text-gray-300" />}
                              </div>
                           </div>
                           <div className="md:col-span-3 space-y-4">
                              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                 <label className="text-[12px] font-semibold text-blue-700 block mb-2">自动获取网站图标</label>
                                 <div className="flex gap-2">
                                    <input type="text" value={fetchUrlInput} onChange={(e) => setFetchUrlInput(e.target.value)} placeholder="输入网址" className="flex-1 bg-white border border-blue-200 rounded-[6px] px-2 py-1.5 text-[13px] focus:outline-none focus:border-blue-400" />
                                    <button type="button" onClick={() => fetchWebsiteIcons(fetchUrlInput)} disabled={isFetchingIcons || !fetchUrlInput} className="bg-blue-500 hover:bg-blue-600 text-white text-[13px] px-3 py-1.5 rounded-[6px] transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap shrink-0">{isFetchingIcons ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} 获取</button>
                                 </div>
                                 {fetchedIcons.length > 0 && (
                                    <div className="mt-3 grid grid-cols-6 gap-2">
                                       {fetchedIcons.map((url, idx) => (
                                          <button key={idx} type="button" onClick={async () => {
                                             // Download and save the icon to local server
                                             const localUrl = await addAsset(url, 'icon');
                                             if (localUrl) {
                                                setIconPreview(localUrl);
                                             }
                                          }} className={`aspect-square rounded-md border p-1 bg-white hover:border-blue-500 transition-all flex items-center justify-center overflow-hidden ${iconPreview === url ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'}`}>
                                             <img
                                                src={url}
                                                alt=""
                                                className="w-full h-full object-contain"
                                                onError={(e) => {
                                                   const target = e.currentTarget;
                                                   if (!target.src.includes('/api/proxy-image')) {
                                                      target.src = `${API_BASE}/proxy-image?url=${encodeURIComponent(url)}`;
                                                   }
                                                }}
                                             />
                                          </button>
                                       ))}
                                    </div>
                                 )}
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                 <div><label className="block text-[12px] text-gray-500 mb-1">图片链接</label><input name="iconUrl" placeholder="https://..." value={iconPreview.startsWith('data:') ? '' : iconPreview} onChange={(e) => setIconPreview(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-[8px] px-2 py-1.5 text-[13px] focus:outline-none focus:border-blue-500" /></div>
                                 <div><label className="block text-[12px] text-gray-500 mb-1">本地上传</label><label className="flex items-center justify-center gap-2 w-full bg-white border border-dashed border-gray-300 rounded-[8px] px-2 py-1.5 cursor-pointer hover:bg-gray-50 transition-colors"><Upload size={14} className="text-gray-400" /><span className="text-[13px] text-gray-600">选择图片</span><input type="file" accept="image/*" onChange={handleIconUpload} className="hidden" /></label></div>
                              </div>

                              {/* Asset Library for Icons */}
                              {iconAssets.length > 0 && (
                                 <div className="mt-2">
                                    <label className="block text-[12px] text-gray-500 mb-2">从图库选择</label>
                                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                       {iconAssets.map(asset => (
                                          <button key={asset.id} type="button" onClick={() => setIconPreview(asset.data)} className="w-10 h-10 flex-shrink-0 bg-white border border-gray-200 rounded-md p-1 hover:border-blue-500 transition-all overflow-hidden">
                                             <img src={asset.data} alt="icon" className="w-full h-full object-contain" />
                                          </button>
                                       ))}
                                    </div>
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>
                     <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onClick={() => setIsServiceModalOpen(false)} className="px-4 py-2 text-[14px] font-medium text-gray-600 hover:bg-gray-100 rounded-[8px] transition-colors">取消</button>
                        <button type="submit" className="px-6 py-2 text-[14px] font-medium text-white bg-[#007AFF] hover:bg-[#0062CC] rounded-[8px] shadow-sm transition-colors">保存</button>
                     </div>
                  </form>

               </Modal>

               {/* Delete Confirmation Modal */}
               <Modal
                  isOpen={!!serviceToDelete}
                  onClose={cancelDeleteService}
                  title="确认删除"
                  maxWidth="max-w-[400px]"
               >
                  <div className="space-y-4">
                     <p className="text-[14px] text-gray-600">确定删除此服务？此操作无法撤销。</p>
                     <div className="flex justify-end gap-3 pt-2">
                        <button
                           onClick={cancelDeleteService}
                           className="px-4 py-2 text-[14px] font-medium text-gray-600 hover:bg-gray-100 rounded-[8px] transition-colors"
                        >
                           取消
                        </button>
                        <button
                           onClick={confirmDeleteService}
                           className="px-4 py-2 text-[14px] font-medium text-white bg-red-500 hover:bg-red-600 rounded-[8px] shadow-sm transition-colors"
                        >
                           删除
                        </button>
                     </div>
                  </div>
               </Modal>

               {/* Password Change Modal */}
               <Modal
                  isOpen={showPasswordModal}
                  onClose={() => {
                     setShowPasswordModal(false);
                     setOldPassword('');
                     setNewPassword('');
                     setConfirmPassword('');
                     setPasswordError('');
                     setPasswordSuccess('');
                  }}
                  title="修改密码"
                  maxWidth="max-w-[450px]"
                  zIndex={200}
               >
                  <form onSubmit={handleChangePassword} className="space-y-4">
                     <div>
                        <label className="block text-[13px] font-medium text-gray-700 mb-2">旧密码</label>
                        <input
                           type="password"
                           value={oldPassword}
                           onChange={(e) => setOldPassword(e.target.value)}
                           className="w-full bg-gray-50 border border-gray-200 rounded-[8px] px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                           placeholder="请输入旧密码"
                           required
                        />
                     </div>
                     <div>
                        <label className="block text-[13px] font-medium text-gray-700 mb-2">新密码</label>
                        <input
                           type="password"
                           value={newPassword}
                           onChange={(e) => setNewPassword(e.target.value)}
                           className="w-full bg-gray-50 border border-gray-200 rounded-[8px] px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                           placeholder="请输入新密码（至少4位）"
                           required
                        />
                     </div>
                     <div>
                        <label className="block text-[13px] font-medium text-gray-700 mb-2">确认新密码</label>
                        <input
                           type="password"
                           value={confirmPassword}
                           onChange={(e) => setConfirmPassword(e.target.value)}
                           className="w-full bg-gray-50 border border-gray-200 rounded-[8px] px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                           placeholder="再次输入新密码"
                           required
                        />
                     </div>

                     {passwordError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-[8px] text-[13px]">
                           {passwordError}
                        </div>
                     )}

                     {passwordSuccess && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-[8px] text-[13px] flex items-center gap-2">
                           <Check size={16} />
                           {passwordSuccess}
                        </div>
                     )}

                     <div className="flex justify-end gap-3 pt-2">
                        <button
                           type="button"
                           onClick={() => {
                              setShowPasswordModal(false);
                              setOldPassword('');
                              setNewPassword('');
                              setConfirmPassword('');
                              setPasswordError('');
                              setPasswordSuccess('');
                           }}
                           className="px-4 py-2 text-[14px] font-medium text-gray-600 hover:bg-gray-100 rounded-[8px] transition-colors"
                        >
                           取消
                        </button>
                        <button
                           type="submit"
                           className="px-6 py-2 text-[14px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-[8px] shadow-sm transition-colors"
                        >
                           确认修改
                        </button>
                     </div>
                  </form>
               </Modal>

               {/* --- SPLIT-VIEW SETTINGS MODAL --- */}
               <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="系统设置" maxWidth="max-w-[700px]" noPadding={true}>
                  <div className="flex h-[480px]">
                     {/* Sidebar */}
                     <div className={`${isSidebarCollapsed ? 'w-[60px]' : 'w-[200px]'} bg-[#F5F5F7] border-r border-gray-200 flex flex-col justify-between transition-all duration-300`}>
                        <nav className="space-y-1 p-3">
                           {/* Toggle Button (Mobile Only or Always) */}
                           <button
                              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                              className="w-full flex items-center justify-center p-2 mb-2 text-gray-400 hover:text-gray-600 hover:bg-black/5 rounded-lg transition-colors md:hidden"
                           >
                              {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                           </button>

                           {isGuest ? (
                              <>
                                 <button onClick={() => setSettingsTab('appearance')} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-2.5 px-3'} py-2 rounded-[8px] text-[13px] font-medium transition-all ${settingsTab === 'appearance' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-black/5'}`} title="界面外观">
                                    <Palette size={16} /> {!isSidebarCollapsed && '界面外观'}
                                 </button>
                                 <button onClick={() => setSettingsTab('wallpaper')} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-2.5 px-3'} py-2 rounded-[8px] text-[13px] font-medium transition-all ${settingsTab === 'wallpaper' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-black/5'}`} title="壁纸设置">
                                    <ImageIcon size={16} /> {!isSidebarCollapsed && '壁纸设置'}
                                 </button>
                              </>
                           ) : (
                              <>
                                 {[
                                    { id: 'appearance', label: '界面外观', icon: Palette },
                                    { id: 'wallpaper', label: '壁纸设置', icon: ImageIcon },
                                    { id: 'categories', label: '分类管理', icon: LayoutGrid },
                                    { id: 'assets', label: '素材管理', icon: FolderOpen },
                                    ...(isAdmin ? [{ id: 'users', label: '用户管理', icon: Users }] : []),
                                    { id: 'data', label: '数据管理', icon: Database }
                                 ].map((tab: any) => (
                                    <button
                                       key={tab.id}
                                       onClick={() => setSettingsTab(tab.id)}
                                       className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-2.5 px-3'} py-2 rounded-[8px] text-[13px] font-medium transition-all ${settingsTab === tab.id
                                          ? 'bg-white text-blue-600 shadow-sm'
                                          : 'text-gray-600 hover:bg-black/5'
                                          }`}
                                       title={tab.label}
                                    >
                                       <tab.icon size={16} />
                                       {!isSidebarCollapsed && tab.label}
                                    </button>
                                 ))}
                              </>
                           )}
                        </nav>

                        {/* User Profile Footer - Simplified */}
                        <div className="p-3 border-t border-gray-200/50 bg-[#F5F5F7]">
                           {!isGuest ? (
                              <div className={`bg-white border border-gray-200 rounded-[10px] p-2.5 shadow-sm ${isSidebarCollapsed ? 'flex flex-col items-center gap-2' : ''}`}>
                                 <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'} mb-2.5`}>
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[12px] font-bold shrink-0">
                                       {currentUser.charAt(0).toUpperCase()}
                                    </div>
                                    {!isSidebarCollapsed && (
                                       <div className="min-w-0">
                                          <p className="text-[13px] font-semibold text-gray-900 truncate">{currentUser}</p>
                                          <p className="text-[10px] text-gray-500 truncate">{isAdmin ? '管理员' : '用户'}</p>
                                       </div>
                                    )}
                                 </div>
                                 <button onClick={handleLogout} className={`bg-gray-50 border border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-100 rounded-[6px] text-[11px] transition-all font-medium ${isSidebarCollapsed ? 'w-8 h-8 flex items-center justify-center p-0' : 'w-full px-2 py-1.5'}`} title="退出登录">
                                    {isSidebarCollapsed ? <LogOut size={16} /> : '退出登录'}
                                 </button>
                              </div>
                           ) : (
                              <button onClick={() => setShowLoginModal(true)} className={`w-full bg-blue-500 hover:bg-blue-600 text-white text-[12px] font-medium py-2 rounded-[8px] shadow-sm transition-colors flex items-center justify-center ${isSidebarCollapsed ? '' : 'gap-2'}`}>
                                 <UserCircle size={14} /> {!isSidebarCollapsed && '登录管理员'}
                              </button>
                           )}
                        </div>
                     </div>

                     {/* Content Area */}
                     <div className="flex-1 overflow-y-auto bg-white p-6">

                        {/* TAB: APPEARANCE */}
                        {settingsTab === 'appearance' && (
                           <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                              <h3 className="text-[16px] font-bold text-gray-900 mb-4">界面外观</h3>
                              <div className="space-y-5">
                                 <div>
                                    <div className="flex justify-between items-center mb-2">
                                       <label className="text-[13px] font-medium text-gray-700">背景模糊</label>
                                       <span className="text-[12px] text-gray-500">{config.backgroundBlur}px</span>
                                    </div>
                                    <input type="range" min="0" max="50" value={config.backgroundBlur} onChange={(e) => saveConfig({ ...config, backgroundBlur: Number(e.target.value) })} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                                 </div>
                                 <div>
                                    <div className="flex justify-between items-center mb-2">
                                       <label className="text-[13px] font-medium text-gray-700">卡片最小宽度</label>
                                       <span className="text-[12px] text-gray-500">{config.cardMinWidth || 180}px</span>
                                    </div>
                                    <input type="range" min="140" max="210" step="5" value={config.cardMinWidth || 180} onChange={(e) => saveConfig({ ...config, cardMinWidth: Number(e.target.value) })} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                                    <div className="flex justify-between text-[10px] text-gray-400 mt-1"><span>140px</span><span>210px</span></div>
                                 </div>
                                 <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div><label className="text-[12px] font-medium text-gray-500 mb-1.5 block">分类颜色</label><div className="flex items-center gap-2"><input type="color" value={config.categoryColor} onChange={(e) => saveConfig({ ...config, categoryColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0" /></div></div>
                                    <div><label className="text-[12px] font-medium text-gray-500 mb-1.5 block">卡片标题颜色</label><div className="flex items-center gap-2"><input type="color" value={config.cardTitleColor} onChange={(e) => saveConfig({ ...config, cardTitleColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0" /></div></div>
                                    <div><label className="text-[12px] font-medium text-gray-500 mb-1.5 block">卡片描述颜色</label><div className="flex items-center gap-2"><input type="color" value={config.cardDescColor || '#4b5563'} onChange={(e) => saveConfig({ ...config, cardDescColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0" /></div></div>
                                    <div><label className="text-[12px] font-medium text-gray-500 mb-1.5 block">时钟颜色</label><div className="flex items-center gap-2"><input type="color" value={config.clockColor || '#ffffff'} onChange={(e) => saveConfig({ ...config, clockColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0" /></div></div>
                                    <div><label className="text-[12px] font-medium text-gray-500 mb-1.5 block">标题颜色 (NexusHub)</label><div className="flex items-center gap-2"><input type="color" value={config.headerTitleColor || '#1f2937'} onChange={(e) => saveConfig({ ...config, headerTitleColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0" /></div></div>
                                    <div><label className="text-[12px] font-medium text-gray-500 mb-1.5 block">问候语颜色</label><div className="flex items-center gap-2"><input type="color" value={config.headerGreetingColor || '#1f2937'} onChange={(e) => saveConfig({ ...config, headerGreetingColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0" /></div></div>
                                 </div>
                              </div>
                           </div>
                        )}

                        {/* TAB: WALLPAPER */}
                        {settingsTab === 'wallpaper' && (
                           <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                              <h3 className="text-[16px] font-bold text-gray-900 mb-4">壁纸设置</h3>
                              <div className="space-y-6">
                                 <div>
                                    <label className="text-[13px] font-medium text-gray-700 mb-2 block">壁纸链接 (失去焦点自动保存到图库)</label>
                                    <input
                                       value={config.backgroundImageUrl}
                                       onChange={(e) => saveConfig({ ...config, backgroundImageUrl: e.target.value })}
                                       onBlur={handleRemoteWallpaperBlur}
                                       className="w-full bg-gray-50 border border-gray-200 rounded-[8px] px-3 py-2 text-[14px] focus:outline-none focus:border-blue-500"
                                       placeholder="http://..."
                                    />
                                 </div>
                                 <div>
                                    <label className="text-[13px] font-medium text-gray-700 mb-2 block">本地上传 (自动保存到素材库)</label>
                                    <label className="flex flex-col items-center justify-center gap-2 w-full h-32 bg-gray-50 border-2 border-dashed border-gray-300 rounded-[12px] cursor-pointer hover:bg-gray-100 transition-colors">
                                       <Upload size={24} className="text-gray-400" />
                                       <span className="text-[13px] text-gray-600">点击选择图片</span>
                                       <input type="file" accept="image/*" onChange={handleWallpaperUpload} className="hidden" />
                                    </label>
                                 </div>
                                 {wallpaperAssets.length > 0 && (
                                    <div>
                                       <label className="text-[13px] font-medium text-gray-700 mb-2 block">从壁纸库选择</label>
                                       <div className="grid grid-cols-3 gap-3">
                                          {wallpaperAssets.map(asset => (
                                             <button
                                                key={asset.id}
                                                onClick={() => saveConfig({ ...config, backgroundImageUrl: asset.data })}
                                                className={`aspect-video rounded-[8px] overflow-hidden border-2 transition-all ${config.backgroundImageUrl === asset.data ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-400'}`}
                                             >
                                                <img src={asset.data} alt="wallpaper" className="w-full h-full object-cover" />
                                             </button>
                                          ))}
                                       </div>
                                    </div>
                                 )}
                              </div>
                           </div>
                        )}

                        {/* TAB: CATEGORIES */}
                        {settingsTab === 'categories' && (
                           <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                              <h3 className="text-[16px] font-bold text-gray-900 mb-4">分类管理</h3>
                              <p className="text-[13px] text-gray-600 mb-4">拖拽分类以调整显示顺序</p>

                              {categories.length === 0 ? (
                                 <p className="text-[12px] text-gray-400 italic">暂无分类,添加服务时会自动创建分类。</p>
                              ) : (
                                 <div className="space-y-2">
                                    {categories.map((category, index) => (
                                       <div
                                          key={category}
                                          draggable
                                          onDragStart={() => setDraggedCategoryIndex(index)}
                                          onDragOver={(e) => e.preventDefault()}
                                          onDrop={() => {
                                             if (draggedCategoryIndex !== null && draggedCategoryIndex !== index) {
                                                const newOrder = [...categories];
                                                const [removed] = newOrder.splice(draggedCategoryIndex, 1);
                                                newOrder.splice(index, 0, removed);
                                                saveConfig({ ...config, categoryOrder: newOrder });
                                                setDraggedCategoryIndex(null);
                                             }
                                          }}
                                          onDragEnd={() => setDraggedCategoryIndex(null)}
                                          className={`flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-[8px] cursor-move hover:border-blue-300 hover:shadow-sm transition-all ${draggedCategoryIndex === index ? 'opacity-50' : ''
                                             }`}
                                       >
                                          <LayoutGrid size={18} className="text-gray-400" />
                                          <span className="flex-1 text-[14px] font-medium text-gray-900">{category}</span>
                                          <span className="text-[12px] text-gray-500">
                                             {servicesByCategory[category]?.length || 0} 个服务
                                          </span>
                                       </div>
                                    ))}
                                 </div>
                              )}
                           </div>
                        )}

                        {/* TAB: ASSETS */}
                        {settingsTab === 'assets' && (
                           <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                              <h3 className="text-[16px] font-bold text-gray-900 mb-4">素材管理</h3>

                              {/* Icons Section */}
                              <div className="space-y-3">
                                 <h4 className="text-[13px] font-semibold text-gray-800">已存图标 ({iconAssets.length})</h4>
                                 {iconAssets.length === 0 ? (
                                    <p className="text-[12px] text-gray-400 italic">暂无本地图标，上传或在线获取图标时会自动保存。</p>
                                 ) : (
                                    <div className="grid grid-cols-6 sm:grid-cols-8 gap-3">
                                       {iconAssets.map(asset => (
                                          <div key={asset.id} className="group relative aspect-square bg-white border border-gray-200 rounded-[8px] flex items-center justify-center p-2">
                                             <img src={asset.data} alt="icon" className="w-full h-full object-contain" />
                                             <button
                                                onClick={() => deleteAsset(asset.id)}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                             >
                                                <X size={10} />
                                             </button>
                                          </div>
                                       ))}
                                    </div>
                                 )}
                              </div>

                              <div className="h-px bg-gray-100 my-4"></div>

                              {/* Wallpapers Section */}
                              <div className="space-y-3">
                                 <h4 className="text-[13px] font-semibold text-gray-800">已存壁纸 ({wallpaperAssets.length})</h4>
                                 {wallpaperAssets.length === 0 ? (
                                    <p className="text-[12px] text-gray-400 italic">暂无本地壁纸，上传壁纸时会自动保存。</p>
                                 ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                       {wallpaperAssets.map(asset => (
                                          <div key={asset.id} className="group relative aspect-video bg-gray-100 border border-gray-200 rounded-[8px] overflow-hidden">
                                             <img src={asset.data} alt="wallpaper" className="w-full h-full object-cover" />
                                             <button
                                                onClick={() => deleteAsset(asset.id)}
                                                className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm backdrop-blur-sm"
                                             >
                                                <Trash2 size={14} />
                                             </button>
                                          </div>
                                       ))}
                                    </div>
                                 )}
                              </div>
                           </div>
                        )}

                        {/* TAB: USERS (Admin Only) */}
                        {settingsTab === 'users' && isAdmin && !isGuest && (
                           <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300 h-full flex flex-col">
                              <div className="flex justify-between items-center mb-4">
                                 <h3 className="text-[16px] font-bold text-gray-900">用户管理</h3>
                              </div>

                              {/* Password Change Section */}
                              <div className="mb-4 bg-blue-50 p-4 rounded-[12px] border border-blue-200">
                                 <div className="flex items-center justify-between">
                                    <div>
                                       <h4 className="text-[13px] font-semibold text-blue-900">账户安全</h4>
                                       <p className="text-[11px] text-blue-700">修改当前账户的登录密码</p>
                                    </div>
                                    <button
                                       onClick={() => setShowPasswordModal(true)}
                                       className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-[8px] text-[12px] font-medium transition-colors shadow-sm flex items-center gap-2"
                                    >
                                       <Shield size={14} />
                                       修改密码
                                    </button>
                                 </div>
                              </div>

                              <div className="mb-4 bg-gray-50 p-4 rounded-[12px] border border-gray-200 flex items-center justify-between">
                                 <div>
                                    <h4 className="text-[13px] font-semibold text-gray-900">免登录访问</h4>
                                    <p className="text-[11px] text-gray-500">启用后，访客可直接查看导航页面（只读）</p>
                                 </div>
                                 <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={config.enableGuestAccess || false} onChange={(e) => saveConfig({ ...config, enableGuestAccess: e.target.checked })} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                 </label>
                              </div>

                              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                 {config.users?.map((u) => (
                                    <div key={u.username} className="flex items-center justify-between bg-white border border-gray-100 p-3 rounded-[10px] hover:shadow-sm transition-shadow">
                                       <div className="flex items-center gap-3">
                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold ${u.username === currentUser ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                             {u.username.charAt(0).toUpperCase()}
                                          </div>
                                          <div className="flex flex-col">
                                             <span className="text-[14px] font-medium text-gray-900">{u.username}</span>
                                             <span className="text-[11px] text-gray-500">{u.username === currentUser ? '当前登录' : (config.users[0]?.username === u.username ? '管理员' : '普通用户')}</span>
                                          </div>
                                       </div>
                                       {/* Admin can see delete option for other users, but "Add User" is removed as requested */}
                                       {u.username !== currentUser && (
                                          <button type="button" onClick={(e) => handleDeleteUser(e, u.username)} className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded hover:bg-red-50 relative z-10" title="删除用户"><Trash2 size={16} /></button>
                                       )}
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}

                        {/* TAB: DATA */}
                        {settingsTab === 'data' && !isGuest && (
                           <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                              <h3 className="text-[16px] font-bold text-gray-900 mb-4">数据管理</h3>
                              <div className="grid grid-cols-1 gap-4">
                                 <div className="p-4 border border-gray-200 rounded-[12px] bg-gray-50/50">
                                    <h4 className="text-[13px] font-semibold text-gray-800 mb-2">导出配置</h4>
                                    <p className="text-[12px] text-gray-500 mb-4">下载包含所有服务、设置和素材库的 JSON 文件。</p>
                                    <button onClick={() => {
                                       const dataStr = JSON.stringify({ config, services, assets }, null, 2);
                                       const blob = new Blob([dataStr], { type: 'application/json' });
                                       const url = URL.createObjectURL(blob);
                                       const a = document.createElement('a');
                                       a.href = url;
                                       a.download = `nexus_backup_${new Date().toISOString().slice(0, 10)}.json`;
                                       a.click();
                                    }} className="w-full bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-[8px] text-[13px] font-medium hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm">
                                       <Download size={14} className="inline mr-2" /> 下载备份
                                    </button>
                                 </div>

                                 <div className="p-4 border border-gray-200 rounded-[12px] bg-gray-50/50">
                                    <h4 className="text-[13px] font-semibold text-gray-800 mb-2">导入配置</h4>
                                    <p className="text-[12px] text-gray-500 mb-4">从 JSON 文件恢复服务、设置和素材库。</p>
                                    <label className="w-full flex items-center justify-center bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-[8px] text-[13px] font-medium hover:bg-gray-50 hover:border-gray-400 transition-all text-center cursor-pointer shadow-sm">
                                       <Upload size={14} className="inline mr-2" /> 选择备份文件
                                       <input type="file" className="hidden" accept=".json" onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                             const reader = new FileReader();
                                             reader.onload = (ev) => {
                                                try {
                                                   const data = JSON.parse(ev.target?.result as string);
                                                   if (data.config) saveConfig(data.config);
                                                   if (data.services) saveServices(data.services);
                                                   if (data.assets) saveAssets(data.assets);
                                                   alert('导入成功！');
                                                   setIsSettingsModalOpen(false);
                                                } catch (err) { alert('配置文件格式错误'); }
                                             };
                                             reader.readAsText(file);
                                          }
                                       }} />
                                    </label>
                                 </div>
                              </div>
                           </div>
                        )}
                     </div>
                  </div>
               </Modal>

               {/* Asset Deletion Confirmation Modal */}
               {!!assetToDelete && (
                  <Modal isOpen={true} onClose={cancelDeleteAsset} title="确认删除" maxWidth="max-w-[400px]">
                     <div className="space-y-4">
                        <p className="text-[14px] text-gray-600">确定要删除这个素材吗?此操作不可撤销</p>
                        <div className="flex gap-3 justify-end">
                           <button
                              onClick={cancelDeleteAsset}
                              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[8px] text-[13px] font-medium transition-colors"
                           >
                              取消
                           </button>
                           <button
                              onClick={confirmDeleteAsset}
                              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-[8px] text-[13px] font-medium transition-colors"
                           >
                              删除
                           </button>
                        </div>
                     </div>
                  </Modal>
               )}
            </div >
         )
         }
      </div >
   );
}

export default App;
