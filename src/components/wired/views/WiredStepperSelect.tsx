import { FC } from 'react';
import { Column, Flex, Text } from '../../../common';

interface WiredStepperSelectProps
{
    label: string;
    options: string[];
    value: number;
    onChange: (index: number) => void;
    disabled?: boolean;
}

export const WiredStepperSelect: FC<WiredStepperSelectProps> = ({
    label,
    options,
    value,
    onChange,
    disabled = false
}) =>
{
    const currentIndex = Math.max(0, Math.min(value, options.length - 1));

    const handlePrev = () =>
    {
        if(disabled) return;
        const nextIndex = (currentIndex - 1 + options.length) % options.length;
        onChange(nextIndex);
    };

    const handleNext = () =>
    {
        if(disabled) return;
        const nextIndex = (currentIndex + 1) % options.length;
        onChange(nextIndex);
    };

    return (
        <Column gap={ 1 }>
            <Text bold>{ label }</Text>
            <Flex
                alignItems="center"
                justifyContent="between"
                className={ `wired-stepper-box ${ disabled ? 'disabled' : '' }` }
            >
                <button
                    type="button"
                    className="wired-stepper-btn"
                    disabled={ disabled }
                    onClick={ handlePrev }
                >
                    &lt;
                </button>
                <Text small center className="wired-stepper-text flex-grow-1 px-2 text-truncate">
                    { options[currentIndex] || '' }
                </Text>
                <button
                    type="button"
                    className="wired-stepper-btn"
                    disabled={ disabled }
                    onClick={ handleNext }
                >
                    &gt;
                </button>
            </Flex>
        </Column>
    );
};
