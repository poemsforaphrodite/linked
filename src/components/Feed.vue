<template>
  <div class="feed">
    <h1>LinkedIn Content Strategy Engine</h1>
    
    <div class="user-selection">
      <label for="user-select">Select User:</label>
      <select id="user-select" v-model="selectedUserId" @change="fetchUserProfile">
        <option value="">Select a user</option>
        <option v-for="user in users" :key="user._id" :value="user._id">
          {{ user.name }}
        </option>
      </select>
    </div>

    <button @click="generateSuggestions" :disabled="loading || !isContentReady || !selectedUserId" class="generate-button">
      <i class="fas fa-sync-alt"></i> Generate Suggestions
    </button>
    <div v-if="!selectedUserId" class="warning">
      Please select a user before generating suggestions.
    </div>
    <div v-else-if="!isContentReady" class="warning">
      Please ensure at least one content category is filled before generating suggestions.
    </div>
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Generating suggestions...</p>
    </div>
    <div v-if="error" class="error">
      {{ error }}
    </div>
    <div class="suggestions-container">
      <div v-for="(posts, category) in suggestions" :key="category" class="category-column">
        <h2>{{ formatCategoryTitle(category) }}</h2>
        <div v-for="(post, index) in posts" :key="index" class="linkedin-post">
          <div class="post-header">
            <div class="avatar"></div>
            <div class="user-info">
              <h3>{{ userProfile?.name || 'Your Name' }}</h3>
              <p>Your Title • 1d</p>
            </div>
          </div>
          <p class="post-content">{{ post.content }}</p>
          <div class="post-hashtags">
            <span v-for="(hashtag, hIndex) in post.hashtags" :key="hIndex" class="hashtag">
              #{{ hashtag }}
            </span>
          </div>
          <p class="post-cta">{{ post.callToAction }}</p>
          <div class="post-actions">
            <button class="action-button"><i class="far fa-thumbs-up"></i> Like</button>
            <button class="action-button"><i class="far fa-comment"></i> Comment</button>
            <button class="action-button"><i class="fas fa-share"></i> Share</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

const loading = ref(false);
const suggestions = ref({});
const userProfile = ref(null);
const error = ref(null);
const users = ref([]);
const selectedUserId = ref('');

const isContentReady = computed(() => {
  if (!userProfile.value || !userProfile.value.content) return false;
  const { plannedContent, reactiveContent, companyContent } = userProfile.value.content;
  return (plannedContent?.trim() !== '' || reactiveContent?.trim() !== '' || companyContent?.trim() !== '');
});

const formatCategoryTitle = (category) => {
  if (category === 'culturalConversation') {
    return 'Company Content';
  }
  return category
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase());
};

const generateSuggestions = async () => {
  if (!selectedUserId.value) {
    error.value = "Please select a user before generating suggestions.";
    return;
  }

  if (!isContentReady.value) {
    error.value = "Please ensure at least one content category is filled before generating suggestions.";
    return;
  }

  loading.value = true;
  suggestions.value = {};
  error.value = null;

  try {
    const eventSource = new EventSource(`http://localhost:3000/api/gpt/suggestions/${selectedUserId.value}`);

    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        eventSource.close();
        loading.value = false;
        return;
      }

      const data = JSON.parse(event.data);
      if (data.error) {
        error.value = data.error;
        eventSource.close();
        loading.value = false;
        return;
      }

      if (data.warning) {
        console.warn(data.warning);
        return;
      }

      Object.entries(data).forEach(([category, post]) => {
        if (!suggestions.value[category]) {
          suggestions.value[category] = [];
        }
        suggestions.value[category].push(post);
      });
    };

    eventSource.onerror = (err) => {
      console.error('EventSource failed:', err);
      error.value = "An error occurred while generating suggestions. Please try again.";
      eventSource.close();
      loading.value = false;
    };
  } catch (err) {
    console.error('Error generating suggestions:', err);
    error.value = "An error occurred while generating suggestions. Please try again.";
    loading.value = false;
  }
};

const fetchUserProfile = async () => {
  if (!selectedUserId.value) {
    userProfile.value = null;
    return;
  }

  try {
    const response = await axios.get(`http://localhost:3000/api/profile/${selectedUserId.value}`);
    userProfile.value = response.data;
  } catch (err) {
    console.error('Error fetching user profile:', err);
    error.value = "Failed to load user profile. Please try refreshing the page.";
  }
};

const fetchUsers = async () => {
  try {
    const response = await axios.get('http://localhost:3000/api/users');
    users.value = response.data;
  } catch (err) {
    console.error('Error fetching users:', err);
    error.value = "Failed to load users. Please try refreshing the page.";
  }
};

onMounted(async () => {
  await fetchUsers();
});
</script>

<style scoped>
.feed {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

h1 {
  color: #0a66c2;
  text-align: center;
  margin-bottom: 30px;
}

.loading {
  text-align: center;
  margin-top: 50px;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #0a66c2;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.suggestions-container {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.category-column {
  flex: 1;
  min-width: 0;
}

h2 {
  color: #0a66c2;
  border-bottom: 1px solid #0a66c2;
  padding-bottom: 10px;
  margin-top: 0;
  margin-bottom: 20px;
}

.linkedin-post {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.post-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: #0a66c2;
  margin-right: 12px;
}

.user-info h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.user-info p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.post-content {
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 12px;
}

.post-hashtags {
  margin-bottom: 12px;
}

.hashtag {
  display: inline-block;
  background-color: #f3f3f3;
  color: #0a66c2;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  margin-right: 6px;
  margin-bottom: 6px;
}

.post-cta {
  font-size: 14px;
  font-weight: 600;
  color: #0a66c2;
  margin-bottom: 16px;
}

.post-actions {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid #e0e0e0;
  padding-top: 12px;
}

.action-button {
  background: none;
  border: none;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.action-button:hover {
  background-color: #f3f3f3;
}

.generate-button {
  display: block;
  margin: 20px auto;
  padding: 10px 20px;
  background-color: #0a66c2;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  cursor: pointer;
}

.generate-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.warning, .error {
  background-color: #fff3cd;
  color: #856404;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 20px;
  text-align: center;
}

.error {
  background-color: #f8d7da;
  color: #721c24;
}

.user-selection {
  margin-bottom: 20px;
  text-align: center;
}

.user-selection label {
  margin-right: 10px;
  font-weight: bold;
}

.user-selection select {
  padding: 5px 10px;
  font-size: 16px;
  border-radius: 5px;
  border: 1px solid #ccc;
}

@media (max-width: 768px) {
  .suggestions-container {
    flex-direction: column;
  }
}
</style>