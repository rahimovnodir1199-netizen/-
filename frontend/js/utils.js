/**
 * Utility helpers for Планировщик
 */

const Utils = {
  DAYS_RU: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
  DAYS_SHORT: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сс'],
  MONTHS_RU: [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ],

  DEFAULT_SUBJECTS: [
    { name: 'Математика', color: '#3b82f6' },
    { name: 'Алгебра', color: '#2563eb' },
    { name: 'Геометрия', color: '#1d4ed8' },
    { name: 'Русский язык', color: '#8b5cf6' },
    { name: 'Литература', color: '#7c3aed' },
    { name: 'Физика', color: '#06b6d4' },
    { name: 'Химия', color: '#14b8a6' },
    { name: 'Биология', color: '#22c55e' },
    { name: 'География', color: '#84cc16' },
    { name: 'История', color: '#eab308' },
    { name: 'Обществознание', color: '#f59e0b' },
    { name: 'Информатика', color: '#6366f1' },
    { name: 'Английский язык', color: '#ec4899' },
    { name: 'Немецкий язык', color: '#db2777' },
    { name: 'Французский язык', color: '#be185d' },
    { name: 'Испанский язык', color: '#9d174d' },
    { name: 'ОБЖ', color: '#ef4444' },
    { name: 'Физическая культура', color: '#f97316' },
    { name: 'ИЗО', color: '#a855f7' },
    { name: 'Музыка', color: '#d946ef' },
    { name: 'Технология', color: '#78716c' },
    { name: 'Черчение', color: '#57534e' },
    { name: 'Астрономия', color: '#0ea5e9' },
    { name: 'Экономика', color: '#10b981' },
    { name: 'Право', color: '#64748b' },
    { name: 'Философия', color: '#475569' },
    { name: 'Психология', color: '#f472b6' },
    { name: 'Логика', color: '#818cf8' },
    { name: 'Экология', color: '#4ade80' },
    { name: 'Основы безопасности', color: '#fb7185' },
    { name: 'Вероятность и статистика', color: '#38bdf8' },
    { name: 'Программирование', color: '#6366f1' },
    { name: 'Высшая математика', color: '#3b82f6' },
    { name: 'Линейная алгебра', color: '#2563eb' },
    { name: 'Математический анализ', color: '#1e40af' },
    { name: 'Теория вероятностей', color: '#0ea5e9' },
    { name: 'Дискретная математика', color: '#0284c7' },
    { name: 'Базы данных', color: '#0891b2' },
    { name: 'Операционные системы', color: '#0d9488' },
    { name: 'Сети и телекоммуникации', color: '#059669' },
    { name: 'Машинное обучение', color: '#7c3aed' },
    { name: 'Маркетинг', color: '#ea580c' },
    { name: 'Менеджмент', color: '#ca8a04' },
    { name: 'Бухгалтерский учёт', color: '#65a30d' },
    { name: 'Финансы', color: '#16a34a' },
    { name: 'Медицина (общее)', color: '#dc2626' },
    { name: 'Анатомия', color: '#b91c1c' },
    { name: 'Фармакология', color: '#991b1b' },
    { name: 'Архитектура', color: '#a3a3a3' },
    { name: 'Дизайн', color: '#c084fc' },
    { name: 'Журналистика', color: '#fbbf24' },
    { name: 'Лингвистика', color: '#f472b6' },
    { name: 'Социология', color: '#94a3b8' },
    { name: 'Политология', color: '#64748b' },
    { name: 'Культурология', color: '#a78bfa' },
    { name: 'Религиоведение', color: '#fcd34d' },
    { name: 'Физкультура', color: '#f97316' }
  ],

  SCHEDULE_PRESETS: {
    school: {
      lessonDuration: 45,
      shortBreak: 10,
      longBreak: 20,
      longBreakAfter: 2,
      schoolStart: '08:30',
      lessonsPerDay: 7
    },
    student: {
      lessonDuration: 90,
      shortBreak: 10,
      longBreak: 20,
      longBreakAfter: 2,
      schoolStart: '08:30',
      lessonsPerDay: 6
    }
  },

  PRIORITY_LABELS: {
    high: 'Высокий',
    medium: 'Средний',
    low: 'Низкий'
  },

  CATEGORY_LABELS: {
    study: 'Учёба',
    homework: 'ДЗ',
    exam: 'Экзамен',
    project: 'Проект',
    other: 'Другое'
  },

  QUADRANT_LABELS: {
    'urgent-important': 'Важно и срочно',
    'not-urgent-important': 'Важно, не срочно',
    'urgent-not-important': 'Срочно, не важно',
    'not-urgent-not-important': 'Не срочно и не важно'
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  todayISO() {
    return new Date().toISOString().split('T')[0];
  },

  formatDate(dateStr, options = {}) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    if (options.short) {
      return `${d.getDate()} ${this.MONTHS_RU[d.getMonth()].slice(0, 3)}`;
    }
    return `${d.getDate()} ${this.MONTHS_RU[d.getMonth()]} ${d.getFullYear()}`;
  },

  formatDateFull(date = new Date()) {
    const day = this.DAYS_RU[date.getDay()];
    return `${day}, ${date.getDate()} ${this.MONTHS_RU[date.getMonth()]} ${date.getFullYear()}`;
  },

  getGreeting() {
    const h = new Date().getHours();
    if (h < 6) return 'Доброй ночи';
    if (h < 12) return 'Доброе утро';
    if (h < 18) return 'Добрый день';
    return 'Добрый вечер';
  },

  startOfWeek(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  },

  toISO(date) {
    return date.toISOString().split('T')[0];
  },

  isSameDay(a, b) {
    const da = typeof a === 'string' ? a : this.toISO(a);
    const db = typeof b === 'string' ? b : this.toISO(b);
    return da === db;
  },

  isToday(dateStr) {
    return this.isSameDay(dateStr, new Date());
  },

  parseTime(timeStr) {
    const [h, m] = (timeStr || '00:00').split(':').map(Number);
    return h * 60 + m;
  },

  formatMinutes(totalMin) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  },

  buildScheduleSlots(settings) {
    const slots = [];
    let current = this.parseTime(settings.schoolStart);
    const { lessonDuration, shortBreak, longBreak, longBreakAfter, lessonsPerDay } = settings;

    for (let i = 1; i <= lessonsPerDay; i++) {
      const start = current;
      const end = start + lessonDuration;
      slots.push({
        type: 'lesson',
        number: i,
        start: this.formatMinutes(start),
        end: this.formatMinutes(end),
        label: `Урок ${i}`
      });
      current = end;
      if (i < lessonsPerDay) {
        const isLong = i === longBreakAfter;
        const breakDur = isLong ? longBreak : shortBreak;
        slots.push({
          type: 'break',
          start: this.formatMinutes(current),
          end: this.formatMinutes(current + breakDur),
          label: isLong ? 'Большая перемена' : 'Перемена'
        });
        current += breakDur;
      }
    }
    return slots;
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  },

  debounce(fn, ms = 300) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }
};
