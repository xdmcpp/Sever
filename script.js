// 全局变量
const darkModeKey = 'cpp-learning-dark-mode';
const savedNotesKey = 'cpp-learning-notes';
const savedCodeKey = 'cpp-learning-code';
const completedTopicsKey = 'cpp-learning-completed-topics';

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    // 初始化主题
    initTheme();
    
    // 初始化导航菜单
    initNavigation();
    
    // 初始化代码复制功能
    initCodeCopy();
    
    // 初始化折叠面板
    initCollapse();
    
    // 检查当前页面并初始化相应功能
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage === 'compiler.html') {
        // 初始化编译器
        initCompiler();
    } else if (currentPage === 'notes.html') {
        // 初始化笔记功能
        initNotes();
    } else if (currentPage === 'learning.html') {
        // 初始化学习进度
        initLearningProgress();
    }
});

// 初始化主题
function initTheme() {
    const isDarkMode = localStorage.getItem(darkModeKey) === 'true';
    
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    
    // 主题切换按钮
    const themeToggle = document.getElementById('theme-toggle');
    
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            localStorage.setItem(darkModeKey, document.documentElement.classList.contains('dark'));
        });
    }
}

// 初始化导航菜单
function initNavigation() {
    // 移动端菜单
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
}

// 初始化代码复制功能
function initCodeCopy() {
    const codeCopyButtons = document.querySelectorAll('.code-copy-btn');
    
    codeCopyButtons.forEach(button => {
        button.addEventListener('click', () => {
            const codeBlock = button.closest('.code-block');
            const codeContent = codeBlock.querySelector('.code-content');
            
            if (codeContent) {
                const textToCopy = codeContent.textContent;
                
                navigator.clipboard.writeText(textToCopy).then(() => {
                    // 显示复制成功提示
                    const originalText = button.innerHTML;
                    button.innerHTML = '<i class="fas fa-check mr-1"></i> 已复制';
                    
                    setTimeout(() => {
                        button.innerHTML = originalText;
                    }, 2000);
                }).catch(err => {
                    console.error('复制失败:', err);
                });
            }
        });
    });
}

// 初始化折叠面板
function initCollapse() {
    const collapseHeaders = document.querySelectorAll('.collapse-header');
    
    collapseHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const collapse = header.closest('.collapse');
            const content = collapse.querySelector('.collapse-content');
            const icon = header.querySelector('.collapse-icon i');
            
            collapse.classList.toggle('active');
            
            if (collapse.classList.contains('active')) {
                content.style.maxHeight = content.scrollHeight + 'px';
                content.style.padding = '1rem';
                icon.style.transform = 'rotate(180deg)';
            } else {
                content.style.maxHeight = '0';
                content.style.padding = '0 1rem';
                icon.style.transform = 'rotate(0)';
            }
        });
    });
}

