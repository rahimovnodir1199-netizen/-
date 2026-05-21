/**
 * Планировщик — Main Application
 */

const App = {
  state: {
    currentPage: 'home',
    weekOffset: 0,
    monthOffset: 0,
    selectedWeekDay: null,
    selectedCalDay: null,
    editingTaskId: null,
    searchQuery: ''
  },

  init() {
    this.applyTheme(Storage.getSettings().theme || 'dark');
    this.bindEvents();

    const profile = Storage.getProfile();
    if (!profile.onboarded || !profile.userType) {
      this.showOnboarding();
    } else {
      this.showApp();
      this.bootstrap();
    }

    Notifications.init();
  },

  showOnboarding() {
    document.getElementById('onboarding').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
    document.querySelectorAll('.choice-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const userType = btn.dataset.userType;
        Storage.saveProfile({ userType, onboarded: true });
        Storage.saveSchedule(Utils.SCHEDULE_PRESETS[userType]);
        this.showApp();
        this.bootstrap();
        document.getElementById('onboarding').classList.add('hidden');
        this.toast(`Добро пожаловать! Режим: ${userType === 'school' ? 'школьник' : 'студент'}`, 'success');
      });
    });
  },

  showApp() {
    document.getElementById('onboarding').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
  },

  bootstrap() {
    const profile = Storage.getProfile();
    const typeLabel = profile.userType === 'student' ? 'Студент' : 'Школьник';
    document.getElementById('userTypeBadge').textContent = typeLabel;

    document.querySelectorAll(`input[name="userType"][value="${profile.userType}"]`).forEach(r => {
      r.checked = true;
    });

    this.loadScheduleSettings();
    this.populateSubjects();
    this.loadNotes();
    this.navigateTo(this.getPageFromHash() || 'home');
    this.renderAll();
  },

  bindEvents() {
    document.querySelectorAll('[data-page]').forEach(el => {
      el.addEventListener('click', e => {
        const page = el.dataset.page;
        if (page && (el.tagName === 'A' || el.classList.contains('link-more'))) {
          e.preventDefault();
          this.navigateTo(page);
        }
      });
    });

    window.addEventListener('hashchange', () => {
      const page = this.getPageFromHash();
      if (page) this.navigateTo(page, false);
    });

    document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());
    document.getElementById('menuToggle')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    document.getElementById('quickAddBtn')?.addEventListener('click', () => this.showQuickAdd());
    document.getElementById('fabAdd')?.addEventListener('click', () => this.openTaskModal());
    document.getElementById('addTaskBtn')?.addEventListener('click', () => this.openTaskModal());

    const quickBar = document.getElementById('quickAddBar');
    document.getElementById('quickAddSubmit')?.addEventListener('click', () => this.submitQuickAdd());
    document.getElementById('quickAddInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') this.submitQuickAdd();
      if (e.key === 'Escape') quickBar.classList.add('hidden');
    });
    document.getElementById('quickAddExpand')?.addEventListener('click', () => {
      const title = document.getElementById('quickAddInput').value;
      quickBar.classList.add('hidden');
      this.openTaskModal(null, title);
    });

    document.getElementById('closeTaskModal')?.addEventListener('click', () => this.closeTaskModal());
    document.getElementById('taskModal')?.addEventListener('click', e => {
      if (e.target.id === 'taskModal') this.closeTaskModal();
    });

    document.getElementById('taskForm')?.addEventListener('submit', e => {
      e.preventDefault();
      this.saveTask();
    });

    document.getElementById('deleteTaskBtn')?.addEventListener('click', () => this.deleteCurrentTask());
    document.getElementById('archiveTaskBtn')?.addEventListener('click', () => {
      if (this.state.editingTaskId) this.archiveCurrentTask();
      else this.closeTaskModal();
    });

    document.querySelectorAll('.matrix-pick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.matrix-pick-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('taskQuadrant').value = btn.dataset.quadrant;
      });
    });

    document.getElementById('globalSearch')?.addEventListener('input', Utils.debounce(e => {
      this.state.searchQuery = e.target.value.trim().toLowerCase();
      this.renderTasks();
      if (this.state.searchQuery) this.navigateTo('tasks');
    }, 200));

    document.getElementById('filterSubject')?.addEventListener('change', () => this.renderTasks());
    document.getElementById('filterPriority')?.addEventListener('change', () => this.renderTasks());
    document.getElementById('filterStatus')?.addEventListener('change', () => this.renderTasks());
    document.getElementById('filterCategory')?.addEventListener('change', () => this.renderTasks());

    document.getElementById('prevWeek')?.addEventListener('click', () => { this.state.weekOffset--; this.renderWeek(); });
    document.getElementById('nextWeek')?.addEventListener('click', () => { this.state.weekOffset++; this.renderWeek(); });
    document.getElementById('todayWeek')?.addEventListener('click', () => {
      this.state.weekOffset = 0;
      this.state.selectedWeekDay = Utils.todayISO();
      this.renderWeek();
    });

    document.getElementById('prevMonth')?.addEventListener('click', () => { this.state.monthOffset--; this.renderCalendar(); });
    document.getElementById('nextMonth')?.addEventListener('click', () => { this.state.monthOffset++; this.renderCalendar(); });

    document.getElementById('saveNoteBtn')?.addEventListener('click', () => this.saveNotes());
    document.getElementById('quickNotes')?.addEventListener('blur', () => this.saveNotes());

    document.querySelectorAll('input[name="userType"]').forEach(r => {
      r.addEventListener('change', () => {
        const userType = r.value;
        Storage.saveProfile({ ...Storage.getProfile(), userType });
        Storage.saveSchedule(Utils.SCHEDULE_PRESETS[userType]);
        this.loadScheduleSettings();
        document.getElementById('userTypeBadge').textContent = userType === 'student' ? 'Студент' : 'Школьник';
        this.renderAll();
        this.toast('Тип обучения обновлён', 'success');
      });
    });

    ['lessonDuration', 'shortBreak', 'longBreak', 'longBreakAfter', 'schoolStart', 'lessonsPerDay'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => this.saveScheduleFromForm());
    });

    document.getElementById('applySchedulePreset')?.addEventListener('click', () => {
      const profile = Storage.getProfile();
      Storage.saveSchedule(Utils.SCHEDULE_PRESETS[profile.userType || 'school']);
      this.loadScheduleSettings();
      this.renderTimeline();
      this.toast('Пресет расписания применён', 'success');
    });

    document.getElementById('addSubjectBtn')?.addEventListener('click', () => this.addSubject());
    document.getElementById('enablePushBtn')?.addEventListener('click', () => Notifications.requestPermission());

    ['notifTasks', 'notifLessons', 'notifDeadlines'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => this.saveNotifSettings());
    });

    document.getElementById('exportDataBtn')?.addEventListener('click', () => this.exportData());
    document.getElementById('clearDataBtn')?.addEventListener('click', () => {
      if (confirm('Удалить все данные? Это действие нельзя отменить.')) {
        Storage.clearAll();
        location.reload();
      }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.closeTaskModal();
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('globalSearch')?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        this.showQuickAdd();
      }
    });
  },

  getPageFromHash() {
    const hash = location.hash.replace('#', '');
    const pages = ['home', 'planner', 'tasks', 'calendar', 'matrix', 'settings'];
    return pages.includes(hash) ? hash : null;
  },

  navigateTo(page, updateHash = true) {
    this.state.currentPage = page;
    if (updateHash) location.hash = page;

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`)?.classList.add('active');

    document.querySelectorAll('.nav-link, .bottom-nav__link').forEach(link => {
      link.classList.toggle('active', link.dataset.page === page);
    });

    document.getElementById('sidebar')?.classList.remove('open');
    this.renderPage(page);
  },

  renderPage(page) {
    switch (page) {
      case 'home': this.renderHome(); break;
      case 'planner': this.renderWeek(); break;
      case 'tasks': this.renderTasks(); break;
      case 'calendar': this.renderCalendar(); break;
      case 'matrix': this.renderMatrix(); break;
      case 'settings': this.renderSettings(); break;
    }
  },

  renderAll() {
    this.renderHome();
    this.renderWeek();
    this.renderTasks();
    this.renderCalendar();
    this.renderMatrix();
    this.renderSettings();
    this.updateSidebarStats();
  },

  /* ---- Theme ---- */
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const isDark = theme === 'dark';
    document.querySelector('.icon-sun')?.classList.toggle('hidden', isDark);
    document.querySelector('.icon-moon')?.classList.toggle('hidden', !isDark);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = isDark ? '#0a1628' : '#f1f5f9';
  },

  toggleTheme() {
    const settings = Storage.getSettings();
    settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
    Storage.saveSettings(settings);
    this.applyTheme(settings.theme);
  },

  /* ---- Tasks CRUD ---- */
  openTaskModal(taskId = null, presetTitle = '') {
    const modal = document.getElementById('taskModal');
    const form = document.getElementById('taskForm');
    form.reset();
    document.querySelectorAll('.matrix-pick-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('taskQuadrant').value = '';

    this.state.editingTaskId = taskId;
    document.getElementById('taskModalTitle').textContent = taskId ? 'Редактировать задачу' : 'Новая задача';
    document.getElementById('deleteTaskBtn').classList.toggle('hidden', !taskId);
    const archiveBtn = document.getElementById('archiveTaskBtn');
    archiveBtn.textContent = taskId ? 'В архив' : 'Отмена';
    archiveBtn.classList.toggle('hidden', false);

    this.populateSubjectSelect();

    if (taskId) {
      const task = Storage.getTask(taskId);
      if (task) {
        document.getElementById('taskId').value = task.id;
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskSubject').value = task.subject || '';
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskDate').value = task.date || '';
        document.getElementById('taskTime').value = task.time || '';
        document.getElementById('taskCategory').value = task.category || 'study';
        document.getElementById('taskPriority').value = task.priority || 'medium';
        if (task.quadrant) {
          document.getElementById('taskQuadrant').value = task.quadrant;
          document.querySelector(`.matrix-pick-btn[data-quadrant="${task.quadrant}"]`)?.classList.add('active');
        }
      }
    } else {
      document.getElementById('taskId').value = '';
      document.getElementById('taskTitle').value = presetTitle;
      document.getElementById('taskDate').value = Utils.todayISO();
    }

    modal.classList.remove('hidden');
    document.getElementById('taskTitle').focus();
  },

  closeTaskModal() {
    document.getElementById('taskModal').classList.add('hidden');
    this.state.editingTaskId = null;
  },

  saveTask() {
    const id = document.getElementById('taskId').value || Utils.generateId();
    const existing = Storage.getTask(id);
    const task = {
      id,
      title: document.getElementById('taskTitle').value.trim(),
      subject: document.getElementById('taskSubject').value,
      description: document.getElementById('taskDescription').value.trim(),
      date: document.getElementById('taskDate').value,
      time: document.getElementById('taskTime').value,
      category: document.getElementById('taskCategory').value,
      priority: document.getElementById('taskPriority').value,
      quadrant: document.getElementById('taskQuadrant').value || null,
      completed: existing?.completed || false,
      archived: existing?.archived || false,
      completedAt: existing?.completedAt || null,
      createdAt: existing?.createdAt || new Date().toISOString()
    };

    if (!task.title) {
      this.toast('Введите название задачи', 'error');
      return;
    }

    Storage.upsertTask(task);
    this.closeTaskModal();
    this.renderAll();
    this.toast('Задача сохранена', 'success');
  },

  submitQuickAdd() {
    const input = document.getElementById('quickAddInput');
    const title = input.value.trim();
    if (!title) return;

    const task = {
      id: Utils.generateId(),
      title,
      subject: '',
      description: '',
      date: Utils.todayISO(),
      time: '',
      category: 'study',
      priority: 'medium',
      quadrant: null,
      completed: false,
      archived: false,
      createdAt: new Date().toISOString()
    };

    Storage.upsertTask(task);
    input.value = '';
    document.getElementById('quickAddBar').classList.add('hidden');
    this.renderAll();
    this.toast('Задача добавлена', 'success');
  },

  showQuickAdd() {
    const bar = document.getElementById('quickAddBar');
    bar.classList.remove('hidden');
    document.getElementById('quickAddInput').focus();
  },

  toggleTaskComplete(id) {
    const tasks = Storage.getTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;
    if (task.completed) Storage.updateStreakOnComplete();
    Storage.saveTasks(tasks);
    this.renderAll();
  },

  deleteCurrentTask() {
    const id = document.getElementById('taskId').value;
    if (id && confirm('Удалить задачу навсегда?')) {
      Storage.deleteTask(id);
      this.closeTaskModal();
      this.renderAll();
      this.toast('Задача удалена', 'success');
    }
  },

  archiveCurrentTask() {
    const id = document.getElementById('taskId').value;
    if (!id) {
      this.closeTaskModal();
      return;
    }
    const task = Storage.getTask(id);
    if (task) {
      task.archived = true;
      Storage.upsertTask(task);
      this.closeTaskModal();
      this.renderAll();
      this.toast('Задача в архиве', 'success');
    }
  },

  setTaskQuadrant(id, quadrant) {
    const task = Storage.getTask(id);
    if (task) {
      task.quadrant = quadrant;
      Storage.upsertTask(task);
      this.renderMatrix();
      this.renderMatrixMini();
      this.toast('Категория матрицы обновлена', 'success');
    }
  },

  /* ---- Render task card ---- */
  renderTaskCard(task, options = {}) {
    const subjects = Storage.getSubjects();
    const subj = subjects.find(s => s.name === task.subject);
    const color = subj?.color || '#3b82f6';
    const priorityClass = `tag-priority-${task.priority || 'medium'}`;

    return `
      <article class="task-card ${task.completed ? 'completed' : ''}" data-id="${task.id}">
        <div class="task-check" role="checkbox" aria-checked="${task.completed}" data-action="toggle">
          ${task.completed ? '✓' : ''}
        </div>
        <div class="task-card__body" data-action="edit">
          <div class="task-card__title">${Utils.escapeHtml(task.title)}</div>
          <div class="task-card__meta">
            ${task.subject ? `<span class="tag tag-subject" style="background:${color}">${Utils.escapeHtml(task.subject)}</span>` : ''}
            <span class="tag ${priorityClass}">${Utils.PRIORITY_LABELS[task.priority] || 'Средний'}</span>
            ${task.date ? `<span class="tag">📅 ${Utils.formatDate(task.date, { short: true })}${task.time ? ' ' + task.time : ''}</span>` : ''}
            ${task.category ? `<span class="tag">${Utils.CATEGORY_LABELS[task.category] || ''}</span>` : ''}
          </div>
          ${task.description ? `<p class="task-card__desc-preview">${Utils.escapeHtml(task.description)}</p>` : ''}
        </div>
        ${options.showMatrix ? `
          <div class="task-card__actions">
            <button class="matrix-icon-btn ${task.quadrant === 'urgent-important' ? 'active' : ''}" data-action="quadrant" data-q="urgent-important" title="Q1">Q1</button>
            <button class="matrix-icon-btn ${task.quadrant === 'not-urgent-important' ? 'active' : ''}" data-action="quadrant" data-q="not-urgent-important" title="Q2">Q2</button>
            <button class="matrix-icon-btn ${task.quadrant === 'urgent-not-important' ? 'active' : ''}" data-action="quadrant" data-q="urgent-not-important" title="Q3">Q3</button>
            <button class="matrix-icon-btn ${task.quadrant === 'not-urgent-not-important' ? 'active' : ''}" data-action="quadrant" data-q="not-urgent-not-important" title="Q4">Q4</button>
          </div>
        ` : ''}
      </article>
    `;
  },

  bindTaskListEvents(container) {
    if (!container) return;
    container.querySelectorAll('.task-card').forEach(card => {
      const id = card.dataset.id;
      card.querySelector('[data-action="toggle"]')?.addEventListener('click', e => {
        e.stopPropagation();
        this.toggleTaskComplete(id);
      });
      card.querySelector('[data-action="edit"]')?.addEventListener('click', () => this.openTaskModal(id));
      card.querySelectorAll('[data-action="quadrant"]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          this.setTaskQuadrant(id, btn.dataset.q);
        });
      });
    });
  },

  filterTasks(tasks) {
    const subject = document.getElementById('filterSubject')?.value;
    const priority = document.getElementById('filterPriority')?.value;
    const status = document.getElementById('filterStatus')?.value || 'active';
    const category = document.getElementById('filterCategory')?.value;
    const q = this.state.searchQuery;

    return tasks.filter(t => {
      if (q && !t.title.toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q)) return false;
      if (subject && t.subject !== subject) return false;
      if (priority && t.priority !== priority) return false;
      if (category && t.category !== category) return false;
      if (status === 'all') return true;
      if (status === 'active' && (t.archived || t.completed)) return false;
      if (status === 'completed' && (!t.completed || t.archived)) return false;
      if (status === 'archived' && !t.archived) return false;
      return true;
    });
  },

  /* ---- Home ---- */
  renderHome() {
    document.getElementById('greeting').textContent = `${Utils.getGreeting()}!`;
    document.getElementById('todayDate').textContent = Utils.formatDateFull();

    const today = Utils.todayISO();
    const tasks = Storage.getTasks().filter(t => !t.archived);
    const todayTasks = tasks.filter(t => t.date === today || (!t.date && !t.completed));

    const doneToday = todayTasks.filter(t => t.completed).length;
    const totalToday = todayTasks.length || 1;
    const pct = totalToday ? Math.round((doneToday / totalToday) * 100) : 0;

    document.getElementById('progressPercent').textContent = `${pct}%`;
    document.getElementById('progressDetail').textContent = `${doneToday} из ${todayTasks.length} задач`;
    const ring = document.getElementById('progressRing');
    if (ring) {
      const offset = 327 - (327 * pct) / 100;
      ring.style.strokeDashoffset = offset;
    }

    const streak = Storage.getStreak();
    document.getElementById('streakCount').textContent = streak.count;

    const deadlines = tasks
      .filter(t => !t.completed && t.date && t.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);

    const dlList = document.getElementById('deadlinesList');
    dlList.innerHTML = deadlines.length
      ? deadlines.map(t => `<li data-id="${t.id}"><span>📌</span> ${Utils.escapeHtml(t.title)} <span style="margin-left:auto;color:var(--text-muted)">${Utils.formatDate(t.date, { short: true })}</span></li>`).join('')
      : '<li class="empty-msg">Нет ближайших дедлайнов</li>';

    dlList.querySelectorAll('li[data-id]').forEach(li => {
      li.addEventListener('click', () => this.openTaskModal(li.dataset.id));
    });

    const todayEl = document.getElementById('todayTasks');
    todayEl.innerHTML = todayTasks.length
      ? todayTasks.map(t => this.renderTaskCard(t)).join('')
      : '<div class="empty-state"><p>Нет задач на сегодня</p><p>Нажмите «+ Задача» чтобы добавить</p></div>';
    this.bindTaskListEvents(todayEl);

    this.renderTimeline();
    this.renderMatrixMini();
    this.updateSidebarStats();
  },

  renderTimeline() {
    const schedule = Storage.getSchedule();
    const profile = Storage.getProfile();
    const label = profile.userType === 'student' ? 'пара' : 'урок';
    const slots = Utils.buildScheduleSlots(schedule);
    const el = document.getElementById('todayTimeline');

    el.innerHTML = slots.map(slot => `
      <div class="timeline-slot ${slot.type === 'break' ? 'break' : ''}">
        <span class="timeline-slot__time">${slot.start} – ${slot.end}</span>
        <div class="timeline-slot__info">
          <h4>${slot.type === 'lesson' ? `${label.charAt(0).toUpperCase() + label.slice(1)} ${slot.number}` : slot.label}</h4>
          <span>${slot.type === 'lesson' ? `${schedule.lessonDuration} мин` : ''}</span>
        </div>
      </div>
    `).join('');
  },

  renderMatrixMini() {
    const tasks = Storage.getTasks().filter(t => !t.archived && !t.completed);
    const quadrants = ['urgent-important', 'not-urgent-important', 'urgent-not-important', 'not-urgent-not-important'];
    const labels = ['Важно + срочно', 'Важно', 'Срочно', 'Не срочно'];

    document.getElementById('matrixMini').innerHTML = quadrants.map((q, i) => {
      const count = tasks.filter(t => t.quadrant === q).length;
      return `<div class="matrix-mini__cell"><span>${labels[i]}</span><span class="matrix-mini__count">${count}</span></div>`;
    }).join('');
  },

  /* ---- Week planner ---- */
  renderWeek() {
    const start = Utils.startOfWeek();
    start.setDate(start.getDate() + this.state.weekOffset * 7);

    const end = Utils.addDays(start, 6);
    document.getElementById('weekLabel').textContent =
      `${start.getDate()} – ${end.getDate()} ${Utils.MONTHS_RU[end.getMonth()]}`;

    const tasks = Storage.getTasks();
    const today = Utils.todayISO();
    if (!this.state.selectedWeekDay) this.state.selectedWeekDay = today;

    const grid = document.getElementById('weekGrid');
    grid.innerHTML = '';

    for (let i = 0; i < 7; i++) {
      const d = Utils.addDays(start, i);
      const iso = Utils.toISO(d);
      const dayTasks = tasks.filter(t => t.date === iso && !t.archived);
      const isToday = iso === today;
      const isSelected = iso === this.state.selectedWeekDay;

      const cell = document.createElement('div');
      cell.className = `week-day${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`;
      cell.innerHTML = `
        <div class="week-day__name">${Utils.DAYS_SHORT[d.getDay()]}</div>
        <div class="week-day__num">${d.getDate()}</div>
        <div class="week-day__dots">
          ${dayTasks.slice(0, 4).map(t => {
            const subj = Storage.getSubjects().find(s => s.name === t.subject);
            return `<span class="week-day__dot" style="background:${subj?.color || '#3b82f6'}"></span>`;
          }).join('')}
        </div>
      `;
      cell.addEventListener('click', () => {
        this.state.selectedWeekDay = iso;
        this.renderWeek();
      });
      grid.appendChild(cell);
    }

    const profile = Storage.getProfile();
    document.getElementById('scheduleModeLabel').textContent =
      `Режим: ${profile.userType === 'student' ? 'студент (90 мин)' : 'школьник (45 мин)'}`;

    this.renderDayScheduleDetail();
  },

  renderDayScheduleDetail() {
    const schedule = Storage.getSchedule();
    const slots = Utils.buildScheduleSlots(schedule);
    const iso = this.state.selectedWeekDay || Utils.todayISO();
    const tasks = Storage.getTasks().filter(t => t.date === iso && !t.archived);

    const el = document.getElementById('selectedDaySchedule');
    const dateLabel = Utils.formatDate(iso);

    let html = `<p style="margin-bottom:12px;color:var(--text-secondary)">${dateLabel} — ${tasks.length} задач(и)</p>`;
    html += slots.map(slot => {
      if (slot.type === 'break') {
        return `<div class="timeline-slot break"><span class="timeline-slot__time">${slot.start}</span><div class="timeline-slot__info"><h4>${slot.label}</h4></div></div>`;
      }
      const related = tasks.filter(t => t.time && t.time >= slot.start && t.time < slot.end);
      return `
        <div class="timeline-slot">
          <span class="timeline-slot__time">${slot.start} – ${slot.end}</span>
          <div class="timeline-slot__info">
            <h4>Занятие ${slot.number}</h4>
            ${related.map(t => `<span style="display:block;margin-top:4px">📋 ${Utils.escapeHtml(t.title)}</span>`).join('') || '<span>Нет привязанных задач</span>'}
          </div>
        </div>
      `;
    }).join('');

    if (tasks.filter(t => !t.time).length) {
      html += `<p style="margin-top:16px;font-size:0.85rem;color:var(--text-muted)">Без времени: ${tasks.filter(t => !t.time).map(t => Utils.escapeHtml(t.title)).join(', ')}</p>`;
    }

    el.innerHTML = html;
  },

  /* ---- Tasks page ---- */
  renderTasks() {
    let tasks = Storage.getTasks();
    tasks = this.filterTasks(tasks);
    tasks.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    const el = document.getElementById('allTasks');
    el.innerHTML = tasks.length
      ? tasks.map(t => this.renderTaskCard(t, { showMatrix: true })).join('')
      : '<div class="empty-state"><p>Задач не найдено</p><p>Добавьте новую или измените фильтры</p></div>';
    this.bindTaskListEvents(el);
  },

  /* ---- Calendar ---- */
  renderCalendar() {
    const now = new Date();
    now.setMonth(now.getMonth() + this.state.monthOffset);
    const year = now.getFullYear();
    const month = now.getMonth();

    document.getElementById('monthLabel').textContent =
      `${Utils.MONTHS_RU[month].charAt(0).toUpperCase() + Utils.MONTHS_RU[month].slice(1)} ${year}`;

    const firstDay = new Date(year, month, 1);
    let startPad = firstDay.getDay() - 1;
    if (startPad < 0) startPad = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const tasks = Storage.getTasks();
    const today = Utils.todayISO();
    if (!this.state.selectedCalDay) this.state.selectedCalDay = today;

    const container = document.getElementById('calendarDays');
    container.innerHTML = '';

    for (let i = 0; i < startPad; i++) {
      const prev = new Date(year, month, -startPad + i + 1);
      container.appendChild(this.createCalDay(Utils.toISO(prev), tasks, today, true));
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      container.appendChild(this.createCalDay(iso, tasks, today, false));
    }

    const totalCells = startPad + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
      const next = new Date(year, month + 1, i);
      container.appendChild(this.createCalDay(Utils.toISO(next), tasks, today, true));
    }

    this.renderCalDayTasks();
  },

  createCalDay(iso, tasks, today, otherMonth) {
    const div = document.createElement('div');
    const dayTasks = tasks.filter(t => t.date === iso && !t.archived);
    const isToday = iso === today;
    const isSelected = iso === this.state.selectedCalDay;

    div.className = `cal-day${otherMonth ? ' other-month' : ''}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`;
    div.innerHTML = `
      <span>${parseInt(iso.split('-')[2], 10)}</span>
      ${dayTasks.length ? `<div class="cal-day__dots">${dayTasks.slice(0, 3).map(() => '<span class="cal-day__dot"></span>').join('')}</div>` : ''}
    `;
    div.addEventListener('click', () => {
      this.state.selectedCalDay = iso;
      this.renderCalendar();
    });
    return div;
  },

  renderCalDayTasks() {
    const iso = this.state.selectedCalDay || Utils.todayISO();
    document.getElementById('selectedCalDate').textContent = Utils.formatDate(iso);
    const tasks = Storage.getTasks().filter(t => t.date === iso && !t.archived);
    const el = document.getElementById('calDayTasks');
    el.innerHTML = tasks.length
      ? tasks.map(t => this.renderTaskCard(t)).join('')
      : '<div class="empty-state"><p>Нет задач на этот день</p></div>';
    this.bindTaskListEvents(el);
  },

  /* ---- Matrix ---- */
  renderMatrix() {
    const tasks = Storage.getTasks().filter(t => !t.archived && !t.completed && t.quadrant);
    const map = {
      'urgent-important': 'q-ui',
      'not-urgent-important': 'q-nui',
      'urgent-not-important': 'q-uni',
      'not-urgent-not-important': 'q-nuni'
    };

    Object.entries(map).forEach(([quadrant, elId]) => {
      const el = document.getElementById(elId);
      const qTasks = tasks.filter(t => t.quadrant === quadrant);
      el.innerHTML = qTasks.length
        ? qTasks.map(t => `<div class="matrix-task-item" data-id="${t.id}">${Utils.escapeHtml(t.title)}</div>`).join('')
        : '<span style="color:var(--text-muted);font-size:0.85rem">Пусто</span>';
      el.querySelectorAll('.matrix-task-item').forEach(item => {
        item.addEventListener('click', () => this.openTaskModal(item.dataset.id));
      });
    });
  },

  /* ---- Settings ---- */
  renderSettings() {
    const stats = Storage.getStats();
    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statDone').textContent = stats.done;
    document.getElementById('statWeek').textContent = stats.week;
    document.getElementById('statRate').textContent = `${stats.rate}%`;
    this.renderSubjectsList();
  },

  loadScheduleSettings() {
    const s = Storage.getSchedule();
    document.getElementById('lessonDuration').value = s.lessonDuration;
    document.getElementById('shortBreak').value = s.shortBreak;
    document.getElementById('longBreak').value = s.longBreak;
    document.getElementById('longBreakAfter').value = s.longBreakAfter;
    document.getElementById('schoolStart').value = s.schoolStart;
    document.getElementById('lessonsPerDay').value = s.lessonsPerDay;
  },

  saveScheduleFromForm() {
    Storage.saveSchedule({
      lessonDuration: +document.getElementById('lessonDuration').value,
      shortBreak: +document.getElementById('shortBreak').value,
      longBreak: +document.getElementById('longBreak').value,
      longBreakAfter: +document.getElementById('longBreakAfter').value,
      schoolStart: document.getElementById('schoolStart').value,
      lessonsPerDay: +document.getElementById('lessonsPerDay').value
    });
    this.renderTimeline();
  },

  saveNotifSettings() {
    const settings = Storage.getSettings();
    settings.notifications = {
      tasks: document.getElementById('notifTasks').checked,
      lessons: document.getElementById('notifLessons').checked,
      deadlines: document.getElementById('notifDeadlines').checked
    };
    Storage.saveSettings(settings);
  },

  populateSubjects() {
    this.populateSubjectSelect();
    const filter = document.getElementById('filterSubject');
    const subjects = Storage.getSubjects();
    const current = filter.value;
    filter.innerHTML = '<option value="">Все предметы</option>' +
      subjects.map(s => `<option value="${Utils.escapeHtml(s.name)}">${Utils.escapeHtml(s.name)}</option>`).join('');
    filter.value = current;
  },

  populateSubjectSelect() {
    const select = document.getElementById('taskSubject');
    const subjects = Storage.getSubjects();
    const current = select.value;
    select.innerHTML = '<option value="">— Выберите предмет —</option>' +
      subjects.map(s => `<option value="${Utils.escapeHtml(s.name)}">${Utils.escapeHtml(s.name)}</option>`).join('');
    select.value = current;
  },

  renderSubjectsList() {
    const custom = Storage.getCustomSubjects();
    const el = document.getElementById('subjectsList');
    if (!custom.length) {
      el.innerHTML = '<span style="color:var(--text-muted);font-size:0.85rem">Пока только стандартные предметы. Добавьте свой ниже.</span>';
      return;
    }
    el.innerHTML = custom.map(s => `
      <span class="subject-chip" style="background:${s.color}">
        ${Utils.escapeHtml(s.name)}
        <input type="color" value="${s.color}" data-id="${s.id}" title="Изменить цвет" style="width:20px;height:20px;border:none;padding:0;cursor:pointer">
        <button type="button" data-remove="${s.id}" aria-label="Удалить">×</button>
      </span>
    `).join('');

    el.querySelectorAll('input[type="color"]').forEach(input => {
      input.addEventListener('change', () => {
        Storage.updateSubjectColor(input.dataset.id, input.value);
        this.populateSubjects();
      });
    });
    el.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        Storage.removeSubject(btn.dataset.remove);
        this.renderSubjectsList();
        this.populateSubjects();
      });
    });
  },

  addSubject() {
    const name = document.getElementById('newSubjectName').value.trim();
    const color = document.getElementById('newSubjectColor').value;
    if (!name) {
      this.toast('Введите название предмета', 'error');
      return;
    }
    const result = Storage.addSubject(name, color);
    if (!result) {
      this.toast('Такой предмет уже есть', 'error');
      return;
    }
    document.getElementById('newSubjectName').value = '';
    this.renderSubjectsList();
    this.populateSubjects();
    this.toast('Предмет добавлен', 'success');
  },

  loadNotes() {
    document.getElementById('quickNotes').value = Storage.getNotes();
  },

  saveNotes() {
    Storage.saveNotes(document.getElementById('quickNotes').value);
    this.toast('Заметка сохранена', 'success');
  },

  updateSidebarStats() {
    const stats = Storage.getStats();
    const streak = Storage.getStreak();
    document.getElementById('sidebarStreak').textContent = streak.count;
    document.getElementById('sidebarProgress').textContent = `${stats.rate}%`;
  },

  exportData() {
    const data = Storage.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `study-planner-${Utils.todayISO()}.json`;
    a.click();
    this.toast('Данные экспортированы', 'success');
  },

  toast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
