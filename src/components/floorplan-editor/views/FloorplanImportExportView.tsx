import { UpdateFloorPropertiesMessageComposer } from '@nitrots/nitro-renderer';
import { FC, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../api';
import { Button, Flex, NitroCardContentView, NitroCardHeaderView, NitroCardView } from '../../../common';
import { UseMountEffect } from '../../../hooks';
import { ConvertTileMapToString } from '../common/ConvertMapToString';
import { convertNumbersForSaving } from '../common/Utils';
import { useFloorplanEditorContext } from '../FloorplanEditorContext';

interface FloorplanImportExportViewProps
{
    onCloseClick(): void;
}

export const FloorplanImportExportView: FC<FloorplanImportExportViewProps> = props =>
{
    const { onCloseClick = null } = props;
    const [ map, setMap ] = useState<string>('');
    const { originalFloorplanSettings = null } = useFloorplanEditorContext();

    const saveFloorChanges = () =>
    {
        const mapRows = map.replace(/\r\n|\n/g, '\r').split('\r');
        let doorX = originalFloorplanSettings.entryPoint[0];
        let doorY = originalFloorplanSettings.entryPoint[1];

        if(doorY < 0 || doorY >= mapRows.length || doorX < 0 || doorX >= mapRows[doorY].length || mapRows[doorY].charAt(doorX).toLowerCase() === 'x')
        {
            let found = false;
            for(let y = 0; y < mapRows.length; y++)
            {
                for(let x = 0; x < mapRows[y].length; x++)
                {
                    if(mapRows[y].charAt(x).toLowerCase() !== 'x')
                    {
                        doorX = x;
                        doorY = y;
                        found = true;
                        break;
                    }
                }
                if(found) break;
            }
        }

        SendMessageComposer(new UpdateFloorPropertiesMessageComposer(
            mapRows.join('\r'),
            doorX,
            doorY,
            originalFloorplanSettings.entryPointDir,
            convertNumbersForSaving(originalFloorplanSettings.thicknessWall),
            convertNumbersForSaving(originalFloorplanSettings.thicknessFloor),
            originalFloorplanSettings.wallHeight - 1
        ));
    }

    UseMountEffect(() =>
    {
        setMap(ConvertTileMapToString(originalFloorplanSettings.tilemap));  
    });

    return (
        <NitroCardView theme="primary-slim" className="floorplan-import-export">
            <NitroCardHeaderView headerText={ LocalizeText('floor.plan.editor.import.export') } onCloseClick={ onCloseClick } />
            <NitroCardContentView>
                <textarea className="h-100" value={ map } onChange={ event => setMap(event.target.value) } />
                <Flex justifyContent="between">
                    <Button onClick={ event => setMap(ConvertTileMapToString(originalFloorplanSettings.tilemap)) }>
                        { LocalizeText('floor.plan.editor.revert.to.last.received.map') }
                    </Button>
                    <Button onClick={ saveFloorChanges }>
                        { LocalizeText('floor.plan.editor.save') }
                    </Button>
                </Flex>
            </NitroCardContentView>
        </NitroCardView>
    );
}
