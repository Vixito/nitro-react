import { ConfigurationEvent, GetAssetManager, HabboWebTools, LegacyExternalInterface, Nitro, NitroCommunicationDemoEvent, NitroConfiguration, NitroEvent, NitroLocalizationEvent, NitroVersion, RoomEngineEvent } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { GetCommunication, GetConfiguration, GetNitroInstance, GetUIVersion } from './api';
import { Base, TransitionAnimation, TransitionAnimationTypes } from './common';
import { LoadingView } from './components/loading/LoadingView';
import { MainView } from './components/main/MainView';
import { useConfigurationEvent, useEraTheme, useLocalizationEvent, useMainEvent, useRoomEngineEvent } from './hooks';

NitroVersion.UI_VERSION = GetUIVersion();

const debugLog = (step: string, data?: any) => {
    console.log('[DEBUG_CLIENT]', step, data);
    fetch('/api/debug-client-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, data, time: new Date().toISOString() })
    }).catch(() => {});
};

if (typeof window !== 'undefined' && !(window as any).__debugHandlersAttached) {
    (window as any).__debugHandlersAttached = true;
    window.addEventListener('error', (e) => {
        debugLog('WINDOW_UNCAUGHT_ERROR', { message: e.message, filename: e.filename, lineno: e.lineno, stack: e.error?.stack });
    });
    window.addEventListener('unhandledrejection', (e) => {
        debugLog('WINDOW_UNHANDLED_REJECTION', { reason: String(e.reason), stack: e.reason?.stack });
    });
}

