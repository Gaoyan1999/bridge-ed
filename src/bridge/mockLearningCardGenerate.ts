/**
 * Mock “generate parent-facing learning card” — replace with real API later.
 */
export type MockLearningCardDraft = {
  summaryZh: string;
  summaryEn: string;
  actions: [string, string, string];
};

export type MockLearningCardInput = {
  classTitle: string;
  topic: string;
  gradeSubject: string;
  notes: string;
};

export function mockGenerateLearningCard(_input: MockLearningCardInput): Promise<MockLearningCardDraft> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve({
        summaryZh:
          '本周我们在课上梳理了因式分解的常见套路：先看公因式，再尝试十字相乘。家长可以用“慢一步、写清楚中间步骤”的方式陪孩子练两道课本例题即可，不必追求一次做完所有作业。',
        summaryEn:
          'In class we reviewed factoring patterns: pull out a GCF first, then try grouping or simple cases. At home, two textbook examples with clear intermediate steps are enough—no need to finish the whole set in one sitting.',
        actions: [
          'Tonight: pick two homework items labeled “factoring” and rewrite each solution with one extra line of work shown.',
          'Together, say aloud the first step you try before using a formula (GCF vs. pattern).',
          'If it’s still stuck after 10 minutes, message the teacher with the problem number.',
        ],
      });
    }, 2000);
  });
}
