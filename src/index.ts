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

    if (!endpointUrl || !token) {
        return Promise.reject("Didn't find 'System.TeamFoundationCollectionUri' or 'AccessToken'");
    }

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
        buildWorkItems.map((workItem) => parseInt(workItem.id ?? '')),
        undefined,
        undefined,
        WorkItemExpand.Relations,
    );

    const validWorkItemIds = (workItems ?? [])
        .map((workItem) => {
            if (workItem.fields) {
                return fieldName in workItem.fields ? workItem.id : workItem.fields['System.Parent'];
            }

            return undefined;
        })
        .filter((workItemId) => workItemId !== undefined);

    const inValidWorkItemIds = (workItems ?? [])
        .filter((workItem) => {
            if (workItem.fields) {
                return fieldName in workItem.fields
                    ? !validWorkItemIds.includes(workItem.id)
                    : !validWorkItemIds.includes(workItem.fields['System.Parent']);
            }

            return false;
        })
        .map((workItem) => workItem.id);

    const workItemsWithParents = await workItemTrackingClient.getWorkItems(validWorkItemIds, [fieldName]);

    return [
        ...(workItemsWithParents ?? [])
            .filter((workItem) => workItem.fields?.[fieldName] !== releaseNumber)
            .map((workItem) => workItem.id),
        ...inValidWorkItemIds,
    ];
}

async function run() {
    try {
        const branches = getInput('branches', true)
            ?.split(',')
            .map((branch) => branch.trim());
        const releases = getInput('releases', true)
            ?.split(',')
            .map((release) => release.trim());
        const taskFieldName = getInput('fieldName', true) ?? '';

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

        if (!currentRelease) {
            setResult(TaskResult.Skipped, 'Not protected branch');
            return;
        }

        const buildWorkItems = await getBuildWorkItems(webApi);

        if (buildWorkItems.length === 0) {
            setResult(TaskResult.Failed, `PR doesn't have linked work items`);
            return;
        }

        const wrongWorkItemIds = await checkWorkItems(webApi, buildWorkItems, currentRelease, taskFieldName);

        if (wrongWorkItemIds.length > 0) {
            const workItemIds = wrongWorkItemIds.join(', ');
            setResult(TaskResult.Failed, `Next work item ids have different value or don't have value: ${workItemIds}`);
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
