import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBridge } from '@/bridge/BridgeContext';
import { AI_DEMO } from '@/bridge/mockData';
import { cx } from '@/bridge/cx';
import { Button } from '@/bridge/components/ui/Button';
import { Composer } from '@/bridge/components/ui/Composer';
import { PanelHeader } from '@/bridge/components/ui/PanelHeader';

export function AiPanel({ active }: { active: boolean }) {
  const { t } = useTranslation();
  const { getHints } = useBridge();
  const [aiMessages, setAiMessages] = useState(() =>
    AI_DEMO.map((m) => ({ role: m.role, text: m.text })),
  );
  const loadAiDemo = () => {
    setAiMessages(AI_DEMO.map((m) => ({ role: m.role, text: m.text })));
  };
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
          text: t('ai.demoReply'),
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
      <PanelHeader titleId="panel-ai-title" title={t('panels.ai')} hint={hints.ai} hintId="ai-role-hint" />
      <div className="chat-thread" id="ai-thread" ref={threadRef} aria-live="polite">
        {aiMessages.map((m, i) => (
          <div key={`${i}-${m.role}`} className={`bubble ${m.role === 'user' ? 'bubble--user' : 'bubble--ai'}`}>
            <div className="bubble__meta">{m.role === 'user' ? t('common.you') : t('common.bridgedAi')}</div>
            <div className="numbered" style={{ whiteSpace: 'pre-wrap' }}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <Composer
        inputId="ai-input"
        label={t('common.message')}
        value={input}
        onChange={setInput}
        placeholder={t('ai.placeholder')}
        actions={
          <>
            <Button variant="text" id="ai-load-demo" onClick={loadAiDemo}>
              {t('ai.loadSample')}
            </Button>
            <Button variant="primary" pill id="ai-send" onClick={send}>
              {t('common.send')}
            </Button>
          </>
        }
      />
    </section>
  );
}
