import { ConfigurationEvent, GetAssetManager, HabboWebTools, LegacyExternalInterface, Nitro, NitroCommunicationDemoEvent, NitroConfiguration, NitroEvent, NitroLocalizationEvent, NitroVersion, RoomEngineEvent } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { GetCommunication, GetConfiguration, GetNitroInstance, GetUIVersion } from './api';
import { Base, TransitionAnimation, TransitionAnimationTypes } from './common';
import { LoadingView } from './components/loading/LoadingView';
import { MainView } from './components/main/MainView';
import { useConfigurationEvent, useLocalizationEvent, useMainEvent, useRoomEngineEvent } from './hooks';

NitroVersion.UI_VERSION = GetUIVersion();

export const App: FC<{}> = props =>
{
    const [ isReady, setIsReady ] = useState(false);
    const [ isError, setIsError ] = useState(false);
    const [ message, setMessage ] = useState('Getting Ready');
    const [ percent, setPercent ] = useState(0);
    const [ imageRendering, setImageRendering ] = useState<boolean>(true);

    if(!GetNitroInstance())
    {
        //@ts-ignore
        if(!NitroConfig) throw new Error('NitroConfig is not defined!');

        Nitro.bootstrap();
    }

    const handler = useCallback(async (event: NitroEvent) =>
    {
        switch(event.type)
        {
            case ConfigurationEvent.LOADED:
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
                                    isHcOnly: !!b.is_vip,
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
                setPercent(prevValue => (prevValue + 20));
                return;
            case NitroCommunicationDemoEvent.CONNECTION_HANDSHAKE_FAILED:
                setIsError(true);
                setMessage('Handshake Failed');
                return;
            case NitroCommunicationDemoEvent.CONNECTION_AUTHENTICATED:
                setPercent(prevValue => (prevValue + 20));

                GetNitroInstance().init();

                if(LegacyExternalInterface.available) LegacyExternalInterface.call('legacyTrack', 'authentication', 'authok', []);
                return;
            case NitroCommunicationDemoEvent.CONNECTION_ERROR:
                setIsError(true);
                setMessage('Connection Error');
                return;
            case NitroCommunicationDemoEvent.CONNECTION_CLOSED:
                //if(GetNitroInstance().roomEngine) GetNitroInstance().roomEngine.dispose();
                //setIsError(true);
                setMessage('Connection Error');

                HabboWebTools.send(-1, 'client.init.handshake.fail');
                return;
            case RoomEngineEvent.ENGINE_INITIALIZED:
                setPercent(prevValue => (prevValue + 20));

                setTimeout(() => setIsReady(true), 300);
                return;
            case NitroLocalizationEvent.LOADED: {
                const assetUrls = GetConfiguration<string[]>('preload.assets.urls');
                const urls: string[] = [];

                if(assetUrls && assetUrls.length) for(const url of assetUrls) urls.push(NitroConfiguration.interpolate(url));

                const status = await GetAssetManager().downloadAssets(urls);
                
                if(status)
                {
                    GetCommunication().init();

                    setPercent(prevValue => (prevValue + 20))
                }
                else
                {
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
