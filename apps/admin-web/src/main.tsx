import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { queryClient } from './lib/queryClient';
import './theme/index.scss';

// #region agent log disabled
// fetch('http://127.0.0.1:7245/ingest/cc045650-7261-4ab6-a60c-2e050afa9fcf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:8',message:'main.tsx execution started',data:{rootExists:!!document.getElementById('root')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion

try {
  // #region agent log disabled
  // fetch('http://127.0.0.1:7245/ingest/cc045650-7261-4ab6-a60c-2e050afa9fcf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:12',message:'Before ReactDOM.createRoot',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  
  const rootElement = document.getElementById('root');
  
  // #region agent log disabled
  // fetch('http://127.0.0.1:7245/ingest/cc045650-7261-4ab6-a60c-2e050afa9fcf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:16',message:'Root element check',data:{rootElementExists:!!rootElement},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  const root = ReactDOM.createRoot(rootElement);
  
  // #region agent log disabled
  // fetch('http://127.0.0.1:7245/ingest/cc045650-7261-4ab6-a60c-2e050afa9fcf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:24',message:'Before render',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  );
  
  // #region agent log disabled
  // fetch('http://127.0.0.1:7245/ingest/cc045650-7261-4ab6-a60c-2e050afa9fcf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:33',message:'After render',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
} catch (error) {
  // #region agent log disabled
  // fetch('http://127.0.0.1:7245/ingest/cc045650-7261-4ab6-a60c-2e050afa9fcf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:36',message:'Error in main.tsx',data:{error:String(error),errorName:error?.name,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  console.error('Failed to render app:', error);
}
