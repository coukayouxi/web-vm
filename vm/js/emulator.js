class ManualISOVM {
    constructor() {
        this.emulator = null;
        this.isRunning = false;
        this.isoFile = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkStoredISO();
        this.updateSystemInfo();
    }

    setupEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('stopBtn').addEventListener('click', () => this.stop());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('fullscreenBtn').addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('uploadBtn').addEventListener('click', () => this.openISOUpload());
        
        // 模态框文件上传
        document.getElementById('modalIsoFile').addEventListener('change', (e) => {
            if (e.target.files.length) {
                this.handleModalFileSelect(e.target.files[0]);
            }
        });
    }

    checkStoredISO() {
        const storedName = localStorage.getItem('vm_iso_name');
        const storedSize = localStorage.getItem('vm_iso_size');
        
        if (storedName && storedSize) {
            document.getElementById('iso-info').textContent = storedName;
            document.getElementById('cdrom-info').textContent = '已就绪';
        }
    }

    openISOUpload() {
        document.getElementById('iso-upload-modal').style.display = 'flex';
    }

    handleModalFileSelect(file) {
        if (!file.name.toLowerCase().endsWith('.iso')) {
            alert('请选择 ISO 格式的文件！');
            return;
        }

        if (file.size > 500 * 1024 * 1024) {
            alert('文件大小超过 500MB 限制！');
            return;
        }

        this.isoFile = file;
        this.displayModalFileInfo(file);
    }

    displayModalFileInfo(file) {
        document.getElementById('modalFileName').textContent = file.name;
        document.getElementById('modalFileSize').textContent = this.formatFileSize(file.size);
        document.getElementById('modalFileInfo').style.display = 'block';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    confirmISOUpload() {
        if (this.isoFile) {
            // 保存文件信息
            localStorage.setItem('vm_iso_name', this.isoFile.name);
            localStorage.setItem('vm_iso_size', this.isoFile.size.toString());
            
            document.getElementById('iso-info').textContent = this.isoFile.name;
            document.getElementById('cdrom-info').textContent = '已就绪';
            
            this.closeModal('iso-upload-modal');
            alert('ISO 文件已准备就绪，可以启动虚拟机了！');
        }
    }

    async start() {
        if (this.isRunning) {
            this.updateStatus('虚拟机已在运行');
            return;
        }

        // 检查是否有 ISO 文件
        const storedName = localStorage.getItem('vm_iso_name');
        if (!storedName) {
            alert('请先上传 ISO 文件！');
            this.openISOUpload();
            return;
        }

        this.showLoading(true);
        this.updateLoadingText('正在初始化虚拟机环境...');
        this.updateProgress(5);

        try {
            await this.ensureV86Loaded();
            
            this.updateLoadingText('正在创建虚拟机实例...');
            this.updateProgress(15);

            const screenContainer = document.getElementById('vm-screen');
            
            // 创建虚拟机配置
            const config = {
                screen_container: screenContainer,
                bios: {
                    url: "https://cdn.jsdelivr.net/npm/v86@0.2.0/images/bios/seabios.bin"
                },
                vga_bios: {
                    url: "https://cdn.jsdelivr.net/npm/v86@0.2.0/images/bios/vgabios.bin"
                },
                memory_size: 128 * 1024 * 1024,
                vga_memory_size: 8 * 1024 * 1024,
                boot_order: 0x213,
                network_relay_url: "wss://relay.widgetry.org/"
            };

            // 如果有本地 ISO 文件，使用它
            if (this.isoFile) {
                config.cdrom = {
                    file: this.isoFile
                };
            } else {
                // 使用默认的小型 Linux ISO 进行演示
                config.cdrom = {
                    url: "https://cdn.jsdelivr.net/npm/v86@0.2.0/images/linux.iso"
                };
            }

            this.emulator = new V86Starter(config);
            this.setupEmulatorListeners();
            this.updateProgress(30);

        } catch (error) {
            console.error("启动虚拟机失败:", error);
            this.updateStatus("启动失败: " + error.message);
            this.showLoading(false);
        }
    }

    ensureV86Loaded() {
        return new Promise((resolve, reject) => {
            if (typeof V86Starter !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/v86@0.2.0/build/libv86.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    setupEmulatorListeners() {
        this.emulator.add_listener("download-progress", (e) => {
            const progress = Math.round(e.loaded / e.total * 100);
            this.updateProgress(Math.max(30, progress * 0.7 + 30));
            this.updateLoadingText(`正在加载系统文件... ${progress}%`);
            this.updateLoadingDetails(`已下载: ${(e.loaded / 1024 / 1024).toFixed(2)}MB / ${(e.total / 1024 / 1024).toFixed(2)}MB`);
        });

        this.emulator.add_listener("emulator-ready", () => {
            this.updateProgress(90);
            this.updateLoadingText('虚拟机准备就绪，正在启动...');
        });

        this.emulator.add_listener("emulator-started", () => {
            this.updateProgress(100);
            this.updateLoadingText('虚拟机启动完成！');
            this.isRunning = true;
            setTimeout(() => {
                this.showLoading(false);
                this.updateStatus('虚拟机运行中');
                this.updateVMStatus('运行中');
                this.startPerformanceMonitor();
            }, 1000);
        });

        this.emulator.add_listener("download-error", (e) => {
            console.error("下载错误:", e);
            this.updateStatus("系统文件下载失败，请检查网络连接");
            this.showLoading(false);
        });
    }

    stop() {
        if (this.emulator && this.isRunning) {
            this.emulator.stop();
            this.isRunning = false;
            this.updateStatus('虚拟机已停止');
            this.updateVMStatus('已停止');
        }
    }

    reset() {
        if (this.emulator) {
            this.emulator.restart();
            this.updateStatus('虚拟机已重启');
            this.updateVMStatus('重启中');
        }
    }

    toggleFullscreen() {
        const screen = document.getElementById('vm-screen');
        if (screen.requestFullscreen) {
            screen.requestFullscreen();
        } else if (screen.webkitRequestFullscreen) {
            screen.webkitRequestFullscreen();
        } else if (screen.msRequestFullscreen) {
            screen.msRequestFullscreen();
        }
    }

    startPerformanceMonitor() {
        if (!this.emulator) return;

        setInterval(() => {
            if (this.isRunning) {
                // 模拟性能数据
                const cpu = Math.floor(Math.random() * 40) + 10;
                document.getElementById('cpu-usage').textContent = cpu + '%';
                document.getElementById('memory-info').textContent = '64MB/128MB';
                document.getElementById('network-status').textContent = '已连接';
            }
        }, 2000);
    }

    mountISO() {
        this.openISOUpload();
    }

    createVirtualDisk() {
        alert('创建虚拟硬盘功能已触发！\n\n在真实的环境中，这将创建一个可读写的虚拟硬盘。');
    }

    sendCtrlAltDel() {
        if (this.emulator && this.isRunning) {
            this.emulator.keyboard_send_scancodes([0x1D, 0x38, 0x53, 0xD3, 0xB8, 0x9D]);
            this.updateStatus('已发送 Ctrl+Alt+Del');
        } else {
            alert('请先启动虚拟机');
        }
    }

    takeScreenshot() {
        if (this.emulator && this.isRunning) {
            alert('截图功能已触发！\n\n在真实的环境中，这将保存当前屏幕截图。');
        } else {
            alert('请先启动虚拟机');
        }
    }

    saveState() {
        if (this.emulator && this.isRunning) {
            alert('保存状态功能已触发！\n\n在真实的环境中，这将保存当前虚拟机状态。');
        } else {
            alert('请先启动虚拟机');
        }
    }

    loadState() {
        alert('加载状态功能！\n\n在真实的环境中，这将从保存的状态恢复虚拟机。');
    }

    updateSystemInfo() {
        const storedName = localStorage.getItem('vm_iso_name');
        if (storedName) {
            document.getElementById('iso-info').textContent = storedName;
            document.getElementById('cdrom-info').textContent = '已就绪';
        }
    }

    updateStatus(message) {
        document.getElementById('vm-status').textContent = message;
    }

    updateVMStatus(message) {
        document.getElementById('vm-status').textContent = message;
    }

    updateLoadingText(message) {
        document.getElementById('loading-text').textContent = message;
    }

    updateLoadingDetails(message) {
        document.getElementById('loading-details').textContent = message;
    }

    updateProgress(percent) {
        document.getElementById('progress').style.width = percent + '%';
        document.getElementById('progress-text').textContent = percent + '%';
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (show) {
            loading.style.display = 'flex';
        } else {
            loading.style.display = 'none';
        }
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    window.manualISOVM = new ManualISOVM();
});

// 全局函数
function mountISO() {
    if (window.manualISOVM) {
        window.manualISOVM.mountISO();
    }
}

function createVirtualDisk() {
    if (window.manualISOVM) {
        window.manualISOVM.createVirtualDisk();
    }
}

function sendCtrlAltDel() {
    if (window.manualISOVM) {
        window.manualISOVM.sendCtrlAltDel();
    }
}

function takeScreenshot() {
    if (window.manualISOVM) {
        window.manualISOVM.takeScreenshot();
    }
}

function saveState() {
    if (window.manualISOVM) {
        window.manualISOVM.saveState();
    }
}

function loadState() {
    if (window.manualISOVM) {
        window.manualISOVM.loadState();
    }
}

function closeModal(modalId) {
    if (window.manualISOVM) {
        window.manualISOVM.closeModal(modalId);
    }
}

function confirmISOUpload() {
    if (window.manualISOVM) {
        window.manualISOVM.confirmISOUpload();
    }
}
