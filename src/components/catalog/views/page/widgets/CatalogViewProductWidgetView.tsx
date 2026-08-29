import { Vector3d } from '@nitrots/nitro-renderer';
import { FC, useEffect, useRef } from 'react';
import { FurniCategory, GetAvatarRenderManager, GetPetIndexFromLocalization, GetSessionDataManager, Offer, ProductTypeEnum } from '../../../../../api';
import { AutoGrid, Column, LayoutGridItem, LayoutRoomPreviewerView } from '../../../../../common';
import { useCatalog } from '../../../../../hooks';

export const CatalogViewProductWidgetView: FC<{}> = props =>
{
    const { currentOffer = null, roomPreviewer = null, purchaseOptions = null } = useCatalog();
    const { previewStuffData = null } = purchaseOptions;
    const prevPreviewIsAvatar = useRef<boolean>(false);

    useEffect(() =>
    {
        if(!currentOffer || (currentOffer.pricingModel === Offer.PRICING_MODEL_BUNDLE) || !roomPreviewer) return;

        const product = currentOffer.product;

        if(!product) return;

        switch(product.productType)
        {
            case ProductTypeEnum.FLOOR: {
                if(!product.furnitureData) return;

                if(product.furnitureData.specialType === FurniCategory.FIGURE_PURCHASABLE_SET)
                {
                    const furniData = GetSessionDataManager().getFloorItemData(product.furnitureData.id);
                    const customParts = furniData.customParams.split(',').map(value => parseInt(value));
                    const figureSets: number[] = [];

                    for(const part of customParts)
                    {
                        if(GetAvatarRenderManager().isValidFigureSetForGender(part, GetSessionDataManager().gender)) figureSets.push(part);
                    }

                    const figureString = GetAvatarRenderManager().getFigureStringWithFigureIds(GetSessionDataManager().figure, GetSessionDataManager().gender, figureSets);

                    if(prevPreviewIsAvatar.current)
                    {
                        roomPreviewer.updateObjectUserFigure(figureString, GetSessionDataManager().gender);
                    }
                    else
                    {
                        roomPreviewer.reset(false);
                        roomPreviewer.addAvatarIntoRoom(figureString, product.productClassId);
                    }

                    prevPreviewIsAvatar.current = true;
                }
                else
                {
                    prevPreviewIsAvatar.current = false;
                    roomPreviewer.reset(false);
                    const res = roomPreviewer.addFurnitureIntoRoom(product.productClassId, new Vector3d(90), previewStuffData, product.extraParam);
                    if(res === -1 && product.furnitureData && (roomPreviewer as any)._roomEngine)
                    {
                        const rp = roomPreviewer as any;
                        rp._currentPreviewObjectType = product.productClassId;
                        rp._currentPreviewObjectCategory = 10;
                        rp._currentPreviewObjectData = '';
                        rp._roomEngine.addFurnitureFloorByTypeName(rp._previewRoomId, 1, product.furnitureData.className, new Vector3d(0, 0, 0), new Vector3d(90), 0, previewStuffData || null, NaN, -1, 0, -1, '', true, false);
                        rp._previousAutomaticStateChangeTime = Date.now();
                        rp._automaticStateChange = true;
                        roomPreviewer.updatePreviewRoomView();
                    }
                }
                return;
            }
            case ProductTypeEnum.WALL: {
                if(!product.furnitureData) return;

                prevPreviewIsAvatar.current = false;

                switch(product.furnitureData.specialType)
                {
                    case FurniCategory.FLOOR:
                        roomPreviewer.updateObjectRoom(product.extraParam);
                        return;
                    case FurniCategory.WALL_PAPER:
                        roomPreviewer.updateObjectRoom(null, product.extraParam);
                        return;
                    case FurniCategory.LANDSCAPE: {
                        roomPreviewer.updateObjectRoom(null, null, product.extraParam);

                        const furniData = GetSessionDataManager().getWallItemDataByName('window_double_default');

                        if(furniData) roomPreviewer.addWallItemIntoRoom(furniData.id, new Vector3d(90), furniData.customParams);
                        return;
                    }
                    default: {
                        roomPreviewer.updateObjectRoom('default', 'default', 'default');
                        const res = roomPreviewer.addWallItemIntoRoom(product.productClassId, new Vector3d(90), product.extraParam);
                        if(res === -1 && product.furnitureData && (roomPreviewer as any)._roomEngine)
                        {
                            const rp = roomPreviewer as any;
                            rp._currentPreviewObjectType = product.productClassId;
                            rp._currentPreviewObjectCategory = 20;
                            rp._currentPreviewObjectData = product.extraParam || '';
                            rp._roomEngine.addFurnitureWall(rp._previewRoomId, 1, product.productClassId, new Vector3d(0.5, 2.3, 1.8), new Vector3d(90), 0, product.extraParam || '', 0, 0, -1, '', false);
                            rp._previousAutomaticStateChangeTime = Date.now();
                            rp._automaticStateChange = true;
                            roomPreviewer.updatePreviewRoomView();
                        }
                        return;
                    }
                }
            }
            case ProductTypeEnum.ROBOT:
                prevPreviewIsAvatar.current = true;
                roomPreviewer.addAvatarIntoRoom(product.extraParam, 0);
                return;
            case ProductTypeEnum.EFFECT:
                prevPreviewIsAvatar.current = true;
                roomPreviewer.addAvatarIntoRoom(GetSessionDataManager().figure, product.productClassId);
                return;
            case ProductTypeEnum.PET: {
                prevPreviewIsAvatar.current = false;
                let petType = 0;
                if(product.extraParam) {
                    const parsed = parseInt(product.extraParam);
                    if(!isNaN(parsed)) petType = parsed;
                } else if(currentOffer?.localizationId) {
                    const parsed = GetPetIndexFromLocalization(currentOffer.localizationId);
                    if(parsed > -1) petType = parsed;
                }
                roomPreviewer.addPetIntoRoom(`${ petType } 0`);
                return;
            }
        }
    }, [ currentOffer, previewStuffData, roomPreviewer ]);

    if(!currentOffer) return null;

    if(currentOffer.pricingModel === Offer.PRICING_MODEL_BUNDLE)
    {
        return (
            <Column fit overflow="hidden" className="bg-muted p-2 rounded">
                <AutoGrid fullWidth columnCount={ 4 } className="nitro-catalog-layout-bundle-grid">
                    { (currentOffer.products.length > 0) && currentOffer.products.map((product, index) =>
                    {
                        return <LayoutGridItem key={ index } itemImage={ product.getIconUrl(currentOffer) } itemCount={ product.productCount } />;
                    }) }
                </AutoGrid>
            </Column>
        );
    }
    
    return <LayoutRoomPreviewerView roomPreviewer={ roomPreviewer } height={ 140 } />;
}
