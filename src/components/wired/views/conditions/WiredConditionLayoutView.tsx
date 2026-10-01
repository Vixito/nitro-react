import { WiredConditionlayout } from '../../../../api';
import { WiredConditionActorHasHandItemView } from './WiredConditionActorHasHandItem';
import { WiredConditionVariableValueMatchView } from './WiredConditionVariableValueMatchView';
import { WiredConditionActorIsGroupMemberView } from './WiredConditionActorIsGroupMemberView';
import { WiredConditionActorIsOnFurniView } from './WiredConditionActorIsOnFurniView';
import { WiredConditionActorIsTeamMemberView } from './WiredConditionActorIsTeamMemberView';
import { WiredConditionActorIsWearingBadgeView } from './WiredConditionActorIsWearingBadgeView';
import { WiredConditionActorIsWearingEffectView } from './WiredConditionActorIsWearingEffectView';
import { WiredConditionDateRangeView } from './WiredConditionDateRangeView';
import { WiredConditionFurniHasAvatarOnView } from './WiredConditionFurniHasAvatarOnView';
import { WiredConditionFurniHasFurniOnView } from './WiredConditionFurniHasFurniOnView';
import { WiredConditionFurniHasNotFurniOnView } from './WiredConditionFurniHasNotFurniOnView';
import { WiredConditionFurniIsOfTypeView } from './WiredConditionFurniIsOfTypeView';
import { WiredConditionFurniMatchesSnapshotView } from './WiredConditionFurniMatchesSnapshotView';
import { WiredConditionTimeElapsedLessView } from './WiredConditionTimeElapsedLessView';
import { WiredConditionTimeElapsedMoreView } from './WiredConditionTimeElapsedMoreView';
import { WiredConditionUserCountInRoomView } from './WiredConditionUserCountInRoomView';
import { WiredConditionUserPerformsActionView } from './WiredConditionUserPerformsActionView';
import { WiredConditionSlcQuantityView } from './WiredConditionSlcQuantityView';
import { WiredConditionHasVariableView } from './WiredConditionHasVariableView';
import { WiredConditionVariableAgeView } from './WiredConditionVariableAgeView';
import { WiredConditionSelectorVariableView } from './WiredConditionSelectorVariableView';
import { WiredConditionSelectorRemoteStackView } from './WiredConditionSelectorRemoteStackView';
import { WiredConditionFilterVariableView } from './WiredConditionFilterVariableView';
import { WiredConditionTextConnectorView } from './WiredConditionTextConnectorView';
import { WiredConditionSelectorUsersByNameView } from './WiredConditionSelectorUsersByNameView';
import { WiredConditionSelectorUsersByTypeView } from './WiredConditionSelectorUsersByTypeView';
import { WiredConditionSelectorAltitudeView } from './WiredConditionSelectorAltitudeView';
import { WiredConditionSelectorNeighborhoodView } from './WiredConditionSelectorNeighborhoodView';
import { WiredConditionSelectorSignalView } from './WiredConditionSelectorSignalView';
import { WiredConditionFilterCountView } from './WiredConditionFilterCountView';
import { WiredConditionSelectorFurniPicksView } from './WiredConditionSelectorFurniPicksView';

