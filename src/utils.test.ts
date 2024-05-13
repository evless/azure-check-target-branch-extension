import { filterWorkItemWithDifferentRelease, mapWorkItemIdWithParentId } from './utils';

describe('filterWorkItemWithDifferentRelease', () => {
    it('returns "false" for release with extra spaces', () => {
        expect(
            filterWorkItemWithDifferentRelease(
                '24.4.1',
                'Custom.Release',
            )({
                fields: { 'Custom.Release': ' 24.4.1 ' },
            }),
        ).toBeFalsy();
    });

    it('returns "true" for different release versions', () => {
        expect(
            filterWorkItemWithDifferentRelease(
                '24.4.1',
                'Custom.Release',
            )({
                fields: { 'Custom.Release': '24.5.1' },
            }),
        ).toBeTruthy();
    });
});

describe('mapWorkItemIdWithParentId', () => {
    it('returns work item id', () => {
        const workItem = { id: 13, fields: { 'Custom.Release': '24.5.1', 'System.Parent': '000' } };
        expect(mapWorkItemIdWithParentId([workItem])(workItem)).toEqual('13');
    });

    it('returns work item id with parent id', () => {
        expect(
            mapWorkItemIdWithParentId([{ id: 13, fields: { 'System.Parent': '666' } }])({
                id: 666,
                fields: { 'Custom.Release': '24.5.1' },
            }),
        ).toEqual('13 (parent 666)');
    });
});
