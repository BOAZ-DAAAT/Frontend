export type Report = {
  id: string;
  title: string;
  author: string;
  date: string;
  greeting: string;
  paragraphs: string[];
  signoff: string;
};

export const reports: Report[] = [
  {
    id: 'rp-sales',
    title: 'Coffee?',
    author: 'Marisa Lu',
    date: 'Just Now',
    greeting: 'Hey Jason,',
    paragraphs: [
      "Was wondering if you'd be interested in meeting my team at Philz Coffee at 11 AM today. No pressure if you can't make it, although I think you guys would really get along!",
    ],
    signoff: 'Marisa',
  },
  {
    id: 'rp-mart-1',
    title: 'Feedback',
    author: 'Lindsey Weiss',
    date: 'Yesterday',
    greeting: 'Hey Jason,',
    paragraphs: [
      'I took a look at the prototype, really into it so far. I know you are very close to the launch date, but here is something that a potential user would encourage you to think about.',
      'The hierarchy is clear and the main flow feels focused. A little more room around the summary would make the results easier to scan.',
      'I would also like to see spaces organized by temporality. If that makes sense, a team should be able to move through recent work without losing the larger project context.',
      'The report view feels like the right place to preserve that context. It can stay calm while still giving the most important findings enough visual weight.',
      'Let me know if this is helpful to your process. I can send a few annotated examples before the next review.',
    ],
    signoff: 'Lindsey',
  },
  {
    id: 'rp-mart-2',
    title: 'Post-grad plans',
    author: 'Evelyn Ma',
    date: '3 days ago',
    greeting: 'Dear Jason,',
    paragraphs: [
      "How's everything? Doesn't it seem crazy that you have less than 10 days to go before you graduate?",
      "I'm sorry that I won't be able to attend your ceremony in person, but I was wondering what your plans are for after graduation.",
      "Will you be traveling, or are you planning to stay nearby for a while? I'd love to hear what you decide once things settle down.",
    ],
    signoff: 'Evelyn',
  },
  {
    id: 'rp-mart-3',
    title: 'Launch plan',
    author: 'Dennis Jin',
    date: '5 days ago',
    greeting: 'Hey team,',
    paragraphs: [
      "You've made some last-minute revisions. I'll update the site to reflect the new work, but it may take a little time to sync.",
      'The rollout checklist is attached to the project. Everything is ready for a final review.',
      'Once the content pass is complete, we can publish the updated report and share it with the rest of the team.',
    ],
    signoff: 'Dennis',
  },
  {
    id: 'rp-growth',
    title: 'Weekly growth review',
    author: 'Victoria Wang',
    date: '8 July',
    greeting: 'Hi everyone,',
    paragraphs: [
      'Acquisition remained steady this week while activation improved across the newest onboarding flow.',
      'The strongest signal came from teams that connected a second data source during their first session.',
      'Those teams reached their first saved report faster and returned more frequently during the following week.',
      'Usage was especially strong among collaborators who reviewed the same report together instead of exporting it immediately.',
      'We should continue watching whether the new navigation changes improve discovery without increasing the time needed to complete common tasks.',
      'For the next iteration, the team will compare report creation, return visits, and sharing behavior across each onboarding cohort.',
      'A detailed breakdown will be included in the monthly review after the remaining event data has been validated.',
    ],
    signoff: 'Victoria',
  },
  {
    id: 'rp-retention',
    title: 'Retention notes',
    author: 'Adil Kalakkad',
    date: '2 July',
    greeting: 'Hello,',
    paragraphs: [
      'Returning teams are creating more reports per session and spending less time moving between data sources.',
    ],
    signoff: 'Adil',
  },
];
