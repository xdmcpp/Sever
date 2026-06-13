// ========== 全局状态 ==========
let serverRunning = false;
let serverStarting = false;
let startTime = null;
let runtimeTimer = null;
let startTimer = null;
let selectedFolderName = '';
let selectedFileCount = 0;
let serverBaseUrl = ''; // 工具自身的 URL，从页面加载时获取

// ========== API 工具 ==========
function api(path, options = {}) {
    return fetch(serverBaseUrl + path, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
    }).then(r => r.json());
}

// ========== 页面加载时 ==========
document.addEventListener('DOMContentLoaded', function () {
    // 从当前页面 URL 推断工具的根路径
    serverBaseUrl = window.location.origin + '/';

    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetPage = this.getAttribute('data-page');
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            pages.forEach(page => {
                page.classList.remove('active');
                if (page.id === targetPage) page.classList.add('active');
            });
        });
    });

    // 文件夹选择器
    const folderInput = document.getElementById('folder-input');
    if (folderInput) folderInput.addEventListener('change', handleFolderSelect);

    // 端口输入框 - 限制数字
    const portInput = document.getElementById('port-input');
    if (portInput) {
        portInput.addEventListener('input', function () {
            let val = this.value.replace(/[^\d]/g, '');
            if (val.length > 5) val = val.slice(0, 5);
            const num = parseInt(val);
            if (num > 65535) val = '65535';
            this.value = val;
        });
        portInput.addEventListener('blur', function () {
            if (!this.value || parseInt(this.value) < 1) this.value = '';
        });
    }

    // 初始化状态
    fetchStatus();
});

// ========== 获取服务器状态 ==========
function fetchStatus() {
    api('/api/status').then(data => {
        if (data.running) {
            syncToRunningUI(data);
        } else {
            syncToStoppedUI();
        }
    }).catch(() => {
        // 后端未启动，保持初始状态
    });
}

// ========== 同步 UI 到"运行中"状态 ==========
function syncToRunningUI(data) {
    serverRunning = true;
    serverStarting = false;

    const statusEl = document.getElementById('server-status');
    const dotEl = document.getElementById('status-dot');
    const btn = document.getElementById('start-btn');
    const urlEl = document.getElementById('server-url');
    const openBtn = document.getElementById('open-browser');
    const runtimeEl = document.getElementById('runtime');

    if (statusEl) statusEl.textContent = '运行中';
    if (dotEl) {
        dotEl.className = 'status-dot status-dot-on';
        dotEl.style.animation = '';
    }
    if (urlEl) urlEl.textContent = data.url || `http://localhost:${data.port}`;
    if (openBtn) openBtn.style.display = 'inline-flex';
    if (btn) {
        btn.innerHTML = '<span class="btn-icon">⏹</span><span>停止服务器</span>';
        btn.classList.add('stop');
    }

    startTime = Date.now() - (data.elapsed || 0) * 1000;
    if (runtimeTimer) clearInterval(runtimeTimer);
    runtimeTimer = setInterval(updateRuntime, 1000);
    updateRuntime();
}

// ========== 同步 UI 到"已停止"状态 ==========
function syncToStoppedUI() {
    serverRunning = false;
    serverStarting = false;

    const statusEl = document.getElementById('server-status');
    const dotEl = document.getElementById('status-dot');
    const btn = document.getElementById('start-btn');
    const urlEl = document.getElementById('server-url');
    const runtimeEl = document.getElementById('runtime');
    const openBtn = document.getElementById('open-browser');

    if (statusEl) statusEl.textContent = '未启动';
    if (dotEl) dotEl.className = 'status-dot status-dot-off';
    if (urlEl) urlEl.textContent = '等待启动...';
    if (runtimeEl) runtimeEl.textContent = '--:--:--';
    if (openBtn) openBtn.style.display = 'none';
    if (btn) {
        btn.innerHTML = '<span class="btn-icon">🚀</span><span>启动服务器</span>';
        btn.classList.remove('stop');
    }

    if (runtimeTimer) { clearInterval(runtimeTimer); runtimeTimer = null; }
    startTime = null;
}

