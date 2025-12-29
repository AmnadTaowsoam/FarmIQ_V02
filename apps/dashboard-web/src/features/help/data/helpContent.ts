export interface HelpArticle {
    id: string;
    title: string;
    content: string;
    category: 'getting-started' | 'glossary' | 'troubleshooting' | 'faq';
    tags: string[];
}

export const helpArticles: HelpArticle[] = [
    // Getting Started
    {
        id: 'quick-start',
        title: 'Quick Start Guide',
        content: 'Welcome to FarmIQ! This guide will help you get started with the platform. First, select your organization and farm from the context selector in the topbar. Then explore the dashboard to see your farm\'s key metrics.',
        category: 'getting-started',
        tags: ['beginner', 'setup', 'onboarding']
    },
    {
        id: 'dashboard-overview',
        title: 'Dashboard Overview',
        content: 'The dashboard provides a comprehensive view of your farm operations. Monitor key metrics like FCR, mortality rates, and growth performance. Use the time range selector to view historical data.',
        category: 'getting-started',
        tags: ['dashboard', 'overview', 'metrics']
    },
    {
        id: 'first-farm',
        title: 'Setting Up Your First Farm',
        content: 'To add a new farm, navigate to Admin > Farms and click "Add Farm". Enter farm details including name, location, and capacity. Once created, you can add barns and batches.',
        category: 'getting-started',
        tags: ['setup', 'farm', 'admin']
    },

    // Troubleshooting
    {
        id: 'api-errors',
        title: 'API Connection Issues',
        content: 'If you see "Failed to fetch" errors, check your internet connection. If the problem persists, the backend service may be down. Contact support with the Request ID shown in the error message.',
        category: 'troubleshooting',
        tags: ['api', 'errors', 'connection']
    },
    {
        id: 'import-failures',
        title: 'CSV Import Failures',
        content: 'Common reasons for import failures: incorrect CSV format, missing required columns, invalid data types. Download the template file and ensure your data matches the expected format.',
        category: 'troubleshooting',
        tags: ['import', 'csv', 'standards']
    },
    {
        id: 'permission-denied',
        title: 'Permission Denied Errors',
        content: 'If you see "403 Forbidden" errors, you may not have the required role to access this feature. Contact your admin to request appropriate permissions.',
        category: 'troubleshooting',
        tags: ['permissions', 'rbac', 'access']
    },

    // FAQ
    {
        id: 'faq-fcr',
        title: 'How is FCR calculated?',
        content: 'Feed Conversion Ratio (FCR) = Total Feed Consumed / Total Weight Gain. Lower FCR indicates better feed efficiency. Target FCR varies by species and age.',
        category: 'faq',
        tags: ['fcr', 'metrics', 'feeding']
    },
    {
        id: 'faq-standards',
        title: 'How do I update growth standards?',
        content: 'Navigate to Standards Library, select the standard set you want to update, and click Edit. You can adjust target values or import new data via CSV.',
        category: 'faq',
        tags: ['standards', 'growth', 'update']
    },
    {
        id: 'faq-sensors',
        title: 'How do I add a new sensor?',
        content: 'Go to Sensors > Catalog, click "Add Sensor", and enter sensor details. Then bind it to a specific barn or location in Sensors > Bindings.',
        category: 'faq',
        tags: ['sensors', 'iot', 'setup']
    }
];

export const glossary: Record<string, string> = {
    'FCR': 'Feed Conversion Ratio - The ratio of feed consumed to weight gained. Lower is better.',
    'ADG': 'Average Daily Gain - The average weight gain per day for animals in a batch.',
    'Mortality': 'The percentage of animals that have died in a batch or time period.',
    'Batch': 'A group of animals managed together, typically of similar age and genetics.',
    'Barn': 'A physical housing structure for animals, containing multiple pens or sections.',
    'Tenant': 'An organization or company using the FarmIQ platform.',
    'Context': 'The currently selected tenant, farm, and barn for viewing data.',
    'Standard Set': 'A collection of target growth values for a specific species and genetic line.',
    'Telemetry': 'Automated sensor data collection from IoT devices in barns.',
    'WeighVision': 'Computer vision system for automated weight estimation.',
    'Anomaly': 'An unusual pattern or value detected by AI analysis.',
    'Scenario': 'A what-if simulation for planning and forecasting.'
};

export interface ContextualHelpContent {
    title: string;
    description: string;
    commonIssues: string[];
    relatedDocs: string[];
}

export const contextualHelp: Record<string, ContextualHelpContent> = {
    '/standards': {
        title: 'Standards Library',
        description: 'Manage growth standards for different species and genetic lines. Standards define target weights, feed consumption, and other metrics by age.',
        commonIssues: [
            'CSV import fails due to format errors',
            'Validation errors for out-of-range values',
            'Cannot find the right standard set'
        ],
        relatedDocs: ['quick-start', 'import-failures', 'faq-standards']
    },
    '/sensors': {
        title: 'Sensors',
        description: 'Monitor and manage IoT sensors deployed across your farms. View real-time telemetry data and configure sensor bindings.',
        commonIssues: [
            'Sensor showing offline status',
            'Missing telemetry data',
            'Incorrect sensor bindings'
        ],
        relatedDocs: ['dashboard-overview', 'faq-sensors']
    },
    '/feeding': {
        title: 'Feeding Module',
        description: 'Track feed consumption, calculate FCR, and optimize feeding schedules based on growth performance.',
        commonIssues: [
            'FCR calculation seems incorrect',
            'Feed data not updating',
            'Cannot create feeding program'
        ],
        relatedDocs: ['faq-fcr', 'dashboard-overview']
    },
    '/admin': {
        title: 'Admin',
        description: 'Manage tenants, farms, barns, users, and system settings. Admin features require appropriate permissions.',
        commonIssues: [
            'Permission denied errors',
            'Cannot add new users',
            'Farm configuration not saving'
        ],
        relatedDocs: ['permission-denied', 'first-farm']
    }
};

export const keyboardShortcuts = [
    { keys: ['Ctrl', 'K'], description: 'Open sidebar search' },
    { keys: ['Esc'], description: 'Close modals and drawers' },
    { keys: ['?'], description: 'Show keyboard shortcuts' },
    { keys: ['Ctrl', '/'], description: 'Toggle sidebar' },
];

export function getDiagnosticInfo(): string {
    const info = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        appVersion: '1.0.0', // TODO: Get from package.json
        currentPath: window.location.pathname,
    };

    return JSON.stringify(info, null, 2);
}
