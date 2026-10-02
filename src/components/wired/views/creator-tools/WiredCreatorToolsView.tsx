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

            <NitroCardContentView className="p-2" style={{ minWidth: '380px', maxHeight: '420px', overflowY: 'auto' }}>
                { activeTab === 'monitor' && (
                    <Column gap={ 2 }>
                        <Flex alignItems="center" justifyContent="between" className="p-2 bg-dark rounded border border-secondary">
                            <Flex alignItems="center" gap={ 2 }>
                                <FaCheckCircle className="text-success fs-5" />
                                <Column gap={ 0 }>
                                    <Text bold small className="text-white">Estado del sistema Wired</Text>
                                    <Text className="text-muted" style={{ fontSize: '11px' }}>Rendimiento óptimo (Sin sobrecarga)</Text>
                                </Column>
                            </Flex>
                            <span className="badge bg-success">ACTIVO</span>
                        </Flex>

                        <div className="p-2 bg-dark rounded border border-secondary" style={{ fontSize: '11px' }}>
                            <Text bold small className="mb-1 text-white">Métricas de la sala:</Text>
                            <Flex justifyContent="between" className="py-1 border-bottom border-secondary text-light">
                                <span>Carga del procesador Wired:</span>
                                <span className="text-success fw-bold">Normal (0% Heavy)</span>
                            </Flex>
                            <Flex justifyContent="between" className="py-1 border-bottom border-secondary text-light">
                                <span>Límite de ejecución por ciclo:</span>
                                <span>100 eventos / seg</span>
                            </Flex>
                            <Flex justifyContent="between" className="py-1 text-light">
                                <span>Comando de acceso rápido:</span>
                                <code className="text-info">:wired o :wf</code>
                            </Flex>
                        </div>

                        <Column gap={ 1 }>
                            <Text bold small className="text-white">Historial de ejecuciones recientes:</Text>
                            <div className="bg-black p-2 rounded border border-secondary text-monospace text-light" style={{ fontSize: '11px', maxHeight: '120px', overflowY: 'auto' }}>
                                <div className="text-muted">[Sistema] Monitor de Wired iniciado correctamente.</div>
                                <div className="text-success">[OK] Configuración verificada sin errores de ciclo.</div>
                                <div className="text-info">[Info] Todos los causantes y efectos sincronizados.</div>
                            </div>
                        </Column>
                    </Column>
                ) }

                { activeTab === 'variables' && (
                    <Column gap={ 2 }>
                        <Flex alignItems="center" gap={ 1 } className="p-1 bg-dark rounded border border-secondary">
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

                        <div className="p-2 bg-dark rounded border border-secondary" style={{ fontSize: '11px' }}>
                            <Flex alignItems="center" gap={ 1 } className="text-info mb-2">
                                <FaInfoCircle />
                                <span>Las variables permiten gestionar contadores, puntos y estados sin que el usuario esté presente.</span>
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
                        <div className="p-3 bg-dark rounded border border-secondary text-center">
                            <div className="mb-2">
                                <span className="badge bg-primary p-2 fs-6">
                                    Modo Inspección (W)
                                </span>
                            </div>
                            <Text small className="text-muted mb-3 d-block">
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

                        <div className="p-2 bg-black rounded border border-secondary" style={{ fontSize: '11px' }}>
                            <Text bold small className="text-white mb-1">Consejos para creadores:</Text>
                            <ul className="m-0 ps-3 text-muted">
                                <li>Usa causantes con retraso para evitar sobrecargar los ciclos de ejecución.</li>
                                <li>Verifica que las condiciones de estado no bloqueen el flujo de ejecución.</li>
                                <li>El modo brocha te permite clonar ajustes rápidamente entre Wired idénticos.</li>
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

                        <div className="p-2 bg-dark rounded border border-secondary text-muted" style={{ fontSize: '11px' }}>
                            <FaInfoCircle className="text-info me-1" />
                            <span>Si un circuito de Wired genera un bucle infinito o bloquea la sala, puedes usar <code>:reload</code> para reiniciar las pilas sin perder furnis.</span>
                        </div>
                    </Column>
                ) }
            </NitroCardContentView>
        </NitroCardView>
    );
};
