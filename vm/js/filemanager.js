class FileManager {
    constructor() {
        this.currentPath = '/home/user';
        this.selectedItems = [];
        this.clipboard = [];
        this.clipboardAction = null; // 'copy' or 'cut'
        this.viewMode = 'grid'; // 'list' or 'grid'
        this.sortBy = 'name'; // 'name', 'size', 'date'
        this.files = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadFiles();
        this.setupContextMenu();
    }

    setupEventListeners() {
        document.getElementById('refreshBtn').addEventListener('click', () => this.refresh());
        document.getElementById('uploadBtn').addEventListener('click', () => this.uploadFiles());
        document.getElementById('newFolderBtn').addEventListener('click', () => this.createFolder());
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileUpload(e));
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchFiles();
        });
        
        // 点击空白处隐藏上下文菜单
        document.addEventListener('click', () => {
            document.getElementById('contextMenu').style.display = 'none';
        });
    }

    setupContextMenu() {
        document.getElementById('file-list').addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const contextMenu = document.getElementById('contextMenu');
            contextMenu.style.display = 'block';
            contextMenu.style.left = e.pageX + 'px';
            contextMenu.style.top = e.pageY + 'px';
        });
    }

    async loadFiles() {
        this.showLoading(true);
        
        // 模拟文件数据 - 实际应用中应该从虚拟机获取真实文件列表
        this.files = [
            { name: 'Desktop', type: 'folder', size: 0, modified: '2024-01-15', icon: '📁' },
            { name: 'Documents', type: 'folder', size: 0, modified: '2024-01-10', icon: '📁' },
            { name: 'Downloads', type: 'folder', size: 0, modified: '2024-01-20', icon: '📁' },
            { name: 'Pictures', type: 'folder', size: 0, modified: '2024-01-05', icon: '📁' },
            { name: 'Music', type: 'folder', size: 0, modified: '2024-01-01', icon: '📁' },
            { name: 'Videos', type: 'folder', size: 0, modified: '2024-01-12', icon: '📁' },
            { name: 'readme.txt', type: 'file', size: 1024, modified: '2024-01-15', icon: '📄' },
            { name: 'notes.md', type: 'file', size: 2048, modified: '2024-01-14', icon: '📝' },
            { name: 'image.jpg', type: 'file', size: 102400, modified: '2024-01-13', icon: '🖼️' },
            { name: 'script.sh', type: 'file', size: 512, modified: '2024-01-12', icon: '📜' },
            { name: 'data.csv', type: 'file', size: 5120, modified: '2024-01-11', icon: '📊' },
            { name: 'backup.zip', type: 'file', size: 1048576, modified: '2024-01-10', icon: '📦' }
        ];

        setTimeout(() => {
            this.renderFileList();
            this.updateStatusBar();
            this.showLoading(false);
        }, 1000);
    }

    renderFileList() {
        const fileList = document.getElementById('file-list');
        fileList.innerHTML = '';

        // 排序文件
        const sortedFiles = this.sortFiles(this.files);

        sortedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.dataset.index = index;
            
            fileItem.innerHTML = `
                <div class="file-icon">${file.icon}</div>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-details">
                        ${file.type === 'folder' ? '文件夹' : this.formatFileSize(file.size)} • ${file.modified}
                    </div>
                </div>
            `;

            fileItem.addEventListener('click', (e) => {
                if (e.ctrlKey) {
                    this.toggleSelect(index);
                } else {
                    this.selectSingle(index);
                }
            });

            fileItem.addEventListener('dblclick', () => {
                this.openItem(file);
            });

            fileList.appendChild(fileItem);
        });

        this.updateSelection();
    }

    sortFiles(files) {
        return files.sort((a, b) => {
            if (this.sortBy === 'name') {
                return a.name.localeCompare(b.name);
            } else if (this.sortBy === 'size') {
                return b.size - a.size;
            } else if (this.sortBy === 'date') {
                return new Date(b.modified) - new Date(a.modified);
            }
            return 0;
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    toggleSelect(index) {
        const itemIndex = this.selectedItems.indexOf(index);
        if (itemIndex > -1) {
            this.selectedItems.splice(itemIndex, 1);
        } else {
            this.selectedItems.push(index);
        }
        this.updateSelection();
        this.updateStatusBar();
    }

    selectSingle(index) {
        this.selectedItems = [index];
        this.updateSelection();
        this.updateStatusBar();
    }

    updateSelection() {
        const fileItems = document.querySelectorAll('.file-item');
        fileItems.forEach((item, i) => {
            if (this.selectedItems.includes(i)) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    updateStatusBar() {
        document.getElementById('item-count').textContent = `${this.files.length} 个项目`;
        document.getElementById('selected-count').textContent = `已选择 ${this.selectedItems.length} 项`;
    }

    openItem(file) {
        if (file.type === 'folder') {
            this.navigateTo(this.currentPath + '/' + file.name);
        } else {
            alert(`打开文件: ${file.name}\n\n在真实的虚拟机中，这将打开相应的应用程序。`);
        }
    }

    navigateTo(path) {
        this.currentPath = path;
        document.getElementById('current-path').textContent = path;
        this.loadFiles();
    }

    refresh() {
        this.loadFiles();
    }

    uploadFiles() {
        document.getElementById('fileInput').click();
    }

    handleFileUpload(event) {
        const files = event.target.files;
        if (files.length > 0) {
            alert(`上传 ${files.length} 个文件:\n${Array.from(files).map(f => f.name).join('\n')}\n\n在真实环境中，这些文件将被上传到虚拟机文件系统中。`);
            event.target.value = '';
        }
    }

    createFolder() {
        const folderName = prompt('请输入文件夹名称:');
        if (folderName) {
            alert(`创建文件夹: ${folderName}\n\n在真实环境中，这将在虚拟机文件系统中创建新文件夹。`);
        }
    }

    searchFiles() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        if (searchTerm) {
            const results = this.files.filter(file => 
                file.name.toLowerCase().includes(searchTerm)
            );
            alert(`搜索 "${searchTerm}": 找到 ${results.length} 个结果\n\n在真实环境中，这将显示搜索结果。`);
        }
    }

    viewMode(mode) {
        this.viewMode = mode;
        this.renderFileList();
    }

    sortBy(criteria) {
        this.sortBy = criteria;
        this.renderFileList();
    }

    copySelected() {
        if (this.selectedItems.length > 0) {
            this.clipboard = [...this.selectedItems];
            this.clipboardAction = 'copy';
            alert(`已复制 ${this.selectedItems.length} 个项目到剪贴板`);
        }
    }

    cutSelected() {
        if (this.selectedItems.length > 0) {
            this.clipboard = [...this.selectedItems];
            this.clipboardAction = 'cut';
            alert(`已剪切 ${this.selectedItems.length} 个项目到剪贴板`);
        }
    }

    pasteHere() {
        if (this.clipboard.length > 0) {
            const action = this.clipboardAction === 'cut' ? '移动' : '复制';
            alert(`${action} ${this.clipboard.length} 个项目到当前目录\n\n在真实环境中，这将执行实际的文件操作。`);
            if (this.clipboardAction === 'cut') {
                this.clipboard = [];
                this.clipboardAction = null;
            }
        }
    }

    deleteSelected() {
        if (this.selectedItems.length > 0) {
            if (confirm(`确定要删除 ${this.selectedItems.length} 个选中的项目吗？`)) {
                alert(`已删除 ${this.selectedItems.length} 个项目\n\n在真实环境中，这将从虚拟机文件系统中删除文件。`);
                this.selectedItems = [];
                this.updateSelection();
                this.updateStatusBar();
            }
        }
    }

    renameItem() {
        if (this.selectedItems.length === 1) {
            const file = this.files[this.selectedItems[0]];
            const newName = prompt('重命名文件:', file.name);
            if (newName && newName !== file.name) {
                alert(`文件已重命名为: ${newName}\n\n在真实环境中，这将重命名虚拟机中的文件。`);
            }
        }
    }

    showProperties() {
        if (this.selectedItems.length === 1) {
            const file = this.files[this.selectedItems[0]];
            const propertiesContent = document.getElementById('properties-content');
            
            propertiesContent.innerHTML = `
                <div class="property-item">
                    <span>名称:</span>
                    <span>${file.name}</span>
                </div>
                <div class="property-item">
                    <span>类型:</span>
                    <span>${file.type === 'folder' ? '文件夹' : '文件'}</span>
                </div>
                <div class="property-item">
                    <span>大小:</span>
                    <span>${file.type === 'folder' ? '-' : this.formatFileSize(file.size)}</span>
                </div>
                <div class="property-item">
                    <span>修改时间:</span>
                    <span>${file.modified}</span>
                </div>
                <div class="property-item">
                    <span>路径:</span>
                    <span>${this.currentPath}/${file.name}</span>
                </div>
            `;
            
            this.openModal('propertiesModal');
        }
    }

    openInTerminal() {
        if (this.selectedItems.length === 1) {
            const file = this.files[this.selectedItems[0]];
            alert(`在终端中打开: ${this.currentPath}/${file.name}\n\n在真实环境中，这将在虚拟机终端中打开该位置。`);
        }
    }

    openModal(modalId) {
        document.getElementById(modalId).style.display = 'flex';
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (show) {
            loading.style.display = 'flex';
        } else {
            loading.style.display = 'none';
        }
    }
}

// 全局函数
function navigateTo(path) {
    if (window.fileManager) {
        window.fileManager.navigateTo(path);
    }
}

function searchFiles() {
    if (window.fileManager) {
        window.fileManager.searchFiles();
    }
}

function viewMode(mode) {
    if (window.fileManager) {
        window.fileManager.viewMode(mode);
    }
}

function sortBy(criteria) {
    if (window.fileManager) {
        window.fileManager.sortBy(criteria);
    }
}

function openItem() {
    if (window.fileManager && window.fileManager.selectedItems.length === 1) {
        const file = window.fileManager.files[window.fileManager.selectedItems[0]];
        window.fileManager.openItem(file);
    }
}

function showProperties() {
    if (window.fileManager) {
        window.fileManager.showProperties();
    }
}

function copySelected() {
    if (window.fileManager) {
        window.fileManager.copySelected();
    }
}

function cutSelected() {
    if (window.fileManager) {
        window.fileManager.cutSelected();
    }
}

function pasteHere() {
    if (window.fileManager) {
        window.fileManager.pasteHere();
    }
}

function deleteSelected() {
    if (window.fileManager) {
        window.fileManager.deleteSelected();
    }
}

function renameItem() {
    if (window.fileManager) {
        window.fileManager.renameItem();
    }
}

function openInTerminal() {
    if (window.fileManager) {
        window.fileManager.openInTerminal();
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    window.fileManager = new FileManager();
});
