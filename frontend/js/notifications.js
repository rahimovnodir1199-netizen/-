/**
 * Browser notifications (push-style via Notification API)
 */

const Notifications = {
  permission: 'default',
  checkInterval: null,

  async init() {
    if (!('Notification' in window)) return false;
    this.permission = Notification.permission;
    this.updateStatusUI();
    this.startScheduler();
    return true;
  },

  async requestPermission() {
    if (!('Notification' in window)) {
      App?.toast?.('Браузер не поддерживает уведомления', 'error');
      return false;
    }
    const result = await Notification.requestPermission();
    this.permission = result;
    this.updateStatusUI();
    if (result === 'granted') {
      this.show('Планировщик', 'Уведомления включены! 🎉', { tag: 'welcome' });
      App?.toast?.('Push-уведомления включены', 'success');
    } else if (result === 'denied') {
      App?.toast?.('Разрешите уведомления в настройках браузера', 'error');
    }
    return result === 'granted';
  },

  updateStatusUI() {
    const el = document.getElementById('notifStatus');
    if (!el) return;
    const labels = {
      granted: 'Статус: включены ✓',
      denied: 'Статус: заблокированы',
      default: 'Статус: не запрошено'
    };
    el.textContent = labels[this.permission] || labels.default;
  },

  canNotify() {
    return 'Notification' in window && Notification.permission === 'granted';
  },

  show(title, body, options = {}) {
    if (!this.canNotify()) return null;
    const settings = Storage.getSettings();
    if (!settings.notifications) return null;

    try {
      return new Notification(title, {
        body,
        icon: options.icon || undefined,
        tag: options.tag || 'study-planner',
        requireInteraction: false,
        ...options
      });
    } catch (e) {
      console.warn('Notification error:', e);
      return null;
    }
  },

  notifyTask(task) {
    const settings = Storage.getSettings();
    if (!settings.notifications?.tasks) return;
    this.show(
      'Напоминание о задаче',
      task.title + (task.subject ? ` · ${task.subject}` : ''),
      { tag: `task-${task.id}` }
    );
  },

  notifyDeadline(task) {
    const settings = Storage.getSettings();
    if (!settings.notifications?.deadlines) return;
    this.show(
      'Приближается дедлайн',
      `${task.title} — ${Utils.formatDate(task.date)}`,
      { tag: `deadline-${task.id}` }
    );
  },

  notifyLesson(slot, subject) {
    const settings = Storage.getSettings();
    if (!settings.notifications?.lessons) return;
    this.show(
      'Скоро урок',
      `${subject || slot.label} в ${slot.start}`,
      { tag: `lesson-${slot.start}` }
    );
  },

  startScheduler() {
    if (this.checkInterval) clearInterval(this.checkInterval);
    this.checkInterval = setInterval(() => this.checkReminders(), 60000);
    this.checkReminders();
  },

  checkReminders() {
    if (!this.canNotify()) return;

    const now = new Date();
    const today = Utils.todayISO();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const notifiedKey = `sp_notified_${today}`;
    const notified = JSON.parse(sessionStorage.getItem(notifiedKey) || '[]');

    const tasks = Storage.getTasks().filter(t => !t.completed && !t.archived && t.date === today);

    tasks.forEach(task => {
      if (!task.time) return;
      const taskMin = Utils.parseTime(task.time);
      const diff = taskMin - currentMin;
      const key = `task-${task.id}-${task.time}`;

      if (diff > 0 && diff <= 15 && !notified.includes(key)) {
        this.notifyTask(task);
        notified.push(key);
      }
    });

    tasks.filter(t => t.date && t.date >= today).forEach(task => {
      const d = new Date(task.date + 'T12:00:00');
      const daysLeft = Math.ceil((d - new Date(today + 'T12:00:00')) / 86400000);
      const key = `deadline-${task.id}-${today}`;
      if (daysLeft === 1 && daysLeft > 0 && !notified.includes(key)) {
        this.notifyDeadline(task);
        notified.push(key);
      }
    });

    const schedule = Storage.getSchedule();
    const slots = Utils.buildScheduleSlots(schedule);
    const lessonSlots = slots.filter(s => s.type === 'lesson');

    lessonSlots.forEach(slot => {
      const startMin = Utils.parseTime(slot.start);
      const diff = startMin - currentMin;
      const key = `lesson-${slot.start}`;
      if (diff > 0 && diff <= 10 && !notified.includes(key)) {
        const weekSched = Storage.getWeekSchedule();
        const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
        const subject = weekSched[dayKey]?.[slot.number - 1] || slot.label;
        this.notifyLesson(slot, subject);
        notified.push(key);
      }
    });

    sessionStorage.setItem(notifiedKey, JSON.stringify(notified));
  }
};
