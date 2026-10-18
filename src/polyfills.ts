// Polyfill for SockJS client that expects `global` object
// In modern JavaScript environments, `global` is not defined by default
(window as any).global = window;
