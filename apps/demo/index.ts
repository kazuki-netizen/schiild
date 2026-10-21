import '@expo/metro-runtime';
import { registerRootComponent } from 'expo';
import App from './src/Entry';
import './src/studio-theme.css';
import './src/logo.css';
import './src/international.css';
registerRootComponent(App);
