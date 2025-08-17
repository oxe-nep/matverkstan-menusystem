module.exports = {
  apps: [{
    name: 'menuscreen',
    script: 'src/server.js',
    cwd: '/home/menuapp/matverkstan-menusystem/backend',
    
    // Watchdog & Restart konfiguration
    watch: false,  // Sätt true för utveckling, false för produktion
    ignore_watch: ['uploads', 'logs', 'node_modules'],
    
    // Auto-restart vid crash
    autorestart: true,
    max_restarts: 10,      // Max 10 omstarter inom 15 min
    min_uptime: '10s',     // Minst 10s uptime för att räknas som lyckad start
    restart_delay: 3000,   // 3 sekunder väntan mellan omstarter
    
    // Memory watchdog
    max_memory_restart: '500M',  // Starta om om RAM > 500MB
    
    // Error handling
    kill_timeout: 5000,    // 5s för graceful shutdown
    listen_timeout: 3000,  // 3s för app att starta
    
    // Logging
    log_file: '/home/menuapp/matverkstan-menusystem/backend/logs/combined.log',
    out_file: '/home/menuapp/matverkstan-menusystem/backend/logs/out.log',
    error_file: '/home/menuapp/matverkstan-menusystem/backend/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    
    // Instances (för load balancing - börja med 1)
    instances: 1,
    exec_mode: 'fork'
  }]
}
