import { useState, useCallback, memo } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronRight, MapPin, Globe, Users, Zap, Eye } from 'lucide-react';
import { CATEGORIES, AGENDA_MAP, AI_STATUSES, FORM_STEPS, EMPTY_CONTACT, EMPTY_ACTION_ITEM } from './OutgoingFacultyConstants';
import './OutgoingFaculty.css';

// ── Reusable Field ────────────────────────────────────────────────────────────
const Field = ({ label, required, error, children }) => (
  <div className="outfac__field">
    <label className="outfac__label">{label}{required && <span> *</span>}</label>
    {children}
    {error && <p className="outfac__error-text">{error}</p>}
  </div>
);

// ── Section 1 ────────────────────────────────────────────────────────────────
const VisitDetails = memo(({ data, onChange, errors }) => (
  <div className="outfac__section">
    <h3 className="outfac__section-title"><MapPin size={16} /> Visit Details</h3>
    <div className="outfac__grid">
      <Field label="Faculty Name" required error={errors.faculty_name}>
        <input className={`outfac__input${errors.faculty_name ? ' outfac__input--error' : ''}`}
          value={data.faculty_name} onChange={e => onChange('faculty_name', e.target.value)} />
      </Field>
      <Field label="Place" required error={errors.place}>
        <input className={`outfac__input${errors.place ? ' outfac__input--error' : ''}`}
          value={data.place} onChange={e => onChange('place', e.target.value)} placeholder="City, Country" />
      </Field>
      <Field label="Visit Start Date" required error={errors.visit_start_date}>
        <input type="date" className={`outfac__input${errors.visit_start_date ? ' outfac__input--error' : ''}`}
          value={data.visit_start_date} onChange={e => onChange('visit_start_date', e.target.value)} />
      </Field>
      <Field label="Visit End Date" required error={errors.visit_end_date}>
        <input type="date" className={`outfac__input${errors.visit_end_date ? ' outfac__input--error' : ''}`}
          value={data.visit_end_date} onChange={e => onChange('visit_end_date', e.target.value)} />
      </Field>
      <div className="outfac__field outfac__field--full">
        <label className="outfac__label">Purpose <span>*</span></label>
        <textarea className={`outfac__textarea${errors.purpose ? ' outfac__input--error' : ''}`}
          rows={3} value={data.purpose} onChange={e => onChange('purpose', e.target.value)}
          placeholder="Describe the purpose of this visit..." />
        {errors.purpose && <p className="outfac__error-text">{errors.purpose}</p>}
      </div>
    </div>
  </div>
));
VisitDetails.displayName = 'VisitDetails';

