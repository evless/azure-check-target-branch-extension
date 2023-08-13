import {
    getVariable,
    getEndpointAuthorizationParameter,
    getInput,
    setResult,
    TaskResult,
} from 'azure-pipelines-task-lib';
import { WebApi, getHandlerFromToken } from 'azure-devops-node-api/WebApi';
import { ResourceRef } from 'azure-devops-node-api/interfaces/common/VSSInterfaces';

import { WorkItemExpand } from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces';

async function getWebApi() {
    const endpointUrl = getVariable('System.TeamFoundationCollectionUri');
    const token = getEndpointAuthorizationParameter('SYSTEMVSSCONNECTION', 'AccessToken', false);

    const credentialHandler = getHandlerFromToken(token);
    return new WebApi(endpointUrl, credentialHandler);
}

async function getBuildWorkItems(webApi: WebApi) {
    const projectId = getVariable('System.TeamProjectId');
    const buildId = getVariable('Build.BuildId');
    const buildClient = await webApi.getBuildApi();

    if (projectId && buildId) {
        const workItemRefs = await buildClient.getBuildWorkItemsRefs(projectId, parseInt(buildId));
        return workItemRefs;
    }

    return Promise.reject("Didn't find System.TeamProjectId or Build.BuildId");
}

async function checkWorkItems(
    webApi: WebApi,
    buildWorkItems: Array<ResourceRef>,
    releaseNumber: string,
    fieldName: string,
) {
    const workItemTrackingClient = await webApi.getWorkItemTrackingApi();

    const workItems = await workItemTrackingClient.getWorkItems(
        buildWorkItems.map((workItem) => parseInt(workItem.id)),
        undefined,
        undefined,
        WorkItemExpand.Relations,
    );

    const workItemsWithParents = await workItemTrackingClient.getWorkItems(
        workItems.map((workItem) => {
            if (workItem.fields) {
                return fieldName in workItem.fields ? workItem.id : workItem.fields['System.Parent'];
            }

            return undefined;
        }),
        [fieldName],
    );

    return workItemsWithParents.filter((workItem) => workItem.fields?.[fieldName] !== releaseNumber);
}

async function run() {
    try {
        const branches = getInput('branches', true)
            ?.split(',')
            .map((branch) => branch.trim());
        const releases = getInput('releases', true)
            ?.split(',')
            .map((release) => release.trim());
        const taskFieldName = getInput('fieldName', true);

        if (!branches || !releases || branches?.length !== releases?.length) {
            setResult(TaskResult.Failed, 'Count of branches and releases should be equal');
            return;
        }

        const webApi = await getWebApi();
        const targetBranch = getVariable('System.PullRequest.TargetBranch');
        const currentRelease =
            releases[branches.findIndex((branch) => `refs/heads/${branch}` === targetBranch?.trim())];

        console.log('Target branch is ', targetBranch);
        console.log('Current release in branch is ', currentRelease);
        console.log('List of branches: ', branches);
        console.log('List of releases: ', releases);

        const buildWorkItems = await getBuildWorkItems(webApi);
        const wrongWorkItems = await checkWorkItems(webApi, buildWorkItems, currentRelease, taskFieldName);

        if (wrongWorkItems.length > 0) {
            const workItemIds = wrongWorkItems.map((workItem) => workItem.id).join(',');
            setResult(
                TaskResult.Failed,
                `Next task ids have different release number or does't have it: ${workItemIds}`,
            );
        } else {
            setResult(TaskResult.Succeeded, '');
        }
    } catch (err) {
        console.log(err);
        if (err instanceof Error) {
            setResult(TaskResult.Failed, err.message);
        }
    }
}

run();
