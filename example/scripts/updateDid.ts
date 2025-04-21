import { Address, beginCell, toNano } from '@ton/core';
import { DidContract } from '../wrappers/Did';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('DId contract address'));
    const storageType =  await ui.input('New storage type');
    const storageRef =  await ui.input('New storage ref');


    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }

    const did = provider.open(DidContract.createFromAddress(address));

    const newStorageType = beginCell().storeStringTail(storageType).endCell();
    const newStorageRef = beginCell().storeStringTail(storageRef).endCell();

    await did.sendUpdateDid(provider.sender(), {
        storageType: newStorageType,
        storageRef: newStorageRef,
        value: toNano('0.01'),
    });

    await provider.waitForDeploy(did.address);

    ui.write('Storage update transaction sent!');
}
