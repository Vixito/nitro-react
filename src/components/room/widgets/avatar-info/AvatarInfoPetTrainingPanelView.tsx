import { IRoomUserData, PetTrainingMessageParser, PetTrainingPanelMessageEvent } from '@nitrots/nitro-renderer';
import { FC, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { Button, Column, Flex, Grid, LayoutPetImageView, NitroCardContentView, NitroCardHeaderView, NitroCardView, Text } from '../../../../common';
import { useMessageEvent, useRoom, useSessionInfo } from '../../../../hooks';

export const AvatarInfoPetTrainingPanelView: FC<{}> = props =>
{
    const [ petData, setPetData ] = useState<IRoomUserData>(null);
    const [ petTrainInformation, setPetTrainInformation ] = useState<PetTrainingMessageParser>(null);
    const { chatStyleId = 0 } = useSessionInfo();
    const { roomSession = null } = useRoom();

    useMessageEvent<PetTrainingPanelMessageEvent>(PetTrainingPanelMessageEvent, event =>
    {
        const parser = event.getParser();

        if (!parser) return;

        const roomPetData = roomSession.userDataManager.getPetData(parser.petId);

        if(!roomPetData) return;

        setPetData(roomPetData);
        setPetTrainInformation(parser);
    });

    const processPetAction = (petName: string, commandName: string) =>
    {
        if (!petName || !commandName) return;

        roomSession?.sendChatMessage(`${ petName } ${ commandName }`, chatStyleId);
    }

    if(!petData || !petTrainInformation) return null;

    return (
        <NitroCardView uniqueKey="pet-training" className="pet-training-window no-resize" theme="primary-slim">
            <NitroCardHeaderView headerText={ LocalizeText('widgets.pet.commands.title') } onCloseClick={ () => setPetTrainInformation(null) } />
            <NitroCardContentView className="text-black">
                <Flex alignItems="center" gap={ 2 } className="pet-training-header mb-2">
                    <div className="pet-training-preview">
                        <LayoutPetImageView figure={ petData.figure } posture={ 'std' } direction={ 2 } />
                    </div>
                    <Column gap={ 0 } className="flex-1 min-w-0">
                        <Text bold className="text-truncate">{ petData.name }</Text>
                        <Text small variant="muted" style={{ fontSize: '11px' }}>Haz clic en un comando para entrenar:</Text>
                    </Column>
                </Flex>
                <div className="pet-commands-container">
                    <Grid columnCount={ 2 } gap={ 1 }>
                        {
                            (petTrainInformation.commands && petTrainInformation.commands.length > 0) && petTrainInformation.commands.map((command, index) => {
                                const isEnabled = petTrainInformation.enabledCommands && petTrainInformation.enabledCommands.includes(command);
                                const commandText = LocalizeText(`pet.command.${ command }`);
                                return (
                                    <Button
                                        key={ index }
                                        variant={ isEnabled ? 'primary' : 'secondary' }
                                        disabled={ !isEnabled }
                                        onClick={ () => processPetAction(petData.name, commandText) }
                                        className="text-truncate"
                                        style={{ fontSize: '11px', padding: '4px 6px' }}
                                    >
                                        { commandText }
                                    </Button>
                                );
                            })
                        }
                    </Grid>
                </div>
            </NitroCardContentView>
        </NitroCardView>
    );
};

