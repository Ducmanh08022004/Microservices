import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

function CustomSelect({ value, onChange, options, style, className }) {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    const selectedOption = options.find(opt => opt.value === value) || options[0];

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div 
            ref={wrapperRef} 
            className={`custom-select-wrapper ${className || ''}`} 
            style={{ position: 'relative', ...style }}
        >
            <div 
                className={`custom-select-trigger input ${isOpen ? 'is-open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{selectedOption ? selectedOption.label : 'Chọn...'}</span>
                <ChevronDown size={18} className={`custom-select-icon ${isOpen ? 'open' : ''}`} />
            </div>

            {isOpen && (
                <div className="custom-select-dropdown">
                    {options.map((opt) => (
                        <div 
                            key={opt.value} 
                            className={`custom-select-option ${opt.value === value ? 'selected' : ''}`}
                            onClick={() => {
                                onChange({ target: { value: opt.value } });
                                setIsOpen(false);
                            }}
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default CustomSelect;
