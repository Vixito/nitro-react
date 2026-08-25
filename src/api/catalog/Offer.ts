import { GetFurnitureData, GetProductDataForLocalization, GetSessionDataManager, LocalizeText, ProductTypeEnum } from '..';
import { ICatalogPage } from './ICatalogPage';
import { IProduct } from './IProduct';
import { IPurchasableOffer } from './IPurchasableOffer';
import { Product } from './Product';

export class Offer implements IPurchasableOffer
{
    public static PRICING_MODEL_UNKNOWN: string = 'pricing_model_unknown';
    public static PRICING_MODEL_SINGLE: string = 'pricing_model_single';
    public static PRICING_MODEL_MULTI: string = 'pricing_model_multi';
    public static PRICING_MODEL_BUNDLE: string = 'pricing_model_bundle';
    public static PRICING_MODEL_FURNITURE: string = 'pricing_model_furniture';
    public static PRICE_TYPE_NONE: string = 'price_type_none';
    public static PRICE_TYPE_CREDITS: string = 'price_type_credits';
    public static PRICE_TYPE_ACTIVITYPOINTS: string = 'price_type_activitypoints';
    public static PRICE_TYPE_CREDITS_ACTIVITYPOINTS: string = 'price_type_credits_and_activitypoints';

    private _pricingModel: string;
    private _priceType: string;
    private _offerId: number;
    private _localizationId: string;
    private _priceInCredits: number;
    private _priceInActivityPoints: number;
    private _activityPointType: number;
    private _giftable: boolean;
    private _isRentOffer: boolean;
    private _page: ICatalogPage;
    private _clubLevel: number = 0;
    private _products: IProduct[];
    private _badgeCode: string;
    private _bundlePurchaseAllowed: boolean = false;

    constructor(offerId: number, localizationId: string, isRentOffer: boolean, priceInCredits: number, priceInActivityPoints: number, activityPointType: number, giftable: boolean, clubLevel: number, products: IProduct[], bundlePurchaseAllowed: boolean)
    {
        this._offerId = offerId;
        this._localizationId = localizationId;
        this._isRentOffer = isRentOffer;
        this._priceInCredits = priceInCredits;
        this._priceInActivityPoints = priceInActivityPoints;
        this._activityPointType = activityPointType;
        this._giftable = giftable;
        this._clubLevel = clubLevel;
        this._products = products;
        this._bundlePurchaseAllowed = bundlePurchaseAllowed;

        this.setPricingModelForProducts();
        this.setPricingType();

        for(const product of products)
        {
            if(product.productType === ProductTypeEnum.BADGE)
            {
                this._badgeCode = product.extraParam;

                break;
            }
        }
    }

    public activate(): void
    {
        
    }

    public get clubLevel(): number
    {
        return this._clubLevel;
    }

    public get page(): ICatalogPage
    {
        return this._page;
    }

    public set page(k: ICatalogPage)
    {
        this._page = k;
    }

    public get offerId(): number
    {
        return this._offerId;
    }

    public get localizationId(): string
    {
        return this._localizationId;
    }

    public get priceInCredits(): number
    {
        return this._priceInCredits;
    }

    public get priceInActivityPoints(): number
    {
        return this._priceInActivityPoints;
    }

    public get activityPointType(): number
    {
        return this._activityPointType;
    }

    public get giftable(): boolean
    {
        return this._giftable;
    }

    public get product(): IProduct
    {
        if(!this._products || !this._products.length) return null;

        if(this._products.length === 1) return this._products[0];

        const products = Product.stripAddonProducts(this._products);

        if(products.length) return products[0];

        return null;
    }

    public get pricingModel(): string
    {
        return this._pricingModel;
    }

    public get priceType(): string
    {
        return this._priceType;
    }

    public get bundlePurchaseAllowed(): boolean
    {
        return this._bundlePurchaseAllowed;
    }

    public get isRentOffer(): boolean
    {
        return this._isRentOffer;
    }

    public get badgeCode(): string
    {
        return this._badgeCode;
    }

