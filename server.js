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

// 启动服务器
app.listen(PORT, () => {
    console.log(`✅ Asset server running on http://localhost:${PORT}`);
    console.log(`📁 Uploads directory: ${uploadsDir}`);
});
