import { useEffect, useState } from 'react';
import { BridgeProvider } from '@/bridge/BridgeContext';
import { BridgeApp } from '@/bridge/BridgeApp';
import { DebugIndexedDbPage } from '@/debug/DebugIndexedDbPage';

function usePathname(): string {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return pathname;
}

function App() {
  const pathname = usePathname();
  if (pathname === '/debug' || pathname.startsWith('/debug/')) {
    return <DebugIndexedDbPage />;
  }
  return (
    <BridgeProvider>
      <BridgeApp />
    </BridgeProvider>
  );
}

export default App;
