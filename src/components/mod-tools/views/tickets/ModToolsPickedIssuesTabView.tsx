import { FriendlyTime, IssueMessageData } from '@nitrots/nitro-renderer';
import { FC } from 'react';
import { GetSessionDataManager } from '../../../../api';
import { Base, Button, Column, Grid, Text } from '../../../../common';

interface ModToolsPickedIssuesTabViewProps
{
    pickedIssues: IssueMessageData[];
    handleIssue?: (issueId: number) => void;
}

export const ModToolsPickedIssuesTabView: FC<ModToolsPickedIssuesTabViewProps> = props =>
{
    const { pickedIssues = null, handleIssue = null } = props;
    const myUserId = GetSessionDataManager().userId;
    
    return (
        <Column gap={ 0 } overflow="hidden">
            <Column gap={ 2 }>
                <Grid gap={ 1 } className="text-black fw-bold border-bottom pb-1">
                    <Base className="g-col-2">Tipo</Base>
                    <Base className="g-col-3">Sala / Usuario</Base>
                    <Base className="g-col-3">Tiempo</Base>
                    <Base className="g-col-2">Moderador</Base>
                    <Base className="g-col-2"></Base>
                </Grid>
            </Column>
            <Column overflow="auto" className="striped-children" gap={ 0 }>
                { pickedIssues && (pickedIssues.length > 0) ? pickedIssues.map(issue =>
                {
                    return (
                        <Grid key={ issue.issueId } gap={ 1 } alignItems="center" className="text-black py-1 border-bottom">
                            <Base className="g-col-2">{ issue.categoryId }</Base>
                            <Base className="g-col-3 text-truncate">{ issue.reportedUserName || issue.reporterUserName || `#${ issue.issueId }` }</Base>
                            <Base className="g-col-3">{ FriendlyTime.format(issue.issueAgeInMilliseconds / 1000, '.ago', 2) }</Base>
                            <Base className="g-col-2 text-truncate">{ issue.pickerUserName }</Base>
                            <Base className="g-col-2">
                                { handleIssue && (issue.pickerUserId === myUserId) &&
                                    <Button variant="primary" onClick={ () => handleIssue(issue.issueId) }>Gestionar</Button> }
                            </Base>
                        </Grid>
                    );
                }) : <Text small className="text-muted p-2">No hay tickets en curso.</Text> }
            </Column>
        </Column>
    );
}
