import { IMessageComposer } from '@nitrots/nitro-renderer';
import { GetConnection } from '../nitro/GetConnection';

let registered = false;

export const ensureClickFurniComposerRegistered = () =>
{
    if(registered) return;
    const connection = GetConnection();
    if(connection)
    {
        try
        {
            connection.registerMessages({
                events: new Map(),
                composers: new Map([[ 2998, RoomUserClickFurniComposer ]])
            });
            registered = true;
        }
        catch(e)
        {
            // retry next time
        }
    }
};

export class RoomUserClickFurniComposer implements IMessageComposer<[number]>
{
    private _data: [number];

    constructor(objectId: number)
    {
        ensureClickFurniComposerRegistered();
        this._data = [ objectId ];
    }

    public getMessageArray(): [number]
    {
        ensureClickFurniComposerRegistered();
        return this._data;
    }

    public dispose(): void
    {
        return;
    }
}
