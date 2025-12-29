import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Grid,
  alpha
} from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { Calendar, GitBranch, Zap, Bug, Sparkles } from 'lucide-react';

const releases = [
  {
    version: '1.2.0',
    date: '2024-12-20',
    type: 'feature',
    changes: [
      'Added AI section with Overview, Insights Feed, Model Registry',
      'Implemented Help/Docs system with User Guide',
      'Enhanced sidebar with collapsible groups and recents',
      'Added premium empty states across the platform'
    ]
  },
  {
    version: '1.1.5',
    date: '2024-12-15',
    type: 'improvement',
    changes: [
      'Improved Standards Library with tabs and filters',
      'Enhanced error handling with better error states',
      'Added URL persistence for filters',
      'Performance optimizations for large datasets'
    ]
  },
  {
    version: '1.1.0',
    date: '2024-12-10',
    type: 'feature',
    changes: [
      'Added Account/Workspace Settings split',
      'Implemented context selection improvements',
      'Added WeighVision distribution analytics',
      'Enhanced telemetry visualization'
    ]
  },
  {
    version: '1.0.5',
    date: '2024-12-05',
    type: 'bugfix',
    changes: [
      'Fixed CSV import validation errors',
      'Resolved sensor binding issues',
      'Fixed FCR calculation edge cases',
      'Improved mobile responsiveness'
    ]
  },
  {
    version: '1.0.0',
    date: '2024-12-01',
    type: 'release',
    changes: [
      'Initial production release',
      'Core farm management features',
      'Sensor monitoring and telemetry',
      'Standards library and batch tracking',
      'Multi-language support (EN/TH)'
    ]
  }
];

const getTypeColor = (type: string) => {
  switch (type) {
    case 'feature': return 'success';
    case 'improvement': return 'info';
    case 'bugfix': return 'warning';
    case 'release': return 'primary';
    default: return 'default';
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'feature': return <Sparkles size={18} />;
    case 'improvement': return <Zap size={18} />;
    case 'bugfix': return <Bug size={18} />;
    case 'release': return <GitBranch size={18} />;
    default: return <Calendar size={18} />;
  }
};

export const ChangelogPage: React.FC = () => {
  return (
    <Box>
      <PageHeader 
        title="Changelog" 
        subtitle="Track new features, improvements, and bug fixes"
      />

      {/* Current Version */}
      <PremiumCard sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Current Version: {releases[0].version}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Released on {new Date(releases[0].date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Typography>
          </Box>
          <Chip 
            label="Latest" 
            color="success" 
            sx={{ fontWeight: 'bold' }}
          />
        </Box>
      </PremiumCard>

      {/* Release History */}
      <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
        Release History
      </Typography>

      <Grid container spacing={3}>
        {releases.map((release, index) => (
          <Grid item xs={12} key={index}>
            <Card
              sx={{
                border: '1px solid',
                borderColor: index === 0 ? 'success.main' : 'divider',
                bgcolor: index === 0 ? (theme) => alpha(theme.palette.success.main, 0.05) : 'background.paper'
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 2,
                        bgcolor: (theme) => {
                          const colorType = getTypeColor(release.type);
                          if (colorType === 'default') return 'background.default';
                          return alpha(theme.palette[colorType as 'success' | 'info' | 'warning' | 'primary'].main, 0.1);
                        },
                        color: `${getTypeColor(release.type)}.main`,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {getTypeIcon(release.type)}
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        Version {release.version}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Calendar size={14} />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(release.date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Chip 
                    label={release.type} 
                    color={getTypeColor(release.type) !== 'default' ? getTypeColor(release.type) as any : undefined}
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                  />
                </Box>

                <Box sx={{ pl: 7 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    What's New
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {release.changes.map((change, idx) => (
                      <Box component="li" key={idx} sx={{ mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {change}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Footer */}
      <Box sx={{ mt: 4, p: 3, bgcolor: 'background.default', borderRadius: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Want to suggest a feature or report a bug?{' '}
          <a href="mailto:support@farmiq.ai" style={{ color: 'inherit', fontWeight: 'bold' }}>
            Contact us
          </a>
        </Typography>
      </Box>
    </Box>
  );
};
