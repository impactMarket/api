import { stub } from 'sinon';

import { User } from '../../../src/db/models/user';
import UserService from '../../../src/services/user';



describe('user', () => {

    const userFindOneStub = stub(User, 'findOne');

    describe('#welcome(address)', () => {
        it('should return -1 when the value is not present', () => {
            userFindOneStub.returns(Promise.resolve({
                id: 1,
                address: '0x93ewojjdwed',
                username: 'toze',
                avatar: '1',
                language: 'pt',
                currency: 'EUR',
                pushNotificationToken: 'usakdna',
                createdAt: new Date(),
                updatedAt: new Date(),
            }) as any);
            console.log(UserService)
            UserService.welcome('0x833961aab38d24EECdCD2129Aa5a5d41Fd86Acbf').then(console.log)
        });
        // it('should return -1 when the value is not present', () => {
        //     userFindOneStub.callsFake(() => {
        //         return Promise.resolve({
        //             id: 1,
        //             address: '0x93ewojjdwed',
        //             username: 'toze',
        //             avatar: '1',
        //             language: 'pt',
        //             currency: 'EUR',
        //             pushNotificationToken: 'usakdna',
        //             createdAt: new Date(),
        //             updatedAt: new Date(),
        //         }) as any
        //     });
        //     console.log(UserService)
        //     UserService.welcome('0x833961aab38d24EECdCD2129Aa5a5d41Fd86Acbf').then(console.log)
        // });
    });
});