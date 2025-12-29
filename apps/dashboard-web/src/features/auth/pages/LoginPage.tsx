import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Checkbox, FormControlLabel, Link, Stack, alpha, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { LogIn, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            email: 'admin@farmiq.com',
            password: 'password123',
            rememberMe: true
        }
    });

    const onSubmit = async (data: any) => {
        setLoading(true);
        setError(null);
        try {
            await login(data.email, data.password);
            navigate('/select-tenant');
        } catch (err) {
            setError('Invalid credentials or server error');
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
            backgroundImage: `radial-gradient(circle at 20% 20%, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 40%), radial-gradient(circle at 80% 80%, ${alpha(theme.palette.secondary.main, 0.05)} 0%, transparent 40%)`,
            animation: 'fadeIn 0.6s ease-out'
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
                        FarmIQ
                    </Typography>
                    <Typography color="text.secondary" variant="body1">
                        Professional Agricultural Intelligence
                    </Typography>
                </Box>

                <Paper 
                    elevation={0}
                    sx={{ 
                        p: 4, 
                        borderRadius: 4, 
                        border: '1px solid', 
                        borderColor: 'divider',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
                        bgcolor: 'background.paper',
                    }}
                >
                    <Typography variant="h5" fontWeight="700" sx={{ mb: 1 }}>Welcome back</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                        Please enter your details to sign in to your workspace
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

                    <form onSubmit={handleSubmit(onSubmit)}>
                        <Stack spacing={2.5}>
                            <TextField
                                fullWidth
                                label="Email address"
                                type="email"
                                {...register('email', { required: 'Email is required' })}
                                error={!!errors.email}
                                helperText={errors.email?.message}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                            />
                            <Box>
                                <TextField
                                    fullWidth
                                    label="Password"
                                    type="password"
                                    {...register('password', { required: 'Password is required' })}
                                    error={!!errors.password}
                                    helperText={errors.password?.message}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                                />
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                    <Link href="/auth/forgot-password" variant="body2" color="primary" sx={{ fontWeight: 600, textDecoration: 'none' }}>
                                        Forgot password?
                                    </Link>
                                </Box>
                            </Box>

                            <FormControlLabel
                                control={<Checkbox {...register('rememberMe')} color="primary" />}
                                label={<Typography variant="body2">Keep me signed in</Typography>}
                            />

                            <Button
                                fullWidth
                                size="large"
                                type="submit"
                                variant="contained"
                                disabled={loading}
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
                        Don't have an account? {' '}
                        <Link href="#" color="primary" sx={{ fontWeight: 700, textDecoration: 'none' }}>
                            Contact Sales
                        </Link>
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};
