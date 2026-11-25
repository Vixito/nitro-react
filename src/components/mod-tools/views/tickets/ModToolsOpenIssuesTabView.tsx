import { FriendlyTime, IssueMessageData, PickIssuesMessageComposer } from '@nitrots/nitro-renderer';
import { FC } from 'react';
import { SendMessageComposer } from '../../../../api';
import { Base, Button, Column, Grid, Text } from '../../../../common';

interface ModToolsOpenIssuesTabViewProps
{
    openIssues: IssueMessageData[];
    onPickIssue?: (issueId: number) => void;
}

export const ModToolsOpenIssuesTabView: FC<ModToolsOpenIssuesTabViewProps> = props =>
{
    const { openIssues = null, onPickIssue = null } = props;

    const handlePick = (issueId: number) =>
    {
        if(onPickIssue) onPickIssue(issueId);
        else SendMessageComposer(new PickIssuesMessageComposer([ issueId ], false, 0, 'pick issue button'));
    }

    return (
        <Column gap={ 0 } overflow="hidden">
            <Column gap={ 2 }>
                <Grid gap={ 1 } className="text-black fw-bold border-bottom pb-1">
                    <Base className="g-col-2">Tipo</Base>
                    <Base className="g-col-3">Sala / Usuario</Base>
                    <Base className="g-col-4">Tiempo</Base>
                    <Base className="g-col-3"></Base>
                </Grid>
            </Column>
            <Column overflow="auto" className="striped-children" gap={ 0 }>
                { openIssues && (openIssues.length > 0) ? openIssues.map(issue =>
                {
                    return (
                        <Grid key={ issue.issueId } gap={ 1 } alignItems="center" className="text-black py-1 border-bottom">
                            <Base className="g-col-2">{ issue.categoryId }</Base>
                            <Base className="g-col-3 text-truncate">{ issue.reportedUserName || issue.reporterUserName || `#${ issue.issueId }` }</Base>
                            <Base className="g-col-4">{ FriendlyTime.format(issue.issueAgeInMilliseconds / 1000, '.ago', 2) }</Base>
                            <Base className="g-col-3">
                                <Button variant="success" onClick={ () => handlePick(issue.issueId) }>Atender</Button>
                            </Base>
                        </Grid>
                    );
                }) : <Text small className="text-muted p-2">No hay tickets abiertos pendientes.</Text> }
            </Column>
        </Column>
    );
}