    public get localizationName(): string
    {
        const productData = GetProductDataForLocalization(this._localizationId);

        if(productData && productData.name && productData.name.length && productData.name !== this._localizationId) return productData.name;

        let val = LocalizeText(this._localizationId);
        if(!val || val === this._localizationId || val === ('${' + this._localizationId + '}'))
        {
            // 1. Try from first product's class ID
            const product = (this._products && this._products.length > 0) ? this._products[0] : null;
            if(product)
            {
                const isWall = product.isWallItem || (product.productType && product.productType.toLowerCase() === 'i');
                const furniData = isWall ? GetSessionDataManager().getWallItemData(product.productClassId) : GetSessionDataManager().getFloorItemData(product.productClassId);
                if(furniData && furniData.name && furniData.name.length) return furniData.name;

                const localizedKey = LocalizeText((isWall ? 'wallItem.name.' : 'roomItem.name.') + product.productClassId);
                if(localizedKey && !localizedKey.startsWith('roomItem.') && !localizedKey.startsWith('wallItem.') && !localizedKey.startsWith('${')) return localizedKey;
            }

            // 2. Try by localizationId matching furni classname
            const furniFloorByName = GetSessionDataManager().getFloorItemDataByName(this._localizationId);
            if(furniFloorByName && furniFloorByName.name && furniFloorByName.name.length) return furniFloorByName.name;

            const furniWallByName = GetSessionDataManager().getWallItemDataByName(this._localizationId);
            if(furniWallByName && furniWallByName.name && furniWallByName.name.length) return furniWallByName.name;
        }

        return val || this._localizationId;
    }

    public get localizationDescription(): string
    {
        const productData = GetProductDataForLocalization(this._localizationId);

        if(productData && productData.description && productData.description.length && productData.description !== this._localizationId) return productData.description;

        let val = LocalizeText(this._localizationId);
        if(!val || val === this._localizationId || val === ('${' + this._localizationId + '}'))
        {
            // 1. Try from first product's class ID
            const product = (this._products && this._products.length > 0) ? this._products[0] : null;
            if(product)
            {
                const isWall = product.isWallItem || (product.productType && product.productType.toLowerCase() === 'i');
                const furniData = isWall ? GetSessionDataManager().getWallItemData(product.productClassId) : GetSessionDataManager().getFloorItemData(product.productClassId);
                if(furniData && furniData.description && furniData.description.length) return furniData.description;

                const localizedKey = LocalizeText((isWall ? 'wallItem.desc.' : 'roomItem.desc.') + product.productClassId);
                if(localizedKey && !localizedKey.startsWith('roomItem.') && !localizedKey.startsWith('wallItem.') && !localizedKey.startsWith('${')) return localizedKey;
            }

            // 2. Try by localizationId matching furni classname
            const furniFloorByName = GetSessionDataManager().getFloorItemDataByName(this._localizationId);
            if(furniFloorByName && furniFloorByName.description && furniFloorByName.description.length) return furniFloorByName.description;

            const furniWallByName = GetSessionDataManager().getWallItemDataByName(this._localizationId);
            if(furniWallByName && furniWallByName.description && furniWallByName.description.length) return furniWallByName.description;
        }

        return val || '';
    }

    public get isLazy(): boolean
    {
        return false;
    }

    public get products(): IProduct[]
    {
        return this._products;
    }

    private setPricingModelForProducts(): void
    {
        const products = Product.stripAddonProducts(this._products);

        if(products.length === 1)
        {
            if(products[0].productCount === 1)
            {
                this._pricingModel = Offer.PRICING_MODEL_SINGLE;
            }
            else
            {
                this._pricingModel = Offer.PRICING_MODEL_MULTI;
            }
        }

        else if(products.length > 1)
        {
            this._pricingModel = Offer.PRICING_MODEL_BUNDLE;
        }

        else
        {
            this._pricingModel = Offer.PRICING_MODEL_UNKNOWN;
        }
    }

    private setPricingType(): void
    {
        if((this._priceInCredits > 0) && (this._priceInActivityPoints > 0))
        {
            this._priceType = Offer.PRICE_TYPE_CREDITS_ACTIVITYPOINTS;
        }

        else if(this._priceInCredits > 0)
        {
            this._priceType = Offer.PRICE_TYPE_CREDITS;
        }

        else if(this._priceInActivityPoints > 0)
        {
            this._priceType = Offer.PRICE_TYPE_ACTIVITYPOINTS;
        }

        else
        {
            this._priceType = Offer.PRICE_TYPE_NONE;
        }
    }

    public clone(): IPurchasableOffer
    {
        const products: IProduct[] = [];
        const productData = GetProductDataForLocalization(this.localizationId);
        
        for(const product of this._products)
        {
            const furnitureData = GetFurnitureData(product.productClassId, product.productType);

            products.push(new Product(product.productType, product.productClassId, product.extraParam, product.productCount, productData, furnitureData));
        }

        const offer = new Offer(this.offerId, this.localizationId, this.isRentOffer, this.priceInCredits, this.priceInActivityPoints, this.activityPointType, this.giftable, this.clubLevel, products, this.bundlePurchaseAllowed);

        offer.page = this.page;

        return offer;
    }
}
