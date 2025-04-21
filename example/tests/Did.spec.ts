import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, beginCell, toNano } from '@ton/core';
import { DidContract, Opcodes } from '../wrappers/Did'; // Имя класса из wrapper
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('DidContract', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Did');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let did: SandboxContract<DidContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');

        const storageType = beginCell().storeUint(1, 32).endCell();
        const storageRef = beginCell().storeUint(42, 64).endCell();

        did = blockchain.openContract(
            DidContract.createFromConfig(
                {
                    controller: beginCell().storeAddress(deployer.address).endCell().beginParse(),
                    storageType,
                    storageRef,
                    updatedAt: Math.floor(Date.now() / 1000), // или другое значение
                    nonce: Math.floor(Math.random() * 0xfffffff), // если нужен nonce
                },
                code
            )
        );

        const deployResult = await did.sendDeploy(deployer.getSender(), toNano('0.05'));
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: did.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy and return correct controller', async () => {
        const controller = await did.getController();
        expect(controller.equals(deployer.address)).toBe(true);
    });

    it('should update did info', async () => {
        const newStorageType = beginCell().storeUint(2, 32).endCell();
        const newStorageRef = beginCell().storeUint(999, 64).endCell();

        const result = await did.sendUpdateDid(deployer.getSender(), {
            storageType: newStorageType,
            storageRef: newStorageRef,
            value: toNano('0.05'),
        });

        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: did.address,
            success: true,
        });

        const { storageType: type, storageRef: ref, updatedAt: timestamp } = await did.getDidInfo();

        expect(type.hash()).toEqual(newStorageType.hash());
        expect(ref.hash()).toEqual(newStorageRef.hash());
        expect(typeof timestamp).toBe('number');
    });

    it('should update controller', async () => {
        const newController = (await blockchain.treasury('new-controller')).address;

        const result = await did.sendUpdateController(deployer.getSender(), {
            newController,
            value: toNano('0.05'),
        });

        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: did.address,
            success: true,
        });

        const controller = await did.getController();
        expect(controller.equals(newController)).toBe(true);
    });

    it('should reject unauthorized update', async () => {
        const attacker = await blockchain.treasury('attacker');
        const badStorageType = beginCell().storeUint(666, 32).endCell();
        const badStorageRef = beginCell().storeUint(777, 64).endCell();

        const result = await did.sendUpdateDid(attacker.getSender(), {
            storageType: badStorageType,
            storageRef: badStorageRef,
            value: toNano('0.05'),
        });

        expect(result.transactions).toHaveTransaction({
            from: attacker.address,
            to: did.address,
            aborted: true,
        });

        const { storageType: type } = await did.getDidInfo();
        expect(type.hash()).not.toEqual(badStorageType.hash());
    });
});
