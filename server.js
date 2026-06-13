const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const url = require('url');

// ==================== 配置 ====================
const UI_PORT = 3001;  // 本工具 UI 的端口
const MIMES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
};

// ==================== 状态 ====================
let devServer = null;
let devServerInfo = {
    running: false,
    port: null,
    folder: null,
    host: 'localhost',
    startTime: null,
};

// ==================== 工具函数 ====================
function sendJSON(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
}

function sendFile(res, filePath, mime) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found');
            return;
        }
        res.writeHead(200, { 'Content-Type': mime });
        res.end(data);
    });
}

function checkPortAvailable(port) {
    return new Promise((resolve) => {
        const net = require('net');
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => {
            server.close();
            resolve(true);
        });
        server.listen(port);
    });
}

function getLocalIP() {
    const nets = require('os').networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '127.0.0.1';
}

function resolveFolder(f) {
    if (!f) return process.cwd();
    // 支持相对路径
    if (!path.isAbsolute(f)) {
        f = path.join(process.cwd(), f);
    }
    return f;
}

// ==================== 请求处理 ====================
function handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // CORS 预检
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
    }

    // API 路由
    if (pathname.startsWith('/api/')) {
        res.setHeader('Access-Control-Allow-Origin', '*');

        // GET /api/status
        if (req.method === 'GET' && pathname === '/api/status') {
            const elapsed = devServerInfo.startTime
                ? Math.floor((Date.now() - devServerInfo.startTime) / 1000)
                : 0;
            sendJSON(res, 200, {
                running: devServerInfo.running,
                port: devServerInfo.port,
                folder: devServerInfo.folder,
                host: devServerInfo.host,
                url: devServerInfo.running
                    ? `http://${devServerInfo.host === '0.0.0.0' ? getLocalIP() : devServerInfo.host}:${devServerInfo.port}`
                    : null,
                elapsed,
            });
            return;
        }

        // GET /api/check-port/:port
        if (req.method === 'GET' && pathname.startsWith('/api/check-port/')) {
            const port = parseInt(pathname.split('/').pop());
            checkPortAvailable(port).then((available) => {
                sendJSON(res, 200, { port, available });
            });
            return;
        }

        // POST /api/start
        if (req.method === 'POST' && pathname === '/api/start') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                let cfg;
                try { cfg = JSON.parse(body); } catch { cfg = {}; }

                const port = parseInt(cfg.port) || 3000;
                const folder = resolveFolder(cfg.folder);
                const host = cfg.host || 'localhost';
                const autoOpen = cfg.autoOpen !== false;
                const hotReload = cfg.hotReload !== false;

                // 检查端口
                checkPortAvailable(port).then((available) => {
                    if (!available) {
                        sendJSON(res, 409, { error: `端口 ${port} 已被占用，请换一个端口后重试` });
                        return;
                    }

                    // 关闭已有服务器
                    if (devServer) {
                        devServer.kill();
                        devServer = null;
                    }

                    devServerInfo = { running: false, port, folder, host, startTime: null };

                    // 启动静态文件服务器
                    const srv = http.createServer((qReq, qRes) => {
                        serveDevFile(qReq, qRes, folder, hotReload);
                    });

                    srv.on('error', (e) => {
                        if (e.code === 'EADDRINUSE') {
                            sendJSON(res, 409, { error: `端口 ${port} 已被占用` });
                        } else {
                            sendJSON(res, 500, { error: e.message });
                        }
                    });

                    srv.listen(port, host === '0.0.0.0' ? '0.0.0.0' : '127.0.0.1', () => {
                        devServer = srv;
                        devServerInfo.running = true;
                        devServerInfo.startTime = Date.now();

                        const displayHost = host === '0.0.0.0' ? getLocalIP() : host;
                        const displayUrl = `http://${displayHost}:${port}`;

                        console.log(`\n✅ 开发服务器已启动: ${displayUrl}`);
                        console.log(`📁 托管文件夹: ${folder}`);
                        console.log(`🔄 热更新: ${hotReload ? '启用' : '关闭'}`);

                        sendJSON(res, 200, {
                            success: true,
                            url: displayUrl,
                            port,
                            host: displayHost,
                            folder,
                        });
                    });
                });
            });
            return;
        }

        // POST /api/stop
        if (req.method === 'POST' && pathname === '/api/stop') {
            if (devServer) {
                devServer.kill();
                devServer = null;
            }
            devServerInfo = { running: false, port: null, folder: null, host: 'localhost', startTime: null };
            console.log('\n⏹ 服务器已停止');
            sendJSON(res, 200, { success: true });
            return;
        }

        // 未知 API
        sendJSON(res, 404, { error: '未知 API' });
        return;
    }

    // 静态文件服务（UI）
    let filePath = req.url === '/' || req.url === ''
        ? path.join(__dirname, 'index.html')
        : path.join(__dirname, req.url);

    // 安全：禁止跳出目录
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = MIMES[ext] || 'application/octet-stream';

    sendFile(res, filePath, mime);
}

