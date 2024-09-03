<template>
  <div class="feed">
    <h1 class="title">LinkedIn Content Strategy Engine 🚀</h1>
    
    <button @click="generateSuggestions" :disabled="loading" class="generate-button">
      <i class="fas fa-sync-alt"></i> Generate Awesome Posts 🎉
    </button>
    
    <Alert v-if="error" variant="destructive" class="mb-4">
      <AlertCircle class="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <div class="suggestions-container">
      <div v-for="(post, index) in suggestions" :key="index" class="linkedin-post">
        <p class="post-content">{{ post.content }}</p>
        <div class="post-hashtags">
          <span v-for="(hashtag, hIndex) in post.hashtags" :key="hIndex" class="hashtag">
            #{{ hashtag.replace(/^#+/, '') }}
          </span>
        </div>
        <p class="post-cta">{{ post.callToAction }}</p>
        <div class="post-actions">
          <button class="action-button"><i class="far fa-thumbs-up"></i> Like 👍</button>
          <button class="action-button"><i class="far fa-comment"></i> Comment 💬</button>
          <button class="action-button"><i class="fas fa-share"></i> Share 🔄</button>
        </div>
      </div>
    </div>
    
    <div v-if="loading" class="loading-indicator">
      <p>Crafting brilliant posts... ✨</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import api from '../api';

const loading = ref(false);
const suggestions = ref([]);
const error = ref(null);

const generateSuggestions = async () => {
  loading.value = true;
  suggestions.value = [];
  error.value = null;

  try {
    const response = await api.get('/gpt/suggestions', {
      responseType: 'text',
      onDownloadProgress: (progressEvent) => {
        const rawText = progressEvent.event.target.responseText;
        const jsonObjects = rawText.split('\n').filter(text => text.trim() !== '');
        
        suggestions.value = jsonObjects.map(jsonStr => {
          try {
            return JSON.parse(jsonStr);
          } catch (e) {
            console.error('Error parsing JSON:', e);
            return null;
          }
        }).filter(obj => obj !== null);
      }
    });
  } catch (err) {
    console.error('Error generating suggestions:', err);
    error.value = "An error occurred while generating suggestions. Please try again.";
  } finally {
    loading.value = false;
  }
};

// Remove the fetchUserProfile function and onMounted hook
</script>

<style scoped>
.feed {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: Arial, sans-serif;
}

.title {
  color: #0077B5;
  text-align: center;
  margin-bottom: 2rem;
  font-weight: bold;
  font-size: 2.5rem;
}

.generate-button {
  display: block;
  margin: 0 auto 2rem;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  color: white;
  background-color: #0077B5;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  font-weight: bold;
  text-transform: uppercase;
}

.generate-button:hover {
  background-color: #005582;
}

.generate-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  margin-bottom: 2rem;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #0077B5;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  color: #d32f2f;
  text-align: center;
  margin-bottom: 2rem;
}

.linkedin-post {
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.linkedin-post:hover {
  transform: translateY(-5px);
}

.post-content {
  font-size: 1.1rem;
  line-height: 1.5;
  margin-bottom: 1rem;
}

.post-hashtags {
  margin-bottom: 1rem;
}

.hashtag {
  display: inline-block;
  margin-right: 0.5rem;
  color: #0077B5;
  font-weight: bold;
  background-color: #e1f5fe;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.9rem;
}

.post-cta {
  font-weight: bold;
  margin-bottom: 1rem;
  color: #0077B5;
}

.post-actions {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid #e0e0e0;
  padding-top: 1rem;
}

.action-button {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  transition: color 0.3s ease;
}

.action-button i {
  margin-right: 0.5rem;
}

.action-button:hover {
  color: #0077B5;
  transform: scale(1.1);
}

.loading-indicator {
  text-align: center;
  margin-top: 1rem;
  font-style: italic;
  color: #666;
  font-size: 1.2rem;
  font-weight: bold;
}
</style>