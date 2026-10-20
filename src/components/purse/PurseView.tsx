import { FriendlyTime, HabboClubLevelEnum } from '@nitrots/nitro-renderer';
import { FC, useMemo } from 'react';
import { CreateLinkEvent, GetConfiguration, LocalizeFormattedNumber, LocalizeShortNumber, LocalizeText } from '../../api';
import { Column, Flex, Grid, LayoutCurrencyIcon, Text } from '../../common';
import { usePurse } from '../../hooks';
import { useEraTheme } from '../../hooks/era/useEraTheme';
import { CurrencyView } from './views/CurrencyView';
import { SeasonalView } from './views/SeasonalView';

export const PurseView: FC<{}> = props =>
{
    const { purse = null, hcDisabled = false } = usePurse();
    const { currentEra } = useEraTheme();

    const displayedCurrencies = useMemo(() => GetConfiguration<number[]>('system.currency.types', []), []);
    const currencyDisplayNumberShort = useMemo(() => GetConfiguration<boolean>('currency.display.number.short', false), []);

    const getClubText = (() =>
    {
        if(!purse) return null;

        const totalDays = ((purse.clubPeriods * 31) + purse.clubDays);
        const minutesUntilExpiration = purse.minutesUntilExpiration;

        if(purse.clubLevel === HabboClubLevelEnum.NO_CLUB) return LocalizeText('purse.clubdays.zero.amount.text');

        else if((minutesUntilExpiration > -1) && (minutesUntilExpiration < (60 * 24))) return FriendlyTime.shortFormat(minutesUntilExpiration * 60);
        
        else return FriendlyTime.shortFormat(totalDays * 86400);
    })();

    const getCurrencyElements = (offset: number, limit: number = -1, seasonal: boolean = false) =>
    {
        if(!purse || !purse.activityPoints || !purse.activityPoints.size) return null;

        const types = Array.from(purse.activityPoints.keys()).filter(type => (displayedCurrencies.indexOf(type) >= 0));

        let count = 0;

        while(count < offset)
        {
            types.shift();

            count++;
        }

        count = 0;

        const elements: JSX.Element[] = [];

        for(const type of types)
        {
            if((limit > -1) && (count === limit)) break;

            if(seasonal) elements.push(<SeasonalView key={ type } type={ type } amount={ purse.activityPoints.get(type) } />);
            else elements.push(<CurrencyView key={ type } type={ type } amount={ purse.activityPoints.get(type) } short={ currencyDisplayNumberShort } />);

            count++;
        }

        return elements;
    }

    if(!purse) return null;

    if(currentEra === 'flash2012')
    {
        return (
            <div className="nitro-purse-container purse-flash2012">
                <div className="purse-box">
                    <div className="purse-currencies">
                        <div className="currency-pill currency-credits" title="Créditos">
                            <span className="amount">{ currencyDisplayNumberShort ? LocalizeShortNumber(purse.credits) : LocalizeFormattedNumber(purse.credits) }</span>
                            <LayoutCurrencyIcon type={ -1 } />
                        </div>
                        { getCurrencyElements(0, 2) }
                    </div>
                    <div className="purse-side">
                        { !hcDisabled && (
                            <div className="purse-club" title="Habbten Club" onClick={ () => CreateLinkEvent('habboUI/open/hccenter') }>
                                <LayoutCurrencyIcon type="hc" />
                                <span className="club-text">{ getClubText }</span>
                            </div>
                        )}
                        <div className="purse-actions">
                            <div className="purse-btn btn-settings" title="Ajustes" onClick={ () => CreateLinkEvent('user-settings/toggle') }>
                                <i className="icon icon-cog" />
                            </div>
                            <div className="purse-btn btn-help" title="Ayuda" onClick={ () => CreateLinkEvent('help/show') }>
                                <i className="icon icon-help" />
                            </div>
                        </div>
                    </div>
                </div>
                { getCurrencyElements(2, -1, true) }
            </div>
        );
    }

    if(currentEra === 'shockwave2006')
    {
        return (
            <div className="nitro-purse-container purse-shockwave2006">
                <div className="purse-bevel-box">
                    <div className="credits-display" title="Créditos" onClick={ () => CreateLinkEvent('catalog/open/credits') }>
                        <LayoutCurrencyIcon type={ -1 } />
                        <span className="credits-val">{ LocalizeFormattedNumber(purse.credits) }</span>
                    </div>
                    <div className="purse-actions">
                        <div className="purse-btn" title="Ajustes" onClick={ () => CreateLinkEvent('user-settings/toggle') }>
                            <i className="icon icon-cog" />
                        </div>
                        <div className="purse-btn" title="Ayuda" onClick={ () => CreateLinkEvent('help/show') }>
                            <i className="icon icon-help" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Column alignItems="end" className="nitro-purse-container" gap={ 1 }>
            <Flex className="nitro-purse rounded-bottom p-1">
                <Grid fullWidth gap={ 1 }>
                    <Column justifyContent="center" size={ hcDisabled ? 10 : 6 } gap={ 0 }>
                        <CurrencyView type={ -1 } amount={ purse.credits } short={ currencyDisplayNumberShort } />
                        { getCurrencyElements(0, 2) }
                    </Column>
                    { !hcDisabled &&
                        <Column center pointer size={ 4 } gap={ 1 } className="nitro-purse-subscription rounded" onClick={ event => CreateLinkEvent('habboUI/open/hccenter') }>
                            <LayoutCurrencyIcon type="hc" />
                            <Text variant="white">{ getClubText }</Text>
                        </Column> }
                    <Column justifyContent="center" size={ 2 } gap={ 0 }>
                        <Flex center pointer fullHeight className="nitro-purse-button nitro-purse-help p-1 rounded" onClick={ event => CreateLinkEvent('help/show') }>
                            <i className="icon icon-help"/>
                        </Flex>
                        <Flex center pointer fullHeight className="nitro-purse-button nitro-purse-settings p-1 rounded" onClick={ event => CreateLinkEvent('user-settings/toggle') } >
                            <i className="icon icon-cog"/>
                        </Flex>
                    </Column>
                </Grid>
            </Flex>
            { getCurrencyElements(2, -1, true) }
        </Column>
    );
}
