import { useCallback, useEffect, useState } from 'react';
import { getDataLayer, getDataSourceMode } from '@/data';
import type { LearningCard } from '@/data';

export function HomeLearningCards() {
  const [cards, setCards] = useState<LearningCard[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const mode = getDataSourceMode();

  const fetchCards = useCallback(async () => {
    const layer = getDataLayer();
    return layer.learningCards.list();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchCards()
      .then((list) => {
        if (!cancelled) {
          setCards(list);
          setStatus('ready');
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setStatus('error');
          setError(e instanceof Error ? e.message : String(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fetchCards]);

  const refresh = async () => {
    setStatus('loading');
    setError(null);
    try {
      const list = await fetchCards();
      setCards(list);
      setStatus('ready');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const addSample = async () => {
    try {
      const layer = getDataLayer();
      await layer.learningCards.create({
        title: `示例学习卡 · ${new Date().toLocaleString()}`,
        teacherSummary: '调试插入：老师侧摘要会出现在这里。',
        parentActions: ['和孩子一起回顾今日关键词', '完成书上一道小题', '签字或拍照反馈'],
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <section className="home-learning">
      <header className="home-learning__header">
        <h1 className="home-learning__title">BridgeEd</h1>
        <p className="home-learning__subtitle">
          首页预览 · 数据来自 <span className="home-learning__mode">{mode}</span>
          {mode === 'api' && (
            <span className="home-learning__hint">（需配置 VITE_API_BASE_URL）</span>
          )}
        </p>
      </header>

      <div className="home-learning__toolbar">
        <button type="button" className="home-learning__btn" onClick={() => void refresh()}>
          刷新列表
        </button>
        <button
          type="button"
          className="home-learning__btn home-learning__btn--primary"
          onClick={() => void addSample()}
        >
          插入一条示例
        </button>
      </div>

      {status === 'loading' && cards.length === 0 && (
        <p className="home-learning__empty">加载中…</p>
      )}

      {error && (
        <p className="home-learning__error" role="alert">
          {error}
        </p>
      )}

      {status === 'ready' && cards.length === 0 && !error && (
        <p className="home-learning__empty">暂无学习卡。可点「插入一条示例」或检查 API 配置。</p>
      )}

      <ul className="home-learning__list">
        {cards.map((card) => (
          <li key={card.id} className="learning-card">
            <h2 className="learning-card__title">{card.title}</h2>
            <p className="learning-card__summary">{card.teacherSummary}</p>
            <p className="learning-card__label">家长可执行动作</p>
            <ol className="learning-card__actions">
              {card.parentActions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ol>
            <p className="learning-card__meta">更新 {new Date(card.updatedAt).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
