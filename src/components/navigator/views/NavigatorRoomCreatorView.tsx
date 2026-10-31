/* eslint-disable no-template-curly-in-string */
import { CreateFlatMessageComposer, HabboClubLevelEnum } from '@nitrots/nitro-renderer';
import { FC, useEffect, useState } from 'react';
import { GetClubMemberLevel, GetConfiguration, IRoomModel, LocalizeText, SendMessageComposer } from '../../../api';
import { Button, Column, Flex, Grid, LayoutCurrencyIcon, LayoutGridItem, ShockwaveDropdown, Text } from '../../../common';
import { useNavigator } from '../../../hooks';
import { useEraTheme } from '../../../hooks/era/useEraTheme';

export const NavigatorRoomCreatorView: FC<{}> = props =>
{
    const [ maxVisitorsList, setMaxVisitorsList ] = useState<number[]>(null);
    const [ name, setName ] = useState<string>('');
    const [ description, setDescription ] = useState<string>('');
    const [ category, setCategory ] = useState<number>(null);
    const [ visitorsCount, setVisitorsCount ] = useState<number>(null);
    const [ tradesSetting, setTradesSetting ] = useState<number>(0);
    const [ roomModels, setRoomModels ] = useState<IRoomModel[]>([]);
    const [ selectedModelName, setSelectedModelName ] = useState<string>('');
    const { categories = null } = useNavigator();
    const { currentEra } = useEraTheme();

    const hcDisabled = GetConfiguration<boolean>('hc.disabled', false);

    const getRoomModelImage = (name: string) => GetConfiguration<string>('images.url') + `/navigator/models/model_${ name }.png`;

    const selectModel = (model: IRoomModel, index: number) =>
    {
        if(!model || (model.clubLevel > GetClubMemberLevel())) return;

        setSelectedModelName(roomModels[index].name);
    };

    const createRoom = () =>
    {
        if(!name || name.length < 3) return;
        SendMessageComposer(new CreateFlatMessageComposer(name, description, 'model_' + selectedModelName, Number(category), Number(visitorsCount), tradesSetting));
    };

    useEffect(() =>
    {
        if(!maxVisitorsList)
        {
            const list = [];

            for(let i = 10; i <= 100; i = i + 10) list.push(i);

            setMaxVisitorsList(list);
            setVisitorsCount(list[0]);
        }
    }, [ maxVisitorsList ]);

    useEffect(() =>
    {
        if(categories && categories.length) setCategory(categories[0].id);
    }, [ categories ]);

    useEffect(() =>
    {
        const models = GetConfiguration<IRoomModel[]>('navigator.room.models');

        if(models && models.length)
        {
            setRoomModels(models);
            setSelectedModelName(models[0].name);
        }
    }, []);

    if(currentEra !== 'shockwave2006')
    {
        return (
            <Column overflow="hidden">
                <Grid overflow="hidden">
                    <Column size={ 6 } gap={ 1 } overflow="auto">
                        <Column gap={ 1 }>
                            <Text>{ LocalizeText('navigator.createroom.roomnameinfo') }</Text>
                            <input type="text" className="form-control form-control-sm" maxLength={ 60 } value={ name } onChange={ event => setName(event.target.value) } placeholder={ LocalizeText('navigator.createroom.roomnameinfo') } />
                        </Column>
                        <Column grow gap={ 1 }>
                            <Text>{ LocalizeText('navigator.createroom.roomdescinfo') }</Text>
                            <textarea className="flex-grow-1 form-control form-control-sm w-100" maxLength={ 255 } value={ description } onChange={ event => setDescription(event.target.value) } placeholder={ LocalizeText('navigator.createroom.roomdescinfo') } />
                        </Column>
                        <Column gap={ 1 }>
                            <Text>{ LocalizeText('navigator.category') }</Text>
                            <select className="form-select form-select-sm" value={ category ?? '' } onChange={ event => setCategory(Number(event.target.value)) }>
                                { categories && (categories.length > 0) && categories.map(cat => (
                                    <option key={ cat.id } value={ cat.id }>{ LocalizeText(cat.name) }</option>
                                )) }
                            </select>
                        </Column>
                        <Column gap={ 1 }>
                            <Text>{ LocalizeText('navigator.maxvisitors') }</Text>
                            <select className="form-select form-select-sm" value={ visitorsCount ?? 10 } onChange={ event => setVisitorsCount(Number(event.target.value)) }>
                                { maxVisitorsList && maxVisitorsList.map(value => (
                                    <option key={ value } value={ value }>{ value }</option>
                                )) }
                            </select>
                        </Column>
                        <Column gap={ 1 }>
                            <Text>{ LocalizeText('navigator.tradesettings') }</Text>
                            <select className="form-select form-select-sm" value={ tradesSetting } onChange={ event => setTradesSetting(Number(event.target.value)) }>
                                <option value="0">{ LocalizeText('navigator.roomsettings.trade_not_allowed') }</option>
                                <option value="1">{ LocalizeText('navigator.roomsettings.trade_not_with_Controller') }</option>
                                <option value="2">{ LocalizeText('navigator.roomsettings.trade_allowed') }</option>
                            </select>
                        </Column>
                    </Column>
                    <Column size={ 6 } gap={ 1 } overflow="auto">
                        { roomModels && (roomModels.length > 0) && roomModels.map((model, index) => (
                            <LayoutGridItem key={ model.name } onClick={ () => selectModel(model, index) } itemActive={ (selectedModelName === model.name) } overflow="unset" gap={ 0 } className="p-1" disabled={ (GetClubMemberLevel() < model.clubLevel) }>
                                <Flex fullHeight center overflow="hidden">
                                    <img alt="" src={ getRoomModelImage(model.name) } />
                                </Flex>
                                <Text bold>{ model.tileSize } { LocalizeText('navigator.createroom.tilesize') }</Text>
                                { !hcDisabled && model.clubLevel > HabboClubLevelEnum.NO_CLUB && <LayoutCurrencyIcon position="absolute" className="top-1 end-1" type="hc" /> }
                            </LayoutGridItem>
                        )) }
                    </Column>
                </Grid>
                <Button fullWidth variant={ (!name || (name.length < 3)) ? 'danger' : 'success' } onClick={ createRoom } disabled={ (!name || (name.length < 3)) }>{ LocalizeText('navigator.createroom.create') }</Button>
            </Column>
        );
    }

    return (
        <div className="shockwave-room-creator">
            <div className="creator-columns-grid">
                {/* Columna izquierda: Detalles de la sala (altura fija idéntica a la derecha, sin scroll innecesario) */}
                <div className="creator-left-col">
                    <div className="creator-field-group">
                        <label className="creator-label">{ LocalizeText('navigator.createroom.roomnameinfo') }</label>
                        <input
                            type="text"
                            className="form-control form-control-sm creator-input"
                            maxLength={ 60 }
                            value={ name }
                            onChange={ event => setName(event.target.value) }
                            placeholder={ LocalizeText('navigator.createroom.roomnameinfo') }
                        />
                    </div>
                    <div className="creator-field-group">
                        <label className="creator-label">{ LocalizeText('navigator.createroom.roomdescinfo') }</label>
                        <textarea
                            className="form-control form-control-sm creator-textarea"
                            maxLength={ 255 }
                            value={ description }
                            onChange={ event => setDescription(event.target.value) }
                            placeholder={ LocalizeText('navigator.createroom.roomdescinfo') }
                        />
                    </div>
                    <div className="creator-field-group">
                        <label className="creator-label">{ LocalizeText('navigator.category') }</label>
                        <ShockwaveDropdown
                            className="w-100"
                            value={ category ?? (categories?.[0]?.id ?? '') }
                            options={ categories ? categories.map(cat => ({ value: cat.id, label: LocalizeText(cat.name) })) : [] }
                            onChange={ val => setCategory(Number(val)) }
                        />
                    </div>
                    <div className="creator-field-group">
                        <label className="creator-label">{ LocalizeText('navigator.maxvisitors') }</label>
                        <ShockwaveDropdown
                            className="w-100"
                            value={ visitorsCount ?? 10 }
                            options={ maxVisitorsList ? maxVisitorsList.map(val => ({ value: val, label: String(val) })) : [] }
                            onChange={ val => setVisitorsCount(Number(val)) }
                        />
                    </div>
                    <div className="creator-field-group">
                        <label className="creator-label">{ LocalizeText('navigator.tradesettings') }</label>
                        <ShockwaveDropdown
                            className="w-100"
                            value={ tradesSetting }
                            options={ [
                                { value: '0', label: LocalizeText('navigator.roomsettings.trade_not_allowed') },
                                { value: '1', label: LocalizeText('navigator.roomsettings.trade_not_with_Controller') },
                                { value: '2', label: LocalizeText('navigator.roomsettings.trade_allowed') }
                            ] }
                            onChange={ val => setTradesSetting(Number(val)) }
                        />
                    </div>
                </div>

                {/* Columna derecha: Lista de modelos de sala con scroll independiente */}
                <div className="creator-right-col">
                    { roomModels.map((model, index) => (
                        <LayoutGridItem
                            key={ model.name }
                            onClick={ () => selectModel(model, index) }
                            itemActive={ (selectedModelName === model.name) }
                            overflow="unset"
                            gap={ 0 }
                            className="p-1 creator-model-card"
                            disabled={ (GetClubMemberLevel() < model.clubLevel) }
                        >
                            <Flex center overflow="hidden" className="creator-model-img-wrap">
                                <img alt="" src={ getRoomModelImage(model.name) } />
                            </Flex>
                            <Text bold className="creator-model-tiles">
                                { model.tileSize } { LocalizeText('navigator.createroom.tilesize') }
                            </Text>
                            { !hcDisabled && model.clubLevel > HabboClubLevelEnum.NO_CLUB && (
                                <LayoutCurrencyIcon position="absolute" className="top-1 end-1" type="hc" />
                            ) }
                        </LayoutGridItem>
                    )) }
                </div>
            </div>

            {/* Pie fijo siempre visible con el botón Crear sala */}
            <div className="creator-footer-row">
                <Button
                    fullWidth
                    className="creator-submit-btn"
                    variant={ (!name || (name.length < 3)) ? 'danger' : 'success' }
                    onClick={ createRoom }
                    disabled={ (!name || (name.length < 3)) }
                >
                    { LocalizeText('navigator.createroom.create') }
                </Button>
            </div>
        </div>
    );
};
