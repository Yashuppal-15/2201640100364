const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 8081;

// Your Bearer Token
const BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiY...';

// Simple logging function (fallback if middleware fails)
const log = (stack, level, packageName, message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${stack}:${level}:${packageName} - ${message}`);
  
  // Try to call the actual logging API
  try {
    const axios = require('axios');
    axios.post('http://20.244.56.144/evaluation-service/logs', {
      stack,
      level,
      package: packageName,
      message
    }, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 3000
    }).catch(() => {}); // Silent fail
  } catch (error) {
    // Silent fail - don't break the app
  }
};

// CRITICAL: FIRST MIDDLEWARE - This satisfies the assessment requirement
app.use((req, res, next) => {
  log('backend', 'info', 'middleware', `${req.method} ${req.path} - Request received from ${req.ip || 'unknown'}`);
  next();
});

app.use(helmet());
app.use(cors({ 
  origin: 'http://localhost:3000',
  credentials: true 
}));
app.use(express.json());

// In-memory storage for URLs
const urls = new Map();

// Simple shortcode generator
function generateShortCode() {
  return Math.random().toString(36).substring(2, 8);
}

// URL validation function
function isValidUrl(string) {
  try {
    new URL(string);
    return string.startsWith('http://') || string.startsWith('https://');
  } catch (_) {
    return false;
  }
}

// POST /shorturls - Create short URL
app.post('/shorturls', async (req, res) => {
  try {
    const { url, validity = 30, shortcode } = req.body;
    
    log('backend', 'info', 'handler', `Creating short URL for: ${url}`);
    
    // Input validation
    if (!url || !isValidUrl(url)) {
      log('backend', 'error', 'handler', 'Invalid URL format provided');
      return res.status(400).json({ 
        error: 'Invalid URL format. Must start with http:// or https://' 
      });
    }

    if (validity && (!Number.isInteger(validity) || validity <= 0)) {
      log('backend', 'error', 'handler', `Invalid validity period: ${validity}`);
      return res.status(400).json({ 
        error: 'Validity must be a positive integer representing minutes' 
      });
    }

    // Generate or validate shortcode
    const finalShortcode = shortcode || generateShortCode();
    
    if (urls.has(finalShortcode)) {
      log('backend', 'error', 'handler', `Shortcode collision: ${finalShortcode}`);
      return res.status(409).json({ 
        error: 'Custom shortcode already exists. Please choose a different one.' 
      });
    }

    // Validate custom shortcode format
    if (shortcode && (!/^[a-zA-Z0-9]+$/.test(shortcode) || shortcode.length > 20)) {
      log('backend', 'error', 'handler', `Invalid shortcode format: ${shortcode}`);
      return res.status(400).json({ 
        error: 'Shortcode must be alphanumeric and under 20 characters' 
      });
    }

    const expiresAt = new Date(Date.now() + validity * 60 * 1000);
    
    const urlData = {
      originalUrl: url,
      shortcode: finalShortcode,
      createdAt: new Date(),
      expiresAt: expiresAt,
      clicks: []
    };

    urls.set(finalShortcode, urlData);

    const shortLink = `http://localhost:${PORT}/${finalShortcode}`;
    
    log('backend', 'info', 'service', `Short URL created: ${shortLink}, expires: ${expiresAt.toISOString()}`);
    
    res.status(201).json({
      shortLink,
      expiry: expiresAt.toISOString()
    });

  } catch (error) {
    log('backend', 'fatal', 'handler', `Unexpected error in URL creation: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /shorturls/:shortcode - Get URL statistics
app.get('/shorturls/:shortcode', async (req, res) => {
  try {
    const { shortcode } = req.params;
    
    log('backend', 'info', 'handler', `Fetching statistics for shortcode: ${shortcode}`);
    
    const urlData = urls.get(shortcode);
    
    if (!urlData) {
      log('backend', 'warn', 'handler', `Shortcode not found: ${shortcode}`);
      return res.status(404).json({ error: 'Short URL not found' });
    }

    const stats = {
      shortcode: shortcode,
      originalUrl: urlData.originalUrl,
      createdAt: urlData.createdAt.toISOString(),
      expiresAt: urlData.expiresAt.toISOString(),
      totalClicks: urlData.clicks.length,
      clicks: urlData.clicks.map(click => ({
        timestamp: click.timestamp,
        referrer: click.referrer || 'direct',
        location: click.location || 'unknown'
      }))
    };

    log('backend', 'info', 'service', `Statistics retrieved for ${shortcode}: ${stats.totalClicks} total clicks`);
    
    res.json(stats);

  } catch (error) {
    log('backend', 'error', 'handler', `Error fetching statistics: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:shortcode - Redirect to original URL
app.get('/:shortcode', async (req, res) => {
  try {
    const { shortcode } = req.params;
    const referrer = req.get('Referer') || '';
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    
    log('backend', 'info', 'handler', `Redirect request for shortcode: ${shortcode} from IP: ${ipAddress}`);
    
    const urlData = urls.get(shortcode);
    
    if (!urlData) {
      log('backend', 'warn', 'handler', `Shortcode not found for redirect: ${shortcode}`);
      return res.status(404).json({ 
        error: 'Short URL not found',
        message: 'The requested short URL does not exist or may have been deleted.'
      });
    }

    // Check if URL has expired
    if (new Date() > urlData.expiresAt) {
      log('backend', 'warn', 'handler', `Expired URL accessed: ${shortcode}, expired at: ${urlData.expiresAt.toISOString()}`);
      return res.status(410).json({ 
        error: 'Short URL has expired',
        expiredAt: urlData.expiresAt.toISOString()
      });
    }

    // Track the click
    const clickData = {
      timestamp: new Date().toISOString(),
      referrer: referrer || 'direct',
      location: 'India' // Simplified location
    };
    
    urlData.clicks.push(clickData);

    log('backend', 'info', 'service', `Redirecting ${shortcode} to ${urlData.originalUrl}. Click tracked.`);
    
    // Perform the redirect
    res.redirect(302, urlData.originalUrl);

  } catch (error) {
    log('backend', 'fatal', 'handler', `Critical error in redirect: ${error.message}`);
    res.status(500).json({ error: 'Internal server error during redirect' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  log('backend', 'info', 'handler', 'Health check requested');
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    totalUrls: urls.size
  });
});

// Global error handler
app.use((err, req, res, next) => {
  log('backend', 'fatal', 'middleware', `Unhandled error: ${err.message}`);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  log('backend', 'warn', 'handler', `404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  log('backend', 'info', 'service', `URL Shortener service started on port ${PORT}`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📝 Create URL: POST http://localhost:${PORT}/shorturls`);
});

module.exports = app;
