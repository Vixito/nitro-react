import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, useEffect, useState } from 'react';
import { AchievementUtilities, AddEventLinkTracker, LocalizeText, RemoveLinkEventTracker } from '../../api';
import { Base, Column, LayoutImage, LayoutProgressBar, NitroCardContentView, NitroCardHeaderView, NitroCardSubHeaderView, NitroCardView, Text } from '../../common';
import { useAchievements } from '../../hooks';
import { AchievementCategoryView } from './views/AchievementCategoryView';
import { AchievementsCategoryListView } from './views/category-list/AchievementsCategoryListView';

export const AchievementsView: FC<{}> = props =>
{
    const [ isVisible, setIsVisible ] = useState(false);
    const { achievementCategories = [], selectedCategoryCode = null, setSelectedCategoryCode = null, setCategorySeen = null, achievementScore = 0, getProgress = 0, getMaxProgress = 0, selectedCategory = null } = useAchievements();

    const handleBackFromCategory = () =>
    {
        if(selectedCategoryCode && setCategorySeen) setCategorySeen(selectedCategoryCode);
        setSelectedCategoryCode(null);
    };

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');
        
                if(parts.length < 2) return;
        
                switch(parts[1])
                {
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        if(selectedCategoryCode) setSelectedCategoryCode(null);
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible(prevValue =>
                        {
                            if(prevValue && selectedCategoryCode) setSelectedCategoryCode(null);
                            return !prevValue;
                        });
                        return;
                }
            },
            eventUrlPrefix: 'achievements/'
        };

        AddEventLinkTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [ selectedCategoryCode, setSelectedCategoryCode ]);

    if(!isVisible) return null;

    return (
        <NitroCardView uniqueKey="achievements" className="nitro-achievements" theme="primary-slim">
            <NitroCardHeaderView headerText={ LocalizeText('inventory.achievements') } onCloseClick={ event => { if(selectedCategoryCode) setSelectedCategoryCode(null); setIsVisible(false); } } />
            { selectedCategory &&
                <NitroCardSubHeaderView position="relative" className="justify-content-center align-items-center" gap={ 3 }>
                    <Base pointer onClick={ handleBackFromCategory } className="nitro-achievements-back-arrow" />
                    <Column grow gap={ 0 }>
                        <Text fontSize={ 4 } fontWeight="bold" className="text-small">{ LocalizeText(`quests.${ selectedCategory.code }.name`) }</Text>
                        <Text>{ LocalizeText('achievements.details.categoryprogress', [ 'progress', 'limit' ], [ selectedCategory.getProgress().toString(), selectedCategory.getMaxProgress().toString() ]) }</Text>
                    </Column>
                    <LayoutImage imageUrl={ AchievementUtilities.getAchievementCategoryImageUrl(selectedCategory, null,true) } />
                </NitroCardSubHeaderView> }
            <NitroCardContentView gap={ 1 }>
                { !selectedCategory &&
                    <>
                        <AchievementsCategoryListView categories={ achievementCategories } selectedCategoryCode={ selectedCategoryCode } setSelectedCategoryCode={ setSelectedCategoryCode } />
                        <Column grow justifyContent="end" gap={ 1 }>
                            <Text small center>{ LocalizeText('achievements.categories.score', [ 'score' ], [ achievementScore.toString() ]) }</Text>
                            <LayoutProgressBar text={ LocalizeText('achievements.categories.totalprogress', [ 'progress', 'limit' ], [ getProgress.toString(), getMaxProgress.toString() ]) } progress={ getProgress } maxProgress={ getMaxProgress } />
                        </Column>
                    </> }
                { selectedCategory &&
                    <AchievementCategoryView category={ selectedCategory } /> }
            </NitroCardContentView>
        </NitroCardView>
    );
};
