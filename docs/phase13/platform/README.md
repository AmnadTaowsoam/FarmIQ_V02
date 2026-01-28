# FarmIQ Documentation Platform

**Version**: 1.0.0
**Last Updated**: 2025-01-26
**Platform**: Docusaurus v3

---

## Overview

The FarmIQ Documentation Platform is built using Docusaurus, a modern static site generator. It provides a searchable, versioned documentation site with multi-language support.

---

## Table of Contents

- [Platform Features](#platform-features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Content Structure](#content-structure)
- [Deployment](#deployment)
- [Customization](#customization)

---

## Platform Features

| Feature | Description | Status |
|----------|-------------|---------|
| **Full Text Search** | Algolia-powered search | ✅ Enabled |
| **Version Selector** | Multi-version documentation | ✅ Enabled |
| **Dark Mode** | Dark/light theme toggle | ✅ Enabled |
| **Edit on GitHub** | Direct edit links | ✅ Enabled |
| **Feedback Widget** | User feedback collection | ✅ Enabled |
| **Analytics** | Usage tracking | ✅ Enabled |
| **API Reference Integration** | Embedded API docs | ✅ Enabled |
| **Multi-Language** | English and Thai support | ✅ Enabled |

---

## Installation

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/farmiq/docs.git
cd docs

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Preview production build
npm run serve
```

---

## Configuration

### docusaurus.config.js

```javascript
module.exports = {
  title: 'FarmIQ Documentation',
  tagline: 'Smart Farming Platform',
  url: 'https://docs.farmiq.example.com',
  baseUrl: '/',
  
  organizationName: 'farmiq',
  projectName: 'docs',
  
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'th'],
  },

  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/farmiq/docs/tree/main/',
          versions: {
            current: {
              label: '1.0.0',
            },
          },
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'FarmIQ',
      logo: {
        alt: 'FarmIQ Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'doc',
          docId: 'user-guides/README',
          position: 'left',
          label: 'User Guides',
        },
        {
          type: 'doc',
          docId: 'admin-guides/README',
          position: 'left',
          label: 'Admin Guides',
        },
        {
          type: 'doc',
          docId: 'api-docs/README',
          position: 'left',
          label: 'API Docs',
        },
        {
          type: 'doc',
          docId: 'architecture/README',
          position: 'left',
          label: 'Architecture',
        },
        {
          type: 'doc',
          docId: 'runbooks/README',
          position: 'left',
          label: 'Runbooks',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          type: 'search',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'User Guides', to: '/docs/user-guides/README' },
            { label: 'Admin Guides', to: '/docs/admin-guides/README' },
            { label: 'API Docs', to: '/docs/api-docs/README' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'Slack', href: 'https://farmiq.slack.com' },
            { label: 'Twitter', href: 'https://twitter.com/farmiq' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'GitHub', href: 'https://github.com/farmiq' },
            { label: 'Support', href: 'mailto:support@farmiq.example.com' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} FarmIQ. All rights reserved.`,
    },
    prism: {
      theme: {
        light: 'github',
        dark: 'dracula',
      },
      additionalLanguages: ['bash', 'python', 'typescript', 'yaml'],
    },
    algolia: {
      appId: 'YOUR_APP_ID',
      apiKey: 'YOUR_SEARCH_API_KEY',
      indexName: 'farmiq',
      contextualSearch: true,
    },
  },
};
```

### sidebars.js

```javascript
module.exports = {
  userGuides: [
    'user-guides/README',
    'user-guides/README-TH',
    'user-guides/FEEDING-MODULE',
    'user-guides/WEIGHVISION-GUIDE',
    'user-guides/REPORTS-ANALYTICS',
  ],
  adminGuides: [
    'admin-guides/README',
  ],
  apiDocs: [
    'api-docs/README',
  ],
  architecture: [
    'architecture/README',
  ],
  runbooks: [
    'runbooks/README',
  ],
};
```

---

## Content Structure

```
docs/
├── docs/
│   ├── user-guides/
│   │   ├── README.md
│   │   ├── README-TH.md
│   │   ├── FEEDING-MODULE.md
│   │   ├── WEIGHVISION-GUIDE.md
│   │   └── REPORTS-ANALYTICS.md
│   ├── admin-guides/
│   │   └── README.md
│   ├── api-docs/
│   │   └── README.md
│   ├── architecture/
│   │   └── README.md
│   └── runbooks/
│       └── README.md
├── i18n/
│   └── th/
│       └── docusaurus-plugin-content-docs/
│           └── current/
│               └── user-guides/
│                   ├── README.md
│                   ├── FEEDING-MODULE.md
│                   ├── WEIGHVISION-GUIDE.md
│                   └── REPORTS-ANALYTICS.md
├── src/
│   ├── css/
│   │   └── custom.css
│   └── pages/
│       └── index.js
├── static/
│   └── img/
│       └── logo.svg
├── docusaurus.config.js
├── sidebars.js
└── package.json
```

---

## Deployment

### GitHub Pages

```bash
# Deploy to GitHub Pages
npm run deploy
```

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### AWS S3 + CloudFront

```bash
# Build the site
npm run build

# Sync to S3
aws s3 sync build/ s3://docs.farmiq.example.com --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

### Docker

```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
# Build and run
docker build -t farmiq-docs .
docker run -p 8080:80 farmiq-docs
```

---

## Customization

### Custom CSS

```css
/* src/css/custom.css */

:root {
  --ifm-color-primary: #2e8555;
  --ifm-color-primary-dark: #29784c;
  --ifm-color-primary-darker: #277148;
  --ifm-color-primary-darkest: #205d3b;
  --ifm-color-primary-light: #33925d;
  --ifm-color-primary-lighter: #359962;
  --ifm-color-primary-lightest: #3cad6e;
}

.hero {
  background-image: linear-gradient(135deg, #2e8555 0%, #1a5c38 100%);
  padding: 6rem 0;
}

.hero__title {
  font-size: 3rem;
  font-weight: 700;
  color: #fff;
}

.hero__subtitle {
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 0.9);
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  padding: 4rem 0;
}

.feature {
  padding: 2rem;
  border-radius: 8px;
  background: var(--ifm-background-surface-color);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.feature__title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
}
```

### Custom Pages

```javascript
// src/pages/index.js
import React from 'react';
import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './index.module.css';

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`Welcome to ${siteConfig.title}`}
      description="FarmIQ Documentation">
      <main>
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>{siteConfig.title}</h1>
          <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
        </div>
        <div className={styles.features}>
          <div className={styles.feature}>
            <h3>User Guides</h3>
            <p>Complete guides for end users</p>
          </div>
          <div className={styles.feature}>
            <h3>Admin Guides</h3>
            <p>Administrator documentation</p>
          </div>
          <div className={styles.feature}>
            <h3>API Docs</h3>
            <p>Developer API reference</p>
          </div>
        </div>
      </main>
    </Layout>
  );
}
```

---

## Analytics Integration

### Google Analytics

```javascript
// docusaurus.config.js
module.exports = {
  plugins: [
    [
      '@docusaurus/plugin-google-analytics',
      {
        trackingID: 'GA_MEASUREMENT_ID',
        anonymizeIP: true,
      },
    ],
  ],
};
```

### Plausible Analytics

```javascript
// docusaurus.config.js
module.exports = {
  plugins: [
    [
      '@docusaurus/plugin-plausible',
      {
        domain: 'docs.farmiq.example.com',
      },
    ],
  ],
};
```

---

## Feedback Widget

```javascript
// docusaurus.config.js
module.exports = {
  themeConfig: {
    feedback: {
      title: 'Was this helpful?',
      content: 'Let us know how we can improve',
      labels: {
        positive: '👍 Yes',
        negative: '👎 No',
      },
    },
  },
};
```

---

## Maintenance

### Adding New Documentation

1. Create markdown file in appropriate directory
2. Add to `sidebars.js`
3. Update navigation if needed
4. Test locally
5. Commit and deploy

### Updating Versions

```bash
# Create new version
npm run docusaurus docs:version 1.1.0

# Update current version
# Edit docs/ files
```

### Translating Content

```bash
# Extract translatable content
npm run write-translations -- --locale th

# Translate i18n/th/docusaurus-plugin-content-docs/current/
```

---

## Performance Optimization

### Image Optimization

```bash
# Install sharp for image processing
npm install sharp

# Configure in docusaurus.config.js
module.exports = {
  plugins: [
    [
      '@docusaurus/plugin-ideal-image',
      {
        quality: 80,
        max: 1030,
        min: 640,
        steps: 2,
      },
    ],
  ],
};
```

### Build Optimization

```bash
# Analyze bundle size
npm run analyze

# Optimize build
NODE_ENV=production npm run build
```

---

## Support

For documentation platform support:

- **Email**: docs@farmiq.example.com
- **GitHub**: [github.com/farmiq/docs](https://github.com/farmiq/docs)
- **Slack**: #docs channel

---

**© 2025 FarmIQ. All rights reserved.**
