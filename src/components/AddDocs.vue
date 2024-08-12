<script setup>
import { ref } from 'vue';
import axios from 'axios';

const content = ref('');
const status = ref('');
const file = ref(null);
const isUploading = ref(false);

const getEmbedding = async (text) => {
  const response = await axios.post('http://localhost:3000/api/openai/embed', { text });
  return response.data.embedding;
};

const sendToPinecone = async (content, embedding) => {
  const response = await axios.post('http://localhost:3000/api/pinecone/upsert', {
    vectors: [
      {
        id: Date.now().toString(),
        values: embedding,
        metadata: { content }
      }
    ]
  });
  return response.data;
};

const transcribePDF = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axios.post('http://localhost:3000/api/transcribe', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data.text;
};

const handleFileUpload = (event) => {
  file.value = event.target.files[0];
};

const uploadAndTranscribe = async () => {
  if (!file.value) {
    status.value = 'Please select a file first.';
    return;
  }

  isUploading.value = true;
  status.value = 'Transcribing PDF...';

  try {
    const transcribedText = await transcribePDF(file.value);
    content.value = transcribedText;
    status.value = 'PDF transcribed successfully!';
  } catch (error) {
    status.value = 'Error transcribing PDF: ' + error.message;
  } finally {
    isUploading.value = false;
  }
};

const submitContent = async () => {
  status.value = 'Embedding content...';
  try {
    const embedding = await getEmbedding(content.value);
    status.value = 'Sending to Pinecone...';
    await sendToPinecone(content.value, embedding);
    status.value = 'Content sent successfully!';
    content.value = '';
    file.value = null;
  } catch (error) {
    status.value = 'Error: ' + error.message;
  }
};
</script>

<template>
  <div class="add-docs">
    <h1>LinkedIn Content Optimizer</h1>
    <div class="file-upload">
      <input type="file" @change="handleFileUpload" accept=".pdf" id="file-input" />
      <label for="file-input" class="file-label">
        <i class="fas fa-file-upload"></i> Choose PDF
      </label>
      <button @click="uploadAndTranscribe" :disabled="isUploading || !file" class="upload-button">
        <i class="fas fa-sync-alt"></i> Transcribe PDF
      </button>
    </div>
    <textarea v-model="content" placeholder="Enter your content here or upload a PDF"></textarea>
    <button @click="submitContent" :disabled="!content" class="submit-button">Send to Pinecone</button>
    <p class="status">{{ status }}</p>
  </div>
</template>

<style scoped>
.add-docs {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

h1 {
  color: #0077B5;
  text-align: center;
  margin-bottom: 30px;
}

.file-upload {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

#file-input {
  display: none;
}

.file-label {
  background-color: #0077B5;
  color: white;
  padding: 10px 15px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.file-label:hover {
  background-color: #005582;
}

.upload-button, .submit-button {
  background-color: #0077B5;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.upload-button:hover, .submit-button:hover {
  background-color: #005582;
}

.upload-button:disabled, .submit-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

textarea {
  width: 100%;
  height: 200px;
  margin-bottom: 20px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  resize: vertical;
}

.status {
  text-align: center;
  margin-top: 20px;
  font-weight: bold;
}
</style>