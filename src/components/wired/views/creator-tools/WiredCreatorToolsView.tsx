import { RoomEngineObjectEvent, RoomObjectCategory, RoomObjectType, RoomObjectVariable, Vector3d } from '@nitrots/nitro-renderer';
import { Component, ErrorInfo, FC, ReactNode, useState } from 'react';
import { FaCheck } from 'react-icons/fa';
import IconScopeContext from '../../../../assets/images/wired/icon_scope_context.png';
import IconScopeFurni from '../../../../assets/images/wired/icon_scope_furni.png';
import IconScopeGlobal from '../../../../assets/images/wired/icon_scope_global.png';
import IconScopeUser from '../../../../assets/images/wired/icon_scope_user.png';
import { GetFurnitureDataForRoomObject, GetRoomEngine, GetRoomSession, ProductTypeEnum, WiredSelectionVisualizer } from '../../../../api';
import { Column, Flex, LayoutAvatarImageView, LayoutFurniImageView, NitroCardContentView, NitroCardHeaderView, NitroCardView } from '../../../../common';
import { useRoomEngineEvent, useWired } from '../../../../hooks';

interface ErrorBoundaryProps
{
    children: ReactNode;
}

interface ErrorBoundaryState
{
    hasError: boolean;
    error: Error | null;
}

class WiredCreatorToolsErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState>
{
    constructor(props: ErrorBoundaryProps)
    {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState
    {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void
    {
        console.error('WiredCreatorTools Error caught by boundary:', error, errorInfo);
    }

    render(): ReactNode
    {
        if(this.state.hasError)
        {
            return (
                <NitroCardView uniqueKey="wired-creator-tools-error" className="nitro-wired-creator-tools" theme="primary-slim">
                    <NitroCardHeaderView headerText="Wired Creator Tools" onCloseClick={ () => this.setState({ hasError: false, error: null }) } />
                    <NitroCardContentView className="nitro-wired-creator-body text-center p-4">
                        <div style={{ color: '#b91c1c', fontWeight: 700, marginBottom: '8px', fontSize: '14px' }}>
                            Ocurrió un error en esta vista
                        </div>
                        <p style={{ color: '#4b5563', fontSize: '12px', marginBottom: '12px' }}>
                            Se ha recuperado el cliente sin interrupciones.
                        </p>
                        <button
                            className="wired-btn-retro"
                            onClick={ () => this.setState({ hasError: false, error: null }) }
                        >
                            Reiniciar herramientas
                        </button>
                    </NitroCardContentView>
                </NitroCardView>
            );
        }

        return this.props.children;
    }
}

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
        { name: '@state', type: 'Interna', target: 'Furni', availability: 'En sala', hasValue: 'Sí', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@position_x', type: 'Interna', target: 'Furni', availability: 'En sala', hasValue: 'Sí', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@position_y', type: 'Interna', target: 'Furni', availability: 'En sala', hasValue: 'Sí', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@rotation', type: 'Interna', target: 'Furni', availability: 'En sala', hasValue: 'Sí', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@altitude', type: 'Interna', target: 'Furni', availability: 'En sala', hasValue: 'Sí', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@height', type: 'Interna', target: 'Furni', availability: 'En sala', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@id', type: 'Interna', target: 'Furni', availability: 'En sala', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@class_id', type: 'Interna', target: 'Furni', availability: 'En sala', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@owner_id', type: 'Interna', target: 'Furni', availability: 'En sala', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@is_stackable', type: 'Interna', target: 'Furni', availability: 'En sala', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@can_stand_on', type: 'Interna', target: 'Furni', availability: 'En sala', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@can_sit_on', type: 'Interna', target: 'Furni', availability: 'En sala', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@can_lay_on', type: 'Interna', target: 'Furni', availability: 'En sala', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' }
    ],
    user: [
        { name: '@position_x', type: 'Interna', target: 'Usuario', availability: 'Mientras esté en sala', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@position_y', type: 'Interna', target: 'Usuario', availability: 'Mientras esté en sala', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@direction', type: 'Interna', target: 'Usuario', availability: 'Mientras esté en sala', hasValue: 'Sí', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@altitude', type: 'Interna', target: 'Usuario', availability: 'Mientras esté en sala', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@handitem_id', type: 'Interna', target: 'Usuario', availability: 'Mientras esté en sala', hasValue: 'Sí', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@effect_id', type: 'Interna', target: 'Usuario', availability: 'Mientras esté en sala', hasValue: 'Sí', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@dance', type: 'Interna', target: 'Usuario', availability: 'Mientras esté en sala', hasValue: 'Sí', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@sign', type: 'Interna', target: 'Usuario', availability: 'Mientras esté en sala', hasValue: 'Sí', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@user_id', type: 'Interna', target: 'Usuario', availability: 'Mientras esté en sala', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@gender', type: 'Interna', target: 'Usuario', availability: 'Mientras esté en sala', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@is_hc', type: 'Interna', target: 'Usuario', availability: 'Mientras esté en sala', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@has_rights', type: 'Interna', target: 'Usuario', availability: 'Mientras esté en sala', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@is_owner', type: 'Interna', target: 'Usuario', availability: 'Mientras esté en sala', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@is_frozen', type: 'Interna', target: 'Usuario', availability: 'Mientras esté en sala', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@is_idle', type: 'Interna', target: 'Usuario', availability: 'Mientras esté en sala', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@achievement_score', type: 'Interna', target: 'Usuario', availability: 'Mientras esté en sala', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' }
    ],
    global: [
        { name: '@room_id', type: 'Interna', target: 'Sala', availability: 'Permanente', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@group_id', type: 'Interna', target: 'Sala', availability: 'Permanente', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@furni_count', type: 'Interna', target: 'Sala', availability: 'Permanente', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@user_count', type: 'Interna', target: 'Sala', availability: 'Permanente', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@wired_timer', type: 'Interna', target: 'Sala', availability: 'Permanente', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@team_red_score', type: 'Interna', target: 'Sala', availability: 'Permanente', hasValue: 'Sí', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@team_green_score', type: 'Interna', target: 'Sala', availability: 'Permanente', hasValue: 'Sí', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@team_blue_score', type: 'Interna', target: 'Sala', availability: 'Permanente', hasValue: 'Sí', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@team_yellow_score', type: 'Interna', target: 'Sala', availability: 'Permanente', hasValue: 'Sí', canWrite: 'Sí', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@current_time.hour_of_day', type: 'Interna', target: 'Servidor', availability: 'Tiempo real', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@current_time.minute_of_hour', type: 'Interna', target: 'Servidor', availability: 'Tiempo real', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@current_time.seconds_of_minute', type: 'Interna', target: 'Servidor', availability: 'Tiempo real', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@current_time.day_of_week', type: 'Interna', target: 'Servidor', availability: 'Tiempo real', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@current_time.day_of_month', type: 'Interna', target: 'Servidor', availability: 'Tiempo real', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@current_time.month_of_year', type: 'Interna', target: 'Servidor', availability: 'Tiempo real', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' },
        { name: '@current_time.year', type: 'Interna', target: 'Servidor', availability: 'Tiempo real', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'No' }
    ],
    context: [
        { name: '@trigger_user_id', type: 'Contexto de evento', target: 'Contexto', availability: 'Por evento', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'Sí' },
        { name: '@trigger_furni_id', type: 'Contexto de evento', target: 'Contexto', availability: 'Por evento', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'Sí' },
        { name: '@signal_value', type: 'Contexto de evento', target: 'Contexto', availability: 'Por evento', hasValue: 'Sí', canWrite: 'No', canCreateDelete: 'No', canIntercept: 'Sí' }
    ]
};

const WiredCreatorToolsViewContent: FC<{}> = () =>
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
    const [ inspectedFurni, setInspectedFurni ] = useState<{
        id: number;
        classId: number;
        name: string;
        isWall: boolean;
        posX: number;
        posY: number;
        posZ: number;
        rot: number;
        state: number;
        imageSrc?: string;
    } | null>(null);
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
        if(!isWiredCreatorToolsVisible || activeTab !== 'inspect') return;
        if(keepSelected && (inspectedFurni || inspectedUser)) return;

        try
        {
            const session = GetRoomSession();
            if(!session) return;

            if((event.category === RoomObjectCategory.FLOOR) || (event.category === RoomObjectCategory.WALL))
            {
                const roomObject = GetRoomEngine().getRoomObject(session.roomId, event.objectId, event.category);
                const furniData = GetFurnitureDataForRoomObject(session.roomId, event.objectId, event.category);

                let posX = 0;
                let posY = 0;
                let posZ = 0;
                let rot = 0;
                let state = 0;
                let imageSrc: string = null;

                if(roomObject)
                {
                    const loc = roomObject.getLocation();
                    if(loc)
                    {
                        posX = Math.round(loc.x);
                        posY = Math.round(loc.y);
                        posZ = Math.round(loc.z * 100) / 100;
                    }
                    const dir = roomObject.getDirection();
                    if(dir) rot = Math.round(dir.x);

                    const furniState = roomObject.model?.getValue<number>(RoomObjectVariable.FURNITURE_DATA);
                    if(furniState !== undefined && furniState !== null) state = furniState;
                }

                try
                {
                    const roomObjectImage = GetRoomEngine().getRoomObjectImage(session.roomId, event.objectId, event.category, new Vector3d(180), 64, null);
                    if(roomObjectImage && roomObjectImage.getImage())
                    {
                        imageSrc = roomObjectImage.getImage().src;
                    }
                }
                catch(e) {}

                setInspectedFurni({
                    id: event.objectId,
                    classId: furniData?.id || event.objectId,
                    name: furniData?.name || 'Furni',
                    isWall: event.category === RoomObjectCategory.WALL,
                    posX,
                    posY,
                    posZ,
                    rot,
                    state,
                    imageSrc
                });
                setHolderType('furni');
            }
            else if(event.category === RoomObjectCategory.UNIT)
            {
                const userData = session.userDataManager?.getUserDataByIndex(event.objectId);
                if(userData && (userData.type === RoomObjectType.USER))
                {
                    setInspectedUser({
                        id: userData.webID,
                        name: userData.name || 'Usuario',
                        figure: userData.figure || ''
                    });
                    setHolderType('user');
                }
            }
        }
        catch(err)
        {
            console.error('Error during inspect selection:', err);
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
                                    <img src={ IconScopeFurni } alt="Furni" className="creator-scope-icon-img" />
                                </button>
                                <button
                                    className={ `wired-type-icon-btn ${ varType === 'user' ? 'active' : '' }` }
                                    onClick={ () => { setVarType('user'); setSelectedVarIndex(0); } }
                                    title="Variables de usuario"
                                >
                                    <img src={ IconScopeUser } alt="Usuario" className="creator-scope-icon-img" />
                                </button>
                                <button
                                    className={ `wired-type-icon-btn ${ varType === 'global' ? 'active' : '' }` }
                                    onClick={ () => { setVarType('global'); setSelectedVarIndex(0); } }
                                    title="Variables globales"
                                >
                                    <img src={ IconScopeGlobal } alt="Global" className="creator-scope-icon-img" />
                                </button>
                                <button
                                    className={ `wired-type-icon-btn ${ varType === 'context' ? 'active' : '' }` }
                                    onClick={ () => { setVarType('context'); setSelectedVarIndex(0); } }
                                    title="Variables de contexto"
                                >
                                    <img src={ IconScopeContext } alt="Contexto" className="creator-scope-icon-img" />
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
                                            <td colSpan={ 2 } className="text-center py-3" style={{ fontSize: '13px', color: '#475569' }}>
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
                                    <img src={ IconScopeFurni } alt="Furni" className="creator-scope-icon-img" />
                                </button>
                                <button
                                    className={ `wired-type-icon-btn ${ holderType === 'user' ? 'active' : '' }` }
                                    onClick={ () => setHolderType('user') }
                                    title="Usuario"
                                >
                                    <img src={ IconScopeUser } alt="Usuario" className="creator-scope-icon-img" />
                                </button>
                                <button
                                    className={ `wired-type-icon-btn ${ holderType === 'global' ? 'active' : '' }` }
                                    onClick={ () => setHolderType('global') }
                                    title="Global"
                                >
                                    <img src={ IconScopeGlobal } alt="Global" className="creator-scope-icon-img" />
                                </button>
                            </Flex>

                            <div className="creator-section-title">Vista previa:</div>
                            <div className="creator-preview-card" style={{ height: '180px' }}>
                                <div className="creator-preview-content">
                                    { (holderType === 'furni') && (
                                        inspectedFurni ? (
                                            <div className="text-center d-flex flex-column align-items-center justify-content-center">
                                                { inspectedFurni.imageSrc ? (
                                                    <img src={ inspectedFurni.imageSrc } alt="" className="mb-2" style={{ maxHeight: '80px', objectFit: 'contain' }} />
                                                ) : (
                                                    <LayoutFurniImageView
                                                        productType={ inspectedFurni.isWall ? ProductTypeEnum.WALL : ProductTypeEnum.FLOOR }
                                                        productClassId={ inspectedFurni.classId }
                                                        className="mb-2"
                                                    />
                                                ) }
                                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1f2937' }}>
                                                    { inspectedFurni.name } (#{ inspectedFurni.classId })
                                                </span>
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>
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
                                            <span style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>
                                                Selecciona un usuario para inspeccionarlo
                                            </span>
                                        )
                                    ) }

                                    { (holderType === 'global') && (
                                        <div className="text-center d-flex flex-column align-items-center justify-content-center">
                                            <img src={ IconScopeGlobal } alt="Global" style={{ width: '36px', height: '36px', objectFit: 'contain', imageRendering: 'pixelated' }} className="mb-2" />
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
                                                    <tr><td className="fw-semibold">@state</td><td>{ inspectedFurni.state ?? 0 }</td></tr>
                                                    <tr><td className="fw-semibold">@position_x</td><td>{ inspectedFurni.posX ?? 0 }</td></tr>
                                                    <tr><td className="fw-semibold">@position_y</td><td>{ inspectedFurni.posY ?? 0 }</td></tr>
                                                    <tr><td className="fw-semibold">@rotation</td><td>{ inspectedFurni.rot ?? 0 }</td></tr>
                                                    <tr><td className="fw-semibold">@altitude</td><td>{ inspectedFurni.posZ ?? 0 }</td></tr>
                                                    <tr><td className="fw-semibold">@type</td><td>0 (Normal)</td></tr>
                                                </>
                                            ) : (
                                                <tr>
                                                    <td colSpan={ 2 } className="text-center py-4" style={{ fontSize: '13px', color: '#475569' }}>
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
                                                    <td colSpan={ 2 } className="text-center py-4" style={{ fontSize: '13px', color: '#475569' }}>
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

export const WiredCreatorToolsView: FC<{}> = () =>
{
    return (
        <WiredCreatorToolsErrorBoundary>
            <WiredCreatorToolsViewContent />
        </WiredCreatorToolsErrorBoundary>
    );
};
