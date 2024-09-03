<template>
  <div class="user-profile">
    <h2>Your Profile</h2>
    <UserProfileInput />
  </div>
</template>

<script setup>
import UserProfileInput from './UserProfileInput.vue';
</script>

<style scoped>
.user-profile {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}
</style>