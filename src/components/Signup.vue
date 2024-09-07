<template>
  <div class="signup">
    <h2>Sign Up</h2>
    <form @submit.prevent="handleSubmit">
      <input v-model="email" type="email" placeholder="Email" required>
      <input v-model="password" type="password" placeholder="Password" required>
      <input v-model="name" type="text" placeholder="Name" required>
      <textarea v-model="info" placeholder="Professional information, interests, and goals" required></textarea>
      <button type="submit">Sign Up</button>
    </form>
    <p @click="goToLogin">Already have an account? Login</p>
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
const name = ref('');
const info = ref('');
const error = ref('');

const handleSubmit = async () => {
  try {
    await api.post('/signup', { 
      email: email.value,
      password: password.value,
      name: name.value,
      info: info.value
    });
    router.push('/login');
  } catch (err) {
    console.error('Signup error:', err.response?.data);
    error.value = err.response?.data?.error || 'An error occurred during signup';
  }
};

const goToLogin = () => {
  router.push('/login');
};
</script>

<style scoped>
.signup {
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

textarea {
  width: 100%;
  height: 100px;
  margin-bottom: 10px;
  padding: 10px;
}
</style>