<template>
    <nav class="navbar">
      <div class="navbar-brand">Content Strategy AI</div>
      <ul class="navbar-menu">
        <li><router-link to="/">Home</router-link></li>
        <li><router-link to="/feed">Feed</router-link></li>
        <li><router-link to="/profile">Profile & Content</router-link></li>
        <li><router-link to="/add-docs">Add Docs</router-link></li>
      </ul>
    </nav>
  </template>
  
  <script setup>
  // No script needed for this simple navbar
  </script>
  
  <style scoped>
  .navbar {
    background-color: #333;
    color: white;
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .navbar-brand {
    font-size: 1.5rem;
    font-weight: bold;
  }
  
  .navbar-menu {
    list-style-type: none;
    display: flex;
    gap: 1rem;
    margin: 0;
    padding: 0;
  }
  
  .navbar-menu li a {
    color: white;
    text-decoration: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    transition: background-color 0.3s;
  }
  
  .navbar-menu li a:hover {
    background-color: #555;
  }
  </style>