// ========== 文件夹选择 ==========
function handleFolderSelect(e) {
    const files = e.target.files;
    if (!files || files.length === 0) {
        showNotification('未选择文件夹', 'error');
        return;
    }

    selectedFileCount = files.length;
    const firstPath = files[0].webkitRelativePath || files[0].name;
    const parts = firstPath.split('/');
    selectedFolderName = parts[0] || '已选择文件夹';

    const display = document.getElementById('folder-display');
    if (display) {
        display.textContent = selectedFolderName;
        display.classList.add('has-folder');
    }

    const fileCountEl = document.getElementById('file-count');
    const fileInfoEl = document.getElementById('file-info');
    if (fileCountEl) fileCountEl.textContent = selectedFileCount;
    if (fileInfoEl) {
        fileInfoEl.style.display = 'flex';
        fileInfoEl.classList.add('has-files');
    }

    showNotification(`已选择「${selectedFolderName}」，共 ${selectedFileCount} 个文件`, 'success');
}

// ========== 端口检测 ==========
function checkPort() {
    const portInput = document.getElementById('port-input');
    const portStatus = document.getElementById('port-status');
    const port = parseInt(portInput.value);

    if (!port || port < 1 || port > 65535) {
        portStatus.className = 'port-status error';
        portStatus.textContent = '⚠ 请输入 1-65535 之间的端口号';
        return;
    }

    portStatus.className = 'port-status';
    portStatus.textContent = '🔍 检测中...';

    api(`/api/check-port/${port}`).then(data => {
        if (data.available) {
            portStatus.className = 'port-status success';
            portStatus.textContent = `✓ 端口 ${port} 可用`;
        } else {
            portStatus.className = 'port-status error';
            portStatus.textContent = `✗ 端口 ${port} 已被占用，建议换一个`;
        }
    }).catch(() => {
        portStatus.className = 'port-status error';
        portStatus.textContent = '⚠ 无法检测端口（后端未启动？）';
    });
}

// ========== 启动/停止 ==========
function toggleServer() {
    if (serverStarting) return;
    if (serverRunning) {
        stopServer();
    } else {
        startServer();
    }
}

function startServer() {
    const portInput = document.getElementById('port-input');
    const port = parseInt(portInput.value);
    if (!port || port < 1 || port > 65535) {
        showNotification('请先设置有效的端口号', 'error');
        return;
    }

    if (selectedFileCount === 0) {
        showNotification('请先选择项目文件夹', 'error');
        return;
    }

    const statusEl = document.getElementById('server-status');
    const dotEl = document.getElementById('status-dot');
    const btn = document.getElementById('start-btn');

    serverStarting = true;
    statusEl.textContent = '启动中...';
    dotEl.className = 'status-dot status-dot-loading';

    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.7';
        btn.style.cursor = 'not-allowed';
    }

    const host = document.getElementById('host-select').value;
    const autoOpen = document.getElementById('auto-open').checked;
    const hotReload = document.getElementById('hot-reload').checked;

    api('/api/start', {
        method: 'POST',
        body: JSON.stringify({
            port,
            host,
            folder: selectedFolderName,
            autoOpen,
            hotReload,
        }),
    }).then(data => {
        serverStarting = false;

        if (data.error) {
            showNotification(data.error, 'error');
            syncToStoppedUI();
            return;
        }

        serverRunning = true;

        if (statusEl) statusEl.textContent = '运行中';
        if (dotEl) dotEl.className = 'status-dot status-dot-on';

        const urlEl = document.getElementById('server-url');
        if (urlEl) urlEl.textContent = data.url;

        const openBtn = document.getElementById('open-browser');
        if (openBtn) openBtn.style.display = 'inline-flex';

        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '';
            btn.style.cursor = '';
            btn.innerHTML = '<span class="btn-icon">⏹</span><span>停止服务器</span>';
            btn.classList.add('stop');
        }

        startTime = Date.now();
        if (runtimeTimer) clearInterval(runtimeTimer);
        runtimeTimer = setInterval(updateRuntime, 1000);
        updateRuntime();

        if (autoOpen) {
            setTimeout(() => { window.open(data.url, '_blank'); }, 500);
        }

        showNotification(`服务器已启动：${data.url}`, 'success');
    }).catch(err => {
        serverStarting = false;
        showNotification('启动失败：' + err.message, 'error');
        syncToStoppedUI();
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '';
            btn.style.cursor = '';
        }
    });
}

