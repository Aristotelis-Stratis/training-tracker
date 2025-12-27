import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';

type SetRow = {
  set: number;
  prev?: string;     // z.B. "65 x 15"
  kg: number | null;
  reps: number | null;
  done: boolean;
};

type Exercise = {
  name: string;
  sets: SetRow[];
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})

export class AppComponent {
  exercise: Exercise = {
    name: 'Barbell Curl',
    sets: [
      { set: 1, prev: '65 x 15', kg: 65, reps: 15, done: true },
      { set: 2, prev: '65 x 15', kg: 65, reps: 15, done: false },
    ],
  };

  addSet() {
    const next = this.exercise.sets.length + 1;
    this.exercise.sets.push({ set: next, prev: '', kg: null, reps: null, done: false });
  }

  toggleDone(i: number) {
    this.exercise.sets[i].done = !this.exercise.sets[i].done;
  }
}
