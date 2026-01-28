const fs = require('fs');  
const content = \`import React from 'react';\`  
fs.writeFileSync('apps/admin-web/src/layout/AdminSidebar.tsx', content, 'utf8');  
