import React, { useState, useEffect } from 'react';
import { 
  Drawer, 
  Box, 
  Typography, 
  IconButton, 
  Stack, 
  Divider, 
  TextField, 
  FormControl, 
  RadioGroup, 
  FormControlLabel, 
  Radio, 
  Button, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Alert,
  MenuItem,
  Select,
  InputLabel,
  InputAdornment,
  Switch,
  List,
  ListItem,
  ListItemText,
  Tooltip
} from '@mui/material';
import { 
  X, 
  ChevronDown, 
  Server, 
  RotateCcw, 
  Save,
  Shield,
  Key,
  Eye,
  EyeOff,
  Download,

  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useSettings, AuthMode } from '@/contexts/SettingsContext';
import { edgeOpsApi } from '@/api/client';
import { generateCurlCommand } from '@/lib/diagnostics';
import { Terminal } from 'lucide-react';

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ open, onClose }) => {
  const { 
    connectionProfile, setConnectionProfile,
    edgeHost, setEdgeHost,
    serviceOverrides, setServiceOverrides,
    getServiceUrl, resetSettings,
    authMode, setAuthMode,
    apiKey, setApiKey,
    hmacSecret, setHmacSecret,
    enableDangerousActions, setEnableDangerousActions,
    auditLog, exportAuditLog,
    tenantId
  } = useSettings();

  // Local state for buffering changes
  const [localProfile, setLocalProfile] = useState(connectionProfile);
  const [localEdgeHost, setLocalEdgeHost] = useState(edgeHost);
  const [localOverrides, setLocalOverrides] = useState(serviceOverrides);
  const [localAuthMode, setLocalAuthMode] = useState<AuthMode>(authMode);
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localHmacSecret, setLocalHmacSecret] = useState(hmacSecret);
  const [showSecrets, setShowSecrets] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'success' | 'error', msg?: string }>({ status: 'idle' });

  // Sync validation status
  const [connectivitySummary, setConnectivitySummary] = useState<string | null>(null);

  // Sync local state when drawer opens
  useEffect(() => {
    if (open) {
      setLocalProfile(connectionProfile);
      setLocalEdgeHost(edgeHost);
      setLocalOverrides(serviceOverrides);
      setLocalAuthMode(authMode);
      setLocalApiKey(apiKey);
      setLocalHmacSecret(hmacSecret);
      setConnectivitySummary(null);
      setTestResult({ status: 'idle' });
    }
  }, [open, connectionProfile, edgeHost, serviceOverrides, authMode, apiKey, hmacSecret]);

  const handleApply = () => {
    setConnectionProfile(localProfile);
    setEdgeHost(localEdgeHost);
    setServiceOverrides(localOverrides);
    setAuthMode(localAuthMode);
    setApiKey(localApiKey);
    setHmacSecret(localHmacSecret);
    
    // Quick connectivity summary
    // Heuristic: Count overrides + active profile
    const overrideCount = Object.keys(localOverrides).length;
    setConnectivitySummary(`Settings Applied. Profile: ${localProfile}. Overrides: ${overrideCount}.`);
  };

  const handleReset = () => {
    if (confirm('Reset all settings to defaults?')) {
      resetSettings();
      onClose();
    }
  };

  const handleTestHandshake = async () => {
    setTestResult({ status: 'idle' });
    try {
        // Use the context's current settings (applied) or local? 
        // Ideally should apply first, but let's assume user hits Apply then Test.
        // We'll use the "local" values by creating a temp context object if possible, 
        // OR just warn user to Apply first. Simpler: Use the *Hook* values, so user must Apply first.
        
        // We need to pass the *current applied* Settings to the API.
        // The API client uses `getServiceUrl` which uses the Context state.
        // So we just call the API.
        
        await edgeOpsApi.getCloudDiagnostics({
            tenantId,
            apiKey: authMode === 'api-key' ? apiKey : undefined,
            getServiceUrl // Pass dynamic resolver
        });
        setTestResult({ status: 'success', msg: 'Cloud Handshake OK' });
    } catch (e: any) {
        setTestResult({ status: 'error', msg: `Failed: ${e.message || 'Unknown error'}` });
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 500 }, p: 0 }
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Server size={24} />
            <Typography variant="h6" fontWeight="bold">Settings</Typography>
          </Stack>
          <IconButton onClick={onClose}><X size={24} /></IconButton>
        </Stack>

        {/* Content */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
          <Stack spacing={4}>
            
            {/* 1. Connection Profile */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
                Connection Profile
              </Typography>
              <FormControl component="fieldset">
                <RadioGroup 
                  value={localProfile} 
                  onChange={(e) => setLocalProfile(e.target.value as any)}
                >
                  <FormControlLabel 
                    value="local" 
                    control={<Radio />} 
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight="medium">Local (Development)</Typography>
                        <Typography variant="caption" color="text.secondary">Direct to localhost:51xx</Typography>
                      </Box>
                    } 
                    sx={{ mb: 1 }}
                  />
                  <FormControlLabel 
                    value="cluster" 
                    control={<Radio />} 
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight="medium">Cluster / Compose</Typography>
                        <Typography variant="caption" color="text.secondary">Relative paths via Ingress (/svc/...)</Typography>
                      </Box>
                    }
                    sx={{ mb: 1 }}
                  />
                  <FormControlLabel 
                    value="edge-device" 
                    control={<Radio />} 
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight="medium">Edge Device (Remote)</Typography>
                        <Typography variant="caption" color="text.secondary">Connect by IP Address</Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>

              {/* Edge Host Input */}
              {localProfile === 'edge-device' && (
                <Box sx={{ mt: 2, ml: 4 }}>
                  <TextField 
                    label="Edge Device IP / Hostname"
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={localEdgeHost}
                    onChange={(e) => setLocalEdgeHost(e.target.value)}
                    placeholder="e.g. 192.168.1.50"
                  />
                </Box>
              )}
            </Box>
            
            <Divider />

            {/* 2. Authentication */}
            <Box>
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                    <Key size={16} />
                    <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                        Authentication
                    </Typography>
                </Stack>
                
                <Stack spacing={3}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Auth Mode</InputLabel>
                        <Select
                            value={localAuthMode}
                            label="Auth Mode"
                            onChange={(e) => setLocalAuthMode(e.target.value as AuthMode)}
                        >
                            <MenuItem value="none">None (Public/Local)</MenuItem>
                            <MenuItem value="api-key">API Key</MenuItem>
                            <MenuItem value="hmac">HMAC Signature</MenuItem>
                        </Select>
                    </FormControl>

                    {localAuthMode === 'api-key' && (
                        <TextField
                            label="API Key"
                            type={showSecrets ? 'text' : 'password'}
                            fullWidth
                            size="small"
                            value={localApiKey}
                            onChange={(e) => setLocalApiKey(e.target.value)}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowSecrets(!showSecrets)} edge="end">
                                            {showSecrets ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />
                    )}

                    {localAuthMode === 'hmac' && (
                        <TextField
                            label="HMAC Secret"
                            type={showSecrets ? 'text' : 'password'}
                            fullWidth
                            size="small"
                            value={localHmacSecret}
                            onChange={(e) => setLocalHmacSecret(e.target.value)}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowSecrets(!showSecrets)} edge="end">
                                            {showSecrets ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />
                    )}
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Tooltip title="Copy Curl Command">
                            <IconButton 
                                size="small"
                                onClick={() => {
                                    // Use the resolved URL logic (simplified here or use helper if needed)
                                    // We'll use the Observability Agent URL
                                    const baseUrl = getServiceUrl('EDGE_OBSERVABILITY_AGENT');
                                    const url = `${baseUrl}/api/v1/cloud/diagnostics`;
                                    
                                    const cmd = generateCurlCommand(url, { 
                                        tenantId, 
                                        apiKey: localAuthMode === 'api-key' ? localApiKey : undefined, // Use local values as they might be what user is testing
                                        // But generateCurlCommand assumes header injection. 
                                        // We'll pass them explicitly.
                                    });
                                    navigator.clipboard.writeText(cmd);
                                    alert('Curl command copied!');
                                }}
                            >
                                <Terminal size={16} />
                            </IconButton>
                        </Tooltip>

                        <Button 
                            variant="outlined" 
                            size="small" 
                            onClick={handleTestHandshake}
                            disabled={localAuthMode !== 'none' && !localApiKey && !localHmacSecret}
                        >
                            Test Cloud Handshake
                        </Button>
                        
                        {testResult.status === 'success' && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
                                <CheckCircle2 size={16} />
                                <Typography variant="caption" fontWeight="bold">OK</Typography>
                            </Box>
                        )}
                        {testResult.status === 'error' && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
                                <XCircle size={16} />
                                <Typography variant="caption" fontWeight="bold">Error</Typography> {/* Simplified msg */}
                            </Box>
                        )}
                        {testResult.status === 'error' && testResult.msg && (
                             <Typography variant="caption" color="error.main" sx={{ display: 'block', width: '100%' }}>
                                 {testResult.msg}
                             </Typography>
                        )}
                    </Box>
                </Stack>
            </Box>

            <Divider />

            {/* 3. Safety & Audit */}
            <Box>
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                    <Shield size={16} />
                    <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                        Safety & Audit
                    </Typography>
                </Stack>
                
                <FormControlLabel
                    control={
                        <Switch 
                            checked={enableDangerousActions} 
                            onChange={(e) => setEnableDangerousActions(e.target.checked)} 
                            color="error"
                        />
                    }
                    label={
                        <Box>
                            <Typography variant="body2" fontWeight="medium">Enable Dangerous Actions</Typography>
                            <Typography variant="caption" color="text.secondary">Allow triggering syncs and redriving DLQ</Typography>
                        </Box>
                    }
                />

                <Box sx={{ mt: 3, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ p: 1, bgcolor: 'action.hover', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" fontWeight="bold">AUDIT LOG ({auditLog.length})</Typography>
                        <IconButton size="small" onClick={exportAuditLog} disabled={auditLog.length === 0} title="Export JSON">
                            <Download size={14} />
                        </IconButton>
                    </Box>
                    <List dense sx={{ maxHeight: 200, overflow: 'auto', py: 0 }}>
                        {auditLog.length === 0 ? (
                            <ListItem>
                                <ListItemText primary={<Typography variant="caption" color="text.secondary">No actions recorded.</Typography>} />
                            </ListItem>
                        ) : (
                            auditLog.map((entry, i) => (
                                <ListItem key={i} divider>
                                    <ListItemText 
                                        primary={
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Typography variant="caption" fontWeight="bold" 
                                                    color={entry.status === 'success' ? 'success.main' : 'error.main'}
                                                >
                                                    {entry.action.toUpperCase()}
                                                </Typography>
                                                <Typography variant="caption">{entry.details}</Typography>
                                            </Stack>
                                        }
                                        secondary={new Date(entry.timestamp).toLocaleString()}
                                    />
                                </ListItem>
                            ))
                        )}
                    </List>
                </Box>
            </Box>

            <Divider />

            {/* 4. Service Overrides */}
            <Accordion variant="outlined" sx={{ '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ChevronDown size={16} />}>
                <Typography variant="subtitle2" fontWeight="medium">Service Overrides</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Alert severity="info" sx={{ py: 0 }}>
                    Overrides take precedence over profile defaults.
                  </Alert>
                  {['EDGE_INGRESS_GATEWAY', 'EDGE_SYNC_FORWARDER', 'EDGE_OBSERVABILITY_AGENT'].map(key => (
                    <TextField
                      key={key}
                      label={key}
                      variant="outlined"
                      size="small"
                      placeholder="http://..."
                      value={localOverrides[key] || ''}
                      onChange={(e) => setLocalOverrides(prev => ({
                        ...prev,
                        [key]: e.target.value
                      }))}
                      fullWidth
                      helperText={localOverrides[key] ? 'Overridden' : ''}
                    />
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>

          </Stack>
        </Box>

        {/* Footer Actions */}
        <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
          {connectivitySummary && (
            <Alert severity="success" sx={{ mb: 2 }}>{connectivitySummary}</Alert>
          )}
          
          <Stack direction="row" spacing={2} justifyContent="flex-end">
             <Button 
              variant="text" 
              color="error" 
              startIcon={<RotateCcw size={16} />}
              onClick={() => {
                  if (confirm('Revert all unsaved changes?')) {
                      setLocalProfile(connectionProfile);
                      setLocalEdgeHost(edgeHost);
                      setLocalOverrides(serviceOverrides);
                      setLocalAuthMode(authMode);
                      setLocalApiKey(apiKey);
                      setLocalHmacSecret(hmacSecret);
                  }
              }}
            >
              Revert
            </Button>
            <Button 
                variant="outlined" 
                color="warning" 
                onClick={handleReset}
            >
                Defaults
            </Button>
            <Button 
              variant="contained" 
              startIcon={<Save size={16} />}
              onClick={handleApply}
            >
              Apply Settings
            </Button>
          </Stack>
        </Box>
      </Box>
    </Drawer>
  );
};

