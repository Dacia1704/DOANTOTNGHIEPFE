import { Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterOutlet } from '@angular/router';
import { ChatWidgetComponent } from './shared/components/chat-widget/chat-widget.component';
import { AiChatComponent } from './shared/components/ai-chat/ai-chat.component';

@Component({
  imports: [RouterOutlet, MatButtonModule, ChatWidgetComponent, AiChatComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('library-frontend');
}
