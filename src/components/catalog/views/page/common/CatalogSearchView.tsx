import { IFurnitureData } from '@nitrots/nitro-renderer';
import { FC, useEffect, useState } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { CatalogPage, CatalogType, FilterCatalogNode, FurnitureOffer, GetOfferNodes, GetSessionDataManager, ICatalogNode, ICatalogPage, IPurchasableOffer, LocalizeText, PageLocalization, SearchResult } from '../../../../../api';
import { Button, Flex } from '../../../../../common';
import { useCatalog } from '../../../../../hooks';

export const CatalogSearchView: FC<{}> = props =>
{
    const [ searchValue, setSearchValue ] = useState('');
    const { currentType = null, rootNode = null, offersToNodes = null, searchResult = null, setSearchResult = null, setCurrentPage = null } = useCatalog();

    const performSearch = (text: string) =>
    {
        let search = text?.toLocaleLowerCase().replace(' ', '');

        if(!search || !search.length)
        {
            setSearchResult(null);
            return;
        }

        const furnitureDatas = GetSessionDataManager().getAllFurnitureData({
            loadFurnitureData: null
        });

        if(!furnitureDatas || !furnitureDatas.length) return;

        const foundFurniture: IFurnitureData[] = [];
        const foundFurniLines: string[] = [];

        for(const furniture of furnitureDatas)
        {
            if((currentType === CatalogType.BUILDER) && !furniture.availableForBuildersClub) continue;
            if((currentType === CatalogType.NORMAL) && furniture.excludeDynamic) continue;

            const searchValues = [ furniture.className, furniture.name, furniture.description ].join(' ').replace(/ /gi, '').toLowerCase();

            if(searchValues.indexOf(search) >= 0)
            {
                foundFurniture.push(furniture);

                if((furniture.furniLine !== '') && (foundFurniLines.indexOf(furniture.furniLine) < 0))
                {
                    foundFurniLines.push(furniture.furniLine);
                }

                if(foundFurniture.length === 250) break;
            }
        }

        const offers: IPurchasableOffer[] = [];
        for(const furniture of foundFurniture) offers.push(new FurnitureOffer(furniture));

        let nodes: ICatalogNode[] = [];
        if(rootNode) FilterCatalogNode(search, foundFurniLines, rootNode, nodes);

        setSearchResult(new SearchResult(search, offers, nodes.filter(node => (node.isVisible))));
        setCurrentPage((new CatalogPage(-1, 'default_3x3', new PageLocalization([], []), offers, false, 1) as ICatalogPage));

        if(offers.length > 0)
        {
            offers[0].activate();
        }
    };

    useEffect(() =>
    {
        if(!searchValue || !searchValue.length)
        {
            setSearchResult(null);
            return;
        }

        const timeout = setTimeout(() =>
        {
            performSearch(searchValue);
        }, 300);

        return () => clearTimeout(timeout);
    }, [ offersToNodes, currentType, rootNode, searchValue, setCurrentPage, setSearchResult ]);

    return (
        <Flex gap={ 1 }>
            <Flex fullWidth alignItems="center" position="relative">
                <input 
                    type="text" 
                    className="form-control form-control-sm" 
                    placeholder={ LocalizeText('generic.search') } 
                    value={ searchValue } 
                    onChange={ event => setSearchValue(event.target.value) }
                    onKeyDown={ event => {
                        if(event.key === 'Enter')
                        {
                            performSearch(searchValue);
                        }
                    }}
                />
            </Flex>
            { (!searchValue || !searchValue.length) &&
                <Button variant="primary" className="catalog-search-button" onClick={ () => performSearch(searchValue) }>
                    <FaSearch className="fa-icon" />
                </Button> }
            { searchValue && !!searchValue.length &&
                <Button variant="primary" className="catalog-search-button" onClick={ event => setSearchValue('') }>
                    <FaTimes className="fa-icon" />
                </Button> }
        </Flex>
    );
}
