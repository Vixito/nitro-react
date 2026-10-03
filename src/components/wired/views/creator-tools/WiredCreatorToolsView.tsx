import { FC, useState } from 'react';
import { FaChair, FaCheck, FaDiscord, FaGlobeAmericas, FaInfoCircle, FaPlug, FaRedo, FaSearch, FaSyncAlt, FaTimes, FaTools, FaUndo, FaUser } from 'react-icons/fa';
import { GetRoomSession, LocalizeText, WiredSelectionVisualizer } from '../../../../api';
import { Column, Flex, NitroCardContentView, NitroCardHeaderView, NitroCardTabsItemView, NitroCardTabsView, NitroCardView, Text } from '../../../../common';
import { useWired } from '../../../../hooks';

type VariableCategory = 'furni' | 'user' | 'global' | 'context';
type ElementCategory = 'furni' | 'user' | 'global';

interface VariableDefinition
{
    name: string;
    type: string;
    target: string;
    availability: string;
    hasValue: string;
    canWrite: string;
    canCreateDelete: string;
    canIntercept: string;
}

const VARIABLES_CATALOG: Record<VariableCategory, VariableDefinition[]> = {
    furni: [
        { name: 'var_de_furni', type: 'Creada por usuario', target: 'Furni', availability: 'Mientras la sala exista', hasValue: 'No', canWrite: 'No', canCreateDelete: 'Sí', canIntercept: 'Sí' },
        { name: 'var_de_furni_con_valor', type: 'Creada por usuario', target: 'Furni', availability: 'Permanente', hasValue: 'Sí (720)', canWrite: 'Sí', canCreateDelete: 'Sí', canIntercept: 'Sí' },
        { name: '@id', type: 'Interna del sistema', target: 'Furni', availability: 'Permanente', hasValue: 'Sí (979277312)', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@class_id', type: 'Interna del sistema', target: 'Furni', availability: 'Permanente', hasValue: 'Sí (163)', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@height', type: 'Interna del sistema', target: 'Furni', availability: 'Permanente', hasValue: 'Sí (100)', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@state', type: 'Interna del sistema', target: 'Furni', availability: 'Permanente', hasValue: 'Sí (0)', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@position.x', type: 'Interna del sistema', target: 'Furni', availability: 'Permanente', hasValue: 'Sí (44)', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@position.y', type: 'Interna del sistema', target: 'Furni', availability: 'Permanente', hasValue: 'Sí (51)', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@rotation', type: 'Interna del sistema', target: 'Furni', availability: 'Permanente', hasValue: 'Sí (0)', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@altitude', type: 'Interna del sistema', target: 'Furni', availability: 'Permanente', hasValue: 'Sí (0)', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' }
    ],
    user: [
        { name: 'puntos_usuario', type: 'Creada por usuario', target: 'Usuario', availability: 'Mientras el usuario esté en sala', hasValue: 'Sí (15)', canWrite: 'Sí', canCreateDelete: 'Sí', canIntercept: 'Sí' },
        { name: 'bloque_invisible_id', type: 'Creada por usuario', target: 'Usuario', availability: 'Permanente', hasValue: 'No', canWrite: 'Sí', canCreateDelete: 'Sí', canIntercept: 'Sí' },
        { name: 'vidas_restantes', type: 'Creada por usuario', target: 'Usuario', availability: 'Mientras el usuario esté en sala', hasValue: 'Sí (3)', canWrite: 'Sí', canCreateDelete: 'Sí', canIntercept: 'Sí' },
        { name: '@user_id', type: 'Interna del sistema', target: 'Usuario', availability: 'Permanente', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@user_name', type: 'Interna del sistema', target: 'Usuario', availability: 'Permanente', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' }
    ],
    global: [
        { name: 'sala_bloqueada', type: 'Creada por usuario', target: 'Sala', availability: 'Permanente', hasValue: 'Sí (0)', canWrite: 'Sí', canCreateDelete: 'Sí', canIntercept: 'Sí' },
        { name: 'ronda_actual', type: 'Creada por usuario', target: 'Sala', availability: 'Mientras la sala exista', hasValue: 'Sí (1)', canWrite: 'Sí', canCreateDelete: 'Sí', canIntercept: 'Sí' },
        { name: 'temporizador_activo', type: 'Creada por usuario', target: 'Sala', availability: 'Mientras la sala exista', hasValue: 'Sí (30)', canWrite: 'Sí', canCreateDelete: 'Sí', canIntercept: 'Sí' },
        { name: '@room_id', type: 'Interna del sistema', target: 'Sala', availability: 'Permanente', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' }
    ],
    context: [
        { name: 'ultimo_furni_activado', type: 'Contexto de evento', target: 'Contexto', availability: 'Por evento', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'Sí' },
        { name: 'ultimo_usuario_trigger', type: 'Contexto de evento', target: 'Contexto', availability: 'Por evento', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'Sí' }
    ]
};

export const WiredCreatorToolsView: FC<{}> = () =>
{
    const { isWiredCreatorToolsVisible, setIsWiredCreatorToolsVisible } = useWired();
    const [ activeTab, setActiveTab ] = useState<'monitor' | 'variables' | 'inspect' | 'settings'>('monitor');
    const [ toastMsg, setToastMsg ] = useState<string>(null);

    // Tab 1: Monitor
    const [ logs, setLogs ] = useState<Array<{ time: string; code: string; message: string }>>([
        { time: '12:00:00', code: 'OK', message: 'Sistema Wired verificado sin errores.' },
        { time: '11:59:15', code: 'INFO', message: 'Procesador de eventos activo y sincronizado.' },
        { time: '11:58:30', code: 'INFO', message: 'Sin violaciones de EXECUTION_CAP detectadas.' }
    ]);

    // Tab 2: Variables
    const [ varType, setVarType ] = useState<VariableCategory>('furni');
    const [ selectedVarIndex, setSelectedVarIndex ] = useState<number>(0);
    const [ varSearchTerm, setVarSearchTerm ] = useState<string>('');

    // Tab 3: Inspection
    const [ elementType, setElementType ] = useState<ElementCategory>('furni');
    const [ isInspecting, setIsInspecting ] = useState<boolean>(false);
    const [ keepSelected, setKeepSelected ] = useState<boolean>(false);

    // Tab 4: Settings
    const [ canModify, setCanModify ] = useState<'rights' | 'members' | 'admins'>('admins');
    const [ canInspect, setCanInspect ] = useState<'everyone' | 'rights' | 'members' | 'admins'>('admins');
    const [ timezone, setTimezone ] = useState<string>('Europe/Madrid');
    const [ prefShowMenuToolbar, setPrefShowMenuToolbar ] = useState<boolean>(true);
    const [ prefInspectBtn, setPrefInspectBtn ] = useState<boolean>(true);
    const [ prefPlaytesting, setPrefPlaytesting ] = useState<boolean>(false);
    const [ prefSystemNotifications, setPrefSystemNotifications ] = useState<boolean>(false);

    if(!isWiredCreatorToolsVisible) return null;

    const showToast = (msg: string) =>
    {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 2500);
    };

    const onClose = () =>
    {
        setIsWiredCreatorToolsVisible(false);
    };

    const handleReloadRoom = () =>
    {
        const session = GetRoomSession();
        if(session)
        {
            session.sendChatMessage(':reload', 0);
            showToast('Recargando sala (:reload)...');
        }
    };

    const handleRollback = () =>
    {
        const session = GetRoomSession();
        if(session)
        {
            session.sendChatMessage(':rollback', 0);
            showToast('Revertiendo estado (:rollback)...');
        }
    };

    const handleClearLogs = () =>
    {
        setLogs([]);
        showToast('Registro de errores vaciado');
    };

    const handleClearVisualizers = () =>
    {
        WiredSelectionVisualizer.clearSelectionShaderFromFurni([]);
        showToast('Resaltados de Wired eliminados');
    };

    const toggleInspectMode = () =>
    {
        const next = !isInspecting;
        setIsInspecting(next);
        if(next)
        {
            showToast('Modo inspección de furnis ACTIVO');
        }
        else
        {
            handleClearVisualizers();
            showToast('Modo inspección desactivado');
        }
    };

    const currentVariables = VARIABLES_CATALOG[varType].filter(v => 
        !varSearchTerm || v.name.toLowerCase().includes(varSearchTerm.toLowerCase())
    );
    const activeVar = currentVariables[selectedVarIndex] || currentVariables[0] || VARIABLES_CATALOG.furni[0];

    const getBannerTitle = () =>
    {
        switch(activeTab)
        {
            case 'monitor': return 'Monitor';
            case 'variables': return 'Variable Overview';
            case 'inspect': return 'Inspection';
            case 'settings': return 'Settings';
        }
    };

    return (
        <NitroCardView uniqueKey="wired-creator-tools" className="nitro-wired-creator-tools" theme="primary-slim">
            <NitroCardHeaderView headerText="Wired Creator Tools (:wired)" onCloseClick={ onClose } />

            { toastMsg && (
                <div className="nitro-wired-toast">
                    { toastMsg }
                </div>
            ) }

            <NitroCardTabsView>
                <NitroCardTabsItemView isActive={ activeTab === 'monitor' } onClick={ () => setActiveTab('monitor') }>
                    Monitor
                </NitroCardTabsItemView>
                <NitroCardTabsItemView isActive={ activeTab === 'variables' } onClick={ () => setActiveTab('variables') }>
                    Variables
                </NitroCardTabsItemView>
                <NitroCardTabsItemView isActive={ activeTab === 'inspect' } onClick={ () => setActiveTab('inspect') }>
                    Inspection
                </NitroCardTabsItemView>
                <NitroCardTabsItemView isActive={ activeTab === 'settings' } onClick={ () => setActiveTab('settings') }>
                    Settings
                </NitroCardTabsItemView>
            </NitroCardTabsView>

            <div className="creator-banner-strip">
                <span className="creator-banner-title">{ getBannerTitle() }</span>
                <div className="creator-banner-discord" title="Comunidad Wired en Discord">
                    <FaDiscord />
                </div>
            </div>

            <NitroCardContentView className="nitro-wired-creator-body">
                { activeTab === 'monitor' && (
                    <Column gap={ 2 } fullHeight>
                        <div className="creator-panel-card">
                            <Text bold small className="mb-2 text-dark">Wireds usage:</Text>
                            <div className="creator-metric-row">
                                <span className="text-secondary fw-semibold">Execution cap:</span>
                                <span className="fw-bold text-success">0 / 10000 (0% - Normal)</span>
                            </div>
                            <div className="creator-metric-row">
                                <span className="text-secondary fw-semibold">Room status:</span>
                                <span className="badge bg-success">NORMAL (Sin sobrecarga)</span>
                            </div>
                            <div className="creator-metric-row">
                                <span className="text-secondary fw-semibold">Delayed events cap:</span>
                                <span className="fw-bold text-dark">0 / 500 activos</span>
                            </div>
                            <div className="creator-metric-row">
                                <span className="text-secondary fw-semibold">Límite de ejecución por ciclo:</span>
                                <span className="fw-bold text-dark">100 eventos / seg</span>
                            </div>
                        </div>

                        <div className="creator-panel-card flex-grow-1 d-flex flex-column">
                            <Flex alignItems="center" justifyContent="between" className="mb-1">
                                <Text bold small className="text-dark">Error and warning logs:</Text>
                                <button className="wired-btn-retro" onClick={ handleClearLogs }>
                                    Limpiar registro
                                </button>
                            </Flex>

                            <div className="creator-retro-table-container flex-grow-1" style={{ minHeight: '120px', maxHeight: '150px' }}>
                                <table className="wired-retro-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '70px' }}>Hora</th>
                                            <th style={{ width: '60px' }}>Tipo</th>
                                            <th>Detalle</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        { logs.length === 0 ? (
                                            <tr>
                                                <td colSpan={ 3 } className="text-center text-muted py-3">
                                                    No hay errores o advertencias registradas
                                                </td>
                                            </tr>
                                        ) : (
                                            logs.map((log, index) => (
                                                <tr key={ index }>
                                                    <td className="text-muted">{ log.time }</td>
                                                    <td>
                                                        <span className={ `badge ${ log.code === 'OK' ? 'bg-success' : 'bg-primary' }` } style={{ fontSize: '9px' }}>
                                                            { log.code }
                                                        </span>
                                                    </td>
                                                    <td>{ log.message }</td>
                                                </tr>
                                            ))
                                        ) }
                                    </tbody>
                                </table>
                            </div>

                            <Flex alignItems="center" justifyContent="between" className="mt-2 pt-1 border-top">
                                <span style={{ fontSize: '11px', color: '#4b5563' }}>
                                    Acceso rápido con comando: <code>:wired</code> o <code>:wf</code>
                                </span>
                                <button className="wired-btn-retro" onClick={ () => showToast('Métricas actualizadas') }>
                                    <FaSyncAlt className="me-1" />
                                    <span>Actualizar</span>
                                </button>
                            </Flex>
                        </div>
                    </Column>
                ) }

                { activeTab === 'variables' && (
                    <Flex gap={ 2 } fullHeight>
                        { /* Columna izquierda: Tipo de variable y Selector */ }
                        <Column style={{ width: '190px' }} gap={ 1 }>
                            <Text bold small className="text-dark">Variable type:</Text>
                            <Flex gap={ 1 } className="mb-1">
                                <button
                                    className={ `wired-type-icon-btn ${ varType === 'furni' ? 'active' : '' }` }
                                    onClick={ () => { setVarType('furni'); setSelectedVarIndex(0); } }
                                    title="Variables de Furni"
                                >
                                    <FaChair />
                                </button>
                                <button
                                    className={ `wired-type-icon-btn ${ varType === 'user' ? 'active' : '' }` }
                                    onClick={ () => { setVarType('user'); setSelectedVarIndex(0); } }
                                    title="Variables de Usuario"
                                >
                                    <FaUser />
                                </button>
                                <button
                                    className={ `wired-type-icon-btn ${ varType === 'global' ? 'active' : '' }` }
                                    onClick={ () => { setVarType('global'); setSelectedVarIndex(0); } }
                                    title="Variables Globales de Sala"
                                >
                                    <FaGlobeAmericas />
                                </button>
                                <button
                                    className={ `wired-type-icon-btn ${ varType === 'context' ? 'active' : '' }` }
                                    onClick={ () => { setVarType('context'); setSelectedVarIndex(0); } }
                                    title="Variables de Contexto"
                                >
                                    <FaPlug />
                                </button>
                            </Flex>

                            <Text bold small className="text-dark">Variable picker:</Text>
                            <div className="creator-retro-listbox" style={{ height: '185px' }}>
                                { currentVariables.map((v, i) => (
                                    <div
                                        key={ v.name }
                                        className={ `creator-list-item ${ selectedVarIndex === i ? 'selected' : '' }` }
                                        onClick={ () => setSelectedVarIndex(i) }
                                    >
                                        { v.name }
                                    </div>
                                )) }
                            </div>

                            <Flex gap={ 1 } className="mt-1">
                                <button
                                    className="wired-btn-retro flex-grow-1"
                                    onClick={ () => showToast(`Variable ${ activeVar.name } resaltada en sala`) }
                                >
                                    Highlight
                                </button>
                                <button
                                    className="wired-btn-retro flex-grow-1"
                                    disabled
                                    title="Gestión avanzada disponible en modo edición"
                                >
                                    Manage
                                </button>
                            </Flex>
                        </Column>

                        { /* Columna derecha: Propiedades y Valores de texto */ }
                        <Column className="flex-grow-1" gap={ 1 }>
                            <Text bold small className="text-dark">Properties:</Text>
                            <div className="creator-retro-table-container" style={{ height: '145px' }}>
                                <table className="wired-retro-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '45%' }}>Property</th>
                                            <th>Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="fw-semibold">Name</td>
                                            <td>{ activeVar.name }</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">Type</td>
                                            <td>{ activeVar.type }</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">Target</td>
                                            <td>{ activeVar.target }</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">Availability</td>
                                            <td>{ activeVar.availability }</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">Has value</td>
                                            <td>{ activeVar.hasValue }</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">Can write to</td>
                                            <td>{ activeVar.canWrite }</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">Can create/delete</td>
                                            <td>{ activeVar.canCreateDelete }</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">Can intercept</td>
                                            <td>{ activeVar.canIntercept }</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <Text bold small className="text-dark mt-1">Text values:</Text>
                            <div className="creator-retro-table-container" style={{ height: '80px' }}>
                                <table className="wired-retro-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '40%' }}>Value</th>
                                            <th>Text</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td colSpan={ 2 } className="text-center text-muted py-3">
                                                Nothing to display
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </Column>
                    </Flex>
                ) }

                { activeTab === 'inspect' && (
                    <Flex gap={ 2 } fullHeight>
                        { /* Columna izquierda: Tipo, Vista Previa y Toggle */ }
                        <Column style={{ width: '190px' }} gap={ 1 }>
                            <Text bold small className="text-dark">Element type:</Text>
                            <Flex gap={ 1 } className="mb-1">
                                <button
                                    className={ `wired-type-icon-btn ${ elementType === 'furni' ? 'active' : '' }` }
                                    onClick={ () => setElementType('furni') }
                                    title="Inspeccionar Furni"
                                >
                                    <FaChair />
                                </button>
                                <button
                                    className={ `wired-type-icon-btn ${ elementType === 'user' ? 'active' : '' }` }
                                    onClick={ () => setElementType('user') }
                                    title="Inspeccionar Usuario"
                                >
                                    <FaUser />
                                </button>
                                <button
                                    className={ `wired-type-icon-btn ${ elementType === 'global' ? 'active' : '' }` }
                                    onClick={ () => setElementType('global') }
                                    title="Inspeccionar Global"
                                >
                                    <FaGlobeAmericas />
                                </button>
                            </Flex>

                            <Text bold small className="text-dark">Preview:</Text>
                            <div className="creator-preview-card">
                                <button
                                    className="creator-inspect-w-btn"
                                    onClick={ () => showToast('Resaltando pilas Wired conectadas') }
                                    title="Resaltar Wired conectados a este elemento"
                                >
                                    W
                                </button>
                                <div className="creator-preview-content">
                                    { isInspecting ? (
                                        <div className="text-center">
                                            <div className="furni-placeholder-bonsai mb-1" />
                                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1f2937' }}>
                                                Bonsai Tree (#163)
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-muted" style={{ fontSize: '11px' }}>
                                            Select a furni
                                        </span>
                                    )}
                                </div>
                            </div>

                            <label className="wired-checkbox-retro mt-1" onClick={ () => setKeepSelected(!keepSelected) }>
                                <span className={ `checkbox-box ${ keepSelected ? 'checked' : '' }` }>
                                    { keepSelected && <FaCheck style={{ fontSize: '9px' }} /> }
                                </span>
                                <span>Keep selected</span>
                            </label>

                            <button
                                className={ `wired-btn-retro w-100 mt-2 ${ isInspecting ? 'danger' : 'primary' }` }
                                onClick={ toggleInspectMode }
                            >
                                <FaTools className="me-1" />
                                <span>{ isInspecting ? 'Desactivar Inspección' : 'Activar Modo Inspección' }</span>
                            </button>
                        </Column>

                        { /* Columna derecha: Variables inspeccionadas */ }
                        <Column className="flex-grow-1" gap={ 1 }>
                            <Text bold small className="text-dark">Variables:</Text>
                            <div className="creator-retro-table-container" style={{ height: '210px' }}>
                                <table className="wired-retro-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '50%' }}>Variable</th>
                                            <th>Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="fw-semibold">var_de_furni</td>
                                            <td>-</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">var_de_furni_con_valor</td>
                                            <td>720</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">@id</td>
                                            <td>979277312</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">@class_id</td>
                                            <td>163</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">@height</td>
                                            <td>100</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">@state</td>
                                            <td>0</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">@position.x</td>
                                            <td>44</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">@position.y</td>
                                            <td>51</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">@rotation</td>
                                            <td>0</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">@altitude</td>
                                            <td>0</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">@type</td>
                                            <td>0 (Normal)</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">@dimensions.x</td>
                                            <td>1</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">@dimensions.y</td>
                                            <td>1</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <Flex gap={ 1 } className="mt-1">
                                <button className="wired-btn-retro flex-grow-1" disabled>
                                    Remove variable
                                </button>
                                <button className="wired-btn-retro flex-grow-1" onClick={ () => showToast('Asignar variable a furni') }>
                                    Give variable
                                </button>
                            </Flex>
                        </Column>
                    </Flex>
                ) }

                { activeTab === 'settings' && (
                    <Column gap={ 2 } fullHeight>
                        { /* Ajustes de sala: Who can modify & Who can inspect */ }
                        <Text bold small className="text-dark mb-0">Room settings:</Text>
                        <Flex gap={ 2 }>
                            <div className="creator-panel-card flex-grow-1">
                                <Text bold small className="mb-2 text-dark">Who can modify Wired:</Text>
                                <Column gap={ 1 }>
                                    <label className="wired-checkbox-retro" onClick={ () => setCanModify('rights') }>
                                        <span className={ `checkbox-box ${ canModify === 'rights' ? 'checked' : '' }` }>
                                            { canModify === 'rights' && <FaCheck style={{ fontSize: '9px' }} /> }
                                        </span>
                                        <span>Users with rights</span>
                                    </label>
                                    <label className="wired-checkbox-retro" onClick={ () => setCanModify('members') }>
                                        <span className={ `checkbox-box ${ canModify === 'members' ? 'checked' : '' }` }>
                                            { canModify === 'members' && <FaCheck style={{ fontSize: '9px' }} /> }
                                        </span>
                                        <span>Group members</span>
                                    </label>
                                    <label className="wired-checkbox-retro" onClick={ () => setCanModify('admins') }>
                                        <span className={ `checkbox-box ${ canModify === 'admins' ? 'checked' : '' }` }>
                                            { canModify === 'admins' && <FaCheck style={{ fontSize: '9px' }} /> }
                                        </span>
                                        <span>Group admins</span>
                                    </label>
                                </Column>
                            </div>

                            <div className="creator-panel-card flex-grow-1">
                                <Text bold small className="mb-2 text-dark">Who can inspect Wired:</Text>
                                <Column gap={ 1 }>
                                    <label className="wired-checkbox-retro" onClick={ () => setCanInspect('everyone') }>
                                        <span className={ `checkbox-box ${ canInspect === 'everyone' ? 'checked' : '' }` }>
                                            { canInspect === 'everyone' && <FaCheck style={{ fontSize: '9px' }} /> }
                                        </span>
                                        <span>Everyone</span>
                                    </label>
                                    <label className="wired-checkbox-retro" onClick={ () => setCanInspect('rights') }>
                                        <span className={ `checkbox-box ${ canInspect === 'rights' ? 'checked' : '' }` }>
                                            { canInspect === 'rights' && <FaCheck style={{ fontSize: '9px' }} /> }
                                        </span>
                                        <span>Users with rights</span>
                                    </label>
                                    <label className="wired-checkbox-retro" onClick={ () => setCanInspect('members') }>
                                        <span className={ `checkbox-box ${ canInspect === 'members' ? 'checked' : '' }` }>
                                            { canInspect === 'members' && <FaCheck style={{ fontSize: '9px' }} /> }
                                        </span>
                                        <span>Group members</span>
                                    </label>
                                    <label className="wired-checkbox-retro" onClick={ () => setCanInspect('admins') }>
                                        <span className={ `checkbox-box ${ canInspect === 'admins' ? 'checked' : '' }` }>
                                            { canInspect === 'admins' && <FaCheck style={{ fontSize: '9px' }} /> }
                                        </span>
                                        <span>Group admins</span>
                                    </label>
                                </Column>
                            </div>
                        </Flex>

                        { /* Timezone & Room state */ }
                        <Flex gap={ 2 } alignItems="end">
                            <Column style={{ width: '50%' }} gap={ 1 }>
                                <Text bold small className="text-dark">Timezone:</Text>
                                <select
                                    className="wired-select-retro w-100"
                                    value={ timezone }
                                    onChange={ e => setTimezone(e.target.value) }
                                >
                                    <option value="Europe/Madrid">Europe/Madrid</option>
                                    <option value="America/Mexico_City">America/Mexico_City</option>
                                    <option value="America/Bogota">America/Bogota</option>
                                    <option value="America/Buenos_Aires">America/Buenos_Aires</option>
                                    <option value="America/Santiago">America/Santiago</option>
                                    <option value="UTC">UTC (Universal)</option>
                                </select>
                            </Column>

                            <Column style={{ width: '50%' }} gap={ 1 }>
                                <Text bold small className="text-dark">Room state:</Text>
                                <Flex gap={ 2 }>
                                    <button className="wired-btn-retro flex-grow-1" onClick={ handleReloadRoom }>
                                        Reload
                                    </button>
                                    <button className="wired-btn-retro danger flex-grow-1" onClick={ handleRollback }>
                                        Rollback
                                    </button>
                                </Flex>
                            </Column>
                        </Flex>

                        { /* Account preferences */ }
                        <Text bold small className="text-dark mb-0">Account preferences:</Text>
                        <div className="creator-panel-card">
                            <Text bold small className="mb-2 text-dark">General:</Text>
                            <Column gap={ 1 }>
                                <label className="wired-checkbox-retro" onClick={ () => setPrefShowMenuToolbar(!prefShowMenuToolbar) }>
                                    <span className={ `checkbox-box ${ prefShowMenuToolbar ? 'checked' : '' }` }>
                                        { prefShowMenuToolbar && <FaCheck style={{ fontSize: '9px' }} /> }
                                    </span>
                                    <span>Show wired menu in toolbar</span>
                                </label>
                                <label className="wired-checkbox-retro" onClick={ () => setPrefInspectBtn(!prefInspectBtn) }>
                                    <span className={ `checkbox-box ${ prefInspectBtn ? 'checked' : '' }` }>
                                        { prefInspectBtn && <FaCheck style={{ fontSize: '9px' }} /> }
                                    </span>
                                    <span>Furni/user inspect button</span>
                                </label>
                                <label className="wired-checkbox-retro" onClick={ () => setPrefPlaytesting(!prefPlaytesting) }>
                                    <span className={ `checkbox-box ${ prefPlaytesting ? 'checked' : '' }` }>
                                        { prefPlaytesting && <FaCheck style={{ fontSize: '9px' }} /> }
                                    </span>
                                    <span>Enable playtesting mode</span>
                                </label>
                                <label className="wired-checkbox-retro" onClick={ () => setPrefSystemNotifications(!prefSystemNotifications) }>
                                    <span className={ `checkbox-box ${ prefSystemNotifications ? 'checked' : '' }` }>
                                        { prefSystemNotifications && <FaCheck style={{ fontSize: '9px' }} /> }
                                    </span>
                                    <span>Show all system notifications</span>
                                </label>
                            </Column>
                        </div >
                    </Column>
                ) }
            </NitroCardContentView>
        </NitroCardView>
    );
};
