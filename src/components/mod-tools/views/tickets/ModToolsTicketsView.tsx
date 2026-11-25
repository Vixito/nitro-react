import { IssueMessageData, PickIssuesMessageComposer } from '@nitrots/nitro-renderer';
import { FC, useEffect, useState } from 'react';
import { GetSessionDataManager, SendMessageComposer } from '../../../../api';
import { NitroCardContentView, NitroCardHeaderView, NitroCardTabsItemView, NitroCardTabsView, NitroCardView } from '../../../../common';
import { useModTools } from '../../../../hooks';
import { ModToolsIssueInfoView } from './ModToolsIssueInfoView';
import { ModToolsMyIssuesTabView } from './ModToolsMyIssuesTabView';
import { ModToolsOpenIssuesTabView } from './ModToolsOpenIssuesTabView';
import { ModToolsPickedIssuesTabView } from './ModToolsPickedIssuesTabView';

interface ModToolsTicketsViewProps
{
    onCloseClick: () => void;
}

export const ModToolsTicketsView: FC<ModToolsTicketsViewProps> = props =>
{
    const { onCloseClick = null } = props;
    const [ currentTab, setCurrentTab ] = useState<number>(0);
    const [ issueInfoWindows, setIssueInfoWindows ] = useState<number[]>([]);
    const [ pendingOpenIssueId, setPendingOpenIssueId ] = useState<number>(null);
    const { tickets = [] } = useModTools();

    const myUserId = GetSessionDataManager().userId;
    const openIssues = tickets.filter(issue => issue.state === IssueMessageData.STATE_OPEN);
    const myIssues = tickets.filter(issue => (issue.state === IssueMessageData.STATE_PICKED) && (issue.pickerUserId === myUserId));
    const pickedIssues = tickets.filter(issue => issue.state === IssueMessageData.STATE_PICKED);

    const tabs = [
        `Tickets Abiertos (${ openIssues.length })`,
        `Mis Tickets (${ myIssues.length })`,
        `Tickets en Curso (${ pickedIssues.length })`
    ];

    const closeIssue = (issueId: number) =>
    {
        setIssueInfoWindows(prevValue =>
        {
            const newValue = [ ...prevValue ];
            const existingIndex = newValue.indexOf(issueId);

            if(existingIndex >= 0) newValue.splice(existingIndex, 1);

            return newValue;
        });
    }

    const openIssue = (issueId: number) =>
    {
        setIssueInfoWindows(prevValue => (prevValue.indexOf(issueId) >= 0 ? prevValue : [ ...prevValue, issueId ]));
    }

    const handleIssue = (issueId: number) =>
    {
        setIssueInfoWindows(prevValue =>
        {
            const newValue = [ ...prevValue ];
            const existingIndex = newValue.indexOf(issueId);

            if(existingIndex === -1) newValue.push(issueId);
            else newValue.splice(existingIndex, 1);

            return newValue;
        });
    }

    const pickAndOpenIssue = (issueId: number) =>
    {
        setPendingOpenIssueId(issueId);
        SendMessageComposer(new PickIssuesMessageComposer([ issueId ], false, 0, 'pick issue button'));
        setCurrentTab(1);
    }

    useEffect(() =>
    {
        if(!pendingOpenIssueId) return;

        const picked = tickets.find(issue => (issue.issueId === pendingOpenIssueId) && (issue.state === IssueMessageData.STATE_PICKED) && (issue.pickerUserId === myUserId));

        if(picked)
        {
            openIssue(picked.issueId);
            setPendingOpenIssueId(null);
        }
    }, [ tickets, pendingOpenIssueId, myUserId ]);

    const CurrentTabComponent = () =>
    {
        switch(currentTab)
        {
            case 0: return <ModToolsOpenIssuesTabView openIssues={ openIssues } onPickIssue={ pickAndOpenIssue } />;
            case 1: return <ModToolsMyIssuesTabView myIssues={ myIssues } handleIssue={ handleIssue } />;
            case 2: return <ModToolsPickedIssuesTabView pickedIssues={ pickedIssues } handleIssue={ handleIssue } />;
        }

        return null;
    }

    return (
        <>
            <NitroCardView className="nitro-mod-tools-tickets">
                <NitroCardHeaderView headerText={ 'Tickets de Ayuda' } onCloseClick={ onCloseClick } />
                <NitroCardTabsView>
                    { tabs.map((tab, index) =>
                    {
                        return (<NitroCardTabsItemView key={ index } isActive={ (currentTab === index) } onClick={ event => setCurrentTab(index) }>
                            { tab }
                        </NitroCardTabsItemView>);
                    }) }
                </NitroCardTabsView>
                <NitroCardContentView gap={ 1 }>
                    <CurrentTabComponent />
                </NitroCardContentView>
            </NitroCardView>
            { issueInfoWindows && (issueInfoWindows.length > 0) && issueInfoWindows.map(issueId => <ModToolsIssueInfoView key={ issueId } issueId={ issueId } onIssueInfoClosed={ closeIssue } />) }
        </>
    );
}
