import { RoomEngineObjectEvent, RoomObjectCategory } from '@nitrots/nitro-renderer';
import { FC, useState } from 'react';
import { FaChair, FaCheck, FaGlobeAmericas, FaPlug, FaUser } from 'react-icons/fa';
import { GetFurnitureDataForRoomObject, GetRoomSession, ProductTypeEnum, WiredSelectionVisualizer } from '../../../../api';
import { Column, Flex, LayoutAvatarImageView, LayoutFurniImageView, NitroCardContentView, NitroCardHeaderView, NitroCardView } from '../../../../common';
import { useRoomEngineEvent, useWired } from '../../../../hooks';

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
        { name: '@id', type: 'Interna', target: 'Furni', availability: '/', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@class_id', type: 'Interna', target: 'Furni', availability: '/', hasValue: 'Sí (163)', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@height', type: 'Interna', target: 'Furni', availability: '/', hasValue: 'Sí (100)', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@state', type: 'Interna', target: 'Furni', availability: '/', hasValue: 'Sí (0)', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@position.x', type: 'Interna', target: 'Furni', availability: '/', hasValue: 'Sí (44)', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@position.y', type: 'Interna', target: 'Furni', availability: '/', hasValue: 'Sí (51)', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@rotation', type: 'Interna', target: 'Furni', availability: '/', hasValue: 'Sí (0)', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@altitude', type: 'Interna', target: 'Furni', availability: '/', hasValue: 'Sí (0)', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@is_invisible', type: 'Interna', target: 'Furni', availability: '/', hasValue: 'No', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@type', type: 'Interna', target: 'Furni', availability: '/', hasValue: '0 (Normal)', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' }
    ],
    user: [
        { name: '@user_id', type: 'Interna', target: 'Usuario', availability: '/', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@user_name', type: 'Interna', target: 'Usuario', availability: '/', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: 'puntos_usuario', type: 'Creada por usuario', target: 'Usuario', availability: 'Mientras esté en sala', hasValue: 'Sí (15)', canWrite: 'Sí', canCreateDelete: 'Sí', canIntercept: 'Sí' },
        { name: 'vidas_restantes', type: 'Creada por usuario', target: 'Usuario', availability: 'Mientras esté en sala', hasValue: 'Sí (3)', canWrite: 'Sí', canCreateDelete: 'Sí', canIntercept: 'Sí' }
    ],
    global: [
        { name: '@room_id', type: 'Interna', target: 'Sala', availability: '/', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: 'ronda_actual', type: 'Creada por usuario', target: 'Sala', availability: 'Mientras la sala exista', hasValue: 'Sí (1)', canWrite: 'Sí', canCreateDelete: 'Sí', canIntercept: 'Sí' },
        { name: 'sala_bloqueada', type: 'Creada por usuario', target: 'Sala', availability: 'Permanente', hasValue: 'Sí (0)', canWrite: 'Sí', canCreateDelete: 'Sí', canIntercept: 'Sí' }
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
    const [ errorLogs, setErrorLogs ] = useState<Array<{ type: string; category: string; amount: number; latest: string; desc: string }>>([
        { type: 'EXECUTION_CAP', category: 'ERROR', amount: 0, latest: '/', desc: 'Límite máximo de ejecuciones de Wired alcanzado.' },
        { type: 'DELAYED_EVENTS_CAP', category: 'ERROR', amount: 0, latest: '/', desc: 'Límite de eventos diferidos simultáneos excedido.' },
        { type: 'EXECUTOR_OVERLOAD', category: 'ERROR', amount: 0, latest: '/', desc: 'Sobrecarga en el procesamiento de acciones en la sala.' },
        { type: 'MARKED_AS_HEAVY', category: 'WARNING', amount: 0, latest: '/', desc: 'La sala ha sido marcada con carga de Wired elevada.' },
        { type: 'KILLED', category: 'ERROR', amount: 0, latest: '/', desc: 'Ejecución de pila cancelada por bucle infinito o timeout.' },
        { type: 'RECURSION_TIMEOUT', category: 'ERROR', amount: 0, latest: '/', desc: 'Tiempo de recursión excedido en la cadena de eventos.' }
    ]);

    // Tab 2: Variables
    const [ varType, setVarType ] = useState<VariableCategory>('furni');
    const [ selectedVarIndex, setSelectedVarIndex ] = useState<number>(0);

    // Tab 3: Inspection
    const [ holderType, setHolderType ] = useState<ElementCategory>('furni');
    const [ keepSelected, setKeepSelected ] = useState<boolean>(false);
    const [ inspectedFurni, setInspectedFurni ] = useState<{ id: number; classId: number; name: string; isWall: boolean } | null>(null);
    const [ inspectedUser, setInspectedUser ] = useState<{ id: number; name: string; figure: string } | null>(null);

    // Tab 4: Settings
    const [ canModify, setCanModify ] = useState<'rights' | 'members' | 'admins'>('admins');
    const [ canInspect, setCanInspect ] = useState<'everyone' | 'rights' | 'members' | 'admins'>('admins');
    const [ timezone, setTimezone ] = useState<string>('Europe/Madrid');
    const [ prefShowMenuToolbar, setPrefShowMenuToolbar ] = useState<boolean>(false);
    const [ prefInspectBtn, setPrefInspectBtn ] = useState<boolean>(true);
    const [ prefPlaytesting, setPrefPlaytesting ] = useState<boolean>(false);
    const [ prefPrettifyVars, setPrefPrettifyVars ] = useState<boolean>(true);

    useRoomEngineEvent<RoomEngineObjectEvent>(RoomEngineObjectEvent.SELECTED, event =>
    {
        if(activeTab !== 'inspect') return;

        if((event.category === RoomObjectCategory.FLOOR) || (event.category === RoomObjectCategory.WALL))
        {
            const furniData = GetFurnitureDataForRoomObject(GetRoomSession()?.roomId, event.objectId, event.category);
            if(furniData)
            {
                setInspectedFurni({
                    id: event.objectId,
                    classId: furniData.id,
                    name: furniData.name || 'Furni',
                    isWall: event.category === RoomObjectCategory.WALL
                });
                setHolderType('furni');
            }
        }
        else if(event.category === RoomObjectCategory.UNIT)
        {
            const userData = GetRoomSession()?.userDataManager?.getUserDataByIndex(event.objectId);
            if(userData)
            {
                setInspectedUser({
                    id: userData.webID,
                    name: userData.name,
                    figure: userData.figure
                });
                setHolderType('user');
            }
        }
    });

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

    const handleClearLogs = () =>
    {
        setErrorLogs(prev => prev.map(item => ({ ...item, amount: 0, latest: '/' })));
        showToast('Logs vaciados correctamente');
    };

    const handleClearVisualizers = () =>
    {
        WiredSelectionVisualizer.clearSelectionShaderFromFurni([]);
        showToast('Resaltados de Wired eliminados');
    };

    const currentVariables = VARIABLES_CATALOG[varType] || [];
    const activeVar = currentVariables[selectedVarIndex] || currentVariables[0] || VARIABLES_CATALOG.furni[0];

    const getBannerTitle = () =>
    {
        switch(activeTab)
        {
            case 'monitor': return 'Monitor';
            case 'variables': return 'Resumen de variables';
            case 'inspect': return 'Inspección de variables';
            case 'settings': return 'Ajustes';
        }
    };

    return (
        <NitroCardView uniqueKey="wired-creator-tools" className="nitro-wired-creator-tools" theme="primary-slim">
            <NitroCardHeaderView headerText="Wired Creator Tools" onCloseClick={ onClose } />

            { toastMsg && (
                <div className="nitro-wired-toast">
                    { toastMsg }
                </div>
            ) }

            <div className="creator-custom-tabs">
                <div
                    className={ `creator-custom-tab ${ activeTab === 'monitor' ? 'active' : '' }` }
                    onClick={ () => setActiveTab('monitor') }
                >
                    Monitor
                </div>
                <div
                    className={ `creator-custom-tab ${ activeTab === 'variables' ? 'active' : '' }` }
                    onClick={ () => setActiveTab('variables') }
                >
                    Variables
                </div>
                <div
                    className={ `creator-custom-tab ${ activeTab === 'inspect' ? 'active' : '' }` }
                    onClick={ () => setActiveTab('inspect') }
                >
                    Inspección
                </div>
                <div
                    className={ `creator-custom-tab ${ activeTab === 'settings' ? 'active' : '' }` }
                    onClick={ () => setActiveTab('settings') }
                >
                    Ajustes
                </div>
            </div>

            <div className="creator-banner-strip">
                <span className="creator-banner-title">{ getBannerTitle() }</span>
            </div>

            <NitroCardContentView className="nitro-wired-creator-body">
                { /* TAB 1: MONITOR */ }
                { activeTab === 'monitor' && (
                    <Column gap={ 1 }>
                        <div className="creator-section-title">Estadísticas:</div>
                        <Flex gap={ 2 } className="mb-3">
                            <div className="creator-stats-box">
                                <div className="creator-stat-line">
                                    <span>Uso de Wired:</span>
                                    <span className="stat-val-green">0/5625</span>
                                </div>
                                <div className="creator-stat-line">
                                    <span>Es pesado:</span>
                                    <span className="stat-val-green">No</span>
                                </div>
                                <div className="creator-stat-line">
                                    <span>Furnis de suelo:</span>
                                    <span className="stat-val-green">7/4000</span>
                                </div>
                                <div className="creator-stat-line">
                                    <span>Furnis de pared:</span>
                                    <span className="stat-val-green">0/4000</span>
                                </div>
                                <div className="creator-stat-line">
                                    <span>Variables perm. de furni:</span>
                                    <span className="stat-val-green">0/33</span>
                                </div>
                            </div>
                            <div className="creator-desk-illustration" />
                        </Flex>

                        <div className="creator-section-title">Registros:</div>
                        <div className="creator-retro-table-container" style={{ height: '175px' }}>
                            <table className="wired-retro-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40%' }}>Tipo</th>
                                        <th style={{ width: '22%' }}>Categoría</th>
                                        <th style={{ width: '15%' }}>Cantidad</th>
                                        <th>Última ocurrencia</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    { errorLogs.map((log, idx) => (
                                        <tr key={ idx }>
                                             <td>
                                                 <span
                                                     className="creator-log-type-link"
                                                     onClick={ () => showToast(`${ log.type }: ${ log.desc }`) }
                                                     title={ log.desc }
                                                 >
                                                     { log.type }
                                                 </span>
                                             </td>
                                             <td style={{ color: log.category === 'WARNING' ? '#d97706' : '#64748b', fontWeight: 600 }}>
                                                 { log.category }
                                             </td>
                                             <td>{ log.amount }</td>
                                             <td>{ log.latest }</td>
                                         </tr>
                                     )) }
                                 </tbody>
                             </table>
                         </div>

                        <Flex justifyContent="end" className="mt-2">
                            <button
                                className="wired-btn-retro"
                                disabled={ errorLogs.every(l => l.amount === 0) }
                                onClick={ handleClearLogs }
                            >
                                Limpiar todo
                            </button>
                        </Flex>
                    </Column>
                ) }

                { /* TAB 2: VARIABLES */ }
                { activeTab === 'variables' && (
                    <Flex gap={ 2 } fullHeight>
                        <Column style={{ width: '165px' }} gap={ 1 }>
                            <div className="creator-section-title">Tipo de variable:</div>
                            <Flex gap={ 1 } className="mb-2">
                                <button
                                    className={ `wired-type-icon-btn ${ varType === 'furni' ? 'active' : '' }` }
                                    onClick={ () => { setVarType('furni'); setSelectedVarIndex(0); } }
                                    title="Variables de furni"
                                >
                                    <FaChair />
                                </button>
                                <button
                                    className={ `wired-type-icon-btn ${ varType === 'user' ? 'active' : '' }` }
                                    onClick={ () => { setVarType('user'); setSelectedVarIndex(0); } }
                                    title="Variables de usuario"
                                >
                                    <FaUser />
                                </button>
                                <button
                                    className={ `wired-type-icon-btn ${ varType === 'global' ? 'active' : '' }` }
                                    onClick={ () => { setVarType('global'); setSelectedVarIndex(0); } }
                                    title="Variables globales"
                                >
                                    <FaGlobeAmericas />
                                </button>
                                <button
                                    className={ `wired-type-icon-btn ${ varType === 'context' ? 'active' : '' }` }
                                    onClick={ () => { setVarType('context'); setSelectedVarIndex(0); } }
                                    title="Variables de contexto"
                                >
                                    <FaPlug />
                                </button>
                            </Flex>

                            <div className="creator-section-title">Selector de variables:</div>
                            <div className="creator-retro-listbox" style={{ height: '190px' }}>
                                { currentVariables.map((v, i) => (
                                    <div
                                        key={ v.name }
                                        className={ `creator-list-item ${ selectedVarIndex === i ? 'selected' : '' }` }
                                        onClick={ () => setSelectedVarIndex(i) }
                                    >
                                        { v.name }
                                    </div>
                                ))}
                            </div>

                            <button
                                className="wired-btn-retro w-100 mt-2"
                                onClick={ () => showToast(`Resaltando portadores de ${ activeVar.name }`) }
                            >
                                Resaltar portadores
                            </button>
                        </Column>

                        <Column className="flex-grow-1" gap={ 1 }>
                            <div className="creator-section-title">Propiedades:</div>
                            <div className="creator-retro-table-container" style={{ height: '160px' }}>
                                <table className="wired-retro-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '45%' }}>Propiedad</th>
                                            <th>Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="fw-semibold">Nombre</td>
                                            <td>{ activeVar.name }</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">Tipo</td>
                                            <td>{ activeVar.type }</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">Objetivo</td>
                                            <td>{ activeVar.target }</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">Disponibilidad</td>
                                            <td>{ activeVar.availability }</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">Tiene valor</td>
                                            <td>{ activeVar.hasValue }</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">Permite escritura</td>
                                            <td>{ activeVar.canWrite }</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">Permite crear/borrar</td>
                                            <td>{ activeVar.canCreateDelete }</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold">Permite interceptar</td>
                                            <td>{ activeVar.canIntercept }</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="creator-section-title mt-2">Valores de texto:</div>
                            <div className="creator-retro-table-container" style={{ height: '95px' }}>
                                <table className="wired-retro-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '40%' }}>Valor</th>
                                            <th>Texto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td colSpan={ 2 } className="text-center text-muted py-3">
                                                Nada que mostrar
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </Column>
                    </Flex>
                ) }

                { /* TAB 3: INSPECTION */ }
                { activeTab === 'inspect' && (
                    <Flex gap={ 2 } fullHeight>
                        <Column style={{ width: '175px' }} gap={ 1 }>
                            <div className="creator-section-title">Tipo de portador:</div>
                            <Flex gap={ 1 } className="mb-2">
                                <button
                                    className={ `wired-type-icon-btn ${ holderType === 'furni' ? 'active' : '' }` }
                                    onClick={ () => setHolderType('furni') }
                                    title="Furni"
                                >
                                    <FaChair />
                                </button>
                                <button
                                    className={ `wired-type-icon-btn ${ holderType === 'user' ? 'active' : '' }` }
                                    onClick={ () => setHolderType('user') }
                                    title="Usuario"
                                >
                                    <FaUser />
                                </button>
                                <button
                                    className={ `wired-type-icon-btn ${ holderType === 'global' ? 'active' : '' }` }
                                    onClick={ () => setHolderType('global') }
                                    title="Global"
                                >
                                    <FaGlobeAmericas />
                                </button>
                            </Flex>

                            <div className="creator-section-title">Vista previa:</div>
                            <div className="creator-preview-card" style={{ height: '180px' }}>
                                <div className="creator-preview-content">
                                    { (holderType === 'furni') && (
                                        inspectedFurni ? (
                                            <div className="text-center d-flex flex-column align-items-center justify-content-center">
                                                <LayoutFurniImageView
                                                    productType={ inspectedFurni.isWall ? ProductTypeEnum.WALL : ProductTypeEnum.FLOOR }
                                                    productClassId={ inspectedFurni.classId }
                                                    className="mb-2"
                                                />
                                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1f2937' }}>
                                                    { inspectedFurni.name } (#{ inspectedFurni.classId })
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-muted" style={{ fontSize: '13px' }}>
                                                Selecciona un furni para inspeccionarlo
                                            </span>
                                        )
                                    ) }

                                    { (holderType === 'user') && (
                                        inspectedUser ? (
                                            <div className="text-center d-flex flex-column align-items-center justify-content-center">
                                                <LayoutAvatarImageView
                                                    figure={ inspectedUser.figure }
                                                    direction={ 2 }
                                                    className="mb-1"
                                                />
                                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1f2937' }}>
                                                    { inspectedUser.name }
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-muted" style={{ fontSize: '13px' }}>
                                                Selecciona un usuario para inspeccionarlo
                                            </span>
                                        )
                                    ) }

                                    { (holderType === 'global') && (
                                        <div className="text-center d-flex flex-column align-items-center justify-content-center">
                                            <FaGlobeAmericas style={{ fontSize: '36px', color: '#38bdf8' }} className="mb-2" />
                                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1f2937' }}>
                                                Sala / Global
                                            </span>
                                        </div>
                                    ) }
                                </div>
                            </div>

                            <label className="wired-checkbox-retro mt-2" onClick={ () => setKeepSelected(!keepSelected) }>
                                <span className={ `checkbox-box ${ keepSelected ? 'checked' : '' }` }>
                                    { keepSelected && <FaCheck style={{ fontSize: '10px' }} /> }
                                </span>
                                <span>Mantener furni/usuario seleccionado</span>
                            </label>
                        </Column>

                        <Column className="flex-grow-1" gap={ 1 }>
                            <div className="creator-section-title">Variables:</div>
                            <div className="creator-retro-table-container" style={{ height: '280px' }}>
                                <table className="wired-retro-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '50%' }}>Variable</th>
                                            <th>Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        { (holderType === 'furni') && (
                                            inspectedFurni ? (
                                                <>
                                                    <tr><td className="fw-semibold">@id</td><td>{ inspectedFurni.id }</td></tr>
                                                    <tr><td className="fw-semibold">@class_id</td><td>{ inspectedFurni.classId }</td></tr>
                                                    <tr><td className="fw-semibold">@height</td><td>100</td></tr>
                                                    <tr><td className="fw-semibold">@state</td><td>0</td></tr>
                                                    <tr><td className="fw-semibold">@position.x</td><td>44</td></tr>
                                                    <tr><td className="fw-semibold">@position.y</td><td>51</td></tr>
                                                    <tr><td className="fw-semibold">@rotation</td><td>0</td></tr>
                                                    <tr><td className="fw-semibold">@altitude</td><td>0</td></tr>
                                                    <tr><td className="fw-semibold">@type</td><td>0 (Normal)</td></tr>
                                                </>
                                            ) : (
                                                <tr>
                                                    <td colSpan={ 2 } className="text-center text-muted py-4" style={{ fontSize: '13px' }}>
                                                        Nada que mostrar
                                                    </td>
                                                </tr>
                                            )
                                        ) }

                                        { (holderType === 'user') && (
                                            inspectedUser ? (
                                                <>
                                                    <tr><td className="fw-semibold">@user_id</td><td>{ inspectedUser.id }</td></tr>
                                                    <tr><td className="fw-semibold">@user_name</td><td>{ inspectedUser.name }</td></tr>
                                                    <tr><td className="fw-semibold">puntos_usuario</td><td>15</td></tr>
                                                    <tr><td className="fw-semibold">vidas_restantes</td><td>3</td></tr>
                                                </>
                                            ) : (
                                                <tr>
                                                    <td colSpan={ 2 } className="text-center text-muted py-4" style={{ fontSize: '13px' }}>
                                                        Nada que mostrar
                                                    </td>
                                                </tr>
                                            )
                                        ) }

                                        { (holderType === 'global') && (
                                            <>
                                                <tr><td className="fw-semibold">@room_id</td><td>{ GetRoomSession()?.roomId || 0 }</td></tr>
                                                <tr><td className="fw-semibold">ronda_actual</td><td>1</td></tr>
                                                <tr><td className="fw-semibold">sala_bloqueada</td><td>0</td></tr>
                                            </>
                                        ) }
                                    </tbody>
                                </table>
                            </div>
                        </Column>
                    </Flex>
                ) }

                { /* TAB 4: SETTINGS */ }
                { activeTab === 'settings' && (
                    <Column gap={ 1 }>
                        <div className="creator-section-title">Ajustes de sala:</div>
                        <Flex gap={ 2 } className="mb-3">
                            <div className="creator-panel-card flex-grow-1">
                                <div className="creator-section-title mb-2">Quién puede modificar Wired:</div>
                                <Column gap={ 1 }>
                                    <label className="wired-checkbox-retro" onClick={ () => setCanModify('rights') }>
                                        <span className={ `checkbox-box ${ canModify === 'rights' ? 'checked' : '' }` }>
                                            { canModify === 'rights' && <FaCheck style={{ fontSize: '10px' }} /> }
                                        </span>
                                        <span>Usuarios con derechos</span>
                                    </label>
                                    <label className="wired-checkbox-retro" onClick={ () => setCanModify('members') }>
                                        <span className={ `checkbox-box ${ canModify === 'members' ? 'checked' : '' }` }>
                                            { canModify === 'members' && <FaCheck style={{ fontSize: '10px' }} /> }
                                        </span>
                                        <span>Miembros del grupo</span>
                                    </label>
                                    <label className="wired-checkbox-retro" onClick={ () => setCanModify('admins') }>
                                        <span className={ `checkbox-box ${ canModify === 'admins' ? 'checked' : '' }` }>
                                            { canModify === 'admins' && <FaCheck style={{ fontSize: '10px' }} /> }
                                        </span>
                                        <span>Admins del grupo</span>
                                    </label>
                                </Column>
                            </div>

                            <div className="creator-panel-card flex-grow-1">
                                <div className="creator-section-title mb-2">Quién puede inspeccionar Wired:</div>
                                <Column gap={ 1 }>
                                    <label className="wired-checkbox-retro" onClick={ () => setCanInspect('everyone') }>
                                        <span className={ `checkbox-box ${ canInspect === 'everyone' ? 'checked' : '' }` }>
                                            { canInspect === 'everyone' && <FaCheck style={{ fontSize: '10px' }} /> }
                                        </span>
                                        <span>Todos</span>
                                    </label>
                                    <label className="wired-checkbox-retro" onClick={ () => setCanInspect('rights') }>
                                        <span className={ `checkbox-box ${ canInspect === 'rights' ? 'checked' : '' }` }>
                                            { canInspect === 'rights' && <FaCheck style={{ fontSize: '10px' }} /> }
                                        </span>
                                        <span>Usuarios con derechos</span>
                                    </label>
                                    <label className="wired-checkbox-retro" onClick={ () => setCanInspect('members') }>
                                        <span className={ `checkbox-box ${ canInspect === 'members' ? 'checked' : '' }` }>
                                            { canInspect === 'members' && <FaCheck style={{ fontSize: '10px' }} /> }
                                        </span>
                                        <span>Miembros del grupo</span>
                                    </label>
                                    <label className="wired-checkbox-retro" onClick={ () => setCanInspect('admins') }>
                                        <span className={ `checkbox-box ${ canInspect === 'admins' ? 'checked' : '' }` }>
                                            { canInspect === 'admins' && <FaCheck style={{ fontSize: '10px', color: '#64748b' }} /> }
                                        </span>
                                        <span>Admins del grupo</span>
                                    </label>
                                </Column>
                            </div>
                        </Flex>

                        <div className="mb-3">
                            <div className="creator-section-title">Zona horaria:</div>
                            <select
                                className="wired-select-retro"
                                style={{ width: '220px' }}
                                value={ timezone }
                                onChange={ e => setTimezone(e.target.value) }
                            >
                                <option value="Europe/Madrid">Europe/Madrid</option>
                                <option value="America/Mexico_City">America/Mexico_City</option>
                                <option value="America/Bogota">America/Bogota</option>
                                <option value="America/Buenos_Aires">America/Buenos_Aires</option>
                                <option value="UTC">UTC (Universal)</option>
                            </select>
                        </div>

                        <div className="creator-section-title">Preferencias:</div>
                        <div className="creator-panel-card">
                            <Column gap={ 1 }>
                                <label className="wired-checkbox-retro" onClick={ () => setPrefShowMenuToolbar(!prefShowMenuToolbar) }>
                                    <span className={ `checkbox-box ${ prefShowMenuToolbar ? 'checked' : '' }` }>
                                        { prefShowMenuToolbar && <FaCheck style={{ fontSize: '10px' }} /> }
                                    </span>
                                    <span>Mostrar menú Wired en barra de herramientas</span>
                                </label>
                                <label className="wired-checkbox-retro" onClick={ () => setPrefInspectBtn(!prefInspectBtn) }>
                                    <span className={ `checkbox-box ${ prefInspectBtn ? 'checked' : '' }` }>
                                        { prefInspectBtn && <FaCheck style={{ fontSize: '10px' }} /> }
                                    </span>
                                    <span>Mostrar botón "inspeccionar" en info de furni/usuario</span>
                                </label>
                                <label className="wired-checkbox-retro" onClick={ () => setPrefPlaytesting(!prefPlaytesting) }>
                                    <span className={ `checkbox-box ${ prefPlaytesting ? 'checked' : '' }` }>
                                        { prefPlaytesting && <FaCheck style={{ fontSize: '10px' }} /> }
                                    </span>
                                    <span>Habilitar modo de prueba (jugar sin derechos)</span>
                                </label>
                                <label className="wired-checkbox-retro" onClick={ () => setPrefPrettifyVars(!prefPrettifyVars) }>
                                    <span className={ `checkbox-box ${ prefPrettifyVars ? 'checked' : '' }` }>
                                        { prefPrettifyVars && <FaCheck style={{ fontSize: '10px' }} /> }
                                    </span>
                                    <span>Embellecer nombres de variables de usuario</span>
                                </label>
                            </Column>
                        </div>
                    </Column>
                ) }
            </NitroCardContentView>
        </NitroCardView>
    );
};
