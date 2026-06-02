import './styles.css';
import { createApp } from 'vue';
import { createRouter, createWebHistory, RouterLink } from 'vue-router';
import App from './App.vue';
import HomePage from './home/HomePage.vue';
import ContactsPage from './contacts/ContactsPage.vue';
import ContactDetails from './contacts/ContactDetails.vue';
import AutomationsPage from './automations/AutomationsPage.vue';
import AutomationsIndexPage from './automations/AutomationsIndexPage.vue';
import AppointmentsPage from './appointments/AppointmentsPage.vue';
import { createDex, createRouterAdapter } from '@thryvlabs/dex-vue';

const routes = [
  { path: '/', component: HomePage },
  {
    path: '/contacts',
    component: ContactsPage,
    children: [{ path: 'contact/:id', component: ContactDetails }],
  },
  { path: '/appointments', component: AppointmentsPage },
  {
    path: '/automations',
    component: AutomationsPage,
    children: [{ path: '', component: AutomationsIndexPage }],
  },
];

const router = createRouter({
  history: createWebHistory('/ThryvAppointment/'),
  routes,
});

const routerAdapter = createRouterAdapter({
  adapter: { Link: RouterLink },
});

const dex = createDex();

const app = createApp(App);
app.use(router);
app.use(routerAdapter);
app.use(dex);

app.mount('#root');
