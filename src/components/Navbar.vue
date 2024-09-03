<template>
  <nav v-if="!isAuthPage" class="navbar">
    <div class="navbar-container">
      <div class="navbar-brand">Content Strategy AI</div>
      <ul class="navbar-menu">
        <li><router-link to="/feed" class="nav-link">Feed</router-link></li>
        <li><router-link to="/profile" class="nav-link">Profile & Content</router-link></li>
        <li><router-link to="/add-docs" class="nav-link">Add Docs</router-link></li>
        <li><button @click="logout" class="nav-link logout-button">Logout</button></li>
      </ul>
    </div>
  </nav>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router';
import { computed } from 'vue';

const router = useRouter();
const route = useRoute();

const isAuthPage = computed(() => {
  return route.path === '/login' || route.path === '/signup';
});

const logout = () => {
  localStorage.removeItem('token');
  router.push('/login');
};
</script>

<style scoped>
.navbar {
  background-color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  padding: 0.5rem 0;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.navbar-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1rem;
}

.navbar-brand {
  font-size: 1.5rem;
  font-weight: bold;
  color: #0077B5;
}

.navbar-menu {
  list-style-type: none;
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0;
  padding: 0;
}

.nav-link {
  color: #666;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background-color 0.3s, color 0.3s;
  font-weight: 500;
  display: inline-block;
}

.nav-link:hover,
.nav-link.router-link-active {
  background-color: #f3f6f8;
  color: #0077B5;
}

.logout-button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  font-family: inherit;
}

@media (max-width: 768px) {
  .navbar-container {
    flex-direction: column;
    align-items: flex-start;
  }

  .navbar-menu {
    margin-top: 1rem;
    flex-direction: column;
    width: 100%;
  }

  .nav-link,
  .logout-button {
    display: block;
    width: 100%;
    text-align: left;
  }
}
</style>