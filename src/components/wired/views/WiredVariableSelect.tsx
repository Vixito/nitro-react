import { FC, useMemo, useState } from 'react';
import { FaChair, FaGlobeAmericas, FaPlug, FaUser } from 'react-icons/fa';
import { Column, Flex, Text } from '../../../common';

export type VariableScopeType = 0 | 1 | 2 | 3;

interface WiredVariableSelectProps
{
    label?: string;
    value: string;
    scope?: number; // 2: Furni, 1: User, 0: Global, 3: Context
    onScopeChange?: (scope: number) => void;
    onChange: (value: string, scope?: number) => void;
    availableScopes?: number[]; // default: [ 2, 1, 0, 3 ]
    disabled?: boolean;
    activeColor?: 'green' | 'teal';
    placeholder?: string;
}

const SCOPE_VARIABLES: Record<number, string[]> = {
    // 2: Furni
    2: [
        '@state',
        '@position.x',
        '@position.y',
        '@rotation',
        '@altitude',
        '@height',
        '@id',
        '@class_id',
        '@is_invisible',
        '@type'
    ],
    // 1: User
    1: [
        'Monedas De Oro',
        'Galletas',
        'Puntos',
        'Vidas',
        'Punto De Control',
        'puntos_usuario',
        'vidas_restantes',
        '@user_id',
        '@user_name'
    ],
    // 0: Global / Sala
    0: [
        'Monedas De Oro',
        'Galletas',
        'ronda_actual',
        'sala_bloqueada',
        'tiempo',
        'puntos_sala',
        '@room_id'
    ],
    // 3: Context
    3: [
        'ultimo_furni_activado',
        'ultimo_usuario_trigger',
        'ultimo_valor'
    ]
};

export const WiredVariableSelect: FC<WiredVariableSelectProps> = ({
    label = 'Elegir variable:',
    value,
    scope = 1,
    onScopeChange,
    onChange,
    availableScopes = [ 2, 1, 0, 3 ],
    disabled = false,
    activeColor = 'green',
    placeholder = 'Elige una variable'
}) =>
{
    const [ internalScope, setInternalScope ] = useState<number>(scope);
    const [ isCustom, setIsCustom ] = useState<boolean>(false);

    const currentScope = onScopeChange ? scope : internalScope;

    const handleScopeClick = (newScope: number) =>
    {
        if(disabled) return;

        if(onScopeChange)
        {
            onScopeChange(newScope);
        }
        else
        {
            setInternalScope(newScope);
        }

        const presets = SCOPE_VARIABLES[newScope] || [];
        if(!presets.includes(value))
        {
            const nextVal = presets[0] || '';
            onChange(nextVal, newScope);
            setIsCustom(false);
        }
        else
        {
            onChange(value, newScope);
        }
    };

    const currentPresets = SCOPE_VARIABLES[currentScope] || [];

    const options = useMemo(() =>
    {
        const list = [ ...currentPresets ];
        if(value && !list.includes(value) && value !== '__custom__')
        {
            list.unshift(value);
        }
        return list;
    }, [ currentPresets, value ]);

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    {
        const val = e.target.value;
        if(val === '__custom__')
        {
            setIsCustom(true);
        }
        else
        {
            setIsCustom(false);
            onChange(val, currentScope);
        }
    };

    return (
        <Column gap={ 1 }>
            <Flex justifyContent="between" alignItems="center">
                <Text bold>{ label }</Text>
                <div className={ `wired-scope-selector ${ disabled ? 'disabled' : '' }` }>
                    { availableScopes.includes(2) && (
                        <button
                            type="button"
                            className={ `scope-btn ${ currentScope === 2 ? (activeColor === 'teal' ? 'active-teal' : 'active') : '' }` }
                            title="Furni"
                            disabled={ disabled }
                            onClick={ () => handleScopeClick(2) }
                        >
                            <FaChair />
                        </button>
                    ) }
                    { availableScopes.includes(1) && (
                        <button
                            type="button"
                            className={ `scope-btn ${ currentScope === 1 ? (activeColor === 'teal' ? 'active-teal' : 'active') : '' }` }
                            title="Usuario"
                            disabled={ disabled }
                            onClick={ () => handleScopeClick(1) }
                        >
                            <FaUser />
                        </button>
                    ) }
                    { availableScopes.includes(0) && (
                        <button
                            type="button"
                            className={ `scope-btn ${ currentScope === 0 ? (activeColor === 'teal' ? 'active-teal' : 'active') : '' }` }
                            title="Global (Sala)"
                            disabled={ disabled }
                            onClick={ () => handleScopeClick(0) }
                        >
                            <FaGlobeAmericas />
                        </button>
                    ) }
                    { availableScopes.includes(3) && (
                        <button
                            type="button"
                            className={ `scope-btn ${ currentScope === 3 ? (activeColor === 'teal' ? 'active-teal' : 'active') : '' }` }
                            title="Contexto"
                            disabled={ disabled }
                            onClick={ () => handleScopeClick(3) }
                        >
                            <FaPlug />
                        </button>
                    ) }
                </div>
            </Flex>

            <select
                className="form-select form-select-sm"
                value={ isCustom ? '__custom__' : (value || '') }
                disabled={ disabled }
                onChange={ handleSelectChange }
            >
                { !value && <option value="" disabled>{ placeholder }</option> }
                { options.map(opt => (
                    <option key={ opt } value={ opt }>{ opt }</option>
                )) }
                <option value="__custom__">... Escribir otra variable</option>
            </select>

            { isCustom && (
                <input
                    type="text"
                    className="form-control form-control-sm mt-1"
                    placeholder="Escribe el nombre de la variable..."
                    value={ value }
                    disabled={ disabled }
                    maxLength={ 32 }
                    onChange={ e => onChange(e.target.value, currentScope) }
                />
            ) }
        </Column>
    );
};
