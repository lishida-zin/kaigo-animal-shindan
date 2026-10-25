import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import { createApp } from './app';
import { questionSetVersion } from './data';
import { createStore, defaultStorage } from './storage';

const root = document.getElementById('app');
if (root) {
  createApp(root, {
    store: createStore({ questionSetVersion, storage: defaultStorage() }),
    now: Date.now,
    confirm: (message) => window.confirm(message),
  });
}
