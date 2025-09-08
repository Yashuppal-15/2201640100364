const axios = require('axios');

class Logger {
  constructor(bearerToken) {
    this.bearerToken = bearerToken;
    this.apiUrl = 'http://20.244.56.144/evaluation-service/logs';
  }

  async log(stack, level, packageName, message) {
    try {
      const payload = {
        stack,
        level,
        package: packageName,
        message
      };

      await axios.post(this.apiUrl, payload, {
        headers: {
          'Authorization': Bearer ,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
    } catch (error) {
      // Silent fail - don't break app if logging fails
      console.error('Logging failed:', error.message);
    }
  }
}

const createLogger = (bearerToken) => {
  const logger = new Logger(bearerToken);
  return (stack, level, packageName, message) => {
    logger.log(stack, level, packageName, message);
  };
};

module.exports = { Logger, createLogger };
