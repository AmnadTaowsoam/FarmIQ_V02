import React, { useState } from 'react';
import { Box, Paper, Typography, Button, Alert, Chip, IconButton, Tooltip } from '@mui/material';
import { AlertCircle, Server, Lock, XCircle, RefreshCw, Copy, Check, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface ApiErrorStateProps {
  status?: number;
  message?: string;
  correlationId?: string;
  endpoint?: string;
  onRetry?: () => void;
}

export const ApiErrorState: React.FC<ApiErrorStateProps> = ({
  status,
  message,
  correlationId,
  endpoint,
  onRetry,
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  // Determine error type and messaging
  const getErrorDetails = () => {
    switch (status) {
      case 404:
        return {
          icon: <XCircle size={48} />,
          color: 'warning' as const,
          title: 'Endpoint Not Found',
          description: endpoint
            ? `The API endpoint "${endpoint}" is not available. This usually means the backend gateway (BFF) doesn't have a proxy route configured for this endpoint yet.`
            : 'The requested resource was not found.',
          suggestion: 'Please contact the backend team to add the missing BFF proxy route, or check if the service is deployed.',
        };
      
      case 403:
        return {
          icon: <Lock size={48} />,
          color: 'error' as const,
          title: 'Access Forbidden',
          description: 'You don\'t have permission to access this resource.',
          suggestion: 'Please check your user role and permissions, or contact your administrator.',
        };
      
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          icon: <Server size={48} />,
          color: 'error' as const,
          title: 'Server Error',
          description: 'The server encountered an error while processing your request.',
          suggestion: 'This is usually temporary. Please try again in a few moments.',
        };
      
      default:
        return {
          icon: <AlertCircle size={48} />,
          color: 'error' as const,
          title: 'API Error',
          description: message || 'An error occurred while communicating with the server.',
          suggestion: 'Please try again or contact support if the problem persists.',
        };
    }
  };

  const errorDetails = getErrorDetails();

  const handleCopyRequestId = async () => {
    if (correlationId) {
      await navigator.clipboard.writeText(correlationId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGetHelp = () => {
    const params = new URLSearchParams();
    if (correlationId) params.set('rid', correlationId);
    params.set('topic', 'troubleshooting');
    navigate(`/help?${params.toString()}`);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
        p: 3,
      }}
    >
      <Paper
        elevation={2}
        sx={{
          maxWidth: 600,
          p: 4,
          textAlign: 'center',
          borderTop: 4,
          borderColor: `${errorDetails.color}.main`,
        }}
      >
        <Box sx={{ mb: 3, color: `${errorDetails.color}.main` }}>
          {errorDetails.icon}
        </Box>

        <Typography variant="h5" gutterBottom color={errorDetails.color}>
          {errorDetails.title}
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {errorDetails.description}
        </Typography>

        <Alert severity={errorDetails.color} sx={{ mb: 3, textAlign: 'left' }}>
          <Typography variant="body2">
            <strong>Suggestion:</strong> {errorDetails.suggestion}
          </Typography>
        </Alert>

        {/* Technical details for debugging */}
        {(status || endpoint || correlationId) && (
          <Box sx={{ mb: 3, textAlign: 'left' }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              <strong>Technical Details:</strong>
            </Typography>
            
            {status && (
              <Box sx={{ mb: 1 }}>
                <Chip label={`HTTP ${status}`} size="small" color={errorDetails.color} variant="outlined" />
              </Box>
            )}
            
            {endpoint && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontFamily: 'monospace', mb: 0.5 }}>
                <strong>Endpoint:</strong> {endpoint}
              </Typography>
            )}
            
            {correlationId && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                  <strong>Request ID:</strong> {correlationId}
                </Typography>
                <Tooltip title={copied ? 'Copied!' : 'Copy Request ID'}>
                  <IconButton 
                    size="small" 
                    onClick={handleCopyRequestId}
                    sx={{ p: 0.5 }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>
        )}

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          {onRetry && (
            <Button
              variant="contained"
              color={errorDetails.color}
              startIcon={<RefreshCw size={18} />}
              onClick={onRetry}
            >
              Retry
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<HelpCircle size={18} />}
            onClick={handleGetHelp}
          >
            Get Help
          </Button>
          <Button
            variant="outlined"
            onClick={() => window.location.href = '/'}
          >
            Go to Home
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ApiErrorState;
