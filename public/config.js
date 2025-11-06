// API Configuration
// Update this based on your deployment

const API_CONFIG = {
  // For local development
  development: {
    apiUrl: 'http://localhost:3000/api',
  },
  
  // For production (Coolify/VPS)
  production: {
    apiUrl: '/api', // Relative URL, same domain
  }
};

// Auto-detect environment
const ENV = window.location.hostname === 'localhost' ? 'development' : 'production';
const API_BASE = API_CONFIG[ENV].apiUrl;

// Export for use in app.js
window.API_BASE = API_BASE;
console.log('API Base URL:', API_BASE);

