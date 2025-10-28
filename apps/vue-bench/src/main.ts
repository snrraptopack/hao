import { createApp } from 'vue';
import App from './ui/App.vue';

performance.mark('mount:start');
createApp(App).mount('#app');