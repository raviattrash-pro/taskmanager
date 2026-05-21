const getEnvConfig = () => {
  const mode = import.meta.env.MODE; // Vite sets this based on execution mode ('development', 'production', or 'staging')
  
  let rawApiUrl = import.meta.env.VITE_API_URL;
  if (rawApiUrl && rawApiUrl !== '/api') {
    // If the URL is set but is missing the '/api' suffix, append it automatically
    if (!rawApiUrl.endsWith('/api') && !rawApiUrl.endsWith('/api/')) {
      rawApiUrl = rawApiUrl.replace(/\/$/, '') + '/api';
    }
  }

  switch (mode) {
    case 'production':
      return {
        API_URL: rawApiUrl || '/api', // '/api' will be mapped by reverse proxy in production
        SYNC_INTERVAL: 60000, // 1 minute
        ENVIRONMENT: 'production'
      };
    case 'staging':
      return {
        API_URL: rawApiUrl || 'http://staging-api.ascent.com/api',
        SYNC_INTERVAL: 30000, // 30 seconds
        ENVIRONMENT: 'staging'
      };
    case 'development':
    default:
      return {
        API_URL: rawApiUrl || 'http://localhost:8080/api',
        SYNC_INTERVAL: 10000, // 10 seconds for faster development testing
        ENVIRONMENT: 'development'
      };
  }
};

export const CONFIG = getEnvConfig();
