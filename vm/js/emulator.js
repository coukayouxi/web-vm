class WebVMEmulator {
    constructor() {
        this.emulator = null;
        this.isRunning = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('stopBtn').addEventListener('click', () => this.stop());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('fullscreenBtn').addEventListener('click', () => this.toggleFullscreen());
    }

    async start() {
        if (this.isRunning) {
            updateStatus('虚拟机已在运行');
            return;
        }

        showLoading(true);
        updateLoadingText('正在初始化虚拟机...');
        updateProgress(10);

        try {
            const screenContainer = document.getElementById('vm-screen');
            
            this.emulator = new V86Starter({
                screen_container: screenContainer,
                bios: {
                    url: "./bios/seabios.bin"
                },
                vga_bios: {
                    url: "./bios/vgabios.bin"
                },
                cdrom: {
                    url: "./images/linux.iso"
                },
                autostart: true,
                memory_size: 128 * 1024 * 1024,
                vga_memory_size: 8 * 1024 * 1024,
                boot_order: 0x213,
                network_relay_url: "wss://relay.widgetry.org/"
            });

            updateProgress(30);
            updateLoadingText('正在加载 BIOS...');

            this.emulator.add_listener("download-progress", (e) => {
                const progress = Math.round(e.loaded / e.total * 100);
                updateProgress(progress);
                updateLoadingText(`正在加载系统文件... ${progress}%`);
            });

            this.emulator.add_listener("emulator-ready", () => {
                updateProgress(80);
                updateLoadingText('虚拟机准备就绪...');
            });

            this.emulator.add_listener("emulator-started", () => {
                updateProgress(100);
                updateLoadingText('虚拟机启动完成！');
                this.isRunning = true;
                setTimeout(() => {
                    showLoading(false);
                    updateStatus('虚拟机运行中');
                    updateVMStatus('运行中');
                    this.startPerformanceMonitor();
                }, 1000);
            });

            this.emulator.add_listener("download-error", (e) => {
                console.error("下载错误:", e);
                updateStatus("系统文件下载失败");
                showLoading(false);
            });

        } catch (error) {
            console.error("启动虚拟机失败:", error);
            updateStatus("启动失败: " + error.message);
            showLoading(false);
        }
    }

    stop() {
        if (this.emulator && this.isRunning) {
            this.emulator.stop();
            this.isRunning = false;
            updateStatus('虚拟机已停止');
            updateVMStatus('已停止');
        }
    }

    reset() {
        if (this.emulator) {
            this.emulator.restart();
            updateStatus('虚拟机已重启');
            updateVMStatus('重启中');
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
                const cpu = Math.floor(Math.random() * 30) + 10;
                document.getElementById('cpu-usage').textContent = cpu + '%';
                document.getElementById('memory-info').textContent = '64MB/128MB';
                document.getElementById('network-status').textContent = '已连接';
            }
        }, 2000);
    }

    sendCommand(command) {
        if (this.emulator && this.isRunning) {
            // 这里可以通过虚拟机的 API 发送命令
            console.log('发送命令:', command);
        } else {
            alert('请先启动虚拟机');
        }
    }
}

// 全局函数
function updateStatus(message) {
    document.getElementById('status').textContent = message;
}

function updateVMStatus(message) {
    document.getElementById('vm-status').textContent = message;
}

function updateLoadingText(message) {
    document.getElementById('loading-text').textContent = message;
}

function updateProgress(percent) {
    document.getElementById('progress').style.width = percent + '%';
    document.getElementById('progress-text').textContent = percent + '%';
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.style.display = 'flex';
    } else {
        loading.style.display = 'none';
    }
}

function sendCommand(command) {
    if (window.webVM && window.webVM.emulator) {
        window.webVM.sendCommand(command);
    }
}

function testNetwork() {
    sendCommand('ping -c 4 8.8.8.8');
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    window.webVM = new WebVMEmulator();
});
