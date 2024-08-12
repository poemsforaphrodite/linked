import { createRouter, createWebHistory } from 'vue-router';
import Feed from '../components/Feed.vue';
import AddDocs from '../components/AddDocs.vue';
import UserProfileInput from '../components/UserProfileInput.vue';

const routes = [
  { path: '/', redirect: '/feed' },
  { path: '/feed', component: Feed },
  { path: '/profile', component: UserProfileInput },
  { path: '/add-docs', component: AddDocs },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;