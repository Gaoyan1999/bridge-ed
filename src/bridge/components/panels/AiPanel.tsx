import { useEffect, useRef, useState } from 'react';
import { useBridge } from '@/bridge/BridgeContext';
import { cx } from '@/bridge/cx';
import { Button } from '@/bridge/components/ui/Button';
import { Composer } from '@/bridge/components/ui/Composer';
import { PanelHeader } from '@/bridge/components/ui/PanelHeader';

export function AiPanel({ active }: { active: boolean }) {
  const { getHints, aiMessages, setAiMessages, loadAiDemo } = useBridge();
  const hints = getHints();
  const [input, setInput] = useState('');
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [aiMessages]);

  const send = () => {
    const v = input.trim();
    if (!v) return;
    setAiMessages((prev) => [...prev, { role: 'user', text: v }]);
    setInput('');
    window.setTimeout(() => {
      setAiMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text:
            '(Demo) Got it. In production, replies follow your school’s rules and safety policies. Add grade level or textbook if you want tighter help.',
        },
      ]);
    }, 400);
  };

  return (
    <section
      className={cx('panel', 'panel--ai', active && 'is-visible')}
      id="panel-ai"
      data-panel="ai"
      role="region"
      aria-labelledby="panel-ai-title"
      hidden={!active}
    >
      <PanelHeader titleId="panel-ai-title" title="AI assistant" hint={hints.ai} hintId="ai-role-hint" />
      <div className="chat-thread" id="ai-thread" ref={threadRef} aria-live="polite">
        {aiMessages.map((m, i) => (
          <div key={`${i}-${m.role}`} className={`bubble ${m.role === 'user' ? 'bubble--user' : 'bubble--ai'}`}>
            <div className="bubble__meta">{m.role === 'user' ? 'You' : 'BridgeEd AI'}</div>
            <div className="numbered" style={{ whiteSpace: 'pre-wrap' }}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <Composer
        inputId="ai-input"
        label="Message"
        value={input}
        onChange={setInput}
        placeholder="e.g. explain the discriminant… or paste this week’s teacher comment"
        actions={
          <>
            <Button variant="text" id="ai-load-demo" onClick={loadAiDemo}>
              Load sample chat
            </Button>
            <Button variant="primary" pill id="ai-send" onClick={send}>
              Send
            </Button>
          </>
        }
      />
    </section>
  );
}
