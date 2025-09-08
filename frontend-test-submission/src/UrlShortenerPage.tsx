import React, { useState } from 'react';
import {
  Paper,
  TextField,
  Button,
  Typography,
  Grid,
  Alert,
  Card,
  CardContent,
  Box,
  Chip
} from '@mui/material';
import axios from 'axios';

interface UrlResult {
  originalUrl: string;
  shortLink: string;
  expiry: string;
  status: 'success' | 'error';
  error?: string;
}

export const UrlShortenerPage: React.FC = () => {
  const [urls, setUrls] = useState<Array<{url: string; validity: number; shortcode: string}>>([
    { url: '', validity: 30, shortcode: '' },
    { url: '', validity: 30, shortcode: '' },
    { url: '', validity: 30, shortcode: '' },
    { url: '', validity: 30, shortcode: '' },
    { url: '', validity: 30, shortcode: '' }
  ]);
  const [results, setResults] = useState<UrlResult[]>([]);
  const [loading, setLoading] = useState(false);

  const log = (message: string) => {
    console.log(`[${new Date().toISOString()}] frontend:info:component - ${message}`);
  };

  const handleUrlChange = (index: number, field: string, value: string | number) => {
    const newUrls = [...urls];
    newUrls[index] = { ...newUrls[index], [field]: value };
    setUrls(newUrls);
  };

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    log('Starting batch URL shortening process');
    
    const validUrls = urls.filter(item => item.url.trim() !== '');
    const newResults: UrlResult[] = [];

    for (const urlItem of validUrls) {
      try {
        // Client-side validation
        if (!validateUrl(urlItem.url)) {
          newResults.push({
            originalUrl: urlItem.url,
            shortLink: '',
            expiry: '',
            status: 'error',
            error: 'Invalid URL format'
          });
          continue;
        }

        if (urlItem.validity <= 0 || !Number.isInteger(urlItem.validity)) {
          newResults.push({
            originalUrl: urlItem.url,
            shortLink: '',
            expiry: '',
            status: 'error',
            error: 'Validity must be a positive integer'
          });
          continue;
        }

        log(`Creating short URL for: ${urlItem.url}`);

        const response = await axios.post('http://localhost:8081/shorturls', {
          url: urlItem.url,
          validity: urlItem.validity,
          shortcode: urlItem.shortcode || undefined
        });

        newResults.push({
          originalUrl: urlItem.url,
          shortLink: response.data.shortLink,
          expiry: response.data.expiry,
          status: 'success'
        });

        log(`Successfully created short URL: ${response.data.shortLink}`);

      } catch (error: any) {
        log(`Error creating short URL for ${urlItem.url}: ${error.message}`);
        newResults.push({
          originalUrl: urlItem.url,
          shortLink: '',
          expiry: '',
          status: 'error',
          error: error.response?.data?.error || error.message
        });
      }
    }

    setResults(newResults);
    setLoading(false);
    log(`Batch URL shortening completed. ${newResults.length} URLs processed`);
  };

  const handleClear = () => {
    setUrls([
      { url: '', validity: 30, shortcode: '' },
      { url: '', validity: 30, shortcode: '' },
      { url: '', validity: 30, shortcode: '' },
      { url: '', validity: 30, shortcode: '' },
      { url: '', validity: 30, shortcode: '' }
    ]);
    setResults([]);
    log('Form cleared');
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        URL Shortener
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Shorten up to 5 URLs concurrently
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          {urls.map((urlItem, index) => (
            <Grid item xs={12} key={index}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    URL #{index + 1}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Original URL"
                        value={urlItem.url}
                        onChange={(e) => handleUrlChange(index, 'url', e.target.value)}
                        placeholder="https://example.com"
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Validity (minutes)"
                        type="number"
                        value={urlItem.validity}
                        onChange={(e) => handleUrlChange(index, 'validity', parseInt(e.target.value) || 30)}
                        size="small"
                        inputProps={{ min: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Custom Shortcode (optional)"
                        value={urlItem.shortcode}
                        onChange={(e) => handleUrlChange(index, 'shortcode', e.target.value)}
                        placeholder="custom123"
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            onClick={handleSubmit} 
            disabled={loading}
            size="large"
          >
            {loading ? 'Creating Short URLs...' : 'Create Short URLs'}
          </Button>
          <Button 
            variant="outlined" 
            onClick={handleClear}
            disabled={loading}
            size="large"
          >
            Clear All
          </Button>
        </Box>
      </Paper>

      {results.length > 0 && (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Results
          </Typography>
          {results.map((result, index) => (
            <Card key={index} sx={{ mb: 2 }}>
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Original URL:
                    </Typography>
                    <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                      {result.originalUrl}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    {result.status === 'success' ? (
                      <Box>
                        <Chip label="Success" color="success" size="small" sx={{ mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          Short URL:
                        </Typography>
                        <Typography variant="body1" color="primary" sx={{ wordBreak: 'break-all' }}>
                          {result.shortLink}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Expires: {new Date(result.expiry).toLocaleString()}
                        </Typography>
                      </Box>
                    ) : (
                      <Box>
                        <Chip label="Error" color="error" size="small" sx={{ mb: 1 }} />
                        <Alert severity="error" sx={{ mt: 1 }}>
                          {result.error}
                        </Alert>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}
        </Paper>
      )}
    </Box>
  );
};
