# FarmIQ WeighVision Guide

**Version**: 1.0.0
**Last Updated**: 2025-01-26

---

## Overview

WeighVision is FarmIQ's AI-powered computer vision system that automatically estimates animal weights without physical handling. This guide covers setup, operation, and optimization of WeighVision.

---

## Table of Contents

- [System Overview](#system-overview)
- [Camera Setup](#camera-setup)
- [Calibration](#calibration)
- [Running Sessions](#running-sessions)
- [Data Interpretation](#data-interpretation)
- [Troubleshooting](#troubleshooting)

---

## System Overview

### How WeighVision Works

WeighVision uses advanced computer vision and machine learning to:

1. **Capture Images**: Cameras take continuous images of animals
2. **Detect Animals**: AI identifies individual animals in the frame
3. **Estimate Weight**: Machine learning models calculate weight from visual features
4. **Track Growth**: Records weight changes over time

### Key Features

- **Non-invasive**: No stress on animals
- **Real-time**: Live weight estimation
- **Continuous**: 24/7 monitoring capability
- **Accurate**: 95%+ accuracy with proper calibration
- **Automated**: No manual weighing required

---

## Camera Setup

### Hardware Requirements

| Component | Specification |
|-----------|---------------|
| Camera | IP Camera, 1080p minimum |
| Lens | Wide-angle, 2.8mm-4mm |
| Lighting | Adequate ambient or LED |
| Network | Wired Ethernet preferred |
| Power | PoE or 12V DC |

### Installation Steps

1. **Position the Camera**
   - Mount 2-3 meters above the floor
   - Angle 30-45 degrees downward
   - Cover the entire weighing area

2. **Connect to Network**
   - Connect Ethernet cable
   - Verify network connectivity
   - Note IP address

3. **Register Camera**
   - Go to **WeighVision** > **Cameras**
   - Click **+ Add Camera**
   - Enter camera details:
     - Name
     - IP Address
     - Port
     - Username/Password
   - Click **Connect**

4. **Verify Feed**
   - Check live video feed
   - Adjust positioning if needed
   - Ensure good lighting

### Lighting Requirements

Proper lighting is crucial for accurate weight estimation:

- **Minimum**: 300 lux
- **Optimal**: 500-800 lux
- **Avoid**: Direct sunlight, shadows, glare
- **Recommended**: LED lighting with consistent color temperature

---

## Calibration

### Why Calibration Matters

Calibration ensures accurate weight estimation by establishing the relationship between visual features and actual weight.

### Calibration Process

1. **Prepare Reference Animals**
   - Select 5-10 animals of known weight
   - Weigh them using a calibrated scale
   - Record weights accurately

2. **Start Calibration**
   - Go to **WeighVision** > **Calibration**
   - Select camera
   - Click **Start Calibration**

3. **Capture Reference Images**
   - Place reference animals in view
   - Capture images from multiple angles
   - Ensure animals are clearly visible

4. **Enter Reference Weights**
   - For each image, enter actual weight
   - System learns the correlation
   - Minimum 50 images recommended

5. **Validate Calibration**
   - Test with new animals
   - Compare estimated vs actual weight
   - Adjust if error > 5%

### Calibration Best Practices

- Calibrate for each animal type/age group
- Re-calibrate when:
  - Camera moves
  - Lighting changes significantly
  - New animal breed introduced
  - Accuracy drops below 90%

---

## Running Sessions

### Creating a Session

1. Navigate to **WeighVision** > **Sessions**
2. Click **+ New Session**
3. Configure session:
   - **Name**: e.g., "Barn 1 Daily Weighing"
   - **Camera**: Select from registered cameras
   - **Duration**: Set session length
   - **Schedule**: One-time or recurring
4. Click **Start**

### Monitoring Live Sessions

View real-time data during active sessions:

- **Live Video**: Camera feed
- **Detection Overlay**: Bounding boxes around detected animals
- **Weight Display**: Estimated weights in real-time
- **Statistics**: Count, average weight, range

### Session Results

After session completion, view:

1. **Summary Statistics**
   - Total animals weighed
   - Average weight
   - Weight range
   - Standard deviation

2. **Individual Records**
   - Each animal's weight history
   - Growth trends
   - Weight gain rate

3. **Distribution Charts**
   - Weight histogram
   - Growth curve
   - Comparison with targets

---

## Data Interpretation

### Understanding Weight Metrics

| Metric | Description | Use Case |
|--------|-------------|----------|
| **Average Weight** | Mean weight of all animals | Overall flock performance |
| **Median Weight** | Middle value in weight distribution | Less affected by outliers |
| **CV (Coefficient of Variation)** | Weight uniformity measure | Lower is better (< 10%) |
| **ADG (Average Daily Gain)** | Weight gain per day | Growth rate tracking |
| **Weight Distribution** | Histogram of weights | Identify outliers |

### Growth Tracking

Track individual animal growth over time:

1. Go to **WeighVision** > **Growth Tracking**
2. Select animal or group
3. View:
   - Growth curve
   - ADG calculation
   - Comparison with breed standards
   - Predicted harvest date

### Alerts and Notifications

Configure automatic alerts:

- **Low Weight**: Animals below threshold
- **Stalled Growth**: No weight gain for X days
- **High Variance**: CV exceeds target
- **Outliers**: Animals far from average

---

## Troubleshooting

### Common Issues

| Issue | Possible Cause | Solution |
|-------|----------------|----------|
| No animals detected | Poor lighting | Improve lighting |
| Inaccurate weights | Calibration needed | Re-calibrate |
| Camera offline | Network issue | Check network connection |
| Blurry images | Focus issue | Adjust camera focus |
| False detections | Background movement | Adjust detection sensitivity |

### Diagnostic Tools

Use built-in diagnostics:

1. **Camera Health Check**
   - Go to **WeighVision** > **Diagnostics**
   - Run camera health check
   - Review results

2. **Detection Test**
   - Test detection with known animals
   - Verify bounding boxes
   - Check weight estimates

3. **Performance Report**
   - View accuracy metrics
   - Compare with baseline
   - Identify issues

### Maintenance

Regular maintenance ensures optimal performance:

- **Weekly**: Clean camera lens
- **Monthly**: Check mounting stability
- **Quarterly**: Re-calibrate
- **Annually**: Professional inspection

---

## Best Practices

### For Best Results

1. **Consistent Environment**
   - Maintain stable lighting
   - Keep camera position fixed
   - Minimize background movement

2. **Regular Calibration**
   - Calibrate for each production cycle
   - Use representative animals
   - Validate accuracy regularly

3. **Data Quality**
   - Review session results
   - Verify outlier weights
   - Cross-check with manual weights

4. **Integration**
   - Combine with feed data for FCR
   - Correlate with health events
   - Use AI insights for optimization

---

## Support

For WeighVision support:

- **Documentation**: [docs.farmiq.example.com/weighvision](https://docs.farmiq.example.com/weighvision)
- **Email**: weighvision-support@farmiq.example.com
- **Phone**: +66 2-XXX-XXXX (Option 2)
- **In-App Help**: Click help icon in WeighVision module

---

**© 2025 FarmIQ. All rights reserved.**
