/**
 * script.js — Task List
 * Full CRUD + filter logic using Vanilla JavaScript.
 * Data is persisted in localStorage so tasks survive page refresh.
 */

// ============================================================
//  CONSTANTS & STATE
// ============================================================

/** LocalStorage key for persisting tasks */
const STORAGE_KEY = "tasklist_tasks";

/**
 * @typedef  {Object} Task
 * @property {string}  id        - Unique identifier (timestamp-based)
 * @property {string}  title     - Task description
 * @property {boolean} completed - Whether the task is done
 */

/** @type {Task[]} In-memory task array */
let tasks = [];

/** @type {'all'|'active'|'completed'} Currently active filter */
let currentFilter = "all";

/** ID of the task currently being edited (null when modal is closed) */
let editingTaskId = null;

// ============================================================
//  DOM REFERENCES
// ============================================================

const taskForm          = document.getElementById("task-form");
const taskInput         = document.getElementById("task-input");
const validationMsg     = document.getElementById("validation-msg");
const taskList          = document.getElementById("task-list");
const emptyState        = document.getElementById("empty-state");
const emptyMsg          = document.getElementById("empty-msg");
const activeCountEl     = document.getElementById("active-count");
const clearCompletedBtn = document.getElementById("clear-completed-btn");
const filterBtns        = document.querySelectorAll(".filter-btn");

// Modal elements
const modalOverlay  = document.getElementById("modal-overlay");
const modalInput    = document.getElementById("modal-input");
const modalSaveBtn  = document.getElementById("modal-save");
const modalCancelBtn = document.getElementById("modal-cancel");

// ============================================================
//  PERSISTENCE HELPERS
// ============================================================

/** Load tasks from localStorage into the `tasks` array */
function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    tasks = stored ? JSON.parse(stored) : [];
  } catch {
    tasks = [];
  }
}

/** Persist the current `tasks` array to localStorage */
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// ============================================================
//  CORE CRUD OPERATIONS
// ============================================================

/**
 * Create and add a new task.
 * @param {string} title - Task title (already trimmed)
 */
function addTask(title) {
  /** @type {Task} */
  const newTask = {
    id:        String(Date.now()),
    title,
    completed: false,
  };
  tasks.unshift(newTask); // newest task appears at the top
  saveTasks();
  render();

  // Animate the first item after render
  const firstItem = taskList.querySelector(".task-item");
  if (firstItem) firstItem.classList.add("task-item--new");
}

/**
 * Toggle the completed status of a task.
 * @param {string} id - Task ID
 */
function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveTasks();
  render();
}

/**
 * Update the title of an existing task.
 * @param {string} id    - Task ID
 * @param {string} title - New title (already trimmed)
 */
function updateTask(id, title) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  task.title = title;
  saveTasks();
  render();
}

/**
 * Remove a task by ID.
 * @param {string} id - Task ID
 */
function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  render();
}

/** Remove all completed tasks */
function clearCompleted() {
  tasks = tasks.filter((t) => !t.completed);
  saveTasks();
  render();
}

// ============================================================
//  FILTER LOGIC
// ============================================================

/**
 * Return the subset of tasks matching the current filter.
 * @returns {Task[]}
 */
function getFilteredTasks() {
  switch (currentFilter) {
    case "active":
      return tasks.filter((t) => !t.completed);
    case "completed":
      return tasks.filter((t) => t.completed);
    default:
      return tasks;
  }
}

// ============================================================
//  RENDER
// ============================================================

/** Re-render the entire task list and update stats */
function render() {
  const filtered = getFilteredTasks();

  // Clear current list
  taskList.innerHTML = "";

  if (filtered.length === 0) {
    // Show empty state with context-aware message
    emptyState.classList.remove("hidden");
    emptyState.classList.add("flex");
    emptyMsg.textContent =
      currentFilter === "completed"
        ? "No completed tasks."
        : currentFilter === "active"
        ? "No active tasks."
        : "No tasks yet. Add one above!";
  } else {
    emptyState.classList.add("hidden");
    emptyState.classList.remove("flex");

    // Build a document fragment for performance
    const fragment = document.createDocumentFragment();
    filtered.forEach((task) => {
      fragment.appendChild(createTaskElement(task));
    });
    taskList.appendChild(fragment);
  }

  updateFooter();
}

/**
 * Build and return a <li> DOM element for a single task.
 * @param   {Task}        task
 * @returns {HTMLElement}
 */
