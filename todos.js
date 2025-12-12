// Todo Management Class with enhanced features
class TodoManager {
    constructor() {
        this.todos = this.normalizeTodos(this.loadTodos());
        this.currentFilter = 'all';
        this.selectedIds = new Set();
        this.draggedId = null;
        this.editingId = null;
        this.presets = [
            'Buy groceries',
            'Call Mom',
            'Plan the week',
            '30 min workout',
            'Read 20 pages'
        ];
        this.init();
    }

    init() {
        this.cacheDom();
        this.renderTodos();
        this.setupEventListeners();
        this.updateStats();
        this.updateCharCount();
    }

    cacheDom() {
        this.todoInput = document.getElementById('todoInput');
        this.prioritySelect = document.getElementById('prioritySelect');
        this.dueDateInput = document.getElementById('dueDateInput');
        this.charCountEl = document.getElementById('charCount');
        this.validationMsg = document.getElementById('validationMsg');
        this.addBtn = document.getElementById('addTodoBtn');
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.selectAllCheckbox = document.getElementById('selectAllCheckbox');
        this.completeSelectedBtn = document.getElementById('completeSelectedBtn');
        this.deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        this.presetButtons = document.querySelectorAll('.preset-btn');
    }

    normalizeTodos(todos) {
        return todos.map((todo, index) => ({
            id: todo.id ?? Date.now() + index,
            text: todo.text ?? '',
            completed: Boolean(todo.completed),
            createdAt: todo.createdAt ?? new Date().toISOString(),
            priority: todo.priority || 'medium',
            dueDate: todo.dueDate || '',
            order: todo.order ?? index,
            isEditing: false
        }));
    }

    loadTodos() {
        try {
            const todos = localStorage.getItem('todos');
            return todos ? JSON.parse(todos) : [];
        } catch (e) {
            console.error('Failed to load todos', e);
            return [];
        }
    }

    saveTodos() {
        localStorage.setItem('todos', JSON.stringify(this.todos));
        window.dispatchEvent(new CustomEvent('todosUpdated'));
    }

