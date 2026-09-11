// Custom Middleware: Request Logger
// บันทึก log ทุก request ที่เข้ามา โดยแสดง method, URL และเวลา
export const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
};
