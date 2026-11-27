import { FC, useState } from 'react';
import { dispatchRpFeedback, isRoleplayMode, rpPost } from './RoleplayService';

interface RpAvatarQuickActionsProps
{
    targetName: string;
    compact?: boolean;
}

export const RpAvatarQuickActions: FC<RpAvatarQuickActionsProps> = ({ targetName, compact = false }) =>
{
    const [ busy, setBusy ] = useState(false);

    if(!isRoleplayMode() || !targetName) return null;

    const trigger = async (path: string, body: Record<string, any>) =>
    {
        if(busy) return;
        setBusy(true);
        try
        {
            const res = await rpPost(path, body);
            dispatchRpFeedback({
                ok: Boolean(res?.success),
                message: res?.success ? (res.message || 'Acción RP ejecutada.') : (res?.error || 'No se pudo ejecutar la acción RP.'),
                state: res?.state || null
            });
        }
        catch (_)
        {
            dispatchRpFeedback({ ok: false, message: 'Error de conexión con el servidor RP.' });
        }
        finally
        {
            setBusy(false);
        }
    };

    return (
        <div className={ `rp-infostand-actions ${ compact ? 'is-compact' : '' }` }>
            <div className="rp-infostand-actions-title">Acciones RP · { targetName }</div>
            <div className="rp-infostand-actions-grid">
                <button type="button" className="rp-qa-btn is-danger" disabled={ busy } onClick={ () => trigger('/combat/attack', { target: targetName }) }>
                    Atacar
                </button>
                <button type="button" className="rp-qa-btn is-police" disabled={ busy } onClick={ () => trigger('/police/action', { action: 'cuff', target: targetName }) }>
                    Esposar
                </button>
                <button type="button" className="rp-qa-btn is-police" disabled={ busy } onClick={ () => trigger('/police/action', { action: 'arrest', target: targetName, reason: 'Arresto en sala' }) }>
                    Arrestar
                </button>
                <button type="button" className="rp-qa-btn is-medic" disabled={ busy } onClick={ () => trigger('/medic/heal', { target: targetName }) }>
                    Curar
                </button>
                <button type="button" className="rp-qa-btn is-cash" disabled={ busy } onClick={ () => trigger('/bank', { action: 'pay', amount: 100, targetUsername: targetName }) }>
                    Pagar $100
                </button>
            </div>
        </div>
    );
};
