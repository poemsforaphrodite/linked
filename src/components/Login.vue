<template>
  <div class="login">
    <h2>Login</h2>
    <form @submit.prevent="handleSubmit">
      <input v-model="email" type="email" placeholder="Email" required>
      <input v-model="password" type="password" placeholder="Password" required>
      <button type="submit">Login</button>
    </form>
    <p><router-link to="/signup">Need an account? Sign up</router-link></p>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';

const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref('');

const handleSubmit = async () => {
  try {
    const response = await api.post('/login', { 
      email: email.value, 
      password: password.value 
    });
    localStorage.setItem('token', response.data.token);
    // Redirect to the user profile page after successful login
    router.push('/profile');
  } catch (error) {
    console.error('Login error:', error);
    error.value = 'Failed to login. Please check your credentials.';
  }
};

// Remove the goToSignup function as it's no longer needed
</script>

<style scoped>
.login {
  max-width: 300px;
  margin: 0 auto;
  padding: 20px;
}

form {
  display: flex;
  flex-direction: column;
}

input, button {
  margin-bottom: 10px;
  padding: 10px;
}

.error {
  color: red;
}

a {
  color: #007bff;
  text-decoration: none;
  cursor: pointer;
}

a:hover {
  text-decoration: underline;
}
</style>