// 初始化编译器
function initCompiler() {
    const editorTextarea = document.getElementById('editor-textarea');
    const editorLineNumbers = document.getElementById('editor-line-numbers');
    const runButton = document.getElementById('run-button');
    const saveButton = document.getElementById('save-button');
    const loadButton = document.getElementById('load-button');
    const clearButton = document.getElementById('clear-button');
    const outputContent = document.getElementById('output-content');
    
    if (!editorTextarea || !editorLineNumbers || !runButton || !outputContent) {
        return;
    }
    
    // 加载保存的代码
    const savedCode = localStorage.getItem(savedCodeKey);
    
    if (savedCode) {
        editorTextarea.value = savedCode;
        updateLineNumbers();
    } else {
        // 默认代码
        editorTextarea.value = `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`;
        updateLineNumbers();
    }
    
    // 更新行号
    function updateLineNumbers() {
        const lines = editorTextarea.value.split('\n');
        let lineNumbersHTML = '';
        
        for (let i = 1; i <= lines.length; i++) {
            lineNumbersHTML += `<div class="editor-line-number">${i}</div>`;
        }
        
        editorLineNumbers.innerHTML = lineNumbersHTML;
    }
    
    // 编辑器事件监听
    editorTextarea.addEventListener('input', updateLineNumbers);
    
    editorTextarea.addEventListener('scroll', () => {
        editorLineNumbers.scrollTop = editorTextarea.scrollTop;
    });
    
    // 自动缩进
    editorTextarea.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            
            const start = editorTextarea.selectionStart;
            const end = editorTextarea.selectionEnd;
            
            // 插入缩进
            editorTextarea.value = editorTextarea.value.substring(0, start) + '    ' + editorTextarea.value.substring(end);
            
            // 设置光标位置
            editorTextarea.selectionStart = editorTextarea.selectionEnd = start + 4;
            
            updateLineNumbers();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            
            const start = editorTextarea.selectionStart;
            const end = editorTextarea.selectionEnd;
            
            // 获取当前行
            const currentLine = editorTextarea.value.substring(0, start).split('\n').pop();
            
            // 计算缩进
            const indent = currentLine.match(/^\s*/)[0];
            
            // 检查是否需要额外缩进
            let extraIndent = '';
            if (currentLine.trim().endsWith('{')) {
                extraIndent = '    ';
            }
            
            // 插入新行和缩进
            editorTextarea.value = editorTextarea.value.substring(0, start) + '\n' + indent + extraIndent + editorTextarea.value.substring(end);
            
            // 设置光标位置
            editorTextarea.selectionStart = editorTextarea.selectionEnd = start + 1 + indent.length + extraIndent.length;
            
            updateLineNumbers();
        } else if (e.key === '}' && editorTextarea.value.substring(editorTextarea.selectionStart - 4, editorTextarea.selectionStart) === '    ') {
            e.preventDefault();
            
            const start = editorTextarea.selectionStart;
            const end = editorTextarea.selectionEnd;
            
            // 删除缩进并插入大括号
            editorTextarea.value = editorTextarea.value.substring(0, start - 4) + '}' + editorTextarea.value.substring(end);
            
            // 设置光标位置
            editorTextarea.selectionStart = editorTextarea.selectionEnd = start - 3;
            
            updateLineNumbers();
        }
    });
    
    // 运行按钮
    runButton.addEventListener('click', () => {
        const code = editorTextarea.value;
        
        if (!code.trim()) {
            outputContent.innerHTML = '<span class="output-error">错误: 代码不能为空</span>';
            return;
        }
        
        // 显示加载状态
        outputContent.innerHTML = '<div class="flex items-center"><span class="loading mr-2"></span> 编译中...</div>';
        
        // 模拟编译和执行过程
        setTimeout(() => {
            try {
                // 这里是模拟的编译和执行过程
                // 在实际应用中，这里应该调用后端API进行编译和执行
                
                // 简单的语法检查
                const syntaxErrors = checkSyntax(code);
                
                if (syntaxErrors.length > 0) {
                    let errorMessage = '<span class="output-error">编译错误:</span><br>';
                    
                    syntaxErrors.forEach(error => {
                        errorMessage += `<span class="output-error">${error}</span><br>`;
                    });
                    
                    outputContent.innerHTML = errorMessage;
                } else {
                    // 模拟执行结果
                    const output = simulateExecution(code);
                    outputContent.innerHTML = output;
                }
            } catch (error) {
                outputContent.innerHTML = `<span class="output-error">执行错误: ${error.message}</span>`;
            }
        }, 1500);
    });
    
    // 保存按钮
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            const code = editorTextarea.value;
            localStorage.setItem(savedCodeKey, code);
            
            // 显示保存成功提示
            const originalText = saveButton.innerHTML;
            saveButton.innerHTML = '<i class="fas fa-check mr-1"></i> 已保存';
            
            setTimeout(() => {
                saveButton.innerHTML = originalText;
            }, 2000);
        });
    }
    
    // 加载按钮
    if (loadButton) {
        loadButton.addEventListener('click', () => {
            const savedCode = localStorage.getItem(savedCodeKey);
            
            if (savedCode) {
                editorTextarea.value = savedCode;
                updateLineNumbers();
                
                // 显示加载成功提示
                const originalText = loadButton.innerHTML;
                loadButton.innerHTML = '<i class="fas fa-check mr-1"></i> 已加载';
                
                setTimeout(() => {
                    loadButton.innerHTML = originalText;
                }, 2000);
            } else {
                outputContent.innerHTML = '<span class="output-error">错误: 没有找到保存的代码</span>';
            }
        });
    }
    
    // 清空按钮
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            editorTextarea.value = '';
            updateLineNumbers();
            outputContent.innerHTML = '<span>代码已清空</span>';
        });
    }
    
    // 快捷键
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveButton.click();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            runButton.click();
        }
    });
    
    // 简单的语法检查
    function checkSyntax(code) {
        const errors = [];
        
        // 检查括号匹配
        let openBraces = 0;
        let openParens = 0;
        let openBrackets = 0;
        
        for (let i = 0; i < code.length; i++) {
            switch (code[i]) {
                case '{':
                    openBraces++;
                    break;
                case '}':
                    openBraces--;
                    break;
                case '(':
                    openParens++;
                    break;
                case ')':
                    openParens--;
                    break;
                case '[':
                    openBrackets++;
                    break;
                case ']':
                    openBrackets--;
                    break;
            }
            
            if (openBraces < 0) {
                errors.push(`第${code.substring(0, i).split('\n').length}行: 多余的 '}'`);
                break;
            }
            
            if (openParens < 0) {
                errors.push(`第${code.substring(0, i).split('\n').length}行: 多余的 ')'`);
                break;
            }
            
            if (openBrackets < 0) {
                errors.push(`第${code.substring(0, i).split('\n').length}行: 多余的 ']'`);
                break;
            }
        }
        
        if (openBraces > 0) {
            errors.push(`语法错误: 缺少 '}'`);
        }
        
        if (openParens > 0) {
            errors.push(`语法错误: 缺少 ')'`);
        }
        
        if (openBrackets > 0) {
            errors.push(`语法错误: 缺少 ']'`);
        }
        
        // 检查是否包含main函数
        if (!code.includes('int main()') && !code.includes('int main(')) {
            errors.push('语法错误: 缺少main函数');
        }
        
        // 检查是否包含iostream头文件（如果使用了cout或cin）
        if ((code.includes('cout') || code.includes('cin')) && !code.includes('#include <iostream>')) {
            errors.push('语法错误: 使用了cout或cin，但未包含iostream头文件');
        }
        
        // 检查是否使用了using namespace std（如果使用了cout或cin但没有使用std::前缀）
        if ((code.includes('cout') || code.includes('cin')) && !code.includes('using namespace std') && !code.includes('std::cout') && !code.includes('std::cin')) {
            errors.push('语法错误: 使用了cout或cin，但未使用using namespace std或std::前缀');
        }
        
        return errors;
    }
    
    // 模拟代码执行
    function simulateExecution(code) {
        // 这里是非常简单的模拟，实际上无法真正执行C++代码
        // 在实际应用中，这里应该调用后端API进行编译和执行
        
        let output = '';
        
        // 检查是否包含cout语句
        const coutRegex = /cout\s*<<\s*["'](.*?)["']/g;
        let match;
        
        while ((match = coutRegex.exec(code)) !== null) {
            output += match[1] + '<br>';
        }
        
        // 检查是否包含特定的代码模式
        if (code.includes('Hello, World!')) {
            output = 'Hello, World!<br>';
        } else if (code.includes('fibonacci')) {
            // 模拟斐波那契数列
            output = '斐波那契数列前10个数: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34<br>';
        } else if (code.includes('calculator') || code.includes('+') || code.includes('-') || code.includes('*') || code.includes('/')) {
            // 模拟计算器
            output = '计算器结果: 这是一个模拟的计算结果<br>';
        } else if (code.includes('array')) {
            // 模拟数组操作
            output = '数组操作结果: 这是一个模拟的数组操作结果<br>';
        } else if (code.includes('class') || code.includes('Student')) {
            // 模拟类和对象
            output = '类和对象结果: 这是一个模拟的类和对象操作结果<br>';
        } else if (code.includes('file')) {
            // 模拟文件操作
            output = '文件操作结果: 这是一个模拟的文件操作结果<br>';
            output += '注意: 在实际的在线编译器环境中，文件操作可能受到限制<br>';
        }
        
        // 如果没有匹配到任何模式，返回一个通用的成功消息
        if (output === '') {
            output = '<span class="output-success">程序执行成功!</span><br>';
            output += '这是一个模拟的执行结果。在实际应用中，这里将显示程序的实际输出。<br>';
        }
        
        return output;
    }
}