export const App: FC<{}> = props =>
{
    useEraTheme();
    const [ isReady, setIsReady ] = useState(false);
    const [ isError, setIsError ] = useState(false);
    const [ message, setMessage ] = useState('Getting Ready');
    const [ percent, setPercent ] = useState(0);
    const [ imageRendering, setImageRendering ] = useState<boolean>(true);

    if(!GetNitroInstance())
    {
        //@ts-ignore
        if(!NitroConfig) {
            debugLog('NitroConfig is not defined in App!');
            throw new Error('NitroConfig is not defined!');
        }

        try {
            debugLog('Calling Nitro.bootstrap()...');
            Nitro.bootstrap();
            debugLog('Nitro.bootstrap() succeeded');
        } catch (e: any) {
            debugLog('Nitro.bootstrap() FAILED', { message: e?.message, stack: e?.stack });
            throw e;
        }
    }

    const handler = useCallback(async (event: NitroEvent) =>
    {
        switch(event.type)
        {
            case ConfigurationEvent.LOADED:
                debugLog('ConfigurationEvent.LOADED');
                GetNitroInstance().localization.init();
                setPercent(prevValue => (prevValue + 20));
                
                // Fetch dynamic client configuration from CMS
                const loadHabbtenConfig = () => {
                    fetch('/game/api/client_config.json')
                        .then(res => {
                            if (!res.ok) return null;
                            const ct = res.headers.get('content-type');
                            if (ct && ct.includes('application/json')) return res.json();
                            return null;
                        })
                        .then(data => {
                            if (!data) return;
                            (window as any).HabbtenConfig = data;
                            window.dispatchEvent(new CustomEvent('habbten-config-updated', { detail: data }));
                        })
                        .catch(() => {});
                };
                loadHabbtenConfig();
                setInterval(loadHabbtenConfig, 5000);

                // Fetch dynamic chat bubbles
                fetch('/api/chat-bubbles')
                    .then(res => {
                        if (!res.ok) return null;
                        const ct = res.headers.get('content-type');
                        if (ct && ct.includes('application/json')) return res.json();
                        return null;
                    })
                    .then(data => {
                        if (data && data.success && data.bubbles) {
                            const existingStyles = NitroConfiguration.getValue<any[]>('chat.styles') || [];
                            
                            let dynamicCss = '';
                            
                            data.bubbles.forEach((b: any) => {
                                const bubbleObj = {
                                    styleId: b.bubble_id,
                                    minRank: b.min_rank || 0,
                                    isSystemStyle: false,
                                    isHcOnly: !!b.is_hc,
                                    isVipOnly: !!b.is_vip,
                                    isAmbassadorOnly: false
                                };
                                
                                const existingIndex = existingStyles.findIndex((s: any) => s && s.styleId === b.bubble_id);
                                if (existingIndex >= 0) {
                                    existingStyles[existingIndex] = { ...existingStyles[existingIndex], ...bubbleObj };
                                } else {
                                    existingStyles.push(bubbleObj);
                                }
                                
                                // Generate CSS for the bubble
                                dynamicCss += `
                                    .chat-bubble-${b.bubble_id} {
                                        border-image-source: url('${b.image_url}') !important;
                                        color: #${b.text_color || '000'} !important;
                                    }
                                    .chat-bubble-${b.bubble_id} .chat-bubble-pointer {
                                        background: url('${b.image_url}') !important; /* Adjust if pointer image logic is different */
                                    }
                                `;
                            });
                            
                            NitroConfiguration.setValue('chat.styles', existingStyles);
                            
                            // Inject CSS
                            if (dynamicCss.length > 0) {
                                const styleId = 'dynamic-chat-bubbles-style';
                                let styleEl = document.getElementById(styleId);
                                if (!styleEl) {
                                    styleEl = document.createElement('style');
                                    styleEl.id = styleId;
                                    document.head.appendChild(styleEl);
                                }
                                styleEl.innerHTML = dynamicCss;
                            }
                        }
                    })
                    .catch(err => console.error('Failed to load chat bubbles', err));
                
                return;
            case ConfigurationEvent.FAILED:
                setIsError(true);
                setMessage('Configuration Failed');
                return;
            case Nitro.WEBGL_UNAVAILABLE:
                setIsError(true);
                setMessage('WebGL Required');
                return;
            case Nitro.WEBGL_CONTEXT_LOST:
                setIsError(true);
                setMessage('WebGL Context Lost - Reloading');

                setTimeout(() => window.location.reload(), 1500);
                return;
            case NitroCommunicationDemoEvent.CONNECTION_HANDSHAKING:
                debugLog('NitroCommunicationDemoEvent.CONNECTION_HANDSHAKING');
                setPercent(prevValue => (prevValue + 20));
                return;
            case NitroCommunicationDemoEvent.CONNECTION_HANDSHAKE_FAILED:
                setIsError(true);
                setMessage('Handshake Failed');
                return;
            case NitroCommunicationDemoEvent.CONNECTION_AUTHENTICATED:
                debugLog('NitroCommunicationDemoEvent.CONNECTION_AUTHENTICATED');
                setPercent(prevValue => Math.min(100, prevValue + 20));

                try {
                    debugLog('Executing GetNitroInstance().init()...');
                    GetNitroInstance().init();
                    debugLog('GetNitroInstance().init() finished successfully');
                } catch (err: any) {
                    debugLog('GetNitroInstance().init() ERROR', { message: err?.message, stack: err?.stack });
                    console.error('Failed to init Nitro instance:', err);
                }

                if(LegacyExternalInterface.available) LegacyExternalInterface.call('legacyTrack', 'authentication', 'authok', []);

                // Non-invasive status poll to verify furnidata and room engine
                {
                    let ticks = 0;
                    const statusPoll = setInterval(() => {
                        try {
                            ticks++;
                            const nitro = GetNitroInstance();
                            const sdm = (nitro as any)?.sessionDataManager;
                            const re = (nitro as any)?.roomEngine;
                            const floorCount = sdm?._floorItems?.size || 0;
                            const furnitureReady = !!sdm?._furnitureReady;

                            debugLog('ENGINE_POLL', {
                                tick: ticks,
                                furnitureReady,
                                floorCount,
                                roomEngineReady: re?.ready
                            });

                            if (re && re.ready) {
                                debugLog('RoomEngine ready confirmed natively');
                                clearInterval(statusPoll);
                                setPercent(100);
                                setTimeout(() => setIsReady(true), 150);
                            } else if (re && furnitureReady && floorCount > 1000 && ticks >= 3) {
                                // Furnidata is fully downloaded and verified loaded (>1000 items)
                                debugLog(`Furniture data verified loaded (${floorCount} items). Finalizing RoomEngine initialization.`);
                                re.onRoomEngineInitalized(true);
                                clearInterval(statusPoll);
                                setPercent(100);
                                setTimeout(() => setIsReady(true), 150);
                            }
                        } catch (e: any) {
                            debugLog('ENGINE_POLL_ERROR', { message: e?.message });
                        }
                    }, 1000);

                    setTimeout(() => clearInterval(statusPoll), 30000);
                }
                return;
            case NitroCommunicationDemoEvent.CONNECTION_ERROR:
                debugLog('NitroCommunicationDemoEvent.CONNECTION_ERROR');
                setIsError(true);
                setMessage('Error de conexión con el hotel');
                return;
            case NitroCommunicationDemoEvent.CONNECTION_CLOSED:
                debugLog('NitroCommunicationDemoEvent.CONNECTION_CLOSED');
                setIsError(true);
                setMessage('Tu sesión ha finalizado o la conexión fue cerrada.');

                HabboWebTools.send(-1, 'client.init.handshake.fail');
                return;
            case RoomEngineEvent.ENGINE_INITIALIZED:
                debugLog('RoomEngineEvent.ENGINE_INITIALIZED received');
                setPercent(100);

                setTimeout(() => {
                    debugLog('Transitioning to isReady=true');
                    setIsReady(true);
                }, 200);
                return;
            case NitroLocalizationEvent.LOADED: {
                debugLog('NitroLocalizationEvent.LOADED');
                const assetUrls = GetConfiguration<string[]>('preload.assets.urls');
                const urls: string[] = [];

                if(assetUrls && assetUrls.length) for(const url of assetUrls) urls.push(NitroConfiguration.interpolate(url));

                const status = await GetAssetManager().downloadAssets(urls);
                
                if(status)
                {
                    // Fetch a fresh single-use SSO ticket so reloads / iframe refreshes never fail with expired token
                    try {
                        const ssoRes = await fetch('/api/sso/ticket', { credentials: 'same-origin' });
                        if (ssoRes.ok) {
                            const ssoData = await ssoRes.json();
                            if (ssoData && ssoData.ticket) {
                                debugLog('Acquired fresh SSO ticket from /api/sso/ticket');
                                NitroConfiguration.setValue('sso.ticket', ssoData.ticket);
                            }
                        }
                    } catch (e) {
                        debugLog('Could not refresh SSO ticket, using initial ticket', e);
                    }

                    debugLog('Assets downloaded successfully, calling GetCommunication().init()');
                    GetCommunication().init();

                    setPercent(prevValue => (prevValue + 20));
                }
                else
                {
                    debugLog('Assets download FAILED');
                    setIsError(true);
                    setMessage('Assets Failed');
                }
                return;
            }
        }
    }, []);

    useMainEvent(Nitro.WEBGL_UNAVAILABLE, handler);
    useMainEvent(Nitro.WEBGL_CONTEXT_LOST, handler);
    useMainEvent(NitroCommunicationDemoEvent.CONNECTION_HANDSHAKING, handler);
    useMainEvent(NitroCommunicationDemoEvent.CONNECTION_HANDSHAKE_FAILED, handler);
    useMainEvent(NitroCommunicationDemoEvent.CONNECTION_AUTHENTICATED, handler);
    useMainEvent(NitroCommunicationDemoEvent.CONNECTION_ERROR, handler);
    useMainEvent(NitroCommunicationDemoEvent.CONNECTION_CLOSED, handler);
    useRoomEngineEvent(RoomEngineEvent.ENGINE_INITIALIZED, handler);
    useLocalizationEvent(NitroLocalizationEvent.LOADED, handler);
    useConfigurationEvent(ConfigurationEvent.LOADED, handler);
    useConfigurationEvent(ConfigurationEvent.FAILED, handler);

    useEffect(() =>
    {
        GetNitroInstance().core.configuration.init();
    
        const resize = (event: UIEvent) => setImageRendering(!(window.devicePixelRatio % 1));

        window.addEventListener('resize', resize);

        resize(null);

        return () =>
        {
            window.removeEventListener('resize', resize);
        }
    }, []);
    
    return (
        <Base fit overflow="hidden" className={ imageRendering && 'image-rendering-pixelated' }>
            { (!isReady || isError) &&
                <LoadingView isError={ isError } message={ message } percent={ percent } /> }
            <TransitionAnimation type={ TransitionAnimationTypes.FADE_IN } inProp={ (isReady) }>
                <MainView />
            </TransitionAnimation>
            <Base id="draggable-windows-container" />
        </Base>
    );
}
