import {describe, expect, test} from "vitest";
import { createTestAgent } from './utils/http'
import { prismaTestClient } from './utils/test-db'


describe('POST /api/group', () => {
    const agent = createTestAgent();
    const prisma = prismaTestClient();
    // Create a new group
    // Test that the group is created successfully
    test('Group can be created successfully', async () => {
        const res = await (await agent).post('/api/group')
            .send({
                name: 'Gruppe Chaos',
                members: ['Contenta', 'Gecko'],
                color: '#C6DEF1'
            })
            .expect(200)

        expect(res).toBeDefined();
        expect(res.body.name).toBe('Gruppe Chaos');
        expect(res.body.members.length).toBe(2);
    })

    // Test that the group appears in the list of groups
    test('Created group appears in the list of groups', async () => {

        await (await agent).post('/api/group')
            .send({
                name: 'Gruppe Chaos',
                members: ['Contenta', 'Gecko'],
                color: '#C6DEF1'
            })
            .expect(200)

        const res = await (await agent).get('/api/groups')
            .expect(200)

        expect(res).toBeDefined();
        const groupNames = res.body.map((g: any) => g.name);
        expect(groupNames).toContain('Gruppe Chaos');
    })

    // Test that creating a group with a duplicate name fails
    test('Creating a group with duplicate name fails', async () => {
        const g1 = await (await agent).post('/api/group')
            .send({
                name: 'Gruppe Chaos',
                members: ['Contenta', 'Gecko'],
                color: '#C6DEF1'
            })
            .expect(200);

        const g2 = await (await agent).post('/api/group')
            .send({
                name: 'Gruppe Chaos',
                members: ['Clever', 'Sueno'],
                color: '#FAEDCB'
            })
            .expect(409);
    })

    // Test that creating a group with invalid data fails
    test('Creating a group with invalid data fails', async () => {
        const g2 = await (await agent).post('/api/group')
            .send({
                members: ['Clever', 'Sueno'],
            })
            .expect(500);

    })
})