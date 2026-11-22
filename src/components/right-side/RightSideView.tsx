import { FC } from 'react';
import { Column } from '../../common';
import { useGameCenter } from '../../hooks';
import { OfferView } from '../catalog/views/targeted-offer/OfferView';
import { GroupRoomInformationView } from '../groups/views/GroupRoomInformationView';
import { NotificationCenterView } from '../notification-center/NotificationCenterView';
import { PurseView } from '../purse/PurseView';
import { MysteryBoxExtensionView } from '../room/widgets/mysterybox/MysteryBoxExtensionView';
import { RoomPromotesWidgetView } from '../room/widgets/room-promotes/RoomPromotesWidgetView';

export const RightSideView: FC<{}> = props =>
{
    const { isVisible: isGameCenterVisible } = useGameCenter();

    return (
        <div className={ `nitro-right-side${ isGameCenterVisible ? ' is-game-center-open' : '' }` }>
            <Column position="relative" gap={ 1 }>
                <PurseView />
                <GroupRoomInformationView />
                <MysteryBoxExtensionView />
                <OfferView/>
                <RoomPromotesWidgetView />
                <NotificationCenterView />
            </Column>
        </div>
    );
}
