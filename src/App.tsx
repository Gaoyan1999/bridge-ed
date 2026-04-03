import { BridgeProvider } from '@/bridge/BridgeContext';
import { BridgeApp } from '@/bridge/BridgeApp';

function App() {
  return (
    <BridgeProvider>
      <BridgeApp />
    </BridgeProvider>
  );
}

export default App;
