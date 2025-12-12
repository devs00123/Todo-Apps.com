// Utility functions for localStorage
const TodoStorage = {
    getTodos: () => {
        const todos = localStorage.getItem('todos');
        return todos ? JSON.parse(todos) : [];
    },
    
    saveTodos: (todos) => {
        localStorage.setItem('todos', JSON.stringify(todos));
    },
    
    getStats: () => {
        const todos = TodoStorage.getTodos();
        return {
            total: todos.length,
            completed: todos.filter(t => t.completed).length,
            pending: todos.filter(t => !t.completed).length
        };
    }
};

// Update stats on home page
function updateStats() {
    const stats = TodoStorage.getStats();
    const totalEl = document.getElementById('totalTodos');
    const completedEl = document.getElementById('completedTodos');
    const pendingEl = document.getElementById('pendingTodos');
    
    if (totalEl) totalEl.textContent = stats.total;
    if (completedEl) completedEl.textContent = stats.completed;
    if (pendingEl) pendingEl.textContent = stats.pending;
}

// Initialize stats when page loads
if (document.getElementById('totalTodos')) {
    updateStats();
    // Update stats every second in case todos are changed in another tab
    setInterval(updateStats, 1000);
}

