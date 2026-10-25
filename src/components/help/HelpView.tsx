import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, useEffect, useState } from 'react';
import { AddEventLinkTracker, LocalizeText, RemoveLinkEventTracker, ReportState } from '../../api';
import { Base, Column, Grid, NitroCardContentView, NitroCardHeaderView, NitroCardView } from '../../common';
import { useHelp } from '../../hooks';
import { useEraTheme } from '../../hooks/era/useEraTheme';
import { DescribeReportView } from './views/DescribeReportView';
import { HelpIndexView } from './views/HelpIndexView';
import { ShockwaveHelpIndexView } from './views/ShockwaveHelpIndexView';
import { NameChangeView } from './views/name-change/NameChangeView';
import { ReportSummaryView } from './views/ReportSummaryView';
import { SanctionSatusView } from './views/SanctionStatusView';
import { SelectReportedChatsView } from './views/SelectReportedChatsView';
import { SelectReportedUserView } from './views/SelectReportedUserView';
import { SelectTopicView } from './views/SelectTopicView';

export const HelpView: FC<{}> = props =>
{
    const { currentEra } = useEraTheme();
    const [ isVisible, setIsVisible ] = useState(false);
    const { activeReport = null, setActiveReport = null, report = null } = useHelp();

    const onClose = () =>
    {
        setActiveReport(null);
        setIsVisible(false);
    }

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
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible(prevValue => !prevValue);
                        return;
                    case 'tour':
                        // todo: launch tour
                        return;
                    case 'report':
                        if((parts.length >= 5) && (parts[2] === 'room'))
                        {
                            const roomId = parseInt(parts[3]);
                            const unknown = unescape(parts.splice(4).join('/'));
                            //this.reportRoom(roomId, unknown, "");
                        }
                        return;
                }
            },
            eventUrlPrefix: 'help/'
        };

        AddEventLinkTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useEffect(() =>
    {
        if(!activeReport) return;

        setIsVisible(true);
    }, [ activeReport ]);
    
    const CurrentStepView = () =>
    {
        if(activeReport)
        {
            switch(activeReport.currentStep)
            {
                case ReportState.SELECT_USER:
                    return <SelectReportedUserView />;
                case ReportState.SELECT_CHATS:
                    return <SelectReportedChatsView />;
                case ReportState.SELECT_TOPICS:
                    return <SelectTopicView />;
                case ReportState.INPUT_REPORT_MESSAGE:
                    return <DescribeReportView />;
                case ReportState.REPORT_SUMMARY:
                    return <ReportSummaryView />;
            }
        }

        if(currentEra === 'shockwave2006')
        {
            return <ShockwaveHelpIndexView onClose={ onClose } />;
        }

        return <HelpIndexView />;
    }

    const headerText = (currentEra === 'shockwave2006')
        ? 'Ayuda Habbten'
        : LocalizeText('help.button.cfh');

    return (
        <>
            { isVisible &&
                <NitroCardView className={ `nitro-help ${ currentEra === 'shockwave2006' ? 'nitro-help-shockwave' : '' }` } theme="primary-slim">
                    <NitroCardHeaderView headerText={ headerText } onCloseClick={ onClose } />
                    <NitroCardContentView className="text-black p-0">
                        { (currentEra === 'shockwave2006' && !activeReport) ? (
                            <ShockwaveHelpIndexView onClose={ onClose } />
                        ) : (
                            <Grid>
                                <Column center size={ 5 } overflow="hidden">
                                    <Base className="index-image" />
                                </Column>
                                <Column justifyContent="between" size={ 7 } overflow="auto">
                                    <CurrentStepView />
                                </Column>
                            </Grid>
                        ) }
                    </NitroCardContentView>
                </NitroCardView> }
            <SanctionSatusView />
            <NameChangeView />
        </>
    );
}
