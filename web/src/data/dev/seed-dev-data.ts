import type { DataLayer } from '../repositories';

/** Inserts one sample learning card when the DB is empty (IndexedDB debug only). */
export async function seedDevDataIfEmpty(layer: DataLayer): Promise<void> {
  if (layer.mode !== 'indexeddb') return;
  const existing = await layer.learningCards.list();
  if (existing.length > 0) return;
  await layer.learningCards.create({
    title: '示例学习卡',
    teacherSummary: '本周重点：分数加法。',
    parentActions: ['用水果比划 1/2 和 1/4', '完成练习册第 12 页', '签字确认已讨论'],
  });
}
