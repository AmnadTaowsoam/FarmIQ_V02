import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Avatar,
  Divider,
  Switch,
  FormControlLabel,
  alpha,
  useTheme,
  Stack,
  IconButton,
  Alert,
} from '@mui/material';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  Save,
  Lock,
  Bell,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { FadeIn } from '../../../components/motion/FadeIn';

export const ProfileSettingsPage: React.FC = () => {
  const theme = useTheme();
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Mock user data
  const [profile, setProfile] = useState({
    name: 'Platform Admin',
    email: 'admin@farmiq.com',
    phone: '+66 123 456 789',
    location: 'Bangkok, Thailand',
    avatar: '',
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    systemAlerts: true,
    weeklyReports: false,
    securityAlerts: true,
  });

  const handleSaveProfile = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <Box pb={4}>
      <AdminPageHeader
        title="Profile Settings"
        subtitle="Manage your account settings and preferences"
      />

      {saveSuccess && (
        <FadeIn>
          <Alert severity="success" sx={{ mb: 3 }}>
            Profile updated successfully!
          </Alert>
        </FadeIn>
      )}

      <Grid container spacing={3}>
        {/* Left Column - Profile Info */}
        <Grid item xs={12} md={8}>
          <FadeIn delay={100}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: 'primary.main',
                    }}
                  >
                    <User size={24} />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>
                    Personal Information
                  </Typography>
                </Box>

                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      InputProps={{
                        startAdornment: (
                          <User size={20} style={{ marginRight: 8, color: theme.palette.text.secondary }} />
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      InputProps={{
                        startAdornment: (
                          <Mail size={20} style={{ marginRight: 8, color: theme.palette.text.secondary }} />
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      InputProps={{
                        startAdornment: (
                          <Phone size={20} style={{ marginRight: 8, color: theme.palette.text.secondary }} />
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Location"
                      value={profile.location}
                      onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                      InputProps={{
                        startAdornment: (
                          <MapPin size={20} style={{ marginRight: 8, color: theme.palette.text.secondary }} />
                        ),
                      }}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.warning.main, 0.1),
                      color: 'warning.main',
                    }}
                  >
                    <Lock size={24} />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>
                    Change Password
                  </Typography>
                </Box>

                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type={showOldPassword ? 'text' : 'password'}
                      label="Current Password"
                      InputProps={{
                        startAdornment: (
                          <Lock size={20} style={{ marginRight: 8, color: theme.palette.text.secondary }} />
                        ),
                        endAdornment: (
                          <IconButton size="small" onClick={() => setShowOldPassword(!showOldPassword)}>
                            {showOldPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </IconButton>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type={showNewPassword ? 'text' : 'password'}
                      label="New Password"
                      InputProps={{
                        startAdornment: (
                          <Lock size={20} style={{ marginRight: 8, color: theme.palette.text.secondary }} />
                        ),
                        endAdornment: (
                          <IconButton size="small" onClick={() => setShowNewPassword(!showNewPassword)}>
                            {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </IconButton>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type={showNewPassword ? 'text' : 'password'}
                      label="Confirm New Password"
                      InputProps={{
                        startAdornment: (
                          <Lock size={20} style={{ marginRight: 8, color: theme.palette.text.secondary }} />
                        ),
                      }}
                    />
                  </Grid>
                </Grid>

                <Box mt={3} display="flex" gap={2}>
                  <Button
                    variant="contained"
                    startIcon={<Save size={20} />}
                    onClick={handleSaveProfile}
                    sx={{
                      px: 4,
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outlined"
                    sx={{
                      px: 4,
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </FadeIn>

          {/* Notification Preferences */}
          <FadeIn delay={300}>
            <Card sx={{ mt: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.info.main, 0.1),
                      color: 'info.main',
                    }}
                  >
                    <Bell size={24} />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>
                    Notification Preferences
                  </Typography>
                </Box>

                <Stack spacing={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notifications.emailNotifications}
                        onChange={(e) =>
                          setNotifications({ ...notifications, emailNotifications: e.target.checked })
                        }
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          Email Notifications
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Receive email updates about your account activity
                        </Typography>
                      </Box>
                    }
                  />
                  <Divider />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notifications.systemAlerts}
                        onChange={(e) => setNotifications({ ...notifications, systemAlerts: e.target.checked })}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          System Alerts
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Get notified about system status and updates
                        </Typography>
                      </Box>
                    }
                  />
                  <Divider />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notifications.weeklyReports}
                        onChange={(e) => setNotifications({ ...notifications, weeklyReports: e.target.checked })}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          Weekly Reports
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Receive weekly summary reports
                        </Typography>
                      </Box>
                    }
                  />
                  <Divider />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notifications.securityAlerts}
                        onChange={(e) =>
                          setNotifications({ ...notifications, securityAlerts: e.target.checked })
                        }
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          Security Alerts
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Important security notifications (recommended)
                        </Typography>
                      </Box>
                    }
                  />
                </Stack>
              </CardContent>
            </Card>
          </FadeIn>
        </Grid>

        {/* Right Column - Avatar & Quick Info */}
        <Grid item xs={12} md={4}>
          <FadeIn delay={200}>
            <Card>
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Box position="relative" display="inline-block" mb={2}>
                  <Avatar
                    sx={{
                      width: 120,
                      height: 120,
                      bgcolor: 'primary.main',
                      fontSize: '2.5rem',
                      fontWeight: 700,
                    }}
                  >
                    {profile.name.charAt(0)}
                  </Avatar>
                  <IconButton
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' },
                      boxShadow: 2,
                    }}
                    size="small"
                  >
                    <Camera size={20} />
                  </IconButton>
                </Box>

                <Typography variant="h5" fontWeight={700} gutterBottom>
                  {profile.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {profile.email}
                </Typography>

                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                  }}
                >
                  <Typography variant="caption" color="success.main" fontWeight={600}>
                    PLATFORM ADMIN
                  </Typography>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Stack spacing={2} alignItems="flex-start">
                  <Box display="flex" alignItems="center" gap={1.5} width="100%">
                    <Mail size={18} color={theme.palette.text.secondary} />
                    <Typography variant="body2" color="text.secondary">
                      {profile.email}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1.5} width="100%">
                    <Phone size={18} color={theme.palette.text.secondary} />
                    <Typography variant="body2" color="text.secondary">
                      {profile.phone}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1.5} width="100%">
                    <MapPin size={18} color={theme.palette.text.secondary} />
                    <Typography variant="body2" color="text.secondary">
                      {profile.location}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </FadeIn>

          {/* Security Info */}
          <FadeIn delay={400}>
            <Card sx={{ mt: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.error.main, 0.1),
                      color: 'error.main',
                    }}
                  >
                    <Shield size={24} />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>
                    Security
                  </Typography>
                </Box>

                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      Last Login
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Today at 10:30 AM
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      Password Last Changed
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      30 days ago
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      Two-Factor Authentication
                    </Typography>
                    <Typography variant="body2" color="success.main">
                      Enabled
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </FadeIn>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProfileSettingsPage;