// ── Section 2 ────────────────────────────────────────────────────────────────
const UniversitiesVisited = memo(({ items, onChange, error }) => {
  const add = () => onChange([...items, { _id: crypto.randomUUID(), university_name: '' }]);
  const remove = id => onChange(items.filter(u => u._id !== id));
  const update = (id, val) => onChange(items.map(u => u._id === id ? { ...u, university_name: val } : u));
  return (
    <div className="outfac__section">
      <h3 className="outfac__section-title"><Globe size={16} /> Universities Visited</h3>
      {error && <p className="outfac__error-text" style={{ marginBottom: 8 }}>{error}</p>}
      <div className="outfac__uni-list">
        {items.map((u, i) => (
          <div key={u._id} className="outfac__uni-row">
            <span className="outfac__uni-num">{i + 1}</span>
            <input className="outfac__input" value={u.university_name}
              onChange={e => update(u._id, e.target.value)}
              placeholder="e.g. University of Bologna" />
            <button type="button" className="outfac__icon-btn" onClick={() => remove(u._id)} title="Remove">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="outfac__add-btn" onClick={add}>
        <Plus size={14} /> Add University
      </button>
    </div>
  );
});
UniversitiesVisited.displayName = 'UniversitiesVisited';

// ── Section 3 ────────────────────────────────────────────────────────────────
const ContactCard = memo(({ contact, idx, onUpdate, onRemove }) => {
  const [open, setOpen] = useState(false);
  const upd = (k, v) => onUpdate({ ...contact, [k]: v });
  return (
    <div className="outfac__contact-card">
      <div className={`outfac__contact-header${open ? ' outfac__contact-header--open' : ''}`}
        onClick={() => setOpen(p => !p)}>
        <div className="outfac__contact-header-left">
          <span className="outfac__contact-idx">{idx + 1}</span>
          <div>
            <div className="outfac__contact-name">{contact.name || 'New Contact'}</div>
            {contact.university_name && <div className="outfac__contact-uni">{contact.university_name}</div>}
          </div>
        </div>
        <div className="outfac__contact-header-actions">
          <button type="button" className="outfac__icon-btn" onClick={e => { e.stopPropagation(); onRemove(); }} title="Remove">
            <Trash2 size={14} />
          </button>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </div>
      {open && (
        <div className="outfac__contact-body">
          <div className="outfac__grid">
            <Field label="Name" required>
              <input className="outfac__input" value={contact.name} onChange={e => upd('name', e.target.value)} />
            </Field>
            <Field label="University">
              <input className="outfac__input" value={contact.university_name} onChange={e => upd('university_name', e.target.value)} />
            </Field>
            <Field label="Department">
              <input className="outfac__input" value={contact.department} onChange={e => upd('department', e.target.value)} />
            </Field>
            <Field label="Email">
              <input type="email" className="outfac__input" value={contact.email} onChange={e => upd('email', e.target.value)} />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
});
ContactCard.displayName = 'ContactCard';

const KeyContacts = memo(({ items, onChange }) => {
  const add = () => onChange([...items, EMPTY_CONTACT()]);
  const remove = id => onChange(items.filter(c => c._id !== id));
  const update = (id, updated) => onChange(items.map(c => c._id === id ? updated : c));
  return (
    <div className="outfac__section">
      <h3 className="outfac__section-title"><Users size={16} /> Key Official Contacts</h3>
      <div className="outfac__contact-list">
        {items.map((c, i) => (
          <ContactCard key={c._id} contact={c} idx={i}
            onUpdate={updated => update(c._id, updated)}
            onRemove={() => remove(c._id)} />
        ))}
      </div>
      <button type="button" className="outfac__add-btn" onClick={add}>
        <Plus size={14} /> Add Contact
      </button>
    </div>
  );
});
KeyContacts.displayName = 'KeyContacts';

// ── Section 4 ────────────────────────────────────────────────────────────────
const ActionItemCard = memo(({ item, idx, onUpdate, onRemove, error }) => {
  const [open, setOpen] = useState(idx === 0);
  const upd = (k, v) => {
    const updated = { ...item, [k]: v };
    if (k === 'category') updated.agenda = '';
    onUpdate(updated);
  };
  const agendas = AGENDA_MAP[item.category] || [];
  const statusKey = (item.status || 'planned').toLowerCase().replace(' ', '_');
  return (
    <div className="outfac__ai-card">
      <div className={`outfac__ai-header${open ? ' outfac__ai-header--open' : ''}`} onClick={() => setOpen(p => !p)}>
        <div className="outfac__ai-header-left">
          <span className="outfac__ai-num">{idx + 1}</span>
          <div className="outfac__ai-summary">
            <div className="outfac__ai-cat">{item.category || 'New Action Item'}</div>
            {item.agenda && <div className="outfac__ai-agenda">{item.agenda}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {item.status && <span className={`outfac__ai-status-chip outfac__ai-status-chip--${statusKey}`}>{item.status}</span>}
          <button type="button" className="outfac__icon-btn" onClick={e => { e.stopPropagation(); onRemove(); }} title="Remove">
            <Trash2 size={14} />
          </button>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </div>
      {open && (
        <div className="outfac__ai-body">
          {error && <p className="outfac__error-text" style={{ marginBottom: 10 }}>{error}</p>}
          <div className="outfac__grid" style={{ marginBottom: 14 }}>
            <Field label="Category" required>
              <select className="outfac__select" value={item.category} onChange={e => upd('category', e.target.value)}>
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Agenda" required>
              <select className="outfac__select" value={item.agenda} onChange={e => upd('agenda', e.target.value)} disabled={!item.category}>
                <option value="">Select agenda</option>
                {agendas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="Planned Start Date" required>
              <input type="date" className="outfac__input" value={item.planned_start_date} onChange={e => upd('planned_start_date', e.target.value)} />
            </Field>
            <Field label="Planned Closure Date" required>
              <input type="date" className="outfac__input" value={item.planned_closure_date} onChange={e => upd('planned_closure_date', e.target.value)} />
            </Field>
            <Field label="Status" required>
              <select className="outfac__select" value={item.status} onChange={e => upd('status', e.target.value)}>
                {AI_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Progress / Notes" required>
            <textarea className="outfac__textarea" rows={3} value={item.progress}
              onChange={e => upd('progress', e.target.value)}
              placeholder="Describe current progress, outcomes, and next steps..." />
          </Field>
        </div>
      )}
    </div>
  );
});
ActionItemCard.displayName = 'ActionItemCard';

const ActionItems = memo(({ items, onChange, errors }) => {
  const add = () => onChange([...items, EMPTY_ACTION_ITEM()]);
  const remove = id => onChange(items.filter(a => a._id !== id));
  const update = (id, updated) => onChange(items.map(a => a._id === id ? updated : a));
  return (
    <div className="outfac__section">
      <h3 className="outfac__section-title"><Zap size={16} /> Action Items</h3>
      {errors._general && <p className="outfac__error-text" style={{ marginBottom: 8 }}>{errors._general}</p>}
      <div className="outfac__ai-list">
        {items.map((item, i) => (
          <ActionItemCard key={item._id} item={item} idx={i}
            onUpdate={updated => update(item._id, updated)}
            onRemove={() => remove(item._id)}
            error={errors[item._id]} />
        ))}
      </div>
      <button type="button" className="outfac__add-btn" onClick={add}>
        <Plus size={14} /> Add Action Item
      </button>
    </div>
  );
});
ActionItems.displayName = 'ActionItems';

// ── Section 5: Review ─────────────────────────────────────────────────────────
const ReviewSubmit = memo(({ formData, universities, contacts, actionItems }) => (
  <div className="outfac__section">
    <h3 className="outfac__section-title"><Eye size={16} /> Review & Submit</h3>
    <div className="outfac__review-block">
      <h4>Visit Details</h4>
      {[['Faculty', formData.faculty_name], ['Place', formData.place],
      ['Start Date', formData.visit_start_date], ['End Date', formData.visit_end_date],
      ['Purpose', formData.purpose]].map(([l, v]) => v ? (
        <div key={l} className="outfac__review-row">
          <span className="outfac__review-label">{l}:</span>
          <span className="outfac__review-val">{v}</span>
        </div>
      ) : null)}
    </div>
    <div className="outfac__review-block">
      <h4>Universities Visited ({universities.length})</h4>
      {universities.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No universities added.</p> :
        universities.map((u, i) => (
          <div key={i} className="outfac__review-item">
            <span style={{ marginRight: 8, fontWeight: 700, color: '#6366f1' }}>{i + 1}.</span>
            {u.university_name}
          </div>
        ))}
    </div>
    <div className="outfac__review-block">
      <h4>👥 Key Contacts ({contacts.length})</h4>
      {contacts.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No contacts added.</p> :
        contacts.map((c, i) => (
          <div key={i} className="outfac__review-item">
            <div className="outfac__review-item-title">{c.name || '(unnamed)'}</div>
            {c.university_name && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{c.university_name}{c.department ? ` — ${c.department}` : ''}</div>}
            {c.email && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{c.email}</div>}
          </div>
        ))}
    </div>
    <div className="outfac__review-block">
      <h4> Action Items ({actionItems.length})</h4>
      {actionItems.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No action items added.</p> :
        actionItems.map((ai, i) => {
          const statusKey = (ai.status || 'planned').toLowerCase().replace(' ', '_');
          return (
            <div key={i} className="outfac__review-item">
              <div className="outfac__review-item-title" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>{i + 1}. {ai.category}</span>
                <span className={`outfac__ai-status-chip outfac__ai-status-chip--${statusKey}`}>{ai.status}</span>
              </div>
              {ai.agenda && <div style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0' }}>{ai.agenda}</div>}
              {ai.progress && <div style={{ fontSize: '0.82rem', color: '#374151', marginTop: 4 }}>{ai.progress}</div>}
              {(ai.planned_start_date || ai.planned_closure_date) && (
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 4 }}>
                  {ai.planned_start_date} → {ai.planned_closure_date}
                </div>
              )}
            </div>
          );
        })}
    </div>
  </div>
));
ReviewSubmit.displayName = 'ReviewSubmit';

// ── Main Form Panel ───────────────────────────────────────────────────────────
const TravelFormPanel = ({ initial, onClose, onSaved, facultyName }) => {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [aiErrors, setAiErrors] = useState({});
  const [notification, setNotification] = useState(null);

  const [formData, setFormData] = useState({
    faculty_name: initial?.faculty_name || facultyName || '',
    visit_start_date: initial?.visit_start_date || '',
    visit_end_date: initial?.visit_end_date || '',
    purpose: initial?.purpose || '',
    place: initial?.place || '',
  });

  const [universities, setUniversities] = useState(
    (initial?.universities_visited || []).map(u => ({ ...u, _id: crypto.randomUUID() }))
  );
  const [contacts, setContacts] = useState(
    (initial?.contacts || []).map(c => ({ ...c, _id: crypto.randomUUID() }))
  );
  const [actionItems, setActionItems] = useState(
    (initial?.action_items || []).map(a => ({ ...a, _id: crypto.randomUUID() }))
  );

  const isReadOnly = initial && !['DRAFT', 'CLARIFICATION_REQUESTED'].includes(initial.status);

  const fieldChange = useCallback((k, v) => setFormData(p => ({ ...p, [k]: v })), []);

  const buildPayload = () => ({
    ...formData,
    universities_visited: universities.map(({ _id, ...rest }) => rest),
    contacts: contacts.map(({ _id, ...rest }) => rest),
    action_items: actionItems.map(({ _id, ...rest }) => rest),
  });

  const showNote = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSaveDraft = async () => {
    if (isReadOnly) return;
    setSaving(true);
    try {
      const { createTravelSummary, updateTravelSummary } = await import('../services/outgoingFacultyService');
      const fn = initial?.summary_id ? updateTravelSummary : createTravelSummary;
      const args = initial?.summary_id ? [initial.summary_id, buildPayload()] : [buildPayload()];
      const result = await fn(...args);
      showNote('Draft saved successfully');
      onSaved(result, false);
    } catch (e) {
      showNote(e?.detail || 'Failed to save draft', 'error');
    } finally { setSaving(false); }
  };

  const validateAll = () => {
    const errs = {};
    if (!formData.faculty_name.trim()) errs.faculty_name = 'Required';
    if (!formData.place.trim()) errs.place = 'Required';
    if (!formData.purpose.trim()) errs.purpose = 'Required';
    if (!formData.visit_start_date) errs.visit_start_date = 'Required';
    if (!formData.visit_end_date) errs.visit_end_date = 'Required';
    setErrors(errs);

    const aiErrs = {};
    if (actionItems.length === 0) {
      aiErrs._general = 'Add at least one action item before submitting';
    }
    if (universities.length === 0) errs._uni = 'Add at least one university';

    actionItems.forEach(ai => {
      const msgs = [];
      if (!ai.category) msgs.push('Category required');
      if (!ai.agenda) msgs.push('Agenda required');
      if (!ai.progress.trim()) msgs.push('Progress required');
      if (!ai.planned_start_date) msgs.push('Start date required');
      if (!ai.planned_closure_date) msgs.push('Closure date required');
      else if (ai.planned_start_date && ai.planned_closure_date < ai.planned_start_date)
        msgs.push('Closure date must be after start date');
      if (msgs.length) aiErrs[ai._id] = msgs.join(' · ');
    });

    // duplicate check
    const seen = new Set();
    actionItems.forEach(ai => {
      const key = `${ai.category}||${ai.agenda}`;
      if (seen.has(key)) aiErrs[ai._id] = (aiErrs[ai._id] ? aiErrs[ai._id] + ' · ' : '') + 'Duplicate (category + agenda)';
      seen.add(key);
    });

    setAiErrors(aiErrs);
    return Object.keys(errs).length === 0 && Object.keys(aiErrs).length === 0;
  };

  const handleSubmit = async () => {
    if (isReadOnly) return;
    if (!validateAll()) { setStep(1); showNote('Please fix errors before submitting', 'error'); return; }
    setSubmitting(true);
    try {
      const { createTravelSummary, updateTravelSummary, submitTravelSummary } = await import('../services/outgoingFacultyService');
      let id = initial?.summary_id;
      if (!id) {
        const created = await createTravelSummary(buildPayload());
        id = created.summary_id;
      } else {
        await updateTravelSummary(id, buildPayload());
      }
      const submitted = await submitTravelSummary(id);
      showNote('Submitted for review!');
      setTimeout(() => onSaved(submitted, true), 1200);
    } catch (e) {
      showNote(e?.detail || 'Submission failed', 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="outfac__overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="outfac__panel">
        {/* Header */}
        <div className="outfac__panel-header">
          <div>
            <div className="outfac__panel-title">
              {isReadOnly ? 'View Travel Summary' : initial?.summary_id ? 'Edit Travel Summary' : 'New Staff Travel Summary'}
            </div>
            {initial?.status && (
              <span className={`status-badge status-badge--${initial.status.toLowerCase().replace(/_/g, '-')}`} style={{ marginTop: 4, display: 'inline-block' }}>
                {initial.status.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <button className="outfac__panel-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Steps */}
        <div className="outfac__steps">
          {FORM_STEPS.map(s => (
            <button key={s.id} type="button"
              className={`outfac__step${step === s.id ? ' outfac__step--active' : ''}${step > s.id ? ' outfac__step--done' : ''}`}
              onClick={() => setStep(s.id)}>
              <span className="outfac__step__num">{step > s.id ? '✓' : s.id}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Notification inline */}
        {notification && (
          <div style={{
            padding: '8px 24px', fontSize: '0.82rem', fontWeight: 600,
            background: notification.type === 'error' ? '#fee2e2' : '#dcfce7',
            color: notification.type === 'error' ? '#991b1b' : '#166534'
          }}>
            {notification.msg}
          </div>
        )}

        {/* Clarification remarks */}
        {initial?.rejection_remarks && (
          <div className={`outfac__remarks ${initial.status === 'CLARIFICATION_REQUESTED' ? 'outfac__remarks--clarify' : 'outfac__remarks--reject'}`}
            style={{ margin: '0 24px 0' }}>
            <strong>{initial.status === 'CLARIFICATION_REQUESTED' ? 'Clarification: ' : 'Rejected: '}</strong>
            {initial.rejection_remarks}
          </div>
        )}

        {/* Body */}
        <div className="outfac__panel-body">
          {step === 1 && <VisitDetails data={formData} onChange={fieldChange} errors={errors} />}
          {step === 2 && <UniversitiesVisited items={universities} onChange={setUniversities} error={errors._uni} />}
          {step === 3 && <KeyContacts items={contacts} onChange={setContacts} />}
          {step === 4 && <ActionItems items={actionItems} onChange={setActionItems} errors={aiErrors} />}
          {step === 5 && <ReviewSubmit formData={formData} universities={universities} contacts={contacts} actionItems={actionItems} />}
        </div>

        {/* Footer */}
        <div className="outfac__panel-footer">
          <div className="outfac__panel-footer-left">
            {step > 1 && <button type="button" className="outfac__add-btn" style={{ border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151' }} onClick={() => setStep(p => p - 1)}>← Back</button>}
          </div>
          <div className="outfac__panel-footer-right">
            {!isReadOnly && (
              <button type="button" className="outfac__add-btn" style={{ border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151' }}
                onClick={handleSaveDraft} disabled={saving}>
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
            )}
            {step < 5 && (
              <button type="button" className="outfac__add-btn" style={{ background: '#2563eb', color: '#fff', border: '1.5px solid #2563eb' }}
                onClick={() => setStep(p => p + 1)}>
                Next →
              </button>
            )}
            {step === 5 && !isReadOnly && (
              <button type="button" className="outfac__add-btn" style={{ background: '#16a34a', color: '#fff', border: '1.5px solid #16a34a' }}
                onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting…' : ' Submit for Review'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TravelFormPanel;
