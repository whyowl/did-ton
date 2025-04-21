import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    Slice,
} from '@ton/core';

export type DidConfig = {
    controller: Slice;
    storageType: Cell;
    storageRef: Cell;
    updatedAt: number;
    nonce: number;
};

export function didConfigToCell(config: DidConfig): Cell {
    return beginCell()
        .storeSlice(config.controller)
        .storeUint(config.updatedAt, 64)
        .storeRef(config.storageType)
        .storeRef(config.storageRef)
        .storeUint(config.nonce, 32)
        .endCell();
}

export const Opcodes = {
    update_did: 0x01,
    update_controller: 0x02,
};

export class DidContract implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new DidContract(address);
    }

    static createFromConfig(config: DidConfig, code: Cell, workchain = 0) {
        const data = didConfigToCell(config);
        const init = { code, data };
        return new DidContract(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendUpdateDid(
        provider: ContractProvider,
        via: Sender,
        opts: {
            storageType: Cell;
            storageRef: Cell;
            queryID?: number;
            value: bigint;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.update_did, 32)
                .storeAddress(via.address) // controller sender
                .storeUint(opts.queryID ?? 0, 64)
                .storeRef(opts.storageType)
                .storeRef(opts.storageRef)
                .endCell(),
        });
    }

    async sendUpdateController(
        provider: ContractProvider,
        via: Sender,
        opts: {
            newController: Address;
            queryID?: number;
            value: bigint;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.update_controller, 32)
                .storeAddress(via.address!)
                .storeUint(opts.queryID ?? 0, 64)
                .storeAddress(opts.newController)
                .endCell(),
        });
    }

    async getDidInfo(provider: ContractProvider) {
        const result = await provider.get('get_did_info', []);
        return {
            storageType: result.stack.readCell(),
            storageRef: result.stack.readCell(),
            updatedAt: result.stack.readNumber(),
        };
    }

    async getController(provider: ContractProvider) {
        const result = await provider.get('get_controller', []);
        return result.stack.readAddress();
    }
}
