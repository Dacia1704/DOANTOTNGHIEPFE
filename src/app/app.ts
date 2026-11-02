import { Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterOutlet } from '@angular/router';
import { ChatWidgetComponent } from './shared/components/chat-widget/chat-widget.component';

@Component({
  imports: [RouterOutlet, MatButtonModule, ChatWidgetComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('library-frontend');
}
