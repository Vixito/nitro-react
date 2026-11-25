import BattleBallIconImg from '../../assets/images/gamecenter/battleball/bb_presence_icon.png';
import FastFoodIconImg from '../../assets/images/gamecenter/fastfood/ff_food_burger.png';
import SnowballIconImg from '../../assets/images/gamecenter/snowstorm/thumbnails_Extra_ss_snowball.png';
import WobbleSquabbleIconImg from '../../assets/images/gamecenter/wobblesquabble/ws_presence_icon.png';
import { ActiveGamePresence } from '../../hooks';

export interface GamePresenceMeta
{
    key: string;
    label: string;
    icon: string;
    cardClass: string;
    badgeBg: string;
    badgeBorder: string;
    bandBg: string;
    bandBorder: string;
    subColor: string;
}

const GAME_META_MAP: Record<string, GamePresenceMeta> = {
    snowstorm: {
        key: 'snowstorm',
        label: 'SNOW STORM',
        icon: SnowballIconImg,
        cardClass: 'is-game-snowstorm',
        badgeBg: '#485420',
        badgeBorder: '#353f16',
        bandBg: '#485420',
        bandBorder: '#353f16',
        subColor: '#eef5d8'
    },
    battleball: {
        key: 'battleball',
        label: 'BATTLE BALL',
        icon: BattleBallIconImg,
        cardClass: 'is-game-battleball',
        badgeBg: '#9a3412',
        badgeBorder: '#6b220b',
        bandBg: '#5e3516',
        bandBorder: '#3f210c',
        subColor: '#fde8d0'
    },
    fastfood: {
        key: 'fastfood',
        label: 'FAST FOOD',
        icon: FastFoodIconImg,
        cardClass: 'is-game-fastfood',
        badgeBg: '#991b1b',
        badgeBorder: '#691010',
        bandBg: '#66241b',
        bandBorder: '#44150f',
        subColor: '#ffe0d8'
    },
    wobblesquabble: {
        key: 'wobblesquabble',
        label: 'WOBBLE SQUABBLE',
        icon: WobbleSquabbleIconImg,
        cardClass: 'is-game-wobblesquabble',
        badgeBg: '#0369a1',
        badgeBorder: '#0c4a6e',
        bandBg: '#1c4d5e',
        bandBorder: '#103542',
        subColor: '#d7f4ff'
    }
};

export function getGamePresenceMeta(presence: ActiveGamePresence | null | undefined): GamePresenceMeta | null
{
    if (!presence || !presence.game) return null;
    const key = presence.game.toLowerCase().replace(/[^a-z0-9]/g, '');
    const preset = GAME_META_MAP[key] || GAME_META_MAP.snowstorm;
    return {
        ...preset,
        label: (presence.label || preset.label).toUpperCase()
    };
}
