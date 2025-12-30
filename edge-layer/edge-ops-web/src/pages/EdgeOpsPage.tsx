import React, { useState } from 'react';
import { 
  Box,
  Tab,
  Tabs
} from '@mui/material';
import { OverviewTab } from './tabs/OverviewTab';
import { IngressTab } from './tabs/IngressTab';
import { SyncTab } from './tabs/SyncTab';
import { EvidenceTab } from './tabs/EvidenceTab';

export function EdgeOpsPage() {
    const [currentTab, setCurrentTab] = useState('overview');

    const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
        setCurrentTab(newValue);
    };

    return (
        <Box>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={currentTab} onChange={handleTabChange} aria-label="edge ops tabs">
                    <Tab label="Components Overview" value="overview" />
                    <Tab label="Ingress Gateway" value="ingress" />
                    <Tab label="Sync & DLQ" value="sync" />
                    <Tab label="Evidence" value="evidence" />
                </Tabs>
            </Box>

            {/* Tab Panels */}
            {currentTab === 'overview' && <OverviewTab />}
            {currentTab === 'ingress' && <IngressTab />}
            {currentTab === 'sync' && <SyncTab />}
            {currentTab === 'evidence' && <EvidenceTab />}
        </Box>
    );
}
