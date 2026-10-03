import { FC, useState } from 'react';
import { FaCheckCircle, FaExchangeAlt, FaHistory, FaInfoCircle, FaListAlt, FaRedo, FaSearch, FaSlidersH, FaSyncAlt, FaTimes, FaTools, FaUndo } from 'react-icons/fa';
import { GetRoomSession, LocalizeText, WiredSelectionVisualizer } from '../../../../api';
import { Button, Column, Flex, NitroCardContentView, NitroCardHeaderView, NitroCardTabsItemView, NitroCardTabsView, NitroCardView, Text } from '../../../../common';
import { useWired } from '../../../../hooks';

export const WiredCreatorToolsView: FC<{}> = () =>
{
    const { isWiredCreatorToolsVisible, setIsWiredCreatorToolsVisible } = useWired();
    const [ activeTab, setActiveTab ] = useState<'monitor' | 'variables' | 'inspect' | 'settings'>('monitor');
    const [ searchTerm, setSearchTerm ] = useState<string>('');
    const [ isInspecting, setIsInspecting ] = useState<boolean>(false);
    const [ toastMsg, setToastMsg ] = useState<string>(null);

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

    const handleClearVisualizers = () =>
    {
        WiredSelectionVisualizer.clearSelectionShaderFromFurni([]);
        showToast('Resaltados visuales limpiados');
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

    return (
        <NitroCardView uniqueKey="wired-creator-tools" className="nitro-wired-creator-tools" theme="primary-slim">
            <NitroCardHeaderView headerText="Herramientas de Creación Wired" onCloseClick={ onClose } />

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
                    Inspección
                </NitroCardTabsItemView>
                <NitroCardTabsItemView isActive={ activeTab === 'settings' } onClick={ () => setActiveTab('settings') }>
                    Ajustes
                </NitroCardTabsItemView>
            </NitroCardTabsView>

            <NitroCardContentView className="p-2">
                { activeTab === 'monitor' && (
                    <Column gap={ 2 }>
                        <Flex alignItems="center" justifyContent="between" className="creator-panel-card">
                            <Flex alignItems="center" gap={ 2 }>
                                <FaCheckCircle className="text-success fs-5" />
                                <Column gap={ 0 }>
                                    <Text bold small className="text-white">Estado del sistema Wired</Text>
                                    <Text style={{ fontSize: '11px', color: '#a1a1aa' }}>Rendimiento óptimo (Sin sobrecarga)</Text>
                                </Column>
                            </Flex>
                            <span className="badge bg-success">ACTIVO</span>
                        </Flex>

                        <div className="creator-panel-card">
                            <Text bold small className="mb-1 text-white">Métricas de la sala:</Text>
                            <div className="creator-metric-row">
                                <span style={{ color: '#d4d4d8' }}>Carga del procesador Wired:</span>
                                <span className="text-success fw-bold">Normal (0% Heavy)</span>
                            </div>
                            <div className="creator-metric-row">
                                <span style={{ color: '#d4d4d8' }}>Límite de ejecución por ciclo:</span>
                                <span style={{ color: '#ffffff' }}>100 eventos / seg</span>
                            </div>
                            <div className="creator-metric-row">
                                <span style={{ color: '#d4d4d8' }}>Comando de acceso rápido:</span>
                                <code style={{ color: '#38bdf8' }}>:wired o :wf</code>
                            </div>
                        </div>

                        <Column gap={ 1 }>
                            <Text bold small className="text-white">Historial de ejecuciones recientes:</Text>
                            <div className="creator-terminal">
                                <div style={{ color: '#71717a' }}>[Sistema] Monitor de Wired iniciado correctamente.</div>
                                <div style={{ color: '#4ade80' }}>[OK] Configuración verificada sin errores de ciclo.</div>
                                <div style={{ color: '#38bdf8' }}>[Info] Todos los causantes y efectos sincronizados.</div>
                            </div>
                        </Column>
                    </Column>
                ) }

                { activeTab === 'variables' && (
                    <Column gap={ 2 }>
                        <Flex alignItems="center" gap={ 1 } className="creator-panel-card p-1">
                            <FaSearch className="text-muted ms-2" />
                            <input
                                type="text"
                                className="form-control form-control-sm bg-transparent border-0 text-white"
                                placeholder="Buscar variables de sala o furni..."
                                value={ searchTerm }
                                onChange={ e => setSearchTerm(e.target.value) }
                                style={{ fontSize: '12px' }}
                            />
                        </Flex>

                        <div className="creator-panel-card">
                            <Flex alignItems="center" gap={ 1 } style={{ color: '#38bdf8', fontSize: '11px', marginBottom: '8px' }}>
                                <FaInfoCircle />
                                <span>Las variables permiten gestionar contadores, puntos y estados de juego.</span>
                            </Flex>

                            <div className="table-responsive">
                                <table className="table table-dark table-sm table-striped m-0" style={{ fontSize: '11px' }}>
                                    <thead>
                                        <tr>
                                            <th>Variable</th>
                                            <th>Ámbito</th>
                                            <th>Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td><code>puntos_sala</code></td>
                                            <td><span className="badge bg-primary">Sala</span></td>
                                            <td>0</td>
                                        </tr>
                                        <tr>
                                            <td><code>ronda_activa</code></td>
                                            <td><span className="badge bg-secondary">Contexto</span></td>
                                            <td>1</td>
                                        </tr>
                                        <tr>
                                            <td><code>jugadores_vivos</code></td>
                                            <td><span className="badge bg-info text-dark">Usuario</span></td>
                                            <td>-</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <Flex justifyContent="end">
                            <Button variant="secondary" onClick={ () => showToast('Variables actualizadas') }>
                                <FaSyncAlt className="me-1" />
                                <span>Actualizar</span>
                            </Button>
                        </Flex>
                    </Column>
                ) }

                { activeTab === 'inspect' && (
                    <Column gap={ 2 }>
                        <div className="creator-panel-card text-center p-3">
                            <div className="mb-2">
                                <span className="badge bg-primary p-2 fs-6">
                                    Modo Inspección (W)
                                </span>
                            </div>
                            <Text small className="mb-3 d-block" style={{ color: '#a1a1aa' }}>
                                Al activar este modo, haz clic en cualquier furni de la sala para visualizar y resaltar de inmediato todas las pilas Wired conectadas a él.
                            </Text>

                            <Button 
                                variant={ isInspecting ? 'danger' : 'primary' }
                                onClick={ toggleInspectMode }
                            >
                                <FaTools className="me-1" />
                                <span>{ isInspecting ? 'Desactivar Modo Inspección' : 'Activar Modo Inspección' }</span>
                            </Button>
                        </div>

                        <div className="creator-panel-card" style={{ fontSize: '11px' }}>
                            <Text bold small className="text-white mb-1">Consejos para creadores:</Text>
                            <ul className="m-0 ps-3" style={{ color: '#a1a1aa' }}>
                                <li>Usa causantes con retraso para evitar sobrecargar los ciclos de ejecución.</li>
                                <li>Verifica que las condiciones de estado no bloqueen el flujo de ejecución.</li>
                                <li>El modo copiar en otro Wired te permite clonar ajustes rápidamente.</li>
                            </ul>
                        </div>
                    </Column>
                ) }

                { activeTab === 'settings' && (
                    <Column gap={ 2 }>
                        <Text bold small className="text-white">Acciones de recuperación y mantenimiento:</Text>
                        
                        <div className="d-grid gap-2">
                            <Button variant="warning" onClick={ handleReloadRoom } className="text-start">
                                <FaRedo className="me-2" />
                                <span>Recargar sala actual (:reload)</span>
                            </Button>

                            <Button variant="danger" onClick={ handleRollback } className="text-start">
                                <FaUndo className="me-2" />
                                <span>Revertir estado previo (:rollback)</span>
                            </Button>

                            <Button variant="secondary" onClick={ handleClearVisualizers } className="text-start">
                                <FaTimes className="me-2" />
                                <span>Limpiar todos los resaltados de furnis</span>
                            </Button>
                        </div>

                        <div className="creator-panel-card" style={{ fontSize: '11px', color: '#a1a1aa' }}>
                            <FaInfoCircle className="text-info me-1" />
                            <span>Si un circuito de Wired genera un bucle infinito o bloquea la sala, puedes usar <code>:reload</code> para reiniciar las pilas sin perder furnis.</span>
                        </div>
                    </Column>
                ) }
            </NitroCardContentView>
        </NitroCardView>
    );
};
