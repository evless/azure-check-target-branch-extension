import { WorkItem } from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces';

export const filterWorkItemWithDifferentRelease = (releaseNumber: string, fieldName: string) => (workItem: WorkItem) =>
    workItem.fields?.[fieldName].trim() !== releaseNumber;

export const mapWorkItemIdWithParentId = (workItems: ReadonlyArray<WorkItem>) => (workItem: WorkItem) => {
    const childWorkItem = workItems.find(
        (childItem) => String(childItem.fields?.['System.Parent']) === String(workItem.id),
    );
    return childWorkItem !== undefined ? `${childWorkItem.id} (parent ${workItem.id})` : String(workItem.id);
};
