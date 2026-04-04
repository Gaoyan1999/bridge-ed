function compact(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function buildDemoDraft(input) {
  const topic = compact(input.topic) || 'this topic';
  const classTitle = compact(input.classTitle) || 'this lesson';
  const grade = compact(input.grade) || 'this year level';
  const subject = compact(input.subject) || compact(input.gradeSubject) || 'the subject';
  const notes = compact(input.notes);

  const noteLine = notes
    ? `The teacher also flagged this context: ${notes}.`
    : 'The teacher wants families to focus on confidence and steady practice, not perfection.';

  return {
    summaryEn:
      `In ${classTitle}, students worked on ${topic} in ${subject} (${grade}). ` +
      `Parents can help best by checking understanding in simple language and keeping practice short and specific. ` +
      noteLine,
    summaryZh:
      `在 ${classTitle} 这节课里，学生学习了 ${topic}。家长在家最重要的是用自然、易懂的话帮助孩子回顾关键概念，` +
      `把练习控制在短时间、可完成的小步骤里。${notes ? `老师还特别提醒：${notes}。` : '这次更强调理解过程，而不是一次做完全部任务。'}`,
    actions: [
      `Ask your child to explain ${topic} in one or two sentences without reading from the worksheet.`,
      `Spend 10 minutes on one example only, and focus on the first step rather than the full solution.`,
      'If your child is still stuck, send the teacher the question number and the exact step that caused confusion.',
    ],
  };
}