function createTaskElement(task) {
  const li = document.createElement("li");
  li.className  = "task-item";
  li.dataset.id = task.id;

  // ----- Checkbox -----
  const checkbox = document.createElement("input");
  checkbox.type      = "checkbox";
  checkbox.className = "task-checkbox";
  checkbox.checked   = task.completed;
  checkbox.setAttribute("aria-label", `Mark "${task.title}" as ${task.completed ? "active" : "completed"}`);
  checkbox.addEventListener("change", () => toggleTask(task.id));

  // ----- Title -----
  const title = document.createElement("span");
  title.className = `task-title${task.completed ? " task-title--completed" : ""}`;
  title.textContent = task.title;

  // ----- Edit button -----
  const editBtn = document.createElement("button");
  editBtn.className = "btn-action";
  editBtn.setAttribute("aria-label", `Edit task: ${task.title}`);
  editBtn.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>`;
  editBtn.addEventListener("click", () => openEditModal(task));

  // ----- Delete button -----
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn-action btn-action--delete";
  deleteBtn.setAttribute("aria-label", `Delete task: ${task.title}`);
  deleteBtn.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>`;
  deleteBtn.addEventListener("click", () => deleteTask(task.id));

  li.appendChild(checkbox);
  li.appendChild(title);
  li.appendChild(editBtn);
  li.appendChild(deleteBtn);

  return li;
}

/** Update the footer counter and "Clear completed" button visibility */
function updateFooter() {
  const activeCount     = tasks.filter((t) => !t.completed).length;
  const completedCount  = tasks.filter((t) =>  t.completed).length;

  activeCountEl.textContent = `${activeCount} task${activeCount !== 1 ? "s" : ""} left`;

  if (completedCount > 0) {
    clearCompletedBtn.classList.remove("hidden");
  } else {
    clearCompletedBtn.classList.add("hidden");
  }
}

// ============================================================
//  EDIT MODAL
// ============================================================

/**
 * Open the edit modal pre-filled with the task's current title.
 * @param {Task} task
 */
function openEditModal(task) {
  editingTaskId     = task.id;
  modalInput.value  = task.title;
  modalOverlay.classList.remove("hidden");
  // Focus the input after the transition
  setTimeout(() => modalInput.focus(), 50);
}

/** Close the edit modal and reset state */
function closeEditModal() {
  modalOverlay.classList.add("hidden");
  editingTaskId    = null;
  modalInput.value = "";
}

/** Save changes from the edit modal */
function saveEdit() {
  const newTitle = modalInput.value.trim();
  if (!newTitle) {
    modalInput.classList.add("ring-2", "ring-red-400");
    setTimeout(() => modalInput.classList.remove("ring-2", "ring-red-400"), 1200);
    return;
  }
  updateTask(editingTaskId, newTitle);
  closeEditModal();
}

// ============================================================
//  VALIDATION HELPER
// ============================================================

/**
 * Show or hide the add-form validation message.
 * @param {string} message - Empty string clears the message.
 */
function setValidation(message) {
  if (message) {
    validationMsg.textContent = message;
    validationMsg.classList.remove("hidden");
  } else {
    validationMsg.textContent = "";
    validationMsg.classList.add("hidden");
  }
}

// ============================================================
//  EVENT LISTENERS
// ============================================================

// --- Add task form ---
taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = taskInput.value.trim();

  if (!title) {
    setValidation("Task title cannot be empty.");
    taskInput.focus();
    return;
  }

  setValidation("");
  addTask(title);
  taskInput.value = "";
  taskInput.focus();
});

// Clear validation message when user starts typing
taskInput.addEventListener("input", () => setValidation(""));

// --- Filter buttons ---
filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentFilter = btn.dataset.filter;

    // Update active styling
    filterBtns.forEach((b) => b.classList.remove("filter-btn--active"));
    btn.classList.add("filter-btn--active");

    render();
  });
});

// --- Clear completed ---
clearCompletedBtn.addEventListener("click", clearCompleted);

// --- Modal: Save ---
modalSaveBtn.addEventListener("click", saveEdit);

// --- Modal: Cancel ---
modalCancelBtn.addEventListener("click", closeEditModal);

// --- Modal: Close on overlay click ---
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeEditModal();
});

// --- Modal: Save on Enter key ---
modalInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveEdit();
  if (e.key === "Escape") closeEditModal();
});

// --- Add: Submit on Enter (redundant safety for non-submit buttons) ---
taskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") taskForm.dispatchEvent(new Event("submit"));
});

// ============================================================
//  INITIALISATION
// ============================================================

/** Bootstrap the app */
function init() {
  loadTasks();
  render();
}

// Run on DOM ready
document.addEventListener("DOMContentLoaded", init);
