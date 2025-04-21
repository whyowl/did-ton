import { toNano, beginCell, Address } from '@ton/core';
import { DidContract } from '../wrappers/Did';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const code = await compile('Did');

    const controller = provider.sender().address as Address;

    const config = {
        controller: beginCell().storeAddress(controller).endCell().beginParse(),
        storageType: beginCell().storeStringTail('none').endCell(),
        storageRef: beginCell().storeStringTail('initial').endCell(),
        updatedAt: Math.floor(Date.now() / 1000),
        nonce: Math.floor(Math.random() * 1000000),
    };

    const did = provider.open(DidContract.createFromConfig(config, code));

    await did.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(did.address);

    console.log('Contract deployed at:', did.address.toString());
}
