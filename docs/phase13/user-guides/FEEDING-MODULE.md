# FarmIQ Feeding Module Guide

**Version**: 1.0.0
**Last Updated**: 2025-01-26

---

## Overview

The Feeding Module in FarmIQ helps you manage feed consumption, optimize feed efficiency, and track nutrition for your livestock. This guide covers all aspects of feed management.

---

## Table of Contents

- [Feed Types Management](#feed-types-management)
- [Feed Intake Recording](#feed-intake-recording)
- [Feed Efficiency Analysis](#feed-efficiency-analysis)
- [Feed Inventory](#feed-inventory)
- [Best Practices](#best-practices)

---

## Feed Types Management

### Creating Feed Types

1. Navigate to **Feeding** > **Feed Types**
2. Click **+ Add Feed Type**
3. Enter feed details:
   - **Feed Name**: e.g., "Broiler Starter"
   - **Category**: Starter, Grower, Finisher
   - **Nutritional Information**:
     - Protein (%)
     - Energy (kcal/kg)
     - Fiber (%)
     - Moisture (%)
   - **Cost per kg**
4. Click **Save**

### Managing Feed Formulas

Feed formulas define the composition of your feed:

1. Go to **Feeding** > **Formulas**
2. Click **+ Create Formula**
3. Add ingredients:
   - Select ingredient from inventory
   - Enter percentage or weight
   - System auto-calculates totals
4. Save the formula

---

## Feed Intake Recording

### Manual Recording

Use manual recording when automated systems are unavailable:

1. Go to **Feeding** > **Feed Intake**
2. Click **+ Record Intake**
3. Select:
   - Farm and Barn
   - Feed Type
   - Date and Time
4. Enter amount (kg)
5. Add notes (optional)
6. Click **Save**

### Automated Recording

Automated feed systems sync data directly to FarmIQ:

- Real-time feed consumption tracking
- Automatic FCR calculation
- Feed level monitoring
- Low stock alerts

### Batch Recording

Record multiple feedings at once:

1. Go to **Feeding** > **Batch Recording**
2. Select date range
3. Choose barns
4. Enter feed amounts for each barn
5. Submit batch

---

## Feed Efficiency Analysis

### Understanding FCR (Feed Conversion Ratio)

FCR measures how efficiently feed is converted to body weight:

```
FCR = Total Feed Consumed (kg) / Total Weight Gain (kg)
```

**Target FCR Ranges**:

| Animal Type | Excellent | Good | Needs Improvement |
|-------------|-----------|------|-------------------|
| Broiler | < 1.5 | 1.5 - 1.7 | > 1.7 |
| Layer | < 2.0 | 2.0 - 2.3 | > 2.3 |
| Swine | < 2.2 | 2.2 - 2.5 | > 2.5 |

### Viewing FCR Reports

1. Navigate to **Feeding** > **Analytics**
2. Select **FCR Analysis**
3. Choose date range
4. Filter by farm/barn
5. View charts and trends

### Feed Cost Analysis

Track feed costs per kg of production:

1. Go to **Feeding** > **Cost Analysis**
2. Select period
3. View:
   - Total feed cost
   - Cost per kg of weight gain
   - Cost per animal
   - Cost trends over time

---

## Feed Inventory

### Managing Feed Stock

1. Navigate to **Feeding** > **Inventory**
2. View current stock levels:
   - Feed Type
   - Quantity (kg)
   - Location
   - Expiry Date
3. Receive new stock:
   - Click **+ Receive Stock**
   - Enter supplier details
   - Enter quantity and batch number
   - Upload delivery note (optional)

### Low Stock Alerts

Configure automatic alerts:

1. Go to **Settings** > **Notifications**
2. Find **Feed Alerts**
3. Set threshold levels:
   - Warning level (e.g., 500 kg)
   - Critical level (e.g., 200 kg)
4. Enable notifications

### Feed Expiry Management

Track and manage feed expiration:

- Automatic expiry date tracking
- Expiry alerts (7 days before)
- First-in-first-out (FIFO) recommendations
- Disposal logging

---

## Best Practices

### Feed Management Tips

1. **Consistent Feeding Schedule**
   - Feed at the same times daily
   - Monitor feed consumption patterns
   - Adjust based on animal age and growth stage

2. **Quality Control**
   - Regularly inspect feed quality
   - Store feed in dry, cool conditions
   - Rotate stock to prevent spoilage

3. **Data Accuracy**
   - Record feed intake promptly
   - Verify automated system readings
   - Reconcile physical inventory weekly

4. **Cost Optimization**
   - Compare feed suppliers
   - Monitor feed waste
   - Optimize feed formulas based on performance

### Troubleshooting

| Issue | Possible Cause | Solution |
|-------|----------------|----------|
| High FCR | Poor feed quality | Test feed samples |
| High FCR | Health issues | Check animal health |
| Low consumption | Palatability issues | Change feed type |
| Inventory mismatch | Recording errors | Reconcile stock |

---

## Integration with Other Modules

The Feeding Module integrates with:

- **WeighVision**: Automatic weight data for FCR calculation
- **Health Module**: Correlation between feed and health events
- **Reports**: Comprehensive performance reports
- **AI Insights**: Feed optimization recommendations

---

## Support

For assistance with the Feeding Module:

- **Documentation**: [docs.farmiq.example.com/feeding](https://docs.farmiq.example.com/feeding)
- **Email**: support@farmiq.example.com
- **In-App Help**: Click the help icon (❓) in the module

---

**© 2025 FarmIQ. All rights reserved.**
