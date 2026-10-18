import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Polyfill for SockJS client that expects `global` object
// This must be loaded before SockJS tries to use it
(window as any).global = window;

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
