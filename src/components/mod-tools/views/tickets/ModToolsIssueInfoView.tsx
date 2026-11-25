import { CloseIssuesMessageComposer, ReleaseIssuesMessageComposer } from '@nitrots/nitro-renderer';
import { FC, useState } from 'react';
import { GetIssueCategoryName, LocalizeText, SendMessageComposer, TryVisitRoom } from '../../../../api';
import { Button, Column, Grid, NitroCardContentView, NitroCardHeaderView, NitroCardView, Text } from '../../../../common';
import { useModTools } from '../../../../hooks';
import { CfhChatlogView } from './CfhChatlogView';

interface IssueInfoViewProps
{
    issueId: number;
    onIssueInfoClosed(issueId: number): void;
}

export const ModToolsIssueInfoView: FC<IssueInfoViewProps> = props =>
{
    const { issueId = null, onIssueInfoClosed = null } = props;
    const [ cfhChatlogOpen, setcfhChatlogOpen ] = useState(false);
    const { tickets = [], openUserInfo = null, openRoomInfo = null } = useModTools();
    const ticket = tickets.find(issue => (issue.issueId === issueId));

    if(!ticket) return null;

    const releaseIssue = (issueId: number) =>
    {
        SendMessageComposer(new ReleaseIssuesMessageComposer([ issueId ]));

        onIssueInfoClosed(issueId);
    }

    const closeIssue = (resolutionType: number) =>
    {
        SendMessageComposer(new CloseIssuesMessageComposer([ issueId ], resolutionType));

        onIssueInfoClosed(issueId);
    }

    const topicKey = 'help.cfh.topic.' + ticket.reportedCategoryId;
    const localizedTopic = LocalizeText(topicKey);
    const topicLabel = (localizedTopic && localizedTopic !== topicKey) ? localizedTopic : `Categoría #${ ticket.reportedCategoryId }`;
    
    return (
        <>
            <NitroCardView className="nitro-mod-tools-handle-issue" theme="primary-slim">
                <NitroCardHeaderView headerText={ 'Resolviendo ticket #' + issueId } onCloseClick={ () => onIssueInfoClosed(issueId) } />
                <NitroCardContentView className="text-black">
                    <Text fontSize={ 4 }>Información del Ticket</Text>
                    <Grid overflow="auto">
                        <Column size={ 8 }>
                            <table className="table table-striped table-sm table-text-small text-black m-0">
                                <tbody>
                                    <tr>
                                        <th>Origen</th>
                                        <td>{ GetIssueCategoryName(ticket.categoryId) }</td>
                                    </tr>
                                    <tr>
                                        <th>Categoría</th>
                                        <td className="text-break">{ topicLabel }</td>
                                    </tr>
                                    <tr>
                                        <th>Descripción</th>
                                        <td className="text-break">{ ticket.message }</td>
                                    </tr>
                                    <tr>
                                        <th>Denunciante</th>
                                        <td>
                                            { ticket.reporterUserId > 0
                                                ? <Text bold underline pointer onClick={ () => openUserInfo(ticket.reporterUserId) }>{ ticket.reporterUserName }</Text>
                                                : <Text className="text-muted">{ ticket.reporterUserName || 'Sistema' } (Automático)</Text> }
                                        </td>
                                    </tr>
                                    <tr>
                                        <th>Usuario Denunciado</th>
                                        <td>
                                            { ticket.reportedUserId > 0
                                                ? <Text bold underline pointer onClick={ () => openUserInfo(ticket.reportedUserId) }>{ ticket.reportedUserName }</Text>
                                                : <Text className="text-muted">{ ticket.reportedUserName || 'N/A' }</Text> }
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </Column>
                        <Column size={ 4 } gap={ 1 }>
                            <Button variant="secondary" onClick={ () => setcfhChatlogOpen(!cfhChatlogOpen) }>Historial</Button>
                            { (ticket.roomId > 0) &&
                                <>
                                    <Button variant="primary" onClick={ () => TryVisitRoom(ticket.roomId) }>Visitar Sala</Button>
                                    <Button variant="secondary" onClick={ () => openRoomInfo(ticket.roomId) }>Info de Sala</Button>
                                </> }
                            <Button onClick={ () => closeIssue(CloseIssuesMessageComposer.RESOLUTION_USELESS) }>Cerrar como inútil</Button>
                            <Button variant="danger" onClick={ () => closeIssue(CloseIssuesMessageComposer.RESOLUTION_ABUSIVE) }>Cerrar como abusivo</Button>
                            <Button variant="success" onClick={ () => closeIssue(CloseIssuesMessageComposer.RESOLUTION_RESOLVED) }>Cerrar como resuelto</Button> 
                            <Button variant="secondary" onClick={ () => releaseIssue(issueId) } >Liberar</Button>
                        </Column>
                    </Grid>
                </NitroCardContentView>
            </NitroCardView>
            { cfhChatlogOpen &&
                <CfhChatlogView issueId={ issueId } onCloseClick={ () => setcfhChatlogOpen(false) }/> }
        </>
    );
}
