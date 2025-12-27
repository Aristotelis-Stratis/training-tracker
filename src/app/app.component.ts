import { CommonModule } from '@angular/common';
import { Component, QueryList, ViewChildren, ElementRef, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

type DayKey = 'PULL' | 'PUSH' | 'LEGS';

type SetRow = {
  set: number;
  prev?: string;
  kg: number | null;
  reps: number | null;
  done: boolean;
};

type Exercise = {
  name: string;
  collapsed: boolean;
  sets: SetRow[];
};

type WorkoutDay = {
  key: DayKey;
  title: string;
  exercises: Exercise[];
};

const PPL_TEMPLATES: Record<DayKey, { title: string; exercises: string[] }> = {
  PULL: {
    title: 'PULL',
    exercises: [
      'Seated Cable Row',
      'Lat Pulldown',
      'Barbell Shrug',
      'Face Pull',
      'Dumbbell Curl',
      'Hammer Curl',
    ],
  },
  PUSH: {
    title: 'PUSH',
    exercises: [
      'Bench Press',
      'Incline Dumbbell Bench Press',
      'Dumbbell Lateral Raise',
      'Shoulder Press',
      'Tricep Rope Pushdown',
    ],
  },
  LEGS: {
    title: 'LEGS',
    exercises: [
      'Horizontal Leg Press',
      'Leg Extension',
      'Seated Leg Curl',
      'Standing/Seated Calf Raise',
      'Hip Thrust/Glute Bridge',
    ],
  },
};



@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  @ViewChildren('kgInput') kgInputs!: QueryList<ElementRef<HTMLInputElement>>;
  @ViewChildren('repsInput') repsInputs!: QueryList<ElementRef<HTMLInputElement>>;
  @ViewChildren('checkBtn') checkBtns!: QueryList<ElementRef<HTMLButtonElement>>;

  trackBySet = (_: number, s: SetRow) => s.set;
  private readonly STORAGE_KEY = 'tt:lastByExercise';

  private readStore(): Record<string, string[]> {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
    } catch {
      return {};
    }
  }

  private writeStore(store: Record<string, string[]>) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(store));
  }

  private loadPrevForDay() {
    const store = this.readStore();

    this.day.exercises = this.day.exercises.map((ex) => {
      const prevArr = store[ex.name] ?? [];
      return {
        ...ex,
        sets: ex.sets.map((s, i) => ({
          ...s,
          prev: prevArr[i] || '',
        })),
      };
    });
  }

  toggleExercise(exIndex: number) {
    this.day.exercises[exIndex].collapsed = !this.day.exercises[exIndex].collapsed;
  }

  private saveExerciseSnapshot(exerciseIndex: number) {
    const store = this.readStore();
    const ex = this.day.exercises[exerciseIndex];

    const snapshot = ex.sets.map((s) => {
      const kg = s.kg ?? null;
      const reps = s.reps ?? null;
      if (kg === null || reps === null) return '';
      return `${kg} x ${reps}`;
    });

    store[ex.name] = snapshot;
    this.writeStore(store);
  }

  currentDayKey: DayKey = 'PULL';
  day!: WorkoutDay;

  private DEFAULT_SETS = 3;

  ngOnInit() {
    this.loadDay(this.currentDayKey);
  }

  loadDay(key: DayKey) {
    this.currentDayKey = key;

    const template = PPL_TEMPLATES[key];
    this.day = {
      key,
      title: template.title,
      exercises: template.exercises.map((name) => ({
        name,
        collapsed: false,
        sets: Array.from({ length: this.DEFAULT_SETS }, (_, i) => ({
          set: i + 1,
          prev: '',
          kg: null,
          reps: null,
          done: false,
        })),
      })),
    };

    // PREV für alle Übungen laden
    this.loadPrevForDay();
  }


  addSet(exerciseIndex: number) {
    const ex = this.day.exercises[exerciseIndex];
    const nextSetNumber = ex.sets.length + 1;

    ex.sets.push({
      set: nextSetNumber,
      prev: '',
      kg: null,
      reps: null,
      done: false,
    });

    this.loadPrevForDay();
  }

  removeSet(exerciseIndex: number, setIndex: number) {
    const ex = this.day.exercises[exerciseIndex];
    ex.sets.splice(setIndex, 1);
    ex.sets = ex.sets.map((s, i) => ({ ...s, set: i + 1 }));

    this.loadPrevForDay();
  }

  toggleDone(exerciseIndex: number, setIndex: number) {
    this.normalizeKg(exerciseIndex, setIndex);
    this.normalizeReps(exerciseIndex, setIndex);
    const set = this.day.exercises[exerciseIndex].sets[setIndex];
    const wasDone = set.done;
    set.done = !wasDone;

    if (!wasDone) {
      this.saveExerciseSnapshot(exerciseIndex);
      this.loadPrevForDay();
    }
  }


  private focusKg(exIndex: number, setIndex: number) {
    const i = this.flatIndex(exIndex, setIndex);
    const el = this.kgInputs.get(i)?.nativeElement;
    el?.focus();
    el?.select?.();
  }

  private focusReps(exIndex: number, setIndex: number) {
    const i = this.flatIndex(exIndex, setIndex);
    const el = this.repsInputs.get(i)?.nativeElement;
    el?.focus();
    el?.select?.();
  }

  private focusCheck(exIndex: number, setIndex: number) {
    const i = this.flatIndex(exIndex, setIndex);
    this.checkBtns.get(i)?.nativeElement?.focus();
  }

  onKgEnter(exIndex: number, setIndex: number, ev: Event) {
    ev.preventDefault();
    this.focusReps(exIndex, setIndex);
  }

  onRepsEnter(exIndex: number, setIndex: number, ev: Event) {
    ev.preventDefault();
    this.focusCheck(exIndex, setIndex);
  }

  onCheckEnter(exIndex: number, setIndex: number, ev: Event) {
    ev.preventDefault();

    this.toggleDone(exIndex, setIndex);

    setTimeout(() => {
      const ex = this.day.exercises[exIndex];
      if (setIndex + 1 < ex.sets.length) {
        this.focusKg(exIndex, setIndex + 1);
        return;
      }
      if (exIndex + 1 < this.day.exercises.length) {
        this.focusKg(exIndex + 1, 0);
        return;
      }
    }, 0);
  }


  private parseDecimal(value: any): number | null {
    if (value === null || value === undefined) return null;
    const s = String(value).trim();
    if (!s) return null;

    // Komma -> Punkt, alles außer Zahlen/Punkt/Minus entfernen
    const normalized = s.replace(',', '.').replace(/[^0-9.\-]/g, '');

    const n = Number(normalized);
    if (!Number.isFinite(n)) return null;

    // Optional: auf 0.25 runden? (Gym Plates)
    // return Math.round(n * 4) / 4;

    return n;
  }

  private parseIntSafe(value: any): number | null {
    if (value === null || value === undefined) return null;
    const s = String(value).trim().replace(/[^0-9\-]/g, '');
    if (!s) return null;
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return Math.trunc(n);
  }

  normalizeKg(exIndex: number, setIndex: number) {
    const set = this.day.exercises[exIndex].sets[setIndex];
    set.kg = this.parseDecimal(set.kg);
  }

  normalizeReps(exIndex: number, setIndex: number) {
    const set = this.day.exercises[exIndex].sets[setIndex];
    set.reps = this.parseIntSafe(set.reps);
  }




  private flatIndex(exIndex: number, setIndex: number): number {
    let idx = 0;
    for (let e = 0; e < exIndex; e++) idx += this.day.exercises[e].sets.length;
    return idx + setIndex;
  }


}