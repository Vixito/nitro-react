import { FC, useMemo, useState } from 'react';
import IconScopeContext from '../../../assets/images/wired/icon_scope_context.png';
import IconScopeFurni from '../../../assets/images/wired/icon_scope_furni.png';
import IconScopeGlobal from '../../../assets/images/wired/icon_scope_global.png';
import IconScopeUser from '../../../assets/images/wired/icon_scope_user.png';
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

export interface ScopeVariableItem
{
    id: string;
    label: string;
}

const SCOPE_VARIABLES: Record<number, ScopeVariableItem[]> = {
    // 2: Furni
    2: [
        { id: '@state', label: '@state (Estado del furni)' },
        { id: '@position_x', label: '@position_x (Posición X)' },
        { id: '@position_y', label: '@position_y (Posición Y)' },
        { id: '@rotation', label: '@rotation (Rotación 0-7)' },
        { id: '@altitude', label: '@altitude (Altitud Z)' },
        { id: '@height', label: '@height (Altura del furni)' },
        { id: '@id', label: '@id (ID único del furni)' },
        { id: '@class_id', label: '@class_id (ID de catálogo/base)' },
        { id: '@owner_id', label: '@owner_id (ID del dueño)' },
        { id: '@is_stackable', label: '@is_stackable (Es apilable 1/0)' },
        { id: '@can_stand_on', label: '@can_stand_on (Se puede pisar 1/0)' },
        { id: '@can_sit_on', label: '@can_sit_on (Permite sentarse 1/0)' },
        { id: '@can_lay_on', label: '@can_lay_on (Permite acostarse 1/0)' }
    ],
    // 1: User
    1: [
        { id: '@position_x', label: '@position_x (Posición X del usuario)' },
        { id: '@position_y', label: '@position_y (Posición Y del usuario)' },
        { id: '@direction', label: '@direction (Dirección de mirada 0-7)' },
        { id: '@altitude', label: '@altitude (Altitud Z del usuario)' },
        { id: '@handitem_id', label: '@handitem_id (Objeto/bebida en mano)' },
        { id: '@effect_id', label: '@effect_id (ID efecto visual activo)' },
        { id: '@dance', label: '@dance (Tipo de baile 0-4)' },
        { id: '@sign', label: '@sign (Número de cartel levantado)' },
        { id: '@user_id', label: '@user_id (ID del usuario)' },
        { id: '@gender', label: '@gender (Género: 0 Hombre, 1 Mujer)' },
        { id: '@is_hc', label: '@is_hc (Suscripción activa 1/0)' },
        { id: '@has_rights', label: '@has_rights (Derechos en sala 1/0)' },
        { id: '@is_owner', label: '@is_owner (Es dueño de sala 1/0)' },
        { id: '@is_frozen', label: '@is_frozen (Congelado en juego 1/0)' },
        { id: '@is_idle', label: '@is_idle (Ausente/Zzz 1/0)' },
        { id: '@achievement_score', label: '@achievement_score (Puntos recompensa)' }
    ],
    // 0: Global / Sala
    0: [
        { id: '@room_id', label: '@room_id (ID de la sala actual)' },
        { id: '@group_id', label: '@group_id (ID del grupo de sala)' },
        { id: '@furni_count', label: '@furni_count (Total furnis en sala)' },
        { id: '@user_count', label: '@user_count (Total usuarios en sala)' },
        { id: '@wired_timer', label: '@wired_timer (Cronómetro Wired sala)' },
        { id: '@team_red_score', label: '@team_red_score (Puntos equipo Rojo)' },
        { id: '@team_green_score', label: '@team_green_score (Puntos equipo Verde)' },
        { id: '@team_blue_score', label: '@team_blue_score (Puntos equipo Azul)' },
        { id: '@team_yellow_score', label: '@team_yellow_score (Puntos equipo Amarillo)' },
        { id: '@current_time.hour_of_day', label: '@current_time.hour_of_day (Hora 0-23)' },
        { id: '@current_time.minute_of_hour', label: '@current_time.minute_of_hour (Minuto 0-59)' },
        { id: '@current_time.seconds_of_minute', label: '@current_time.seconds_of_minute (Segundos 0-59)' },
        { id: '@current_time.day_of_week', label: '@current_time.day_of_week (Día semana 1-7)' },
        { id: '@current_time.day_of_month', label: '@current_time.day_of_month (Día del mes 1-31)' },
        { id: '@current_time.month_of_year', label: '@current_time.month_of_year (Mes 1-12)' },
        { id: '@current_time.year', label: '@current_time.year (Año actual)' }
    ],
    // 3: Context
    3: [
        { id: '@trigger_user_id', label: '@trigger_user_id (ID usuario que activó)' },
        { id: '@trigger_furni_id', label: '@trigger_furni_id (ID furni que originó)' },
        { id: '@signal_value', label: '@signal_value (Valor de señal)' }
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
        const hasPreset = presets.some(p => p.id === value);
        if(!hasPreset && !isCustom)
        {
            const nextVal = presets[0]?.id || '';
            onChange(nextVal, newScope);
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
        if(value && !list.some(p => p.id === value) && value !== '__custom__')
        {
            list.unshift({ id: value, label: `${ value } (Variable personalizada)` });
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
                            <img src={ IconScopeFurni } alt="Furni" className="scope-icon-img" />
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
                            <img src={ IconScopeUser } alt="Usuario" className="scope-icon-img" />
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
                            <img src={ IconScopeGlobal } alt="Global (Sala)" className="scope-icon-img" />
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
                            <img src={ IconScopeContext } alt="Contexto" className="scope-icon-img" />
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
                    <option key={ opt.id } value={ opt.id }>{ opt.label }</option>
                )) }
                <option value="__custom__">... Escribir variable personalizada</option>
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
