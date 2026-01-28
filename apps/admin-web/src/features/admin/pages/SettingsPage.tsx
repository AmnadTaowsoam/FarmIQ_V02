import React from 'react';
import { Box, Grid, Typography, Stack, alpha, useTheme, Button, Card, CardContent } from '@mui/material';
import { Database, Bell, Shield, ArrowRight, Info, Settings as SettingsIcon, Sparkles } from 'lucide-react';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { FadeIn } from '../../../components/motion/FadeIn';
import { Stagger } from '../../../components/motion/Stagger';
import { useNavigate } from 'react-router-dom';

// Settings Card Component
const SettingsCard: React.FC<{
  title: string;
  description: string;
  icon: any;
  color: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  path: string;
  delay?: number;
}> = ({ title, description, icon: Icon, color, path, delay = 0 }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <FadeIn delay={delay}>
      <Card
        sx={{ 
          height: '100%', 
          position: 'relative', 
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'pointer',
          background: `linear-gradient(135deg, ${alpha(theme.palette[color].main, 0.05)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
          border: `1px solid ${alpha(theme.palette[color].main, 0.1)}`,
          '&:hover': { 
            transform: 'translateY(-8px) scale(1.02)',
            boxShadow: `0 20px 40px ${alpha(theme.palette[color].main, 0.2)}`,
            border: `1px solid ${alpha(theme.palette[color].main, 0.3)}`,
            '& .icon-box': {
              transform: 'rotate(-5deg) scale(1.1)',
              background: `linear-gradient(135deg, ${theme.palette[color].main} 0%, ${theme.palette[color].dark} 100%)`,
            },
            '& .bg-icon': {
              opacity: 0.12,
              transform: 'rotate(20deg) scale(1.1)',
            }
          }
        }}
        onClick={() => navigate(path)}
      >
        <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Background Icon */}
          <Box 
            className="bg-icon"
            sx={{ 
              position: 'absolute', 
              top: -20, 
              right: -20, 
              opacity: 0.06, 
              color: `${color}.main`,
              transform: 'rotate(15deg)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <Icon size={140} strokeWidth={1.5} />
          </Box>
          
          {/* Icon Box */}
          <Box 
            className="icon-box"
            sx={{ 
              width: 56,
              height: 56,
              p: 1.5, 
              borderRadius: 3, 
              background: `linear-gradient(135deg, ${alpha(theme.palette[color].main, 0.15)} 0%, ${alpha(theme.palette[color].main, 0.05)} 100%)`,
              color: `${color}.main`,
              mb: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 1,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: `0 4px 12px ${alpha(theme.palette[color].main, 0.15)}`,
            }}
          >
            <Icon size={28} strokeWidth={2} />
          </Box>

          {/* Content */}
          <Box flex={1} position="relative" zIndex={1}>
            <Typography 
              variant="h5" 
              fontWeight={700} 
              gutterBottom
              sx={{ 
                color: 'text.primary',
                mb: 1.5,
                letterSpacing: -0.5
              }}
            >
              {title}
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                lineHeight: 1.7,
                mb: 3
              }}
            >
              {description}
            </Typography>
          </Box>

          {/* Action Button */}
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Button 
              variant="text"
              endIcon={<ArrowRight size={18} />}
              sx={{ 
                color: `${color}.main`,
                fontWeight: 600,
                px: 0,
                '&:hover': { 
                  bgcolor: 'transparent',
                  '& .MuiButton-endIcon': {
                    transform: 'translateX(4px)',
                  }
                },
                '& .MuiButton-endIcon': {
                  transition: 'transform 0.2s',
                }
              }}
            >
              Configure
            </Button>
          </Box>
        </CardContent>
      </Card>
    </FadeIn>
  );
};

export const SettingsPage: React.FC = () => {
  const theme = useTheme();

  const settingsCategories = [
    {
      title: 'Tenant Quotas',
      description: 'Manage resource quotas and limits for each tenant in the platform',
      icon: Database,
      color: 'primary' as const,
      path: '/settings/quotas',
    },
    {
      title: 'Data Policy',
      description: 'Configure data retention policies, privacy settings, and compliance rules',
      icon: Shield,
      color: 'success' as const,
      path: '/settings/data-policy',
    },
    {
      title: 'Notifications',
      description: 'Set up notification preferences, alert thresholds, and delivery channels',
      icon: Bell,
      color: 'info' as const,
      path: '/settings/notifications',
    },
  ];

  return (
    <Box pb={4}>
      <AdminPageHeader
        title="Settings"
        subtitle="Configure platform-wide settings and preferences"
      />

      {/* Hero Banner */}
      <FadeIn delay={100}>
        <Card 
          sx={{ 
            mb: 4, 
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box 
            sx={{ 
              position: 'absolute', 
              top: -30, 
              right: -30, 
              opacity: 0.04,
              transform: 'rotate(-15deg)',
            }}
          >
            <Sparkles size={200} />
          </Box>
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={2.5}>
              <Box sx={{ 
                p: 2, 
                borderRadius: 3, 
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: 'white',
                boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
              }}>
                <SettingsIcon size={28} strokeWidth={2} />
              </Box>
              <Box flex={1}>
                <Typography variant="h6" fontWeight={700} color="text.primary" gutterBottom>
                  Platform Settings
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Configure global settings that affect all tenants and users in the platform. Changes here will apply system-wide.
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Settings Categories */}
      <Grid container spacing={3}>
        {settingsCategories.map((category, index) => (
          <Grid item xs={12} sm={6} md={4} key={category.path}>
            <SettingsCard
              title={category.title}
              description={category.description}
              icon={category.icon}
              color={category.color}
              path={category.path}
              delay={200 + (index * 100)}
            />
          </Grid>
        ))}
      </Grid>

      {/* Warning Notice */}
      <FadeIn delay={600}>
        <Card 
          sx={{ 
            mt: 4,
            bgcolor: alpha(theme.palette.warning.main, 0.04),
            border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Box display="flex" alignItems="center" gap={2}>
              <Box sx={{ 
                p: 1, 
                borderRadius: 2, 
                bgcolor: alpha(theme.palette.warning.main, 0.1),
                color: 'warning.main',
              }}>
                <Info size={20} />
              </Box>
              <Box flex={1}>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  <strong>Important:</strong> Changes made to platform settings may affect all tenants and users. Please review carefully before applying changes.
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </FadeIn>
    </Box>
  );
};

export default SettingsPage;