    addTodo(text, priority, dueDate) {
        const trimmed = text.trim();
        if (!trimmed) return;

        const todo = {
            id: Date.now(),
            text: trimmed,
            completed: false,
            createdAt: new Date().toISOString(),
            priority: priority || 'medium',
            dueDate: dueDate || '',
            order: this.todos.length ? Math.max(...this.todos.map(t => t.order || 0)) + 1 : 0,
            isEditing: false
        };

        this.todos.unshift(todo);
        this.saveTodos();
        this.renderTodos();
        this.updateStats();
        this.resetInput();
    }

    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            this.saveTodos();
            this.renderTodos();
            this.updateStats();
        }
    }

    deleteTodo(id) {
        this.todos = this.todos.filter(t => t.id !== id);
        this.selectedIds.delete(id);
        this.saveTodos();
        this.renderTodos();
        this.updateStats();
    }

    toggleSelect(id, checked) {
        if (checked) {
            this.selectedIds.add(id);
        } else {
            this.selectedIds.delete(id);
        }
        this.updateSelectAllState();
        this.renderTodos(); // refresh selection styles
    }

    toggleSelectAll(checked) {
        const filtered = this.getFilteredTodos();
        filtered.forEach(todo => {
            if (checked) {
                this.selectedIds.add(todo.id);
            } else {
                this.selectedIds.delete(todo.id);
            }
        });
        this.renderTodos();
    }

    bulkCompleteSelected() {
        if (!this.selectedIds.size) return;
        this.todos = this.todos.map(todo => ({
            ...todo,
            completed: this.selectedIds.has(todo.id) ? true : todo.completed
        }));
        this.saveTodos();
        this.renderTodos();
        this.updateStats();
    }

    bulkDeleteSelected() {
        if (!this.selectedIds.size) return;
        this.todos = this.todos.filter(todo => !this.selectedIds.has(todo.id));
        this.selectedIds.clear();
        this.saveTodos();
        this.renderTodos();
        this.updateStats();
    }

    startEdit(id) {
        this.todos = this.todos.map(todo => ({
            ...todo,
            isEditing: todo.id === id
        }));
        this.editingId = id;
        this.renderTodos();
    }

    saveEdit(id, newText) {
        const trimmed = newText.trim();
        if (!trimmed) {
            this.showValidation('Todo cannot be empty');
            return;
        }
        this.todos = this.todos.map(todo =>
            todo.id === id ? { ...todo, text: trimmed, isEditing: false } : { ...todo, isEditing: false }
        );
        this.editingId = null;
        this.saveTodos();
        this.renderTodos();
        this.updateStats();
        this.clearValidation();
    }

    cancelEdit() {
        this.todos = this.todos.map(todo => ({ ...todo, isEditing: false }));
        this.editingId = null;
        this.renderTodos();
    }

    getFilteredTodos() {
        switch (this.currentFilter) {
            case 'active':
                return this.todos.filter(t => !t.completed);
            case 'completed':
                return this.todos.filter(t => t.completed);
            default:
                return this.todos;
        }
    }

    renderTodos() {
        const todosList = document.getElementById('todosList');
        const emptyState = document.getElementById('emptyState');
        const filteredTodos = this.getFilteredTodos();

        if (!todosList) return;

        if (filteredTodos.length === 0) {
            todosList.innerHTML = '';
            if (emptyState) emptyState.classList.add('show');
            this.updateSelectAllState(true);
            return;
        }

        if (emptyState) emptyState.classList.remove('show');

        todosList.innerHTML = filteredTodos
            .map(todo => {
                const priorityClass = `priority-${todo.priority || 'medium'}`;
                const dueMeta = this.getDueMeta(todo);
                const selectedClass = this.selectedIds.has(todo.id) ? ' selected' : '';
                const completedClass = todo.completed ? ' completed' : '';
                return `
                    <div class="todo-item${completedClass}${selectedClass}" data-id="${todo.id}" draggable="true">
                        <div class="drag-handle" title="Drag to reorder">☰</div>
                        <input 
                            type="checkbox" 
                            class="select-checkbox" 
                            data-select="${todo.id}"
                            ${this.selectedIds.has(todo.id) ? 'checked' : ''}
                            aria-label="Select todo"
                        >
                        <input 
                            type="checkbox" 
                            class="todo-checkbox" 
                            data-complete="${todo.id}"
                            ${todo.completed ? 'checked' : ''}
                            aria-label="Mark todo complete"
                        >
                        <div class="todo-content">
                            <div class="todo-top">
                                ${
                                    todo.isEditing
                                        ? `<input class="edit-input" data-edit-input="${todo.id}" maxlength="200" value="${this.escapeHtml(todo.text)}">`
                                        : `<span class="todo-text" data-edit="${todo.id}" title="Double-click to edit">${this.escapeHtml(todo.text)}</span>`
                                }
                            </div>
                            <div class="todo-meta">
                                <span class="priority-badge ${priorityClass}">${this.formatPriority(todo.priority)}</span>
                                ${dueMeta ? `<span class="due-badge ${dueMeta.className}">${dueMeta.label}</span>` : ''}
                            </div>
                        </div>
                        <div class="todo-actions">
                            <button 
                                class="todo-btn" 
                                data-edit-btn="${todo.id}" 
                                title="Edit todo"
                            >
                                ✎
                            </button>
                            <button 
                                class="todo-btn delete-btn" 
                                data-delete="${todo.id}"
                                title="Delete todo"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                `;
            })
            .join('');

        this.bindRenderedItems();
        this.updateSelectAllState();
    }

    bindRenderedItems() {
        const todosList = document.getElementById('todosList');
        if (!todosList) return;

        todosList.querySelectorAll('.todo-item').forEach(item => {
            const id = Number(item.dataset.id);

            const completeCheckbox = item.querySelector('[data-complete]');
            if (completeCheckbox) {
                completeCheckbox.addEventListener('change', () => this.toggleTodo(id));
            }

            const selectCheckbox = item.querySelector('[data-select]');
            if (selectCheckbox) {
                selectCheckbox.addEventListener('change', (e) => this.toggleSelect(id, e.target.checked));
            }

            const editBtn = item.querySelector('[data-edit-btn]');
            if (editBtn) {
                editBtn.addEventListener('click', () => this.startEdit(id));
            }

            const deleteBtn = item.querySelector('[data-delete]');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => this.deleteTodo(id));
            }

            const textEl = item.querySelector('[data-edit]');
            if (textEl) {
                textEl.addEventListener('dblclick', () => this.startEdit(id));
            }

            const editInput = item.querySelector('[data-edit-input]');
            if (editInput) {
                editInput.focus();
                editInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        this.saveEdit(id, editInput.value);
                    } else if (e.key === 'Escape') {
                        this.cancelEdit();
                    }
                });
                editInput.addEventListener('blur', () => this.saveEdit(id, editInput.value));
            }

            // Drag and drop
            item.addEventListener('dragstart', (e) => this.onDragStart(e, id));
            item.addEventListener('dragover', (e) => this.onDragOver(e, id));
            item.addEventListener('drop', (e) => this.onDrop(e, id));
            item.addEventListener('dragend', () => this.onDragEnd());
        });
    }

    onDragStart(event, id) {
        this.draggedId = id;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', id);
        const item = event.target.closest('.todo-item');
        if (item) item.classList.add('dragging');
    }

    onDragOver(event, id) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }

    onDrop(event, targetId) {
        event.preventDefault();
        const draggedId = this.draggedId;
        if (draggedId === null || draggedId === targetId) return;
        this.moveTodo(draggedId, targetId);
        this.draggedId = null;
    }

    onDragEnd() {
        document.querySelectorAll('.todo-item.dragging').forEach(el => el.classList.remove('dragging'));
    }

    moveTodo(dragId, dropId) {
        const fromIndex = this.todos.findIndex(t => t.id === dragId);
        const toIndex = this.todos.findIndex(t => t.id === dropId);
        if (fromIndex === -1 || toIndex === -1) return;
        const [dragged] = this.todos.splice(fromIndex, 1);
        this.todos.splice(toIndex, 0, dragged);
        // Reassign order to maintain persistence
        this.todos = this.todos.map((t, idx) => ({ ...t, order: idx }));
        this.saveTodos();
        this.renderTodos();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateStats() {
        const countEl = document.getElementById('todoCount');
        const filteredTodos = this.getFilteredTodos();
        const count = filteredTodos.length;
        
        if (countEl) {
            countEl.textContent = `${count} ${count === 1 ? 'todo' : 'todos'}`;
        }
    }

    updateCharCount() {
        if (!this.todoInput || !this.charCountEl) return;
        const current = this.todoInput.value.length;
        this.charCountEl.textContent = `${current}/200`;
    }

    showValidation(message) {
        if (this.validationMsg) {
            this.validationMsg.textContent = message;
        }
    }

    clearValidation() {
        if (this.validationMsg) {
            this.validationMsg.textContent = '';
        }
    }

    resetInput() {
        if (this.todoInput) {
            this.todoInput.value = '';
            this.todoInput.focus();
            this.updateCharCount();
        }
        if (this.dueDateInput) this.dueDateInput.value = '';
        if (this.prioritySelect) this.prioritySelect.value = 'medium';
        this.clearValidation();
    }

    getDueMeta(todo) {
        if (!todo.dueDate) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(todo.dueDate);
        due.setHours(0, 0, 0, 0);
        const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return { label: 'Due today', className: 'due-today' };
        }
        if (diffDays < 0) {
            return { label: `Overdue ${Math.abs(diffDays)}d`, className: 'due-overdue' };
        }
        if (diffDays === 1) {
            return { label: 'Due tomorrow', className: 'due-soon' };
        }
        return { label: `Due in ${diffDays}d`, className: 'due-soon' };
    }

    formatPriority(priority) {
        switch (priority) {
            case 'high':
                return 'High';
            case 'low':
                return 'Low';
            default:
                return 'Medium';
        }
    }

    updateSelectAllState(forceUnchecked = false) {
        if (!this.selectAllCheckbox) return;
        if (forceUnchecked) {
            this.selectAllCheckbox.checked = false;
            return;
        }
        const filtered = this.getFilteredTodos();
        if (filtered.length === 0) {
            this.selectAllCheckbox.checked = false;
            return;
        }
        const allSelected = filtered.every(todo => this.selectedIds.has(todo.id));
        this.selectAllCheckbox.checked = allSelected;
    }

    setupEventListeners() {
        // Add todo button
        if (this.addBtn) {
            this.addBtn.addEventListener('click', () => this.handleAdd());
        }

        // Enter key to add todo
        if (this.todoInput) {
            this.todoInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleAdd();
                }
            });
            this.todoInput.addEventListener('input', () => {
                this.updateCharCount();
                if (this.todoInput.value.trim().length) {
                    this.clearValidation();
                }
            });
        }

        // Preset quick-add buttons
        this.presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (!this.todoInput) return;
                this.todoInput.value = btn.dataset.preset || '';
                this.updateCharCount();
                this.clearValidation();
                this.todoInput.focus();
            });
        });

        // Filter buttons
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.renderTodos();
                this.updateStats();
            });
        });

        // Bulk actions
        if (this.selectAllCheckbox) {
            this.selectAllCheckbox.addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));
        }

        if (this.completeSelectedBtn) {
            this.completeSelectedBtn.addEventListener('click', () => this.bulkCompleteSelected());
        }

        if (this.deleteSelectedBtn) {
            this.deleteSelectedBtn.addEventListener('click', () => this.bulkDeleteSelected());
        }
    }

    handleAdd() {
        const text = this.todoInput ? this.todoInput.value : '';
        if (!text.trim()) {
            this.showValidation('Please enter a todo');
            return;
        }
        const priority = this.prioritySelect ? this.prioritySelect.value : 'medium';
        const dueDate = this.dueDateInput ? this.dueDateInput.value : '';
        this.addTodo(text, priority, dueDate);
    }
}

// Initialize Todo Manager
let todoManager;
document.addEventListener('DOMContentLoaded', () => {
    todoManager = new TodoManager();
});

// Listen for updates from other tabs/windows
window.addEventListener('storage', () => {
    if (todoManager) {
        todoManager.todos = todoManager.normalizeTodos(todoManager.loadTodos());
        todoManager.renderTodos();
        todoManager.updateStats();
    }
});

// Listen for custom events
window.addEventListener('todosUpdated', () => {
    if (todoManager) {
        todoManager.todos = todoManager.normalizeTodos(todoManager.loadTodos());
        todoManager.renderTodos();
        todoManager.updateStats();
    }
});

