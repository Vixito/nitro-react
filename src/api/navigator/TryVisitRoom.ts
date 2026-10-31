import { GetGuestRoomMessageComposer } from '@nitrots/nitro-renderer';
import { SendMessageComposer } from '../nitro';

export function TryVisitRoom(roomId: number): void
{
    const currentEra = localStorage.getItem('habbten_era') || 'modern';
    if(roomId === 100 && currentEra !== 'shockwave2006')
    {
        window.alert('¡Acceso restringido!\n\nEl trampolín y las piscinas del Habbo Lido son exclusivos de la era Shockwave (2006).\n\nPara ingresar, abre "Modifica los Ajustes" en la barra inferior y selecciona la Versión Shockwave (2006).');
        return;
    }

    SendMessageComposer(new GetGuestRoomMessageComposer(roomId, false, true));
}
