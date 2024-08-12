<template>
    <div class="user-profile-input">
      <h2>Your Profile and Content</h2>
      <div class="input-group">
        <label for="userName">Your Name:</label>
        <input id="userName" v-model="profile.name" type="text" placeholder="Enter your name">
      </div>
      <div class="input-group">
        <label for="userGoal">Your Goal:</label>
        <input id="userGoal" v-model="profile.goal" type="text" placeholder="Enter your content goal">
      </div>
      <div v-for="(content, category) in profile.content" :key="category" class="input-group">
        <label :for="category">{{ formatCategoryTitle(category) }}:</label>
        <textarea
          :id="category"
          v-model="profile.content[category]"
          :placeholder="getPlaceholder(category)"
          rows="4"
        ></textarea>
      </div>
      <button @click="saveProfile" class="save-button" :disabled="!isProfileComplete">Save Profile and Content</button>
    </div>
  </template>
  
  <script setup>
  import { ref, computed } from 'vue';
  import axios from 'axios';
  
  const profile = ref({
    name: '',
    goal: '',
    content: {
      plannedContent: '',
      reactiveContent: '',
      companyContent: ''
    }
  });
  
  const formatCategoryTitle = (category) => {
    return category
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
  };
  
  const getPlaceholder = (category) => {
    switch (category) {
      case 'plannedContent':
        return 'Enter planned content (e.g., seasonality, upcoming events like Olympics or Football season)';
      case 'reactiveContent':
        return 'Enter reactive content (e.g., industry events, company activities)';
      case 'companyContent':
        return 'Enter personal/company content (e.g., company journey, product information)';
      default:
        return 'Enter content';
    }
  };
  
  const isProfileComplete = computed(() => {
    return profile.value.name.trim() !== '' &&
      profile.value.goal.trim() !== '' &&
      Object.values(profile.value.content).some(content => content.trim() !== '');
  });
  
  const saveProfile = async () => {
    try {
      const response = await axios.post('https://linked-api.vercel.app/api/profile', profile.value);
      console.log('Profile and content saved:', response.data);
      // You might want to emit an event here to notify the parent component
    } catch (error) {
      console.error('Error saving profile and content:', error);
    }
  };
  </script>
  
  <style scoped>
  .user-profile-input {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
  }
  
  h2 {
    color: #0a66c2;
    margin-bottom: 20px;
  }
  
  .input-group {
    margin-bottom: 15px;
  }
  
  label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
  }
  
  input[type="text"],
  textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: inherit;
    font-size: 14px;
  }
  
  .save-button {
    display: block;
    width: 100%;
    padding: 10px;
    background-color: #0a66c2;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
  }
  
  .save-button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
  </style>