export const WiredConditionLayoutView = (code: number) =>
{
    switch(code)
    {
        case WiredConditionlayout.ACTOR_HAS_HANDITEM:
        case WiredConditionlayout.SELECTOR_USERS_HANDITEM:
            return <WiredConditionActorHasHandItemView />;
        case WiredConditionlayout.ACTOR_IS_GROUP_MEMBER:
        case WiredConditionlayout.NOT_ACTOR_IN_GROUP:
        case WiredConditionlayout.SELECTOR_USERS_GROUP:
            return <WiredConditionActorIsGroupMemberView />;
        case WiredConditionlayout.ACTOR_IS_ON_FURNI:
        case WiredConditionlayout.NOT_ACTOR_ON_FURNI:
        case WiredConditionlayout.SELECTOR_USERS_ONFURNI:
            return <WiredConditionActorIsOnFurniView />;
        case WiredConditionlayout.ACTOR_IS_IN_TEAM:
        case WiredConditionlayout.NOT_ACTOR_IN_TEAM:
        case WiredConditionlayout.SELECTOR_USERS_TEAM:
            return <WiredConditionActorIsTeamMemberView />;
        case WiredConditionlayout.ACTOR_IS_WEARING_BADGE:
        case WiredConditionlayout.NOT_ACTOR_WEARS_BADGE:
            return <WiredConditionActorIsWearingBadgeView />;
        case WiredConditionlayout.ACTOR_IS_WEARING_EFFECT:
        case WiredConditionlayout.NOT_ACTOR_WEARING_EFFECT:
            return <WiredConditionActorIsWearingEffectView />;
        case WiredConditionlayout.DATE_RANGE_ACTIVE:
            return <WiredConditionDateRangeView />;
        case WiredConditionlayout.FURNIS_HAVE_AVATARS:
        case WiredConditionlayout.FURNI_NOT_HAVE_HABBO:
            return <WiredConditionFurniHasAvatarOnView />;
        case WiredConditionlayout.HAS_STACKED_FURNIS:
        case WiredConditionlayout.SELECTOR_FURNI_ONFURNI:
            return <WiredConditionFurniHasFurniOnView />;
        case WiredConditionlayout.NOT_HAS_STACKED_FURNIS:
            return <WiredConditionFurniHasNotFurniOnView />;
        case WiredConditionlayout.STUFF_TYPE_MATCHES:
        case WiredConditionlayout.NOT_FURNI_IS_OF_TYPE:
        case WiredConditionlayout.SELECTOR_FURNI_BYTYPE:
            return <WiredConditionFurniIsOfTypeView />;
        case WiredConditionlayout.STATES_MATCH:
        case WiredConditionlayout.NOT_STATES_MATCH:
            return <WiredConditionFurniMatchesSnapshotView />;
        case WiredConditionlayout.TIME_ELAPSED_LESS:
            return <WiredConditionTimeElapsedLessView />;
        case WiredConditionlayout.TIME_ELAPSED_MORE:
            return <WiredConditionTimeElapsedMoreView />;
        case WiredConditionlayout.USER_COUNT_IN:
        case WiredConditionlayout.NOT_USER_COUNT_IN:
            return <WiredConditionUserCountInRoomView />;
        case WiredConditionlayout.VARIABLE_VALUE_MATCH:
            return <WiredConditionVariableValueMatchView />;
        case WiredConditionlayout.USER_PERFORMS_ACTION:
        case WiredConditionlayout.NOT_USER_PERFORMS_ACTION:
        case WiredConditionlayout.SELECTOR_USERS_BYACTION:
            return <WiredConditionUserPerformsActionView />;
        case WiredConditionlayout.SLC_QUANTITY:
            return <WiredConditionSlcQuantityView />;
        case WiredConditionlayout.HAS_VARIABLE:
            return <WiredConditionHasVariableView />;
        case WiredConditionlayout.VARIABLE_AGE_MATCH:
            return <WiredConditionVariableAgeView />;
        case WiredConditionlayout.SELECTOR_VARIABLE:
            return <WiredConditionSelectorVariableView />;
        case WiredConditionlayout.SELECTOR_REMOTE:
            return <WiredConditionSelectorRemoteStackView />;
        case WiredConditionlayout.FILTER_VARIABLE:
            return <WiredConditionFilterVariableView />;
        case WiredConditionlayout.TEXT_CONNECTOR:
            return <WiredConditionTextConnectorView />;
        case WiredConditionlayout.SELECTOR_USERS_BYNAME:
            return <WiredConditionSelectorUsersByNameView />;
        case WiredConditionlayout.SELECTOR_USERS_BYTYPE:
            return <WiredConditionSelectorUsersByTypeView />;
        case WiredConditionlayout.SELECTOR_FURNI_PICKS:
            return <WiredConditionSelectorFurniPicksView isArea={ false } />;
        case WiredConditionlayout.SELECTOR_AREA:
            return <WiredConditionSelectorFurniPicksView isArea={ true } />;
        case WiredConditionlayout.SELECTOR_FURNI_ALTITUDE:
            return <WiredConditionSelectorAltitudeView />;
        case WiredConditionlayout.SELECTOR_NEIGHBORHOOD:
            return <WiredConditionSelectorNeighborhoodView />;
        case WiredConditionlayout.SELECTOR_SIGNAL:
            return <WiredConditionSelectorSignalView />;
        case WiredConditionlayout.FILTER_COUNT:
            return <WiredConditionFilterCountView />;
    }

    return null;
}

