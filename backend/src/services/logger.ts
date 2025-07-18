import winston from 'winston';
import path from 'path';

const logLevel = process.env.LOG_LEVEL || 'info';

// 定義日誌格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// 建立 logger 實例
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'stay-our-safe' },
  transports: [
    // 寫入錯誤日誌檔案
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // 寫入綜合日誌檔案
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// 如果不是生產環境，同時輸出到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// 建立子 logger 的輔助函數
export const createLogger = (module: string) => {
  return logger.child({ module });
}; 