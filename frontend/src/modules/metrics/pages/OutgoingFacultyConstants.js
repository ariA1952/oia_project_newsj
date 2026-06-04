export const CATEGORIES = ['Academic', 'Global Mobility', 'Research'];

export const AGENDA_MAP = {
  Academic: [
    'Undergraduate and Masters: 1+1, 2+1, 2+2 – Dual or Joint Degrees',
    'Lecture Series and Webinars',
    'Curriculum Enrichment and Knowledge Share',
    'Joint Teaching and Masterclass',
    'Student Buddy System for Joint Projects',
  ],
  'Global Mobility': [
    'Semester Study Abroad',
    'Scholar in Residence & Faculty Visit and Exchange',
    'India Gateway Programmes for Short Term Professional and Cultural Exchanges',
  ],
  Research: [
    'Joint Research',
    'Doctoral Fellowships to Students',
    'Joint Grant Applications',
    'Joint PhD Supervisions – Co-Guideship',
  ],
};

export const AI_STATUSES = ['Planned', 'In Progress', 'Completed', 'On Hold'];

export const FORM_STEPS = [
  { id: 1, label: 'Visit Details' },
  { id: 2, label: 'Universities' },
  { id: 3, label: 'Contacts' },
  { id: 4, label: 'Action Items' },
  { id: 5, label: 'Review & Submit' },
];

export const EMPTY_CONTACT = () => ({
  _id: crypto.randomUUID(),
  name: '', university_name: '', department: '', email: '',
});

export const EMPTY_ACTION_ITEM = () => ({
  _id: crypto.randomUUID(),
  category: '', agenda: '', progress: '',
  planned_start_date: '', planned_closure_date: '', status: 'Planned',
});

export const STATUS_COLORS = {
  DRAFT: '#94a3b8', SUBMITTED: '#3b82f6',
  APPROVED: '#22c55e', REJECTED: '#ef4444',
  CLARIFICATION_REQUESTED: '#f59e0b',
};
