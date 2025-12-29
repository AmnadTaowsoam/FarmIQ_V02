import { useState, useEffect, useCallback, useMemo } from 'react';
import { RouteConfig } from '../config/routes';
import { useLocation } from 'react-router-dom';

const STORAGE_KEYS = {
    EXPANDED_GROUPS: 'farmiq.sidebar.expandedGroups.v2',
    PINNED_ITEMS: 'farmiq.sidebar.pinned.v1',
    RECENTS: 'farmiq.sidebar.recents.v1',
    ACCORDION_MODE: 'farmiq.sidebar.accordionMode',
};

export interface PinnedItem {
    path: string;
    label: string;
    iconKey: string;
    sectionKey: string;
    parentLabel?: string;
}

export interface RecentItem {
    path: string;
    label: string;
    iconKey: string;
    sectionKey: string;
    timestamp: number;
    parentLabel?: string;
}

export type AccordionMode = 'multi' | 'single';

export const useSidebarState = () => {
    const location = useLocation();

    // Accordion mode (default: multi)
    const [accordionMode] = useState<AccordionMode>(() => {
        const stored = localStorage.getItem(STORAGE_KEYS.ACCORDION_MODE);
        return (stored as AccordionMode) || 'multi';
    });

    // Expanded groups (Set for multi-mode)
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.EXPANDED_GROUPS);
            return stored ? new Set(JSON.parse(stored)) : new Set(['operations']);
        } catch {
            return new Set(['operations']);
        }
    });

    // Pinned items (max 10)
    const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.PINNED_ITEMS);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    // Recent items (max 5)
    const [recents, setRecents] = useState<RecentItem[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.RECENTS);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    // Persist expanded groups
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.EXPANDED_GROUPS, JSON.stringify([...expandedGroups]));
    }, [expandedGroups]);

    // Toggle group (multi-mode or single-mode)
    const toggleGroup = useCallback((groupKey: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (accordionMode === 'single') {
                // Single mode: only one group open
                if (next.has(groupKey)) {
                    next.delete(groupKey);
                } else {
                    next.clear();
                    next.add(groupKey);
                }
            } else {
                // Multi mode: toggle individual group
                if (next.has(groupKey)) {
                    next.delete(groupKey);
                } else {
                    next.add(groupKey);
                }
            }
            return next;
        });
    }, [accordionMode]);

    // Auto-expand group containing active route
    const autoExpandActiveGroup = useCallback((groupKey: string) => {
        setExpandedGroups((prev) => {
            if (!prev.has(groupKey)) {
                return new Set([...prev, groupKey]);
            }
            return prev;
        });
    }, []);

    // Pin/unpin item (max 10)
    const togglePin = useCallback((route: RouteConfig, parentLabel?: string) => {
        setPinnedItems((prev) => {
            const exists = prev.find((p) => p.path === route.path);
            let updated: PinnedItem[];

            if (exists) {
                // Unpin
                updated = prev.filter((p) => p.path !== route.path);
            } else {
                // Pin (max 10)
                if (prev.length >= 10) {
                    return prev;
                }
                const newPin: PinnedItem = {
                    path: route.path,
                    label: route.label,
                    iconKey: route.path,
                    sectionKey: route.section || '',
                    parentLabel,
                };
                updated = [...prev, newPin];
            }

            localStorage.setItem(STORAGE_KEYS.PINNED_ITEMS, JSON.stringify(updated));
            return updated;
        });
    }, []);

    // Check if item is pinned
    const isPinned = useCallback(
        (path: string) => {
            return pinnedItems.some((p) => p.path === path);
        },
        [pinnedItems]
    );

    // Track recent navigation
    const trackRecent = useCallback((route: RouteConfig, parentLabel?: string) => {
        setRecents((prev) => {
            const recent: RecentItem = {
                path: route.path,
                label: route.label,
                iconKey: route.path,
                sectionKey: route.section || '',
                timestamp: Date.now(),
                parentLabel,
            };

            // Deduplicate and keep max 5
            const updated = [recent, ...prev.filter((r) => r.path !== route.path)].slice(0, 5);
            localStorage.setItem(STORAGE_KEYS.RECENTS, JSON.stringify(updated));
            return updated;
        });
    }, []);

    return {
        accordionMode,
        expandedGroups,
        toggleGroup,
        autoExpandActiveGroup,
        pinnedItems,
        togglePin,
        isPinned,
        recents,
        trackRecent,
    };
};
