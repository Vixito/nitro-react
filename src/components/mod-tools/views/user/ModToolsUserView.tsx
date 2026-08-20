import { FriendlyTime, GetModeratorUserInfoMessageComposer, ModeratorUserInfoData, ModeratorUserInfoEvent } from '@nitrots/nitro-renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { CreateLinkEvent, LocalizeText, SendMessageComposer } from '../../../../api';
import { Button, Column, DraggableWindowPosition, Grid, NitroCardContentView, NitroCardHeaderView, NitroCardView } from '../../../../common';
import { useMessageEvent } from '../../../../hooks';
import { ModToolsUserModActionView } from './ModToolsUserModActionView';
import { ModToolsUserRoomVisitsView } from './ModToolsUserRoomVisitsView';
import { ModToolsUserSendMessageView } from './ModToolsUserSendMessageView';

interface ModToolsUserViewProps
{
    userId: number;
    onCloseClick: () => void;
}

const USER_INFO_FALLBACKS: Record<string, string> = {
    'modtools.userinfo.userName': 'Nombre de usuario',
    'modtools.userinfo.cfhCount': 'Peticiones de ayuda (CFH)',
    'modtools.userinfo.abusiveCfhCount': 'Peticiones CFH abusivas',
    'modtools.userinfo.cautionCount': 'Advertencias recibidas',
    'modtools.userinfo.banCount': 'Baneos recibidos',
    'modtools.userinfo.lastSanctionTime': 'Última sanción',
    'modtools.userinfo.tradingLockCount': 'Bloqueos de trade',
    'modtools.userinfo.tradingExpiryDate': 'Exp. bloqueo trade',
    'modtools.userinfo.minutesSinceLastLogin': 'Última conexión',
    'modtools.userinfo.lastPurchaseDate': 'Última compra',
    'modtools.userinfo.primaryEmailAddress': 'Correo electrónico',
    'modtools.userinfo.identityRelatedBanCount': 'Baneos por IP/ID',
    'modtools.userinfo.registrationAgeInMinutes': 'Fecha de registro',
    'modtools.userinfo.userClassification': 'Clasificación de usuario'
};

const getPropertyLabel = (key: string) =>
{
    const localized = LocalizeText(key);
    if(localized && (localized !== key)) return localized;
    return USER_INFO_FALLBACKS[key] || key;
};

export const ModToolsUserView: FC<ModToolsUserViewProps> = props =>
{
    const { onCloseClick = null, userId = null } = props;
    const [ userInfo, setUserInfo ] = useState<ModeratorUserInfoData>(null);
    const [ sendMessageVisible, setSendMessageVisible ] = useState(false);
    const [ modActionVisible, setModActionVisible ] = useState(false);
    const [ roomVisitsVisible, setRoomVisitsVisible ] = useState(false);

    const userProperties = useMemo(() =>
    {
        if(!userInfo) return null;

        return [
            {
                localeKey: 'modtools.userinfo.userName',
                value: userInfo.userName,
                showOnline: true
            },
            {
                localeKey: 'modtools.userinfo.cfhCount',
                value: userInfo.cfhCount.toString()
            },
            {
                localeKey: 'modtools.userinfo.abusiveCfhCount',
                value: userInfo.abusiveCfhCount.toString()
            },
            {
                localeKey: 'modtools.userinfo.cautionCount',
                value: userInfo.cautionCount.toString()
            },
            {
                localeKey: 'modtools.userinfo.banCount',
                value: userInfo.banCount.toString()
            },
            {
                localeKey: 'modtools.userinfo.lastSanctionTime',
                value: userInfo.lastSanctionTime || 'Ninguna'
            },
            {
                localeKey: 'modtools.userinfo.tradingLockCount',
                value: userInfo.tradingLockCount.toString()
            },
            {
                localeKey: 'modtools.userinfo.tradingExpiryDate',
                value: userInfo.tradingExpiryDate || 'Ninguna'
            },
            {
                localeKey: 'modtools.userinfo.minutesSinceLastLogin',
                value: FriendlyTime.format(userInfo.minutesSinceLastLogin * 60, '.ago', 2)
            },
            {
                localeKey: 'modtools.userinfo.lastPurchaseDate',
                value: userInfo.lastPurchaseDate || 'Ninguna'
            },
            {
                localeKey: 'modtools.userinfo.primaryEmailAddress',
                value: userInfo.primaryEmailAddress || 'No disponible'
            },
            {
                localeKey: 'modtools.userinfo.identityRelatedBanCount',
                value: userInfo.identityRelatedBanCount.toString()
            },
            {
                localeKey: 'modtools.userinfo.registrationAgeInMinutes',
                value: FriendlyTime.format(userInfo.registrationAgeInMinutes * 60, '.ago', 2)
            },
            {
                localeKey: 'modtools.userinfo.userClassification',
                value: userInfo.userClassification || 'Normal'
            }
        ];
    }, [ userInfo ]);

    useMessageEvent<ModeratorUserInfoEvent>(ModeratorUserInfoEvent, event =>
    {
        const parser = event.getParser();
    
        if(!parser || parser.data.userId !== userId) return;
    
        setUserInfo(parser.data);
    });

    useEffect(() =>
    {
        SendMessageComposer(new GetModeratorUserInfoMessageComposer(userId));
    }, [ userId ]);

    if(!userInfo) return null;

    const titleText = `Información del usuario: ${ userInfo.userName }`;

    return (
        <>
            <NitroCardView className="nitro-mod-tools-user" theme="primary-slim" windowPosition={ DraggableWindowPosition.TOP_LEFT }>
                <NitroCardHeaderView headerText={ titleText } onCloseClick={ () => onCloseClick() } />
                <NitroCardContentView className="text-black">
                    <Grid overflow="hidden">
                        <Column size={ 8 } overflow="auto">
                            <table className="table table-striped table-sm table-text-small text-black m-0">
                                <tbody>
                                    { userProperties.map( (property, index) =>
                                    {

                                        return (
                                            <tr key={ index }>
                                                <th scope="row">{ getPropertyLabel(property.localeKey) }</th>
                                                <td>
                                                    { property.value }
                                                    { property.showOnline &&
                                                    <i className={ `icon icon-pf-${ userInfo.online ? 'online' : 'offline' } ms-2` } /> }
                                                </td>
                                            </tr>
                                        );
                                    }) }
                                </tbody>
                            </table>
                        </Column>
                        <Column size={ 4 } gap={ 1 }>
                            <Button onClick={ event => CreateLinkEvent(`mod-tools/open-user-chatlog/${ userId }`) }>
                                Chat de Salas
                            </Button>
                            <Button onClick={ event => setSendMessageVisible(!sendMessageVisible) }>
                                Enviar Mensaje
                            </Button>
                            <Button onClick={ event => setRoomVisitsVisible(!roomVisitsVisible) }>
                                Visitas a Salas
                            </Button>
                            <Button onClick={ event => setModActionVisible(!modActionVisible) }>
                                Acción de Moderación
                            </Button>
                        </Column>
                    </Grid>
                </NitroCardContentView>
            </NitroCardView>
            { sendMessageVisible &&
                <ModToolsUserSendMessageView user={ { userId: userId, username: userInfo.userName } } onCloseClick={ () => setSendMessageVisible(false) } /> }
            { modActionVisible &&
                <ModToolsUserModActionView user={ { userId: userId, username: userInfo.userName } } onCloseClick={ () => setModActionVisible(false) } /> }
            { roomVisitsVisible &&
                <ModToolsUserRoomVisitsView userId={ userId } onCloseClick={ () => setRoomVisitsVisible(false) } /> }
        </>
    );
}