function stopServer() {
    api('/api/stop', { method: 'POST' }).then(() => {
        syncToStoppedUI();
        showNotification('服务器已停止', 'info');
    }).catch(() => {
        syncToStoppedUI();
    });
}

// ========== 更新运行时间 ==========
function updateRuntime() {
    if (!startTime) return;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
    const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    const runtimeEl = document.getElementById('runtime');
    if (runtimeEl) runtimeEl.textContent = `${h}:${m}:${s}`;
}

// ========== 打开浏览器 ==========
function openBrowser() {
    const urlEl = document.getElementById('server-url');
    if (urlEl && urlEl.textContent && urlEl.textContent !== '等待启动...') {
        window.open(urlEl.textContent, '_blank');
    }
}

// ========== 重置配置 ==========
function resetConfig() {
    if (serverRunning || serverStarting) stopServer();
    document.getElementById('port-input').value = 3000;
    document.getElementById('host-select').value = 'localhost';
    document.getElementById('auto-open').checked = true;
    document.getElementById('hot-reload').checked = true;
    document.getElementById('show-logs').checked = false;

    const folderDisplay = document.getElementById('folder-display');
    folderDisplay.textContent = '未选择文件夹';
    folderDisplay.classList.remove('has-folder');
    const fileInfo = document.getElementById('file-info');
    if (fileInfo) {
        fileInfo.style.display = 'none';
        fileInfo.classList.remove('has-files');
    }

    selectedFolderName = '';
    selectedFileCount = 0;

    const portStatus = document.getElementById('port-status');
    if (portStatus) {
        portStatus.className = 'port-status';
        portStatus.innerHTML = '<span class="status-hint">点击"检测"查看端口是否可用</span>';
    }

    showNotification('配置已重置', 'info');
}

// ========== 关闭 Node.js 提示横幅 ==========
function closeNodeNotice() {
    const notice = document.getElementById('node-notice');
    if (notice) notice.style.display = 'none';
}

// ========== 跳转到教程页面 ==========
function switchToTutorial() {
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    navLinks.forEach(l => l.classList.remove('active'));
    pages.forEach(p => p.classList.remove('active'));
    document.querySelector('[data-page="tutorial"]').classList.add('active');
    document.getElementById('tutorial').classList.add('active');
}

// ========== FAQ ==========
function toggleFaq(element) {
    const faqItem = element.parentElement;
    faqItem.classList.toggle('active');
}

// ========== 模态框 ==========
let currentModalAction = '';

function showModal(type) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalConfirm = document.getElementById('modal-confirm');

    currentModalAction = type;

    if (type === 'start') {
        modalTitle.textContent = '🚀 启动服务器';
        modalBody.innerHTML = `
            <p>确定要启动本地开发服务器吗？</p>
            <div style="margin-top: 15px; padding: 15px; background: #f8f9ff; border-radius: 10px; font-size: 0.9rem;">
                <p style="margin: 4px 0;">• 端口：${document.getElementById('port-input').value}</p>
                <p style="margin: 4px 0;">• 主机：${document.getElementById('host-select').value}</p>
                <p style="margin: 4px 0;">• 自动打开浏览器：${document.getElementById('auto-open').checked ? '是' : '否'}</p>
                <p style="margin: 4px 0;">• 热更新（自动刷新）：${document.getElementById('hot-reload').checked ? '启用' : '关闭'}</p>
            </div>
        `;
        modalConfirm.style.display = 'inline-block';
    } else if (type === 'folder') {
        modalTitle.textContent = '📁 选择项目文件夹';
        modalBody.innerHTML = '<p>请点击首页的"浏览"按钮选择项目文件夹</p>';
        modalConfirm.style.display = 'none';
    }

    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('active');
}

function confirmModal() {
    if (currentModalAction === 'start') startServer();
    closeModal();
}

// ========== 通知 ==========
function showNotification(message, type) {
    const existing = document.querySelectorAll('.notification');
    existing.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
    notification.innerHTML = `<span style="font-size:1.1rem;">${icon}</span><span>${message}</span>`;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 2800);
}

// ========== 全局事件 ==========
(function initGlobalEvents() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === this) closeModal();
        });
    }
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeModal();
    });
})();