// ==================== 开发服务器文件服务 ====================
function serveDevFile(req, res, folder, hotReload) {
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;

    // 安全：禁止跳出目录
    let filePath = path.join(folder, pathname);
    if (!filePath.startsWith(folder)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    // 热更新注入
    if (hotReload && (pathname === '/' || pathname === '/index.html')) {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
                return;
            }
            // 在 </body> 前注入热更新脚本
            const hmrScript = `<script>
(function() {
    var last = 0;
    function check() {
        fetch('/__hmr').then(r => r.json()).then(function(d) {
            if (d.mtime > last) { last = d.mtime; location.reload(); }
        }).catch(function() {});
    }
    setInterval(check, 1500);
})();
<\/script>`;
            if (data.includes('</body>')) {
                data = data.replace('</body>', hmrScript + '</body>');
            }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(data);
        });
        return;
    }

    // 热更新轮询端点
    if (pathname === '/__hmr') {
        fs.stat(filePath === path.join(folder, '/') ? path.join(folder, 'index.html') : filePath, (err, stats) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ mtime: stats ? stats.mtimeMs : 0 }));
        });
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats) {
            // 尝试找 index.html
            const indexPath = path.join(filePath, 'index.html');
            fs.readFile(indexPath, (e, data) => {
                if (e) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('404 Not Found: ' + pathname);
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(data);
            });
            return;
        }

        if (stats.isDirectory()) {
            const indexPath = path.join(filePath, 'index.html');
            fs.readFile(indexPath, (e, data) => {
                if (e) {
                    res.writeHead(403);
                    res.end('Directory listing not allowed');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(data);
            });
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const mime = MIMES[ext] || 'application/octet-stream';
        fs.readFile(filePath, (e, data) => {
            if (e) {
                res.writeHead(500);
                res.end(e.message);
                return;
            }
            res.writeHead(200, { 'Content-Type': mime });
            res.end(data);
        });
    });
}

// ==================== 启动 ====================
const uiHost = '127.0.0.1';
const server = http.createServer(handleRequest);

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`\n❌ 端口 ${UI_PORT} 已被占用！请先关闭占用该端口的程序。`);
        console.error(`   Windows 下可用命令查找: netstat -ano | findstr :${UI_PORT}`);
        process.exit(1);
    }
});

server.listen(UI_PORT, uiHost, () => {
    console.log('\n========================================');
    console.log('  🖥️  一键服务器搭建工具 已启动');
    console.log('========================================');
    console.log(`  本工具地址: http://localhost:${UI_PORT}`);
    console.log(`  本地 IP:     http://${getLocalIP()}:${UI_PORT}`);
    console.log('========================================');
    console.log('  按 Ctrl+C 可停止本工具');
    console.log('========================================\n');
});

// 优雅退出
process.on('SIGINT', () => {
    if (devServer) devServer.kill();
    server.close(() => {
        console.log('\n👋 已退出');
        process.exit(0);
    });
});
