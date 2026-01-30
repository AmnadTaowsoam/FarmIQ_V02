import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, TextField, Button, Stack, alpha, useTheme, IconButton, InputAdornment } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { LogIn, ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface LocationState {
  from?: { pathname: string };
}

export const LoginPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading: authLoading, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('admin@farmiq.com');
  const [password, setPassword] = useState('password123');
  const [loginAttempted, setLoginAttempted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Handle redirect after successful login
  useEffect(() => {
    if (loginAttempted && isAuthenticated && !authLoading) {
      const state = location.state as LocationState;
      const redirectTo = state?.from?.pathname || '/overview';
      navigate(redirectTo, { replace: true });
    }
  }, [loginAttempted, isAuthenticated, authLoading, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      setLoginAttempted(true);
      // Navigation is handled by useEffect
    } catch (err: any) {
      setError(err.message || 'Invalid credentials or server error');
      setLoginAttempted(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      bgcolor: 'background.default',
      backgroundImage: `radial-gradient(circle at 20% 20%, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 40%), radial-gradient(circle at 80% 80%, ${alpha(theme.palette.secondary.main, 0.05)} 0%, transparent 40%)`
    }}>
      <Box sx={{ width: '100%', maxWidth: 450, p: 3 }}>
        {/* Brand Logo */}
        <Box sx={{ mb: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Box sx={{ 
            width: 64, 
            height: 64, 
            bgcolor: 'primary.main', 
            borderRadius: 3, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`
          }}>
            <ShieldCheck color="white" size={32} />
          </Box>
          <Typography variant="h4" fontWeight="800" color="text.primary" sx={{ letterSpacing: -0.5 }}>
            FarmIQ Admin
          </Typography>
          <Typography color="text.secondary" variant="body1">
            Platform Administration Portal
          </Typography>
        </Box>

        <Paper 
          elevation={0}
          sx={{ 
            p: 4, 
            borderRadius: 4, 
            border: '1px solid', 
            borderColor: alpha('#FFFFFF', 0.1),
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            bgcolor: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(20px)',
          }}
        >
          <Typography variant="h5" fontWeight="700" sx={{ mb: 1 }}>Administrator Login</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Please enter your credentials to access the admin portal
          </Typography>

          {error && (
            <Box sx={{ 
              p: 1.5, 
              mb: 3, 
              bgcolor: alpha(theme.palette.error.main, 0.1), 
              color: 'error.main', 
              borderRadius: 1.5,
              fontSize: '0.875rem',
              border: '1px solid',
              borderColor: alpha(theme.palette.error.main, 0.2)
            }}>
              {error}
            </Box>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <TextField
                fullWidth
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                        sx={{ color: 'text.secondary' }}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />

              <Button
                fullWidth
                size="large"
                type="submit"
                variant="contained"
                disabled={loading || authLoading}
                startIcon={<LogIn size={18} />}
                sx={{ 
                  py: 1.5, 
                  borderRadius: 1.5, 
                  boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
                  '&:hover': { boxShadow: `0 12px 20px ${alpha(theme.palette.primary.main, 0.3)}` }
                }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </Stack>
          </form>
        </Paper>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            FarmIQ Platform Administration
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default LoginPage;
