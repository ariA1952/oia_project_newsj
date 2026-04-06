/**
 * parameterConfigs.js
 *
 * Single source of truth for every collaboration parameter's form schema.
 *
 * `match` – lowercase substring looked up inside parameter_name from DB.
 *           More specific strings are listed FIRST so find() picks them correctly.
 *
 * Field `type` values:
 *   text      – <input type="text">
 *   textarea  – <textarea>
 *   date      – <input type="date">
 *   number    – <input type="number">
 *   select    – <select> with `options: string[]`
 *   multi-uni – built-in MultiUniversitySelect (partner_universities top-level key)
 *   country   – <input type="text"> styled as country
 *   yesno     – <select> with Yes / No
 *
 * RESERVED field IDs (stored at row top level, not inside `row.fields`):
 *   partner_universities, start_date, end_date
 *
 * `documents` – ordered array of document slot labels.
 *   Storage key = docKey(label) e.g. "Event Report" → "event_report"
 *
 * `adminOnly` – if true only OIA_ADMIN / SUPER_ADMIN may create/edit.
 * `multiRow`  – whether faculty can add multiple rows (default true).
 */

export const PARAMETER_CONFIGS = [
  // ── 7. Offline Teaching – CHRIST Faculty at Foreign (more specific → first) ──
  {
    match: 'christ faculty at foreign',
    label: 'Offline Teaching – By CHRIST Faculty at Foreign Universities',
    multiRow: true,
    fields: [
      { id: 'partner_universities', label: 'Partner Universities / Org.',     type: 'multi-uni' },
      { id: 'country',              label: 'Country',                         type: 'country'   },
      { id: 'faculty_name',         label: 'CHRIST Faculty Name',             type: 'text', required: true },
      { id: 'start_date',           label: 'From Date',                       type: 'date'      },
      { id: 'end_date',             label: 'To Date',                         type: 'date'      },
      { id: 'topic',                label: 'Topic',                           type: 'text'      },
    ],
    documents: ['Tickets', 'Invitation', 'Travel Report'],
  },

  // ── 6. Offline Teaching – International Faculty for CHRIST ───────────────────
  {
    match: 'international faculty for christ',
    label: 'Offline Teaching – By International Faculty for CHRIST Students',
    multiRow: true,
    fields: [
      { id: 'partner_universities', label: 'Partner Universities / Org.',     type: 'multi-uni' },
      { id: 'country',              label: 'Country',                         type: 'country'   },
      { id: 'faculty_name',         label: 'Faculty Name',                    type: 'text', required: true },
      { id: 'start_date',           label: 'From Date',                       type: 'date'      },
      { id: 'end_date',             label: 'To Date',                         type: 'date'      },
      { id: 'topic',                label: 'Topic',                           type: 'text'      },
    ],
    documents: ['Flyer', 'Report'],
  },

  // ── 14. Exchange Students Incoming (adminOnly → before generic 'student') ────
  {
    match: 'exchange student',
    label: 'Exchange Students (Incoming)',
    multiRow: true,
    adminOnly: true,
    fields: [
      { id: 'register_number',      label: 'Register Number',                 type: 'text'      },
      { id: 'student_name',         label: 'Student Name',                    type: 'text', required: true },
      { id: 'gender',               label: 'Gender',                          type: 'select',
        options: ['Male', 'Female', 'Other'] },
      { id: 'course_at_christ',     label: 'Course at CHRIST',                type: 'text'      },
      { id: 'partner_universities', label: 'Partner Universities / Org.',     type: 'multi-uni' },
      { id: 'country',              label: 'Country',                         type: 'country'   },
      { id: 'start_date',           label: 'From Date',                       type: 'date'      },
      { id: 'end_date',             label: 'To Date',                         type: 'date'      },
    ],
    documents: ['Invitation Letter', 'Transcripts'],
  },

  // ── 1. Collaborative Conferences ─────────────────────────────────────────────
  {
    match: 'collaborative conference',
    label: 'Collaborative Conferences with International Universities',
    multiRow: true,
    fields: [
      { id: 'theme',                label: 'Conference Theme / Topic',        type: 'text', required: true },
      { id: 'partner_universities', label: 'Partner Universities / Org.',     type: 'multi-uni' },
      { id: 'start_date',           label: 'Start Date',                      type: 'date'      },
      { id: 'end_date',             label: 'End Date',                        type: 'date'      },
    ],
    documents: ['Flyer', 'Event Report'],
  },

  // ── 2. Curriculum Internationalization ───────────────────────────────────────
  {
    match: 'curriculum',
    label: 'Curriculum Internationalization',
    multiRow: false,
    fields: [
      { id: 'impact',               label: 'Curriculum Impact',               type: 'textarea'  },
      { id: 'partner_universities', label: 'Partner Universities / Org.',     type: 'multi-uni' },
      { id: 'type',                 label: 'Type',                            type: 'select', required: true,
        options: [
          'Certificate Program',
          'Value Addition Course',
          'Curriculum Review by International Partner',
        ] },
    ],
    documents: ['Updated Curriculum BOS Minutes'],
  },

  // ── 3. International Events – SDG ────────────────────────────────────────────
  {
    match: 'sdg',
    label: 'International Events Aligned to SDG',
    multiRow: true,
    fields: [
      { id: 'event_name',           label: 'Event / Project Name',            type: 'text', required: true },
      { id: 'sdg_goal',             label: 'SDG Goal',                        type: 'select', required: true,
        options: Array.from({ length: 17 }, (_, i) => `Goal ${i + 1} – SDG ${i + 1}`) },
    ],
    documents: ['Flyer / Poster', 'Event Report'],
  },

  // ── 4. Professional Bodies ───────────────────────────────────────────────────
  {
    match: 'professional bod',
    label: 'Professional Bodies',
    multiRow: true,
    fields: [
      { id: 'body_name',            label: 'Collaborating Professional Body', type: 'text', required: true },
      { id: 'country',              label: 'Country',                         type: 'country'   },
      { id: 'key_achievements',     label: 'Key Achievements',                type: 'textarea'  },
    ],
    documents: ['Flyer / Poster', 'Report'],
  },

  // ── 5. Online Teaching – International Webinars ───────────────────────────────
  {
    match: 'online teaching',
    label: 'Online Teaching – International Webinars',
    multiRow: true,
    fields: [
      { id: 'partner_universities', label: 'Partner Universities / Org.',     type: 'multi-uni' },
      { id: 'country',              label: 'Country',                         type: 'country'   },
      { id: 'webinar_topic',        label: 'Webinar Topic',                   type: 'text', required: true },
      { id: 'speaker',              label: 'Speaker',                         type: 'text'      },
      { id: 'start_date',           label: 'Date (Organised On)',             type: 'date'      },
    ],
    documents: ['Flyer', 'List of Attendees'],
  },

  // ── 8. Incoming Faculty ──────────────────────────────────────────────────────
  {
    match: 'incoming faculty',
    label: 'Incoming Faculty',
    multiRow: true,
    fields: [
      { id: 'partner_universities', label: 'Partner Universities / Org.',     type: 'multi-uni' },
      { id: 'country',              label: 'Country',                         type: 'country'   },
      { id: 'faculty_name',         label: 'Faculty Name',                    type: 'text', required: true },
      { id: 'designation',          label: 'Designation',                     type: 'text'      },
      { id: 'purpose',              label: 'Purpose of Visit',                type: 'select', required: true,
        options: [
          'Scholar in Residence',
          'Collaborative Discussion',
          'Conference',
          'Teaching',
          'Immersion Program',
        ] },
      { id: 'start_date',           label: 'From Date',                       type: 'date'      },
      { id: 'end_date',             label: 'To Date',                         type: 'date'      },
    ],
    documents: ['Email / Itinerary', 'Invitation Letter', 'Tickets', 'Visit Schedule / Itinerary'],
    documentNote: '1-day visits: Email / Itinerary. Multi-day: Invitation Letter, Tickets, Visit Schedule.',
  },

  // ── 9. Outgoing Faculty ──────────────────────────────────────────────────────
  {
    match: 'outgoing faculty',
    label: 'Outgoing Faculty',
    multiRow: true,
    fields: [
      { id: 'partner_universities', label: 'Partner Universities / Org.',     type: 'multi-uni' },
      { id: 'country',              label: 'Country',                         type: 'country'   },
      { id: 'faculty_name',         label: 'Faculty Name',                    type: 'text', required: true },
      { id: 'funded_by',            label: 'Funded By',                       type: 'select',
        options: ['CHRIST', 'Partner University', 'Project'] },
      { id: 'start_date',           label: 'From Date',                       type: 'date'      },
      { id: 'end_date',             label: 'To Date',                         type: 'date'      },
    ],
    documents: [
      'Invitation / Participation Certificate',
      'Visa Copy',
      'Tickets',
      'Report',
      'Travel Approval Form',
    ],
  },

  // ── 10. Collaborative Publications ──────────────────────────────────────────
  {
    match: 'publication',
    label: 'Collaborative Publications',
    multiRow: true,
    fields: [
      { id: 'article_name',         label: 'Article Name',                    type: 'text', required: true },
      { id: 'christ_authors',       label: 'CHRIST Authors',                  type: 'text'      },
      { id: 'journal_name',         label: 'Journal Name',                    type: 'text'      },
      { id: 'volume_issue',         label: 'Volume & Issue Number',           type: 'text'      },
      { id: 'pub_month_year',       label: 'Month / Year of Publication',     type: 'text',
        placeholder: 'e.g. March 2024' },
      { id: 'partner_universities', label: 'Partner Universities / Org.',     type: 'multi-uni' },
    ],
    documents: ['Proof of Publication'],
  },

  // ── 11. International Research Projects ─────────────────────────────────────
  {
    match: 'research project',
    label: 'International Research Projects',
    multiRow: true,
    fields: [
      { id: 'partner_universities', label: 'Partner Universities / Org.',     type: 'multi-uni' },
      { id: 'country',              label: 'Country',                         type: 'country'   },
      { id: 'project_name',         label: 'Project Name',                    type: 'text', required: true },
      { id: 'team_members',         label: 'Team Members',                    type: 'text'      },
      { id: 'funding_available',    label: 'Funding Available',               type: 'yesno'     },
      { id: 'start_date',           label: 'Project Start Date',              type: 'date'      },
      { id: 'end_date',             label: 'Project End Date',                type: 'date'      },
      { id: 'grant_value',          label: 'Grant Value (Foreign Currency)',  type: 'number'    },
    ],
    documents: ['Grant Sanction Letter / Email'],
  },

  // ── 12. Short-Term Incoming Students ────────────────────────────────────────
  {
    match: 'incoming student',
    label: 'Short-Term Incoming Students',
    multiRow: true,
    fields: [
      { id: 'student_name',         label: 'Student Name',                    type: 'text', required: true },
      { id: 'gender',               label: 'Gender',                          type: 'select',
        options: ['Male', 'Female', 'Other'] },
      { id: 'purpose',              label: 'Purpose',                         type: 'select', required: true,
        options: [
          'India Gateway Program',
          'Internship',
          'Service Learning',
          'Student Competition',
          'USAC',
        ] },
      { id: 'partner_universities', label: 'Partner Universities / Org.',     type: 'multi-uni' },
      { id: 'country',              label: 'Country',                         type: 'country'   },
      { id: 'start_date',           label: 'From Date',                       type: 'date'      },
      { id: 'end_date',             label: 'To Date',                         type: 'date'      },
    ],
    documents: ['Invitation Letter / Report'],
  },

  // ── 13. Outgoing Students ───────────────────────────────────────────────────
  {
    match: 'outgoing student',
    label: 'Outgoing Students',
    multiRow: true,
    fields: [
      { id: 'register_number',      label: 'Register Number',                 type: 'text'      },
      { id: 'student_name',         label: 'Student Name',                    type: 'text', required: true },
      { id: 'course',               label: 'Course',                          type: 'text'      },
      { id: 'gender',               label: 'Gender',                          type: 'select',
        options: ['Male', 'Female', 'Other'] },
      { id: 'purpose',              label: 'Purpose',                         type: 'select', required: true,
        options: [
          'Exchange', 'Credit Transfer', 'Dual Degree', 'Immersion',
          'Summer Program', 'Conference', 'Internship', 'Competition',
        ] },
      { id: 'outgoing_semester',    label: 'Outgoing Semester',               type: 'text'      },
      { id: 'partner_universities', label: 'Partner Universities / Org.',     type: 'multi-uni' },
      { id: 'country',              label: 'Country',                         type: 'country'   },
      { id: 'start_date',           label: 'From Date',                       type: 'date'      },
      { id: 'end_date',             label: 'To Date',                         type: 'date'      },
    ],
    documents: ['Invitation / Acceptance Letter', 'Report / Certificate / Transcript'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Match a DB parameter object to its config (first substring match wins). */
export const getParamConfig = (parameter) => {
  if (!parameter?.parameter_name) return null;
  const name = parameter.parameter_name.toLowerCase();
  return PARAMETER_CONFIGS.find((cfg) => name.includes(cfg.match)) ?? null;
};

/**
 * Turn a document label into a stable storage key.
 * "Event Report" → "event_report", "Flyer / Poster" → "flyer_poster"
 */
export const docKey = (label) =>
  label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// RESERVED ids that live at the row top-level (not inside row.fields)
const TOP_LEVEL = new Set(['partner_universities', 'start_date', 'end_date']);

/** Build an empty row pre-populated for a given config. */
export const makeEmptyRowForConfig = (config) => ({
  id: crypto.randomUUID(),
  partner_universities: [],
  start_date: '',
  end_date: '',
  fields: Object.fromEntries(
    (config?.fields ?? [])
      .filter((f) => !TOP_LEVEL.has(f.id))
      .map((f) => [f.id, ''])
  ),
  documents: {},        // { docKey: File[] }  — new files to upload
  existingDocuments: {}, // { docKey: string[] } — paths already on server
});

/** Deserialise activity_data.rows (from DB JSON) into RowCard state. */
export const rowsFromActivityData = (activityData, config) => {
  const rows = activityData?.rows;
  if (Array.isArray(rows) && rows.length > 0) {
    return rows.map((r) => ({
      id: crypto.randomUUID(),
      partner_universities: (r.partner_universities ?? []).map(String),
      start_date: r.start_date ?? '',
      end_date: r.end_date ?? '',
      fields: r.fields ?? {},
      documents: {},
      existingDocuments: r.documents ?? {},
    }));
  }
  return config ? [makeEmptyRowForConfig(config)] : [];
};

/** Read a field value from row state (top-level or nested). */
export const getRowFieldValue = (row, fieldId) =>
  TOP_LEVEL.has(fieldId) ? row[fieldId] : (row.fields?.[fieldId] ?? '');

/** Return updated row state after changing one field. */
export const setRowFieldValue = (row, fieldId, value) =>
  TOP_LEVEL.has(fieldId)
    ? { ...row, [fieldId]: value }
    : { ...row, fields: { ...row.fields, [fieldId]: value } };
