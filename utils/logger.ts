const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;

const timestamp = () => new Date().toISOString().replace("T", " ").slice(0, 19);

const logger = {
  info: (msg: string, ...args: any[]) => {
    if (isDev) console.log(`[${timestamp()}] ℹ️  INFO: ${msg}`, ...args);
  },

  success: (msg: string, ...args: any[]) => {
    if (isDev) console.log(`[${timestamp()}] ✅ SUCCESS: ${msg}`, ...args);
  },

  warn: (msg: string, ...args: any[]) => {
    console.warn(`[${timestamp()}] ⚠️  WARN: ${msg}`, ...args);
  },

  error: (msg: string, ...args: any[]) => {
    console.error(`[${timestamp()}] ❌ ERROR: ${msg}`, ...args);
  },

  dev: (msg: string, ...args: any[]) => {
    if (isDev) console.log(`[${timestamp()}] 🔧 DEV: ${msg}`, ...args);
  },
};

export default logger;
