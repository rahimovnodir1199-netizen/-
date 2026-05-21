/**
 * LocalStorage persistence layer
 */

const Storage = {
  KEYS: {
    profile: 'sp_profile',
    tasks: 'sp_tasks',
    subjects: 'sp_subjects',
    schedule: 'sp_schedule',
    notes: 'sp_notes',
    settings: 'sp_settings',
    streak: 'sp_streak',
    weekSchedule: 'sp_week_schedule'
  },

  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  getProfile() {
    return this.get(this.KEYS.profile, { userType: null, onboarded: false });
  },

  saveProfile(profile) {
    this.set(this.KEYS.profile, profile);
  },

  getTasks() {
    return this.get(this.KEYS.tasks, []);
  },

  saveTasks(tasks) {
    this.set(this.KEYS.tasks, tasks);
  },

  getTask(id) {
    return this.getTasks().find(t => t.id === id);
  },

  upsertTask(task) {
    const tasks = this.getTasks();
    const idx = tasks.findIndex(t => t.id === task.id);
    if (idx >= 0) tasks[idx] = task;
    else tasks.unshift(task);
    this.saveTasks(tasks);
    return task;
  },

  deleteTask(id) {
    const tasks = this.getTasks().filter(t => t.id !== id);
    this.saveTasks(tasks);
  },

  getSubjects() {
    const custom = this.get(this.KEYS.subjects, []);
    const defaults = Utils.DEFAULT_SUBJECTS.map((s, i) => ({
      id: `default-${i}`,
      name: s.name,
      color: s.color,
      isDefault: true
    }));
    const customMapped = custom.map(s => ({ ...s, isDefault: false }));
    const names = new Set(customMapped.map(s => s.name));
    return [
      ...customMapped,
      ...defaults.filter(d => !names.has(d.name))
    ];
  },

  getCustomSubjects() {
    return this.get(this.KEYS.subjects, []);
  },

  saveCustomSubjects(subjects) {
    this.set(this.KEYS.subjects, subjects);
  },

  addSubject(name, color) {
    const subjects = this.getCustomSubjects();
    if (subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) return null;
    const subject = { id: Utils.generateId(), name, color };
    subjects.push(subject);
    this.saveCustomSubjects(subjects);
    return subject;
  },

  updateSubjectColor(id, color) {
    const subjects = this.getCustomSubjects();
    const s = subjects.find(x => x.id === id);
    if (s) {
      s.color = color;
      this.saveCustomSubjects(subjects);
    }
  },

  removeSubject(id) {
    const subjects = this.getCustomSubjects().filter(s => s.id !== id);
    this.saveCustomSubjects(subjects);
  },

  getSchedule() {
    const profile = this.getProfile();
    const preset = Utils.SCHEDULE_PRESETS[profile.userType || 'school'];
    return { ...preset, ...this.get(this.KEYS.schedule, {}) };
  },

  saveSchedule(schedule) {
    this.set(this.KEYS.schedule, schedule);
  },

  getSettings() {
    return this.get(this.KEYS.settings, {
      theme: 'dark',
      notifications: {
        tasks: true,
        lessons: true,
        deadlines: true
      }
    });
  },

  saveSettings(settings) {
    this.set(this.KEYS.settings, settings);
  },

  getNotes() {
    return this.get(this.KEYS.notes, '');
  },

  saveNotes(text) {
    this.set(this.KEYS.notes, text);
  },

  getStreak() {
    return this.get(this.KEYS.streak, { count: 0, lastDate: null });
  },

  saveStreak(streak) {
    this.set(this.KEYS.streak, streak);
  },

  updateStreakOnComplete() {
    const today = Utils.todayISO();
    const streak = this.getStreak();
    if (streak.lastDate === today) return streak;

    const yesterday = Utils.toISO(Utils.addDays(new Date(), -1));
    if (streak.lastDate === yesterday) {
      streak.count += 1;
    } else if (streak.lastDate !== today) {
      streak.count = 1;
    }
    streak.lastDate = today;
    this.saveStreak(streak);
    return streak;
  },

  getWeekSchedule() {
    return this.get(this.KEYS.weekSchedule, {});
  },

  saveWeekSchedule(data) {
    this.set(this.KEYS.weekSchedule, data);
  },

  exportAll() {
    return {
      profile: this.getProfile(),
      tasks: this.getTasks(),
      subjects: this.getCustomSubjects(),
      schedule: this.getSchedule(),
      notes: this.getNotes(),
      settings: this.getSettings(),
      streak: this.getStreak(),
      weekSchedule: this.getWeekSchedule(),
      exportedAt: new Date().toISOString()
    };
  },

  clearAll() {
    Object.values(this.KEYS).forEach(k => this.remove(k));
  },

  getStats() {
    const tasks = this.getTasks().filter(t => !t.archived);
    const done = tasks.filter(t => t.completed).length;
    const weekStart = Utils.toISO(Utils.startOfWeek());
    const weekDone = tasks.filter(t =>
      t.completed && t.completedAt && t.completedAt >= weekStart
    ).length;
    return {
      total: tasks.length,
      done,
      week: weekDone,
      rate: tasks.length ? Math.round((done / tasks.length) * 100) : 0
    };
  }
};
