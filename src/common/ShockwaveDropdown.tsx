import { FC, useEffect, useRef, useState } from 'react';

export interface IShockwaveDropdownOption {
    value: string | number;
    label: string;
}

export interface IShockwaveDropdownProps {
    value: string | number;
    options: IShockwaveDropdownOption[];
    onChange: (value: string) => void;
    className?: string;
    disabled?: boolean;
}

export const ShockwaveDropdown: FC<IShockwaveDropdownProps> = ({
    value,
    options,
    onChange,
    className = '',
    disabled = false
}) => {
    const [ isOpen, setIsOpen ] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if(!isOpen) return;
        const handleOutside = (e: MouseEvent) => {
            if(containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [ isOpen ]);

    const selectedOption = options.find(opt => String(opt.value) === String(value)) || options[0];

    return (
        <div
            ref={ containerRef }
            className={ `shockwave-custom-dropdown ${ isOpen ? 'is-open' : '' } ${ disabled ? 'is-disabled' : '' } ${ className }` }
            style={ { position: 'relative', userSelect: 'none' } }
        >
            <div
                className="shockwave-dropdown-trigger"
                onClick={ () => !disabled && setIsOpen(prev => !prev) }
            >
                <span className="shockwave-dropdown-label">
                    { selectedOption ? selectedOption.label : '' }
                </span>
                <span className="shockwave-dropdown-arrow">
                    <span className="shockwave-dropdown-triangle" />
                </span>
            </div>
            { isOpen && !disabled && (
                <div className="shockwave-dropdown-menu">
                    { options.map((opt, idx) => {
                        const isSelected = String(opt.value) === String(value);
                        return (
                            <div
                                key={ `${ opt.value }-${ idx }` }
                                className={ `shockwave-dropdown-item ${ isSelected ? 'active' : '' }` }
                                onClick={ () => {
                                    onChange(String(opt.value));
                                    setIsOpen(false);
                                } }
                            >
                                { opt.label }
                            </div>
                        );
                    }) }
                </div>
            ) }
        </div>
    );
};

