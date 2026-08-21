import { FC, useRef, useState } from 'react';
import { Overlay, Popover } from 'react-bootstrap';
import { Base, Flex, Grid, NitroCardContentView } from '../../../../common';

interface ChatInputStyleSelectorViewProps
{
    chatStyleId: number;
    chatStyleIds: number[];
    selectChatStyleId: (styleId: number) => void;
}

export const ChatInputStyleSelectorView: FC<ChatInputStyleSelectorViewProps> = props =>
{
    const { chatStyleId = 0, chatStyleIds = null, selectChatStyleId = null } = props;
    const [ selectorVisible, setSelectorVisible ] = useState(false);
    const elementRef = useRef<HTMLDivElement>(null);

    const selectStyle = (styleId: number) =>
    {
        selectChatStyleId(styleId);
        setSelectorVisible(false);
    }

    const toggleSelector = () =>
    {
        setSelectorVisible(prevValue => !prevValue);
    }

    return (
        <>
            <Base innerRef={ elementRef } pointer className="icon chatstyles-icon" onClick={ toggleSelector } />
            <Overlay
                show={ selectorVisible }
                target={ elementRef.current }
                placement="top"
                rootClose={ true }
                onHide={ () => setSelectorVisible(false) }
                transition={ false }
            >
                <Popover className="nitro-chat-style-selector-container image-rendering-pixelated">
                    <NitroCardContentView overflow="hidden" className="bg-transparent">
                        <Grid columnCount={ 3 } overflow="auto">
                            { chatStyleIds && (chatStyleIds.length > 0) && chatStyleIds.map((styleId) =>
                            {
                                return (
                                    <Flex center pointer key={ styleId } className="bubble-parent-container" onClick={ () => selectStyle(styleId) }>
                                        <Base className="bubble-container">
                                            <Base className={ `chat-bubble bubble-${ styleId }` }>&nbsp;</Base>
                                        </Base>
                                    </Flex>
                                );
                            }) }
                        </Grid>
                    </NitroCardContentView>
                </Popover>
            </Overlay>
        </>
    );
}
