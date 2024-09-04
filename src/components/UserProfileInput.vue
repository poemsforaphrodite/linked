<template>
    <div class="user-profile-input">
      <h2>Profile & Content</h2>
      <div class="input-group">
        <label for="userName">Your Name</label>
        <input id="userName" v-model="profile.name" type="text" placeholder="Enter your name">
      </div>
      <div class="input-group">
        <label for="userInfo">Your Info</label>
        <textarea
          id="userInfo"
          v-model="profile.info"
          placeholder="Enter your professional information, interests, and goals"
          rows="6"
          class="user-info-textarea"
        ></textarea>
      </div>
      <button @click="saveProfile" class="save-button" :disabled="!isProfileChanged">
        {{ isProfileChanged ? 'Save Changes' : 'No Changes' }}
      </button>
      <p v-if="message" :class="['message', { 'success': !error, 'error': error }]">{{ message }}</p>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted } from 'vue';
  import api from '../api'; // Import the api instance
  
  const profile = ref({ name: '', info: '' });
  const originalProfile = ref({ name: '', info: '' });
  const message = ref('');
  const error = ref(false);

  onMounted(async () => {
    try {
      const response = await api.get('/profile');
      profile.value = { ...response.data };
      originalProfile.value = { ...response.data };
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  });

  const isProfileChanged = computed(() => {
    return profile.value.name !== originalProfile.value.name || 
           profile.value.info !== originalProfile.value.info;
  });

  const saveProfile = async () => {
    try {
      const response = await api.put('/profile', profile.value);
      originalProfile.value = { ...profile.value };
      message.value = 'Profile updated successfully!';
      error.value = false;
    } catch (err) {
      console.error('Error updating profile:', err);
      message.value = 'Failed to update profile. Please try again.';
      error.value = true;
    }
  };
  </script>
  
  <style scoped>
  .user-profile-input {
    max-width: 600px;
    margin: 2rem auto;
    padding: 2rem;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  }
  
  h2 {
    color: #0a66c2;
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
    font-weight: 600;
  }
  
  .input-group {
    margin-bottom: 1.5rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #333;
  }
  
  input[type="text"],
  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-family: inherit;
    font-size: 1rem;
    transition: border-color 0.3s ease;
  }
  
  .user-info-textarea {
    min-height: 150px; /* Increased minimum height */
    resize: vertical; /* Allows vertical resizing */
  }
  
  input[type="text"]:focus,
  textarea:focus {
    outline: none;
    border-color: #0a66c2;
  }
  
  .save-button {
    display: block;
    width: 100%;
    padding: 0.75rem;
    background-color: #0a66c2;
    color: white;
    border: none;
    border-radius: 24px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }
  
  .save-button:hover:not(:disabled) {
    background-color: #004182;
  }
  
  .save-button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
  
  .message {
    margin-top: 1rem;
    padding: 0.75rem;
    border-radius: 4px;
    font-weight: 500;
    text-align: center;
  }
  
  .message.success {
    background-color: #e6f3e6;
    color: #2e7d32;
  }
  
  .message.error {
    background-color: #fdecea;
    color: #c62828;
  }
  </style>