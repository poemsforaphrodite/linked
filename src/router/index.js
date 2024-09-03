import { createRouter, createWebHistory } from 'vue-router';
import Feed from '../components/Feed.vue';
import AddDocs from '../components/AddDocs.vue';
import UserProfileInput from '../components/UserProfileInput.vue';
import Login from '../components/Login.vue';
// Add this line
import Signup from '../components/Signup.vue';

const routes = [
  { path: '/', redirect: '/feed' },
  { path: '/feed', component: Feed },
  { path: '/profile', component: UserProfileInput },
  { path: '/add-docs', component: AddDocs },
  { path: '/login', component: Login },
  { path: '/signup', component: Signup },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;