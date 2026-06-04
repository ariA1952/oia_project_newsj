import { useState, useRef, useEffect } from 'react';
import { FileSpreadsheet, Layers, PenLine, ChevronDown } from 'lucide-react';
import './EntryModeDropdown.css';

/**
 * Dropdown that appears when "Add Entry" or "Add Another Entry" is clicked.
 * showExcel — only true for Outgoing Students parameter (avoids broken Excel import for others).
 */
const EntryModeDropdown = ({ onSelect, label = 'Add Entry', disabled = false, showExcel = false }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const allModes = [
        {
            id: 'manual',
            icon: <PenLine size={16} />,
            title: 'Add Manual',
            desc: 'Single entry form',
        },
        {
            id: 'excel',
            icon: <FileSpreadsheet size={16} />,
            title: 'Import Excel',
            desc: 'Bulk upload from spreadsheet',
            hidden: !showExcel,
        },
        {
            id: 'dynamic',
            icon: <Layers size={16} />,
            title: 'Dynamic Multi-Entry',
            desc: 'Shared fields + multiple entries',
        },
    ];

    const modes = allModes.filter((m) => !m.hidden);

    return (
        <div className="entry-mode-dropdown" ref={ref}>
            <button
                type="button"
                className="entry-mode-dropdown__trigger"
                onClick={() => !disabled && setOpen((o) => !o)}
                disabled={disabled}
            >
                <span>{label}</span>
                <ChevronDown
                    size={14}
                    className={`entry-mode-dropdown__chevron ${open ? 'entry-mode-dropdown__chevron--open' : ''}`}
                />
            </button>

            {open && (
                <div className="entry-mode-dropdown__menu">
                    {modes.map((mode) => (
                        <button
                            key={mode.id}
                            type="button"
                            className="entry-mode-dropdown__item"
                            onClick={() => {
                                setOpen(false);
                                onSelect(mode.id);
                            }}
                        >
                            <span className="entry-mode-dropdown__item-icon">{mode.icon}</span>
                            <div className="entry-mode-dropdown__item-text">
                                <span className="entry-mode-dropdown__item-title">{mode.title}</span>
                                <span className="entry-mode-dropdown__item-desc">{mode.desc}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EntryModeDropdown;