// 初始化笔记功能
function initNotes() {
    const noteForm = document.getElementById('note-form');
    const noteId = document.getElementById('note-id');
    const noteTitle = document.getElementById('note-title');
    const noteContent = document.getElementById('note-content');
    const saveNoteBtn = document.getElementById('save-note-btn');
    const cancelNoteBtn = document.getElementById('cancel-note-btn');
    const notesList = document.getElementById('notes-list');
    
    if (!noteForm || !noteId || !noteTitle || !noteContent || !saveNoteBtn || !cancelNoteBtn || !notesList) {
        return;
    }
    
    // 加载保存的笔记
    loadNotes();
    
    // 保存笔记
    noteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const title = noteTitle.value.trim();
        const content = noteContent.value.trim();
        const id = noteId.value;
        
        if (!title || !content) {
            alert('请输入笔记标题和内容');
            return;
        }
        
        // 获取保存的笔记
        let notes = JSON.parse(localStorage.getItem(savedNotesKey) || '[]');
        
        if (id) {
            // 更新现有笔记
            const index = notes.findIndex(note => note.id === id);
            
            if (index !== -1) {
                notes[index] = {
                    id,
                    title,
                    content,
                    updatedAt: new Date().toISOString()
                };
            }
        } else {
            // 添加新笔记
            notes.push({
                id: Date.now().toString(),
                title,
                content,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        // 保存笔记
        localStorage.setItem(savedNotesKey, JSON.stringify(notes));
        
        // 重置表单
        resetForm();
        
        // 重新加载笔记
        loadNotes();
    });
    
    // 取消按钮
    cancelNoteBtn.addEventListener('click', () => {
        resetForm();
    });
    
    // 加载笔记
    function loadNotes() {
        const notes = JSON.parse(localStorage.getItem(savedNotesKey) || '[]');
        
        if (notes.length === 0) {
            notesList.innerHTML = '<div class="text-center py-8 text-gray-500">暂无笔记，点击上方按钮添加</div>';
            return;
        }
        
        // 按创建时间排序（最新的在前）
        notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // 生成笔记列表
        let notesHTML = '';
        
        notes.forEach(note => {
            const date = new Date(note.createdAt).toLocaleDateString();
            
            notesHTML += `
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow duration-200">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="text-lg font-semibold text-gray-800 dark:text-white">${escapeHtml(note.title)}</h3>
                        <div class="flex space-x-2">
                            <button class="edit-note-btn text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" data-id="${note.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="delete-note-btn text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300" data-id="${note.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <p class="text-gray-600 dark:text-gray-300 mb-2">${escapeHtml(note.content).substring(0, 100)}${note.content.length > 100 ? '...' : ''}</p>
                    <div class="text-sm text-gray-500 dark:text-gray-400">创建于: ${date}</div>
                </div>
            `;
        });
        
        notesList.innerHTML = notesHTML;
        
        // 添加编辑和删除按钮事件
        document.querySelectorAll('.edit-note-btn').forEach(button => {
            button.addEventListener('click', () => {
                const id = button.getAttribute('data-id');
                editNote(id);
            });
        });
        
        document.querySelectorAll('.delete-note-btn').forEach(button => {
            button.addEventListener('click', () => {
                const id = button.getAttribute('data-id');
                deleteNote(id);
            });
        });
    }
    
    // 编辑笔记
    function editNote(id) {
        const notes = JSON.parse(localStorage.getItem(savedNotesKey) || '[]');
        const note = notes.find(note => note.id === id);
        
        if (note) {
            noteId.value = note.id;
            noteTitle.value = note.title;
            noteContent.value = note.content;
            saveNoteBtn.textContent = '更新笔记';
            
            // 滚动到表单
            noteForm.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    // 删除笔记
    function deleteNote(id) {
        if (confirm('确定要删除这条笔记吗？')) {
            let notes = JSON.parse(localStorage.getItem(savedNotesKey) || '[]');
            notes = notes.filter(note => note.id !== id);
            localStorage.setItem(savedNotesKey, JSON.stringify(notes));
            loadNotes();
        }
    }
    
    // 重置表单
    function resetForm() {
        noteId.value = '';
        noteTitle.value = '';
        noteContent.value = '';
        saveNoteBtn.textContent = '添加笔记';
    }
    
    // HTML转义
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 初始化学习进度
function initLearningProgress() {
    const completedTopics = JSON.parse(localStorage.getItem(completedTopicsKey) || '[]');
    const totalCount = document.querySelectorAll('.complete-topic-btn').length;
    const completedCount = completedTopics.length;
    const progressBar = document.getElementById('progress-bar');
    const completedCountElement = document.getElementById('completed-count');
    const totalCountElement = document.getElementById('total-count');
    
    if (progressBar && completedCountElement && totalCountElement) {
        // 更新进度条
        const progress = Math.round((completedCount / totalCount) * 100);
        progressBar.style.width = `${progress}%`;
        
        // 更新计数
        completedCountElement.textContent = completedCount;
        totalCountElement.textContent = totalCount;
    }
    
    // 更新已完成的主题标记
    document.querySelectorAll('.topic-checkmark i').forEach((icon, index) => {
        const topicId = document.querySelectorAll('.complete-topic-btn')[index].getAttribute('data-topic');
        
        if (completedTopics.includes(topicId)) {
            icon.className = 'fas fa-check-circle text-green-500';
        }
    });
    
    // 添加完成主题按钮事件
    document.querySelectorAll('.complete-topic-btn').forEach(button => {
        button.addEventListener('click', () => {
            const topicId = button.getAttribute('data-topic');
            let completedTopics = JSON.parse(localStorage.getItem(completedTopicsKey) || '[]');
            
            if (completedTopics.includes(topicId)) {
                // 取消完成
                completedTopics = completedTopics.filter(id => id !== topicId);
                button.textContent = '标记为已完成';
                
                // 更新图标
                const topicIndex = Array.from(document.querySelectorAll('.complete-topic-btn')).findIndex(btn => btn.getAttribute('data-topic') === topicId);
                if (topicIndex !== -1) {
                    const icon = document.querySelectorAll('.topic-checkmark i')[topicIndex];
                    icon.className = 'far fa-circle text-gray-400';
                }
            } else {
                // 标记为完成
                completedTopics.push(topicId);
                button.textContent = '取消完成';
                
                // 更新图标
                const topicIndex = Array.from(document.querySelectorAll('.complete-topic-btn')).findIndex(btn => btn.getAttribute('data-topic') === topicId);
                if (topicIndex !== -1) {
                    const icon = document.querySelectorAll('.topic-checkmark i')[topicIndex];
                    icon.className = 'fas fa-check-circle text-green-500';
                }
            }
            
            // 保存更新后的完成主题列表
            localStorage.setItem(completedTopicsKey, JSON.stringify(completedTopics));
            
            // 更新进度
            const totalCount = document.querySelectorAll('.complete-topic-btn').length;
            const completedCount = completedTopics.length;
            const progress = Math.round((completedCount / totalCount) * 100);
            
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
            
            if (completedCountElement) {
                completedCountElement.textContent = completedCount;
            }
        });
        
        // 初始化按钮文本
        const topicId = button.getAttribute('data-topic');
        
        if (completedTopics.includes(topicId)) {
            button.textContent = '取消完成';
        } else {
            button.textContent = '标记为已完成';
        }
    });
}