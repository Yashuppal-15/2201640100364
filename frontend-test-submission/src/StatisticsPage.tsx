import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Card,
  CardContent,
  Grid,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Button
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import axios from 'axios';

interface UrlStats {
  shortcode: string;
  originalUrl: string;
  createdAt: string;
  expiresAt: string;
  totalClicks: number;
  clicks: Array<{
    timestamp: string;
    referrer: string;
    location: string;
  }>;
}

export const StatisticsPage: React.FC = () => {
  const [stats, setStats] = useState<UrlStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const log = (message: string) => {
    console.log(`[${new Date().toISOString()}] frontend:info:page - ${message}`);
  };

  // Mock data for demonstration (since we need some shortcodes to fetch stats)
  const mockShortcodes = ['test123', 'demo456', 'sample789'];

  const fetchAllStats = async () => {
    setLoading(true);
    setError('');
    log('Fetching statistics for all URLs');
    
    try {
      const statsPromises = mockShortcodes.map(async (shortcode) => {
        try {
          const response = await axios.get(`http://localhost:8081/shorturls/${shortcode}`);
          return response.data;
        } catch (error: any) {
          if (error.response?.status !== 404) {
            log(`Error fetching stats for ${shortcode}: ${error.message}`);
          }
          return null;
        }
      });

      const results = await Promise.all(statsPromises);
      const validStats = results.filter(stat => stat !== null);
      
      setStats(validStats);
      log(`Successfully fetched statistics for ${validStats.length} URLs`);
      
      if (validStats.length === 0) {
        setError('No URL statistics found. Create some short URLs first.');
      }
    } catch (error: any) {
      setError(`Failed to fetch statistics: ${error.message}`);
      log(`Error fetching statistics: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    log('Statistics page initialized');
    fetchAllStats();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isExpired = (expiresAt: string) => {
    return new Date() > new Date(expiresAt);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          URL Statistics
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchAllStats}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>

      <Typography variant="body1" color="text.secondary" gutterBottom>
        Analytics and click tracking for all shortened URLs
      </Typography>

      {error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && stats.length === 0 ? (
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography>Loading statistics...</Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {stats.map((urlStat, index) => (
            <Grid item xs={12} key={urlStat.shortcode}>
              <Card elevation={3}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" gutterBottom>
                          Short URL: http://localhost:8081/{urlStat.shortcode}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                          Original: {urlStat.originalUrl}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Chip 
                          label={`${urlStat.totalClicks} clicks`} 
                          color="primary" 
                          variant="outlined" 
                        />
                        <Chip 
                          label={isExpired(urlStat.expiresAt) ? 'Expired' : 'Active'} 
                          color={isExpired(urlStat.expiresAt) ? 'error' : 'success'}
                          variant="outlined"
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary">
                        Created: {formatDate(urlStat.createdAt)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Expires: {formatDate(urlStat.expiresAt)}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Typography variant="h6" gutterBottom>
                        Recent Clicks
                      </Typography>
                      {urlStat.clicks.length > 0 ? (
                        <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                          {urlStat.clicks.slice(-5).reverse().map((click, clickIndex) => (
                            <Card key={clickIndex} variant="outlined" sx={{ mb: 1, p: 1 }}>
                              <Typography variant="body2">
                                {formatDate(click.timestamp)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                From: {click.referrer} | Location: {click.location}
                              </Typography>
                            </Card>
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No clicks yet
                        </Typography>
                      )}
                    </Grid>
                  </Grid>

                  {urlStat.clicks.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="h6" gutterBottom>
                        Click Details
                      </Typography>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Timestamp</TableCell>
                              <TableCell>Referrer</TableCell>
                              <TableCell>Location</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {urlStat.clicks.map((click, clickIndex) => (
                              <TableRow key={clickIndex}>
                                <TableCell>
                                  {formatDate(click.timestamp)}
                                </TableCell>
                                <TableCell>
                                  {click.referrer || 'Direct'}
                                </TableCell>
                                <TableCell>
                                  {click.location}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {stats.length === 0 && !loading && !error && (
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No Statistics Available
          </Typography>
          <Typography color="text.secondary">
            Create some short URLs first to see statistics here.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};
