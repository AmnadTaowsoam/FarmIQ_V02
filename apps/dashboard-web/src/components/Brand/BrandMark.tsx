import React from 'react';
import { SvgIcon, SvgIconProps } from '@mui/material';

export const BrandMark: React.FC<SvgIconProps> = (props) => {
    // Using the same path as the asset for consistency, but inlined for theme control without SVG loaders
    return (
        <SvgIcon viewBox="0 0 24 24" {...props}>
            <path 
                fillRule="evenodd" 
                clipRule="evenodd" 
                d="M5 4C5 2.89543 5.89543 2 7 2H19C19.5523 2 20 2.44772 20 3V5C20 5.55228 19.5523 6 19 6H9V10H16C18.2091 10 20 11.7909 20 14C20 16.2091 18.2091 18 16 18H9V20C9 21.1046 8.10457 22 7 22C5.89543 22 5 21.1046 5 20V4ZM9 6H16V4H9V6ZM9 14H16C16.5523 14 17 13.5523 17 13C17 12.4477 16.5523 12 16 12H9V14Z" 
                fill="currentColor"
            />
        </SvgIcon>
    );
};
