import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Chip,
  alpha
} from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { Search, ChevronDown, BookOpen, HelpCircle, AlertCircle, MessageCircle, Copy, Check } from 'lucide-react';
import { helpArticles, glossary, keyboardShortcuts, getDiagnosticInfo } from '../data/helpContent';
import { useSearchParams } from 'react-router-dom';

export const HelpCenterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedDiagnostics, setCopiedDiagnostics] = useState(false);

  const requestId = searchParams.get('rid');
  const topic = searchParams.get('topic');

  // Filter articles based on search
  const filteredArticles = useMemo(() => {
    if (!searchQuery) return helpArticles;
    
    const query = searchQuery.toLowerCase();
    return helpArticles.filter(article =>
      article.title.toLowerCase().includes(query) ||
      article.content.toLowerCase().includes(query) ||
      article.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  const articlesByCategory = useMemo(() => {
    return {
      'getting-started': filteredArticles.filter(a => a.category === 'getting-started'),
      'troubleshooting': filteredArticles.filter(a => a.category === 'troubleshooting'),
      'faq': filteredArticles.filter(a => a.category === 'faq'),
    };
  }, [filteredArticles]);

  const handleCopyDiagnostics = async () => {
    const diagnostics = getDiagnosticInfo();
    await navigator.clipboard.writeText(diagnostics);
    setCopiedDiagnostics(true);
    setTimeout(() => setCopiedDiagnostics(false), 2000);
  };

  return (
    <Box>
      <PageHeader 
        title="Help Center" 
        subtitle="Find answers and get support"
      />

      {/* Request ID Alert */}
      {requestId && (
        <Box sx={{ mb: 3 }}>
          <Card sx={{ bgcolor: 'warning.light', borderLeft: '4px solid', borderColor: 'warning.main' }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                You were directed here from an error
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Request ID: <code>{requestId}</code>
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Search Bar */}
      <PremiumCard sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search help articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={20} />
              </InputAdornment>
            ),
          }}
        />
      </PremiumCard>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          {/* Getting Started */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <BookOpen size={20} />
                <Typography variant="h6" fontWeight="bold">
                  Getting Started
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {articlesByCategory['getting-started'].map((article) => (
                  <Box
                    key={article.id}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'background.default',
                      border: '1px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05)
                      }
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      {article.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {article.content}
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {article.tags.map(tag => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Troubleshooting */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AlertCircle size={20} />
                <Typography variant="h6" fontWeight="bold">
                  Troubleshooting
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {articlesByCategory['troubleshooting'].map((article) => (
                  <Accordion key={article.id}>
                    <AccordionSummary expandIcon={<ChevronDown size={18} />}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {article.title}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" color="text.secondary">
                        {article.content}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <HelpCircle size={20} />
                <Typography variant="h6" fontWeight="bold">
                  Frequently Asked Questions
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {articlesByCategory['faq'].map((article) => (
                  <Accordion key={article.id}>
                    <AccordionSummary expandIcon={<ChevronDown size={18} />}>
                      <Typography variant="subtitle2">
                        {article.title}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" color="text.secondary">
                        {article.content}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Glossary */}
          <PremiumCard title="Glossary" sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {Object.entries(glossary).slice(0, 6).map(([term, definition]) => (
                <Box key={term}>
                  <Typography variant="subtitle2" fontWeight="bold" color="primary">
                    {term}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {definition}
                  </Typography>
                </Box>
              ))}
            </Box>
          </PremiumCard>

          {/* Keyboard Shortcuts */}
          <PremiumCard title="Keyboard Shortcuts" sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {keyboardShortcuts.map((shortcut, index) => (
                <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {shortcut.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {shortcut.keys.map(key => (
                      <Chip
                        key={key}
                        label={key}
                        size="small"
                        sx={{
                          bgcolor: 'background.default',
                          fontFamily: 'monospace',
                          fontSize: '0.75rem'
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          </PremiumCard>

          {/* Contact Support */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <MessageCircle size={20} />
                <Typography variant="h6" fontWeight="bold">
                  Contact Support
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Need more help? Our support team is here to assist you.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={copiedDiagnostics ? <Check size={18} /> : <Copy size={18} />}
                  onClick={handleCopyDiagnostics}
                >
                  {copiedDiagnostics ? 'Copied!' : 'Copy Diagnostic Info'}
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  href="mailto:support@farmiq.ai"
                >
                  Email Support
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
