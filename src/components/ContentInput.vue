<template>
    <div class="content-input">
      <h2>Content Input</h2>
      <div v-for="(content, category) in userContent" :key="category" class="category-input">
        <h3>{{ formatCategoryTitle(category) }}</h3>
        <textarea
          v-model="userContent[category]"
          :placeholder="getPlaceholder(category)"
          rows="4"
          @input="emitUpdate"
        ></textarea>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, watch } from 'vue';
  
  const props = defineProps({
    initialContent: {
      type: Object,
      default: () => ({
        plannedContent: '',
        reactiveContent: '',
        companyContent: ''
      })
    }
  });
  
  const emit = defineEmits(['update']);
  
  const userContent = ref({ ...props.initialContent });
  
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
  
  const emitUpdate = () => {
    emit('update', userContent.value);
  };
  
  watch(() => props.initialContent, (newContent) => {
    userContent.value = { ...newContent };
  }, { deep: true });
  </script>
  
  <style scoped>
  .content-input {
    margin-bottom: 20px;
  }
  
  .category-input {
    margin-bottom: 15px;
  }
  
  h2 {
    color: #0a66c2;
    margin-bottom: 15px;
  }
  
  h3 {
    margin-bottom: 5px;
  }
  
  textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: inherit;
    font-size: 14px;
  }
  </style>