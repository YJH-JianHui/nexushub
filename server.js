import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// 确保 uploads 目录存在
const uploadsDir = path.join(__dirname, 'public/uploads');
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

// API: 上传素材
app.post('/api/assets/upload', upload.single('file'), (req, res) => {
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

// API: 删除素材
app.delete('/api/assets/:filename', (req, res) => {
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

// --- Data Persistence (Config & Services) ---
const DATA_FILE = path.join(__dirname, 'data/data.json');
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
        cardTitleColor: '#1d1d1f',
        cardDescColor: '#4b5563',
        clockColor: '#ffffff',
        headerTitleColor: '#1f2937',
        headerGreetingColor: '#1f2937',
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

// API: Get Data (Config & Services)
app.get('/api/data', (req, res) => {
    const data = readData();
    res.json(data);
});

// API: Update Data
app.post('/api/data', (req, res) => {
    try {
        const newData = req.body;
        // Basic validation could go here
        if (!newData.config && !newData.services) {
            return res.status(400).json({ error: 'Invalid data structure' });
        }

        // Merge with existing data to prevent partial updates from wiping other sections if we wanted,
        // but for this app, we usually save the whole state or specific sections.
        // Let's assume the frontend sends the specific section to update or the whole thing.
        // Actually, to keep it simple and robust:
        // The frontend currently separates saveConfig and saveServices.
        // We should support partial updates or just read-modify-write.

        const currentData = readData();
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

// 启动服务器
app.listen(PORT, () => {
    console.log(`✅ Asset server running on http://localhost:${PORT}`);
    console.log(`📁 Uploads directory: ${uploadsDir}`);
});
