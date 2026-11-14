import { createApp } from './app';
import { SchedulerService } from './services/scheduling/scheduler';

const PORT = Number(process.env.PORT) || 3001;
const app = createApp();

const server = app.listen(PORT, async () => {
  console.log(`[Server] API server running on http://localhost:${PORT}`);
  console.log(`[Server] Health check available at http://localhost:${PORT}/api/health`);

  // Initialize background cron scheduler
  try {
    await SchedulerService.getInstance().init();
  } catch (err) {
    console.warn('[Scheduler] Warning: Failed to initialize scheduler on boot:', err);
  }
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ [PORT CONFLICT] Port ${PORT} is already in use!`);
    console.error(`👉 Another Node process is running on port ${PORT}.`);
    console.error(`👉 Run: Stop-Process -Name node -Force (in PowerShell) then retry.\n`);
    process.exit(1);
  } else {
    console.error('[Server] Fatal error:', err);
    process.exit(1);
  }
});
