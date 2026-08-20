import { Dispatch, FC, SetStateAction } from 'react';
import { AchievementUtilities, IAchievementCategory, LocalizeText } from '../../../../api';
import { LayoutBackgroundImage, LayoutGridItem, Text } from '../../../../common';

interface AchievementCategoryListItemViewProps
{
    category: IAchievementCategory;
    selectedCategoryCode: string;
    setSelectedCategoryCode: Dispatch<SetStateAction<string>>;
}

export const AchievementsCategoryListItemView: FC<AchievementCategoryListItemViewProps> = props =>
{
    const { category = null, selectedCategoryCode = null, setSelectedCategoryCode = null } = props;

    if(!category) return null;

    const progress = AchievementUtilities.getAchievementCategoryProgress(category);
    const maxProgress = AchievementUtilities.getAchievementCategoryMaxProgress(category);
    const getCategoryImage = AchievementUtilities.getAchievementCategoryImageUrl(category, progress);
    const getTotalUnseen = AchievementUtilities.getAchievementCategoryTotalUnseen(category);

    return (
        <LayoutGridItem itemActive={ (selectedCategoryCode === category.code) } itemCount={ getTotalUnseen } itemCountMinimum={ 0 } gap={ 1 } onClick={ event => setSelectedCategoryCode(category.code) }>
            <Text fullWidth center small className="pt-1">{ LocalizeText(`quests.${ category.code }.name`) }</Text>
            <div className="d-flex justify-content-center align-items-center flex-grow-1 w-100 position-relative pb-1">
                <div
                    style={ {
                        width: '68px',
                        height: '64px',
                        backgroundImage: `url(${ getCategoryImage })`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        backgroundSize: 'contain',
                        imageRendering: 'pixelated',
                        position: 'relative'
                    } }
                >
                    <Text fullWidth center position="absolute" variant="white" style={ { fontSize: 11, bottom: 4, textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' } }>
                        { progress } / { maxProgress }
                    </Text>
                </div>
            </div>
        </LayoutGridItem>
    );
}
