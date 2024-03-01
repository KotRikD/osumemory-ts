import ProcessUtils from '.';

export interface ProcessInfo {
    id: number;
    exeFile: string;
    parentId: number;
    pcPriClassBase: number;
}

export class Process {
    public id: number;
    public handle: number;

    constructor(id: number) {
        this.id = id;
        this.handle = ProcessUtils.openProcess(this.id);
    }

    static findProcesses(imageName: string): number[] {
        return ProcessUtils.findProcesses(imageName);
    }

    static isProcessExist(pid: number): boolean {
        return ProcessUtils.isProcessExist(pid);
    }

    get path(): string {
        return ProcessUtils.getProcessPath(this.handle);
    }

    readByte(address: number): number {
        return ProcessUtils.readByte(this.handle, address);
    }

    readShort(address: number): number {
        return ProcessUtils.readShort(this.handle, address);
    }

    readInt(address: number): number {
        return ProcessUtils.readInt(this.handle, address);
    }

    readUInt(address: number): number {
        return ProcessUtils.readUInt(this.handle, address);
    }

    readPointer(address: number): number {
        return this.readInt(this.readInt(address));
    }

    readLong(address: number): number {
        return ProcessUtils.readLong(this.handle, address);
    }

    readFloat(address: number): number {
        return ProcessUtils.readFloat(this.handle, address);
    }

    readDouble(address: number): number {
        return ProcessUtils.readDouble(this.handle, address);
    }

    /* dumbass thing ever... please pr this, if you know, how to deal with that better... */
    readSharpString(address: number): string {
        // Check for null strings (exists somehow in osu!)
        if (address === 0) {
            return '';
        }
        const length = this.readInt(address + 0x4);
        if (length < 0 || length > 4096) {
            return '';
        }
        const endString = this.readBuffer(address + 0x8, length * 2).toString(
            'utf16le'
        );

        return endString;
    }

    readSharpDictionary(
        address: number,
        onLoop: (current: number) => boolean
    ): void {
        const items = this.readInt(address + 0x8);
        const size = this.readInt(address + 0x1c);

        for (let i = 0; i < size; i++) {
            const current = items + 0x8 + 0x10 * i;

            if (!onLoop(current)) {
                return;
            }
        }
    }

    readBuffer(address: number, size: number): Buffer {
        return ProcessUtils.readBuffer(this.handle, address, size);
    }

    scanSync(
        pattern: string,
        refresh: boolean = false,
        baseAddress: number = 0
    ): number {
        const buffer = Buffer.from(
            pattern
                .split(' ')
                .map((x) => (x === '??' ? '00' : x))
                .join(''),
            'hex'
        );

        return ProcessUtils.scanSync(this.handle, baseAddress, buffer, refresh);
    }

    scan(
        pattern: string,
        callback: (address: number) => void,
        refresh: boolean = false,
        baseAddress: number = 0
    ): void {
        const buffer = Buffer.from(
            pattern
                .split(' ')
                .map((x) => (x === '??' ? '00' : x))
                .join(''),
            'hex'
        );

        ProcessUtils.scan(this.handle, baseAddress, buffer, refresh, callback);
    }

    scanAsync(
        pattern: string,
        refresh: boolean = false,
        baseAddress: number = 0
    ): Promise<number> {
        const buffer = Buffer.from(
            pattern
                .split(' ')
                .map((x) => (x === '??' ? '00' : x))
                .join(''),
            'hex'
        );

        return new Promise((resolve, reject) => {
            try {
                ProcessUtils.scan(
                    this.handle,
                    baseAddress,
                    buffer,
                    refresh,
                    resolve
                );
            } catch (e) {
                reject(e);
            }
        });
    }

    static getProcesses(): Array<ProcessInfo> {
        return ProcessUtils.getProcesses();
    }
}
