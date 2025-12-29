import React, { useState } from 'react';
import { Box, Typography, ToggleButtonGroup, ToggleButton, Chip, alpha } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Lightbulb, RefreshCw, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type EventType = 'all' | 'anomaly' | 'recommendation' | 'model';
type TimeRange = '24h' | '7d' | '30d';

export const InsightsFeedPage: React.FC = () => {
  const { t } = useTranslation('common');
  const [eventType, setEventType] = useState<EventType>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  const mockEvents = [
    {
      id: '1',
      type: 'anomaly',
      title: 'Temperature spike detected',
      description: 'Barn 3 temperature exceeded threshold by 3°C at 14:30',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      severity: 'high',
      icon: <AlertCircle size={20} />,
      color: 'error.main'
    },
    {
      id: '2',
      type: 'recommendation',
      title: 'Feeding schedule optimization',
      description: 'AI suggests adjusting feeding times to 06:00 and 18:00 based on growth patterns',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      severity: 'medium',
      icon: <Lightbulb size={20} />,
      color: 'warning.main'
    },
    {
      id: '3',
      type: 'model',
      title: 'FCR prediction model updated',
      description: 'Model v2.1 deployed with 12% improved accuracy',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      severity: 'info',
      icon: <RefreshCw size={20} />,
      color: 'info.main'
    },
    {
      id: '4',
      type: 'anomaly',
      title: 'Feed consumption anomaly',
      description: 'Barn 5 showing 15% lower feed intake than expected',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      severity: 'medium',
      icon: <AlertCircle size={20} />,
      color: 'warning.main'
    },
    {
      id: '5',
      type: 'recommendation',
      title: 'Ventilation adjustment',
      description: 'Increase ventilation rate by 20% during peak hours',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      severity: 'low',
      icon: <Lightbulb size={20} />,
      color: 'info.main'
    }
  ];

  const filteredEvents = mockEvents.filter(event => {
    if (eventType !== 'all' && event.type !== eventType) return false;
    
    const hoursDiff = (Date.now() - event.timestamp.getTime()) / (1000 * 60 * 60);
    if (timeRange === '24h' && hoursDiff > 24) return false;
    if (timeRange === '7d' && hoursDiff > 24 * 7) return false;
    if (timeRange === '30d' && hoursDiff > 24 * 30) return false;
    
    return true;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box>
      <PageHeader 
        title="Insights Feed" 
        subtitle="Timeline of AI-generated insights and events"
      />

      <PremiumCard>
        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Event Type
            </Typography>
            <ToggleButtonGroup
              value={eventType}
              exclusive
              onChange={(_, value) => value && setEventType(value)}
              size="small"
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="anomaly">Anomalies</ToggleButton>
              <ToggleButton value="recommendation">Recommendations</ToggleButton>
              <ToggleButton value="model">Models</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Time Range
            </Typography>
            <ToggleButtonGroup
              value={timeRange}
              exclusive
              onChange={(_, value) => value && setTimeRange(value)}
              size="small"
            >
              <ToggleButton value="24h">24 Hours</ToggleButton>
              <ToggleButton value="7d">7 Days</ToggleButton>
              <ToggleButton value="30d">30 Days</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Timeline */}
        <Box sx={{ position: 'relative' }}>
          {/* Timeline line */}
          <Box
            sx={{
              position: 'absolute',
              left: 20,
              top: 0,
              bottom: 0,
              width: 2,
              bgcolor: 'divider'
            }}
          />

          {/* Events */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {filteredEvents.map((event, index) => (
              <Box key={event.id} sx={{ position: 'relative', pl: 6 }}>
                {/* Timeline dot */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: 12,
                    top: 8,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    bgcolor: 'background.paper',
                    border: '3px solid',
                    borderColor: event.color,
                    zIndex: 1
                  }}
                />

                {/* Event card */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: (theme) => alpha(theme.palette[event.color.split('.')[0] as any].main, 0.05),
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ color: event.color }}>
                        {event.icon}
                      </Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {event.title}
                      </Typography>
                    </Box>
                    <Chip 
                      label={event.severity} 
                      size="small" 
                      color={getSeverityColor(event.severity) as any}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {event.description}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Clock size={14} />
                    <Typography variant="caption" color="text.secondary">
                      {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>

          {filteredEvents.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="body1" color="text.secondary">
                No insights found for the selected filters
              </Typography>
            </Box>
          )}
        </Box>
      </PremiumCard>
    </Box>
  );
};
