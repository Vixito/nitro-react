import { AdjustmentFilter, ColorConverter, IRoomSession, NitroContainer, NitroSprite, NitroTexture, RoomBackgroundColorEvent, RoomEngineEvent, RoomEngineObjectEvent, RoomGeometry, RoomId, RoomObjectCategory, RoomObjectHSLColorEnabledEvent, RoomObjectOperationType, RoomObjectVariable, RoomSessionEvent, RoomVariableEnum, RoomVisualizationSettingsEvent, Vector3d } from '@nitrots/nitro-renderer';
import { useEffect, useRef, useState } from 'react';
import { useBetween } from 'use-between';
import { CanManipulateFurniture, DispatchUiEvent, GetNitroInstance, GetRoomEngine, GetRoomSession, InitializeRoomInstanceRenderingCanvas, IsFurnitureSelectionDisabled, ProcessRoomObjectOperation, RoomWidgetUpdateBackgroundColorPreviewEvent, RoomWidgetUpdateRoomObjectEvent, SetActiveRoomId, StartRoomSession } from '../../api';
import { useMessageEvent, useRoomEngineEvent, useRoomSessionManagerEvent, useUiEvent } from '../events';

const useRoomState = () =>
{
    const [ roomSession, setRoomSession ] = useState<IRoomSession>(null);
    const [ roomBackground, setRoomBackground ] = useState<NitroSprite>(null);
    const [ roomFilter, setRoomFilter ] = useState<AdjustmentFilter>(null);
    const roomMasterRef = useRef<NitroContainer>(null);
    const [ originalRoomBackgroundColor, setOriginalRoomBackgroundColor ] = useState(0);
    const visualizationSettingsRef = useRef<{ hideWalls: boolean, thicknessWall: number, thicknessFloor: number }>(null);

    const applySavedVisualization = (targetRoomId: number) =>
    {
        const vis = visualizationSettingsRef.current;
        if(!vis || targetRoomId <= 0) return;

        const roomEngine = GetRoomEngine();
        if(!roomEngine) return;

        const appliedVis = roomEngine.updateRoomInstancePlaneVisibility(targetRoomId, !vis.hideWalls, true);
        roomEngine.updateRoomInstancePlaneThickness(targetRoomId, vis.thicknessWall, vis.thicknessFloor);

        if(appliedVis)
        {
            try { GetNitroInstance()?.application?.render(); } catch {}
        }
    };

    useMessageEvent<RoomVisualizationSettingsEvent>(RoomVisualizationSettingsEvent, event =>
    {
        const parser = event.getParser();
        if(!parser) return;

        visualizationSettingsRef.current = {
            hideWalls: Boolean(parser.hideWalls),
            thicknessWall: parser.thicknessWall,
            thicknessFloor: parser.thicknessFloor
        };

        const activeRoomId = GetRoomSession()?.roomId || GetRoomEngine()?.activeRoomId || -1;
        if(activeRoomId > 0) applySavedVisualization(activeRoomId);
    });

    const updateRoomBackgroundColor = (hue: number, saturation: number, lightness: number, original: boolean = false) =>
    {
        if(!roomBackground) return;

        const newColor = ColorConverter.hslToRGB(((((hue & 0xFF) << 16) + ((saturation & 0xFF) << 8)) + (lightness & 0xFF)));

        if(original) setOriginalRoomBackgroundColor(newColor);

        if(!hue && !saturation && !lightness)
        {
            roomBackground.tint = 0;
        }
        else
        {
            roomBackground.tint = newColor;
        }
    }

    const updateRoomFilter = (color: number) =>
    {
        if(!roomFilter) return;

        const r = ((color >> 16) & 0xFF);
        const g = ((color >> 8) & 0xFF);
        const b = (color & 0xFF);

        roomFilter.red = (r / 255);
        roomFilter.green = (g / 255);
        roomFilter.blue = (b / 255);

        const master = roomMasterRef.current;
        if(master)
        {
            const isNeutral = (r >= 254 && g >= 254 && b >= 254);
            master.filters = isNeutral ? null : [ roomFilter ];
        }
    }

    useUiEvent<RoomWidgetUpdateBackgroundColorPreviewEvent>(RoomWidgetUpdateBackgroundColorPreviewEvent.PREVIEW, event => updateRoomBackgroundColor(event.hue, event.saturation, event.lightness));

    useUiEvent<RoomWidgetUpdateBackgroundColorPreviewEvent>(RoomWidgetUpdateBackgroundColorPreviewEvent.CLEAR_PREVIEW, event =>
    {
        if(!roomBackground) return;

        roomBackground.tint = originalRoomBackgroundColor;
    });

    useRoomEngineEvent<RoomObjectHSLColorEnabledEvent>(RoomObjectHSLColorEnabledEvent.ROOM_BACKGROUND_COLOR, event =>
    {
        if(RoomId.isRoomPreviewerId(event.roomId)) return;

        if(event.enable) updateRoomBackgroundColor(event.hue, event.saturation, event.lightness, true);
        else updateRoomBackgroundColor(0, 0, 0, true);
    });

    useRoomEngineEvent<RoomBackgroundColorEvent>(RoomBackgroundColorEvent.ROOM_COLOR, event =>
    {
        if(RoomId.isRoomPreviewerId(event.roomId)) return;

        let color = 0x000000;
        let brightness = 0xFF;

        if(!event.bgOnly)
        {
            color = event.color;
            brightness = event.brightness;
        }

        updateRoomFilter(ColorConverter.hslToRGB(((ColorConverter.rgbToHSL(color) & 0xFFFF00) + brightness)));
    });

    useRoomEngineEvent<RoomEngineEvent>([
        RoomEngineEvent.INITIALIZED,
        RoomEngineEvent.DISPOSED
    ], event =>
    {
        if(RoomId.isRoomPreviewerId(event.roomId)) return;

        const session = GetRoomSession();

        if(!session) return;

        switch(event.type)
        {
            case RoomEngineEvent.INITIALIZED:
                SetActiveRoomId(event.roomId);
                setRoomSession(session);
                applySavedVisualization(event.roomId);
                return;
            case RoomEngineEvent.DISPOSED:
                visualizationSettingsRef.current = null;
                setRoomSession(null);
                return;
        }
    });

    useRoomSessionManagerEvent<RoomSessionEvent>([
        RoomSessionEvent.CREATED,
        RoomSessionEvent.ENDED
    ], event =>
    {
        switch(event.type)
        {
            case RoomSessionEvent.CREATED:
                StartRoomSession(event.session);
                return;
            case RoomSessionEvent.ENDED:
                setRoomSession(null);
                return;
        }
    });

    useRoomEngineEvent<RoomEngineObjectEvent>([
        RoomEngineObjectEvent.SELECTED,
        RoomEngineObjectEvent.DESELECTED,
        RoomEngineObjectEvent.ADDED,
        RoomEngineObjectEvent.REMOVED,
        RoomEngineObjectEvent.PLACED,
        RoomEngineObjectEvent.REQUEST_MOVE,
        RoomEngineObjectEvent.REQUEST_ROTATE,
        RoomEngineObjectEvent.MOUSE_ENTER,
        RoomEngineObjectEvent.MOUSE_LEAVE,
        RoomEngineObjectEvent.DOUBLE_CLICK
    ], event =>
    {
        if(RoomId.isRoomPreviewerId(event.roomId)) return;

        let updateEvent: RoomWidgetUpdateRoomObjectEvent = null;

        switch(event.type)
        {
            case RoomEngineObjectEvent.SELECTED:
                if(!IsFurnitureSelectionDisabled(event)) updateEvent = new RoomWidgetUpdateRoomObjectEvent(RoomWidgetUpdateRoomObjectEvent.OBJECT_SELECTED, event.objectId, event.category, event.roomId);
                break;
            case RoomEngineObjectEvent.DESELECTED:
                updateEvent = new RoomWidgetUpdateRoomObjectEvent(RoomWidgetUpdateRoomObjectEvent.OBJECT_DESELECTED, event.objectId, event.category, event.roomId);
                break;
            case RoomEngineObjectEvent.ADDED: {
                let addedEventType: string = null;

                switch(event.category)
                {
                    case RoomObjectCategory.FLOOR:
                    case RoomObjectCategory.WALL:
                        addedEventType = RoomWidgetUpdateRoomObjectEvent.FURNI_ADDED;
                        break;
                    case RoomObjectCategory.UNIT:
                        addedEventType = RoomWidgetUpdateRoomObjectEvent.USER_ADDED;
                        break;
                }

                if(addedEventType) updateEvent = new RoomWidgetUpdateRoomObjectEvent(addedEventType, event.objectId, event.category, event.roomId);
                break;
            }
            case RoomEngineObjectEvent.REMOVED: {
                let removedEventType: string = null;

                switch(event.category)
                {
                    case RoomObjectCategory.FLOOR:
                    case RoomObjectCategory.WALL:
                        removedEventType = RoomWidgetUpdateRoomObjectEvent.FURNI_REMOVED;
                        break;
                    case RoomObjectCategory.UNIT:
                        removedEventType = RoomWidgetUpdateRoomObjectEvent.USER_REMOVED;
                        break;
                }

                if(removedEventType) updateEvent = new RoomWidgetUpdateRoomObjectEvent(removedEventType, event.objectId, event.category, event.roomId);
                break;
            }
            case RoomEngineObjectEvent.REQUEST_MOVE:
                if(CanManipulateFurniture(roomSession, event.objectId, event.category)) ProcessRoomObjectOperation(event.objectId, event.category, RoomObjectOperationType.OBJECT_MOVE);
                break;
            case RoomEngineObjectEvent.REQUEST_ROTATE:
                if(CanManipulateFurniture(roomSession, event.objectId, event.category))
                {
                    const roomObj = GetRoomEngine().getRoomObject(roomSession.roomId, event.objectId, event.category);
                    let nextDirAngle: number | null = null;
                    if(roomObj && event.category === RoomObjectCategory.FLOOR)
                    {
                        const allowed = roomObj.model?.getValue<number[]>(RoomObjectVariable.FURNITURE_ALLOWED_DIRECTIONS);
                        if(Array.isArray(allowed) && allowed.length > 1)
                        {
                            const cur = ((Math.round(roomObj.getDirection()?.x || 0) % 360) + 360) % 360;
                            const idx = allowed.indexOf(cur);
                            nextDirAngle = allowed[(idx >= 0 ? idx + 1 : 0) % allowed.length];
                        }
                    }
                    ProcessRoomObjectOperation(event.objectId, event.category, RoomObjectOperationType.OBJECT_ROTATE_POSITIVE);
                    if(roomObj && nextDirAngle !== null) roomObj.setDirection(new Vector3d(nextDirAngle, 0, 0));
                }
                break;
            case RoomEngineObjectEvent.MOUSE_ENTER:
                updateEvent = new RoomWidgetUpdateRoomObjectEvent(RoomWidgetUpdateRoomObjectEvent.OBJECT_ROLL_OVER, event.objectId, event.category, event.roomId);
                break;
            case RoomEngineObjectEvent.MOUSE_LEAVE:
                updateEvent = new RoomWidgetUpdateRoomObjectEvent(RoomWidgetUpdateRoomObjectEvent.OBJECT_ROLL_OUT, event.objectId, event.category, event.roomId);
                break;
            case RoomEngineObjectEvent.DOUBLE_CLICK:
                updateEvent = new RoomWidgetUpdateRoomObjectEvent(RoomWidgetUpdateRoomObjectEvent.OBJECT_DOUBLE_CLICKED, event.objectId, event.category, event.roomId);
                break;
        }

        if(updateEvent) DispatchUiEvent(updateEvent);
    });

    useEffect(() =>
    {
        if(!roomSession) return;

        const nitroInstance = GetNitroInstance();
        const roomEngine = GetRoomEngine();
        const roomId = roomSession.roomId;
        const canvasId = 1;
        const width = Math.floor(window.innerWidth);
        const height = Math.floor(window.innerHeight);
        const renderer = nitroInstance.application.renderer;

        if(renderer)
        {
            renderer.view.style.width = `${ width }px`;
            renderer.view.style.height = `${ height }px`;
            renderer.resolution = window.devicePixelRatio;
            renderer.resize(width, height);
        }

        const displayObject = roomEngine.getRoomInstanceDisplay(roomId, canvasId, width, height, RoomGeometry.SCALE_ZOOMED_IN);
        const canvas = GetRoomEngine().getRoomInstanceRenderingCanvas(roomId, canvasId);

        if(!displayObject || !canvas) return;

        const applyEraScale = (targetScale?: number) =>
        {
            if(!roomSession) return;
            const scale = (targetScale !== undefined) ? targetScale : 1.0;
            roomEngine.setRoomInstanceRenderingCanvasScale(roomId, canvasId, scale, null, null, true);
        };

        applyEraScale();
        const scaleTimer = setTimeout(() => applyEraScale(), 150);

        const handleEraChange = (event: CustomEvent<string>) =>
        {
            const targetScale = 1.0;
            applyEraScale(targetScale);
        };

        window.addEventListener('nitro-era-changed' as any, handleEraChange);

        const background = new NitroSprite(NitroTexture.WHITE);
        const filter = new AdjustmentFilter();
        const master = (canvas.master as NitroContainer);

        background.tint = document.body.classList.contains('is-mobile-ui') ? 0x0e4d6c : 0;
        background.width = width;
        background.height = height;

        master.addChildAt(background, 0);
        // Solo activar el shader AdjustmentFilter cuando el regulador de luz realmente atenúa la sala (evita copia WebGL innecesaria cada frame)
        master.filters = null;
        roomMasterRef.current = master;

        setRoomBackground(background);
        setRoomFilter(filter);

        const geometry = (roomEngine.getRoomInstanceGeometry(roomId, canvasId) as RoomGeometry);

        if(geometry)
        {
            const minX = (roomEngine.getRoomInstanceVariable<number>(roomId, RoomVariableEnum.ROOM_MIN_X) || 0);
            const maxX = (roomEngine.getRoomInstanceVariable<number>(roomId, RoomVariableEnum.ROOM_MAX_X) || 0);
            const minY = (roomEngine.getRoomInstanceVariable<number>(roomId, RoomVariableEnum.ROOM_MIN_Y) || 0);
            const maxY = (roomEngine.getRoomInstanceVariable<number>(roomId, RoomVariableEnum.ROOM_MAX_Y) || 0);

            let x = ((minX + maxX) / 2);
            let y = ((minY + maxY) / 2);

            const offset = 20;

            x = (x + (offset - 1));
            y = (y + (offset - 1));

            const z = (Math.sqrt(((offset * offset) + (offset * offset))) * Math.tan(((30 / 180) * Math.PI)));

            geometry.location = new Vector3d(x, y, z);
        }

        const stage = nitroInstance.application.stage;

        if(!stage) return;

        stage.addChild(displayObject);

        SetActiveRoomId(roomSession.roomId);
        applySavedVisualization(roomId);
        const visTimer1 = setTimeout(() => applySavedVisualization(roomId), 150);
        const visTimer2 = setTimeout(() => applySavedVisualization(roomId), 450);

        const resize = (event: UIEvent) =>
        {
            const width = Math.floor(window.innerWidth);
            const height = Math.floor(window.innerHeight);

            renderer.view.style.width = `${ width }px`;
            renderer.view.style.height = `${ height }px`;
            renderer.resolution = window.devicePixelRatio;
            renderer.resize(width, height);

            background.width = width;
            background.height = height;

            InitializeRoomInstanceRenderingCanvas(width, height, 1);

            nitroInstance.application.render();
        }

        window.addEventListener('resize', resize);

        return () =>
        {
            clearTimeout(scaleTimer);
            clearTimeout(visTimer1);
            clearTimeout(visTimer2);
            setRoomBackground(null);
            setRoomFilter(null);
            setOriginalRoomBackgroundColor(0);

            window.removeEventListener('resize', resize);
            window.removeEventListener('nitro-era-changed' as any, handleEraChange);
        }
    }, [ roomSession ]);

    return { roomSession };
}

export const useRoom = () => useBetween(useRoomState);
