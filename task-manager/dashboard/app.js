// Task Manager Dashboard JavaScript

const API_BASE = 'http://localhost:3000/api';
let tasks = [];
let currentTaskId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  refreshTasks();
  // Auto-refresh every 10 seconds
  setInterval(refreshTasks, 10000);
});

// Fetch and display tasks
async function refreshTasks() {
  try {
    const status = document.getElementById('filter-status').value;
    const url = status ? `${API_BASE}/tasks?status=${status}` : `${API_BASE}/tasks`;

    const response = await fetch(url);
    tasks = await response.json();

    renderTasks();
    updateStats();
  } catch (error) {
    console.error('Error fetching tasks:', error);
    document.getElementById('tasks-list').innerHTML = '<p class="loading">Error loading tasks</p>';
  }
}

// Render tasks
function renderTasks() {
  const container = document.getElementById('tasks-list');

  if (tasks.length === 0) {
    container.innerHTML = '<div class="empty">No tasks found. Click "Add Task" to create one.</div>';
    return;
  }

  container.innerHTML = tasks.map(task => `
    <div class="task-card">
      <div class="task-header">
        <div class="task-title">
          <h3 onclick="showTaskDetails(${task.id})">${escapeHtml(task.name)}</h3>
          <span class="status-badge status-${task.status}">${task.status}</span>
        </div>
        <div class="task-actions">
          ${task.status === 'pending' ? `<button class="btn btn-success" onclick="runTask(${task.id})">▶ Run</button>` : ''}
          ${task.enabled ? `<button class="btn btn-secondary" onclick="toggleTask(${task.id}, false)">Pause</button>` : `<button class="btn btn-success" onclick="toggleTask(${task.id}, true)">Resume</button>`}
          <button class="btn btn-danger" onclick="deleteTask(${task.id})">Delete</button>
        </div>
      </div>
      <div class="task-info">
        ${task.description ? `<div>${escapeHtml(task.description)}</div>` : ''}
        <div class="task-command">${escapeHtml(task.command)}</div>
        <div class="task-meta">
          ${task.schedule ? `<span>📅 ${escapeHtml(task.schedule)}</span>` : '<span>⚡ One-time</span>'}
          ${task.next_run ? `<span>⏰ Next: ${new Date(task.next_run).toLocaleString()}</span>` : ''}
          <span>🎯 Priority: ${task.priority}</span>
          <span>🔄 Runs: ${task.run_count}</span>
          <span>📅 Created: ${new Date(task.created_at).toLocaleString()}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// Update statistics
async function updateStats() {
  try {
    const response = await fetch(`${API_BASE}/stats`);
    const stats = await response.json();

    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-pending').textContent = stats.pending;
    document.getElementById('stat-running').textContent = stats.running;
    document.getElementById('stat-completed').textContent = stats.completed;
    document.getElementById('stat-failed').textContent = stats.failed;
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
}

// Show add task modal
function showAddTaskModal() {
  document.getElementById('add-task-modal').style.display = 'block';
}

function hideAddTaskModal() {
  document.getElementById('add-task-modal').style.display = 'none';
  document.getElementById('add-task-form').reset();
}

// Add task
async function addTask(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const task = {
    name: formData.get('name'),
    description: formData.get('description'),
    command: formData.get('command'),
    schedule: formData.get('schedule') || null,
    priority: parseInt(formData.get('priority'))
  };

  try {
    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });

    if (response.ok) {
      hideAddTaskModal();
      refreshTasks();
    } else {
      alert('Failed to create task');
    }
  } catch (error) {
    console.error('Error creating task:', error);
    alert('Error creating task');
  }
}

// Show task details
async function showTaskDetails(taskId) {
  currentTaskId = taskId;

  try {
    const [taskResponse, logsResponse] = await Promise.all([
      fetch(`${API_BASE}/tasks/${taskId}`),
      fetch(`${API_BASE}/tasks/${taskId}/logs`)
    ]);

    const task = await taskResponse.json();
    const logs = await logsResponse.json();

    const detailsHtml = `
      <h2>${escapeHtml(task.name)}</h2>
      <div class="task-info" style="margin-top: 20px;">
        <div><strong>Status:</strong> <span class="status-badge status-${task.status}">${task.status}</span></div>
        ${task.description ? `<div><strong>Description:</strong> ${escapeHtml(task.description)}</div>` : ''}
        <div><strong>Command:</strong></div>
        <div class="task-command">${escapeHtml(task.command)}</div>
        ${task.schedule ? `<div><strong>Schedule:</strong> ${escapeHtml(task.schedule)}</div>` : ''}
        ${task.next_run ? `<div><strong>Next Run:</strong> ${new Date(task.next_run).toLocaleString()}</div>` : ''}
        <div><strong>Priority:</strong> ${task.priority}</div>
        <div><strong>Run Count:</strong> ${task.run_count}</div>
        <div><strong>Enabled:</strong> ${task.enabled ? 'Yes' : 'No'}</div>
        <div><strong>Created:</strong> ${new Date(task.created_at).toLocaleString()}</div>
        <div><strong>Last Updated:</strong> ${new Date(task.updated_at).toLocaleString()}</div>
      </div>

      ${logs.length > 0 ? `
        <h3 style="margin-top: 30px;">Recent Logs</h3>
        <div class="logs-container">
          ${logs.map(log => `
            <div class="log-entry ${log.status}">
              <div><strong>${log.status.toUpperCase()}</strong> - ${new Date(log.started_at).toLocaleString()}</div>
              ${log.duration_ms ? `<div>Duration: ${log.duration_ms}ms</div>` : ''}
              ${log.output ? `<div><strong>Output:</strong><pre>${escapeHtml(log.output)}</pre></div>` : ''}
              ${log.error ? `<div><strong>Error:</strong><pre>${escapeHtml(log.error)}</pre></div>` : ''}
            </div>
          `).join('')}
        </div>
      ` : '<p style="margin-top: 20px;">No logs yet</p>'}
    `;

    document.getElementById('task-details').innerHTML = detailsHtml;
    document.getElementById('task-details-modal').style.display = 'block';
  } catch (error) {
    console.error('Error fetching task details:', error);
    alert('Error loading task details');
  }
}

function hideTaskDetailsModal() {
  document.getElementById('task-details-modal').style.display = 'none';
  currentTaskId = null;
}

// Delete task
async function deleteTask(taskId) {
  if (!confirm('Are you sure you want to delete this task?')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      refreshTasks();
    } else {
      alert('Failed to delete task');
    }
  } catch (error) {
    console.error('Error deleting task:', error);
    alert('Error deleting task');
  }
}

// Toggle task enabled/disabled
async function toggleTask(taskId, enabled) {
  try {
    const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: enabled ? 1 : 0 })
    });

    if (response.ok) {
      refreshTasks();
    } else {
      alert('Failed to update task');
    }
  } catch (error) {
    console.error('Error updating task:', error);
    alert('Error updating task');
  }
}

// Run task immediately
async function runTask(taskId) {
  try {
    const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'pending', next_run: new Date().toISOString() })
    });

    if (response.ok) {
      alert('Task queued to run immediately');
      refreshTasks();
    } else {
      alert('Failed to queue task');
    }
  } catch (error) {
    console.error('Error running task:', error);
    alert('Error running task');
  }
}

// Utility function
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Close modals when clicking outside
window.onclick = function(event) {
  const addModal = document.getElementById('add-task-modal');
  const detailsModal = document.getElementById('task-details-modal');

  if (event.target === addModal) {
    hideAddTaskModal();
  }
  if (event.target === detailsModal) {
    hideTaskDetailsModal();
  }
}
