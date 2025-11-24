import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  public title = 'Air Conditioner Website';

  constructor(private pageTitle: Title) {
    this.pageTitle.setTitle(this.title);
  }
}
