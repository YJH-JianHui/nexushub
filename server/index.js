import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'nexushub-secret-key-change-this-in-prod';

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        req.user = null; // Mark as unauthenticated
        return next();
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            req.user = null; // Invalid token
        } else {
            req.user = user;
        }
        next();
    });
};

// Require Auth Middleware (for write operations)
const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.sendStatus(401);
    }
    next();
};

// 中间件
app.use(cors());
app.use(express.json());
app.use(authenticateToken); // Apply auth check to all routes (populates req.user)

// 添加MIME类型中间件，确保图片格式正确返回
app.use('/uploads', (req, res, next) => {
    const ext = path.extname(req.path).toLowerCase();
    const mimeTypes = {
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.ico': 'image/x-icon'
    };

    if (mimeTypes[ext]) {
        res.setHeader('Content-Type', mimeTypes[ext]);
    }
    next();
});

// 提供静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use('/vendor', express.static(path.join(__dirname, '../public/vendor')));
app.use(express.static(path.join(__dirname, '../public')));

// 在生产环境下,提供构建后的前端文件
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../dist')));
}

// 确保 uploads 目录存在
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// 配置 multer 存储 - 使用临时文件名
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        // 先用 icon 作为临时前缀
        cb(null, `asset-icon-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB 限制
});

// API: 上传素材 (Protected)
app.post('/api/assets/upload', requireAuth, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { type } = req.body; // 'icon' or 'wallpaper'

        // 重命名文件以包含正确的类型
        const oldPath = path.join(uploadsDir, req.file.filename);
        const newFilename = req.file.filename.replace(/^asset-icon-/, `asset-${type || 'icon'}-`);
        const newPath = path.join(uploadsDir, newFilename);

        fs.renameSync(oldPath, newPath);
        console.log('   Renamed to:', newFilename);

        const asset = {
            id: newFilename.replace(path.extname(newFilename), ''),
            type: type || 'icon',
            url: `/uploads/${newFilename}`,
            filename: newFilename,
            createdAt: Date.now()
        };

        res.json(asset);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// API: 获取素材列表
app.get('/api/assets', (req, res) => {
    try {
        const files = fs.readdirSync(uploadsDir);
        const assets = files
            .filter(file => file.startsWith('asset-'))
            .map(file => {
                const ext = path.extname(file);
                const id = file.replace(ext, '');
                const stats = fs.statSync(path.join(uploadsDir, file));

                // 从文件名中提取类型 (asset-{type}-{timestamp}.ext)
                let type = 'icon'; // 默认
                const match = file.match(/^asset-(icon|wallpaper)-/);
                if (match) {
                    type = match[1];
                }

                return {
                    id,
                    type,
                    url: `/uploads/${file}`,
                    filename: file,
                    createdAt: stats.mtimeMs
                };
            })
            .sort((a, b) => b.createdAt - a.createdAt);

        res.json(assets);
    } catch (error) {
        console.error('List error:', error);
        res.status(500).json({ error: 'Failed to list assets' });
    }
});

// API: 删除素材 (Protected)
app.delete('/api/assets/:filename', requireAuth, (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(uploadsDir, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        fs.unlinkSync(filePath);
        res.json({ success: true, message: 'Asset deleted' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Delete failed' });
    }
});

// --- Icon Fetching & Proxy ---

// Helper: Resolve relative URL
const resolveUrl = (base, relative) => {
    try {
        return new URL(relative, base).href;
    } catch (e) {
        return relative;
    }
};

// API: Fetch Icon Candidates
app.get('/api/fetch-icon-candidates', async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    let targetUrl = url;
    if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'http://' + targetUrl;
    }

    const icons = new Set();
    const errors = [];

    try {
        // 1. Add default /favicon.ico
        const urlObj = new URL(targetUrl);
        const origin = urlObj.origin;
        icons.add(`${origin}/favicon.ico`);

        // 2. Fetch HTML and parse for <link> tags
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(targetUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        clearTimeout(timeout);

        if (response.ok) {
            const html = await response.text();

            // Simple Regex to find link tags
            // Matches <link ... rel="icon" ... href="..." ... > or <link ... href="..." ... rel="icon" ... >
            const linkRegex = /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*>/gi;
            const hrefRegex = /href=["']([^"']+)["']/i;

            const matches = html.match(linkRegex) || [];

            for (const tag of matches) {
                const hrefMatch = tag.match(hrefRegex);
                if (hrefMatch && hrefMatch[1]) {
                    icons.add(resolveUrl(targetUrl, hrefMatch[1]));
                }
            }

            // Also check for apple-touch-icon
            const appleRegex = /<link[^>]+rel=["']apple-touch-icon["'][^>]*>/gi;
            const appleMatches = html.match(appleRegex) || [];
            for (const tag of appleMatches) {
                const hrefMatch = tag.match(hrefRegex);
                if (hrefMatch && hrefMatch[1]) {
                    icons.add(resolveUrl(targetUrl, hrefMatch[1]));
                }
            }
        }
    } catch (error) {
        console.warn('Error fetching page for icons:', error.message);
        errors.push(error.message);
    }

    res.json({
        icons: Array.from(icons),
        errors
    });
});

// API: Proxy Image (to bypass CORS)
app.get('/api/proxy-image', async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).send('URL is required');
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        clearTimeout(timeout);

        if (!response.ok) {
            return res.status(response.status).send('Failed to fetch image');
        }

        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        // Use arrayBuffer directly
        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));

    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).send('Proxy failed');
    }
});

// API: Upload from URL (Protected)
app.post('/api/assets/upload-from-url', requireAuth, async (req, res) => {
    try {
        const { url, type } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        clearTimeout(timeout);

        if (!response.ok) {
            return res.status(400).json({ error: 'Failed to fetch image from URL' });
        }

        const buffer = await response.arrayBuffer();
        const bufferData = Buffer.from(buffer);

        // Determine extension
        let ext = '.png'; // Default
        const contentType = response.headers.get('content-type');
        if (contentType) {
            if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = '.jpg';
            else if (contentType.includes('gif')) ext = '.gif';
            else if (contentType.includes('svg')) ext = '.svg';
            else if (contentType.includes('webp')) ext = '.webp';
            else if (contentType.includes('x-icon') || contentType.includes('vnd.microsoft.icon')) ext = '.ico';
        }

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = `asset-${type || 'icon'}-${uniqueSuffix}${ext}`;
        const filePath = path.join(uploadsDir, filename);

        fs.writeFileSync(filePath, bufferData);

        const asset = {
            id: filename.replace(ext, ''),
            type: type || 'icon',
            url: `/uploads/${filename}`,
            filename: filename,
            createdAt: Date.now()
        };

        res.json(asset);

    } catch (error) {
        console.error('Upload from URL error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// --- Data Persistence (Config & Services) ---
const DATA_FILE = path.join(__dirname, '../data/data.json');
const DATA_DIR = path.dirname(DATA_FILE);

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default Data (Fallback if data.json doesn't exist)
// Note: These should ideally match the frontend defaults, but the frontend will send its defaults on first save if needed.
// However, to support "sync everywhere", the server should be the source of truth.
// We will initialize with a basic structure if empty.
const DEFAULT_DATA = {
    config: {
        users: [],
        enableGuestAccess: false,
        backgroundImageUrl: "/default-wallpaper.jpg",
        backgroundBlur: 16,
        cardMinWidth: 180,
        categoryColor: '#ffffff',
        cardTitleColor: '#ffffff',
        cardDescColor: '#ffffff',
        clockColor: '#ffffff',
        headerTitleColor: '#ffffff',
        headerGreetingColor: '#e6e6e6',
    },
    services: []
};

// Helper to read data
const readData = () => {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            // Initialize with default data if file doesn't exist
            fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
            return DEFAULT_DATA;
        }
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading data file:', error);
        return DEFAULT_DATA;
    }
};

// Helper to write data
const writeData = (data) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing data file:', error);
        return false;
    }
};

// API: Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const data = readData();
    const user = data.config.users.find(u => u.username === username);

    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const crypto = await import('crypto');

    // Helper: Simple Hash (Fallback)
    const simpleHash = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16).padStart(8, '0');
    };

    const hashPassword = (pwd) => {
        return crypto.createHash('sha256').update(pwd).digest('hex');
    };

    // Check if password matches
    let isValid = false;

    if (user.passwordHash && user.passwordHash.length === 64) {
        // SHA-256
        isValid = user.passwordHash === hashPassword(password);
    } else if (user.passwordHash && user.passwordHash.length === 8) {
        // Simple Hash
        isValid = user.passwordHash === simpleHash(password);
    } else {
        // Unknown hash type or no hash
        isValid = false;
    }

    if (isValid) {
        const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, username: user.username });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// API: Get Data (Config & Services) - Protected/Filtered
app.get('/api/data', (req, res) => {
    const data = readData();

    if (req.user) {
        // Authenticated: Return full data
        res.json(data);
    } else {
        // Unauthenticated: Return safe public data only
        const safeConfig = { ...data.config };

        // Remove sensitive info
        delete safeConfig.users; // Don't expose user list/hashes

        // Only return public config settings needed for login screen/background
        const publicConfig = {
            backgroundImageUrl: safeConfig.backgroundImageUrl,
            backgroundBlur: safeConfig.backgroundBlur,
            enableGuestAccess: safeConfig.enableGuestAccess,
            // UI Colors
            categoryColor: safeConfig.categoryColor,
            cardTitleColor: safeConfig.cardTitleColor,
            cardDescColor: safeConfig.cardDescColor,
            clockColor: safeConfig.clockColor,
            headerTitleColor: safeConfig.headerTitleColor,
            headerGreetingColor: safeConfig.headerGreetingColor,
            // Keep users array empty or just a flag if needed, but better to hide it.
            // But frontend checks `config.users.length` to decide if it's first run.
            // We should send a flag "hasUsers" instead of the array.
            hasUsers: data.config.users && data.config.users.length > 0
        };

        res.json({
            config: publicConfig,
            services: [] // Hide services
        });
    }
});

// API: Update Data (Protected - unless first run)
app.post('/api/data', (req, res) => {
    try {
        const currentData = readData();

        // Security Check: Require auth if users exist
        if (currentData.config.users && currentData.config.users.length > 0) {
            if (!req.user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
        }

        const newData = req.body;
        // Basic validation could go here
        if (!newData.config && !newData.services) {
            return res.status(400).json({ error: 'Invalid data structure' });
        }

        const updatedData = {
            ...currentData,
            ...newData
        };

        if (writeData(updatedData)) {
            res.json({ success: true, data: updatedData });
        } else {
            res.status(500).json({ error: 'Failed to save data' });
        }
    } catch (error) {
        console.error('Update data error:', error);
        res.status(500).json({ error: 'Update failed' });
    }
});

// SPA Fallback - 所有非API请求都返回index.html(用于生产环境)
// 使用中间件而不是通配符路由,避免 path-to-regexp 错误
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        // 如果是 API 或静态资源请求,跳过
        if (req.path.startsWith('/api') ||
            req.path.startsWith('/uploads') ||
            req.path.startsWith('/vendor') ||
            req.path.includes('.')) {
            return next();
        }
        // 其他所有请求返回 index.html
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
}

// 启动服务器
app.listen(PORT, () => {
    console.log(`✅ Asset server running on http://localhost:${PORT}`);
    console.log(`📁 Uploads directory: ${uploadsDir}`);
});
