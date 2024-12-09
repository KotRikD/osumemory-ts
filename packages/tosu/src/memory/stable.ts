import { config, wLogger } from '@tosu/common';

import { AbstractMemory } from '@/memory';
import type {
    IAudioVelocityBase,
    IBindingValue,
    IConfigValue,
    IGameplay,
    IGlobal,
    IGlobalPrecise,
    IHitErrors,
    IKeyOverlay,
    ILeaderboard,
    IMP3Length,
    IMenu,
    IOffsets,
    IResultScreen,
    ISettingsPointers,
    ITourney,
    ITourneyChat,
    ITourneyUser,
    IUser,
    ScanPatterns
} from '@/memory/types';
import type { ITourneyManagerChatItem } from '@/states/tourney';
import { LeaderboardPlayer } from '@/states/types';
import { netDateBinaryToDate } from '@/utils/converters';
import { calculateMods, defaultCalculatedMods } from '@/utils/osuMods';
import type { BindingsList, ConfigList } from '@/utils/settings.types';

export type OsuPatternData = {
    baseAddr: number;
    playTimeAddr: number;
    chatCheckerPtr: number;
    skinDataAddr: number;
    settingsClassAddr: number;
    configurationAddr: number;
    bindingsAddr: number;
    rulesetsAddr: number;
    canRunSlowlyAddr: number;
    statusPtr: number;
    menuModsPtr: number;
    getAudioLengthPtr: number;
    userProfilePtr: number;
    rawLoginStatusPtr: number;
    spectatingUserPtr: number;
    gameTimePtr: number;
};

export class StableMemory extends AbstractMemory<OsuPatternData> {
    private scanPatterns: ScanPatterns = {
        baseAddr: {
            pattern: 'F8 01 74 04 83 65'
        },
        playTimeAddr: {
            pattern: '5E 5F 5D C3 A1 ?? ?? ?? ?? 89 ?? 04'
        },
        chatCheckerPtr: {
            pattern: '8B CE 83 3D ?? ?? ?? ?? 00 75 ?? 80',
            offset: 0x4
        },
        skinDataAddr: {
            pattern: '74 2C 85 FF 75 28 A1 ?? ?? ?? ?? 8D 15'
        },
        settingsClassAddr: {
            pattern: '83 E0 20 85 C0 7E 2F'
        },
        configurationAddr: {
            pattern: '7E 07 8D 65 F8 5E 5F 5D C3 E8',
            offset: -0xd
        },
        bindingsAddr: {
            pattern: '8D 7D D0 B9 08 00 00 00 33 C0 F3 AB 8B CE 89 4D DC B9',
            offset: 0x2a
        },
        rulesetsAddr: {
            pattern: '7D 15 A1 ?? ?? ?? ?? 85 C0'
        },
        canRunSlowlyAddr: {
            pattern: '55 8B EC 80 3D ?? ?? ?? ?? 00 75 26 80 3D'
        },
        statusPtr: {
            pattern: '48 83 F8 04 73 1E',
            offset: -0x4
        },
        menuModsPtr: {
            pattern: 'C8 FF ?? ?? ?? ?? ?? 81 0D ?? ?? ?? ?? ?? 08 00 00',
            offset: 0x9
        },
        getAudioLengthPtr: {
            pattern: '55 8B EC 83 EC 08 A1 ?? ?? ?? ?? 85 C0',
            offset: 0x7
        },
        userProfilePtr: {
            pattern: 'FF 15 ?? ?? ?? ?? A1 ?? ?? ?? ?? 8B 48 54 33 D2',
            offset: 0x7
        },
        rawLoginStatusPtr: {
            pattern: 'B8 0B 00 00 8B 35',
            offset: -0xb
        },
        spectatingUserPtr: {
            pattern: '8B 0D ?? ?? ?? ?? 85 C0 74 05 8B 50 30',
            offset: -0x4
        },
        gameTimePtr: {
            pattern: 'A1 ?? ?? ?? ?? 89 46 04 8B D6 E8',
            offset: 0x1
        }
    };

    patterns: OsuPatternData = {
        baseAddr: 0,
        playTimeAddr: 0,
        chatCheckerPtr: 0,
        skinDataAddr: 0,
        settingsClassAddr: 0,
        configurationAddr: 0,
        bindingsAddr: 0,
        rulesetsAddr: 0,
        canRunSlowlyAddr: 0,
        statusPtr: 0,
        menuModsPtr: 0,
        getAudioLengthPtr: 0,
        userProfilePtr: 0,
        rawLoginStatusPtr: 0,
        spectatingUserPtr: 0,
        gameTimePtr: 0
    };

    TOURNAMENT_CHAT_ENGINE = 'A1 ?? ?? ?? ?? 89 45 F0 8B D1 85 C9 75';
    ChatAreaAddr: number = 0;

    previousState: string = '';
    previousMP3Length: number = 0;
    previousTime: number = 0;

    getScanPatterns(): ScanPatterns {
        return this.scanPatterns;
    }

    audioVelocityBase(): IAudioVelocityBase {
        if (this.process === null) {
            throw new Error('Process not found');
        }

        // Ruleset = [[Rulesets - 0xB] + 0x4]
        const rulesetAddr = this.process.readInt(
            this.process.readInt(this.getPattern('rulesetsAddr') - 0xb) + 0x4
        );

        if (rulesetAddr === 0) return 'rulesetAddr is zero';

        // [Ruleset + 0x44] + 0x10
        const audioVelocityBase = this.process.readInt(
            this.process.readInt(rulesetAddr + 0x44) + 0x10
        );

        const bassDensityLength = this.process.readInt(audioVelocityBase + 0x4);
        if (bassDensityLength < 40)
            return 'bassDensity length less than 40 (basically it have 1024 values)';

        const result: number[] = [];
        for (let i = 0; i < 40; i++) {
            const current = audioVelocityBase + this.getLeaderStart() + 0x4 * i;
            const value = this.process.readFloat(current);

            result.push(value);
        }

        return result;
    }

    user(): IUser {
        try {
            const profileBase = this.process.readPointer(
                this.getPattern('userProfilePtr')
            );

            const rawLoginStatus = this.process.readPointer(
                this.getPattern('rawLoginStatusPtr')
            );
            const rawBanchoStatus = this.process.readByte(profileBase + 0x88);

            const name = this.process.readSharpString(
                this.process.readInt(profileBase + 0x30)
            );
            const accuracy = this.process.readDouble(profileBase + 0x4);
            const rankedScore = this.process.readLong(profileBase + 0xc);
            const id = this.process.readInt(profileBase + 0x70);
            const level = this.process.readFloat(profileBase + 0x74);
            const playCount = this.process.readInt(profileBase + 0x7c);
            const playMode = this.process.readInt(profileBase + 0x80);
            const rank = this.process.readInt(profileBase + 0x84);
            const countryCode = this.process.readInt(profileBase + 0x98);
            const performancePoints = this.process.readShort(
                profileBase + 0x9c
            );
            // ARGB, to convert use UserProfile.backgroundColour.toString(16)
            const backgroundColour = this.process.readUInt(profileBase + 0xac);

            return {
                name,
                accuracy,
                rankedScore,
                id,
                level,
                playCount,
                playMode,
                rank,
                countryCode,
                performancePoints,
                rawBanchoStatus,
                backgroundColour,
                rawLoginStatus
            };
        } catch (exc) {
            return exc as Error;
        }
    }

    settingsPointers(): ISettingsPointers {
        try {
            const { configurationAddr, bindingsAddr } = this.getPatterns([
                'configurationAddr',
                'bindingsAddr'
            ]);

            const configPointer = this.process.readPointer(configurationAddr);
            const bindingPointer = this.process.readPointer(bindingsAddr);

            return {
                config: configPointer,
                binding: bindingPointer
            };
        } catch (error) {
            return error as Error;
        }
    }

    configOffsets(address: number, list: ConfigList): IOffsets {
        try {
            const result: number[] = [];

            const rawSharpDictionary =
                this.process.readSharpDictionary(address);
            for (let i = 0; i < rawSharpDictionary.length; i++) {
                const current = rawSharpDictionary[i];

                try {
                    const keyAddress = this.process.readInt(current);
                    const key = this.process.readSharpString(keyAddress);

                    if (!(key in list)) {
                        continue;
                    }

                    result.push(i);
                } catch (exc) {
                    wLogger.debug('stable', this.pid, 'configOffsets', exc);
                }
            }

            return result;
        } catch (error) {
            return error as Error;
        }
    }

    bindingsOffsets(address: number, list: BindingsList): IOffsets {
        try {
            const result: number[] = [];

            const rawSharpDictionary =
                this.process.readSharpDictionary(address);
            for (let i = 0; i < rawSharpDictionary.length; i++) {
                const current = rawSharpDictionary[i];
                try {
                    const key = this.process.readInt(current);
                    if (!(key in list)) {
                        continue;
                    }

                    result.push(i);
                } catch (exc) {
                    wLogger.debug('stable', this.pid, 'bindingsOffsets', exc);
                }
            }

            return result;
        } catch (error) {
            return error as Error;
        }
    }

    configValue(
        address: number,
        position: number,
        list: ConfigList
    ): IConfigValue {
        try {
            const offset =
                this.process.readInt(address + 0x8) + 0x8 + 0x10 * position;
            const keyAddress = this.process.readInt(offset);

            const key = this.process.readSharpString(keyAddress);
            const bindable = this.process.readInt(offset + 0x4);

            if (!list[key]) {
                return null;
            }

            let value: any;
            switch (list[key].type) {
                case 'byte':
                    value = this.process.readByte(bindable + 0xc);
                    break;
                case 'bool':
                    value = Boolean(this.process.readByte(bindable + 0xc));
                    break;
                case 'int':
                case 'double':
                    value = this.process.readDouble(bindable + 0x4);
                    break;
                case 'string':
                    value = this.process.readSharpString(
                        this.process.readInt(offset + 0x4)
                    );
                    break;
                case 'bstring':
                    value = this.process.readSharpString(
                        this.process.readInt(bindable + 0x4)
                    );
                    break;
                case 'enum':
                    value = this.process.readInt(bindable + 0xc);
                    break;
                default:
                    break;
            }

            if (value === null || value === undefined) {
                return null;
            }

            return { key, value };
        } catch (error) {
            return error as Error;
        }
    }

    bindingValue(address: number, position: number): IBindingValue {
        try {
            const offset =
                this.process.readInt(address + 0x8) + 0x8 + 0x10 * position;

            const key = this.process.readInt(offset);
            const value = this.process.readInt(offset + 0xc);

            return { key, value };
        } catch (error) {
            return error as Error;
        }
    }

    resultScreen(): IResultScreen {
        try {
            const address = this.getPattern('rulesetsAddr');
            const rulesetAddr = this.process.readInt(
                this.process.readInt(address - 0xb) + 0x4
            );
            if (rulesetAddr === 0) {
                return 'rulesetAddr is zero';
            }

            const resultScreenBase = this.process.readInt(rulesetAddr + 0x38);
            if (resultScreenBase === 0) {
                return 'resultScreenBase is zero';
            }

            const onlineId = this.process.readLong(resultScreenBase + 0x4);
            const playerName = this.process.readSharpString(
                this.process.readInt(resultScreenBase + 0x28)
            );
            const modsInt =
                this.process.readInt(
                    this.process.readInt(resultScreenBase + 0x1c) + 0xc
                ) ^
                this.process.readInt(
                    this.process.readInt(resultScreenBase + 0x1c) + 0x8
                );
            const mode = this.process.readInt(resultScreenBase + 0x64);
            const maxCombo = this.process.readShort(resultScreenBase + 0x68);
            const score = this.process.readInt(resultScreenBase + 0x78);
            const hit100 = this.process.readShort(resultScreenBase + 0x88);
            const hit300 = this.process.readShort(resultScreenBase + 0x8a);
            const hit50 = this.process.readShort(resultScreenBase + 0x8c);
            const hitGeki = this.process.readShort(resultScreenBase + 0x8e);
            const hitKatu = this.process.readShort(resultScreenBase + 0x90);
            const hitMiss = this.process.readShort(resultScreenBase + 0x92);

            const date = netDateBinaryToDate(
                this.process.readInt(resultScreenBase + 0xa4),
                this.process.readInt(resultScreenBase + 0xa0)
            ).toISOString();

            let mods = calculateMods(modsInt, true);
            if (mods instanceof Error)
                mods = Object.assign({}, defaultCalculatedMods);

            return {
                onlineId,
                playerName,
                mods,
                mode,
                maxCombo,
                score,
                hit100,
                hit300,
                hit50,
                hitGeki,
                hitKatu,
                hitMiss,
                sliderEndHits: 0,
                smallTickHits: 0,
                largeTickHits: 0,
                date
            };
        } catch (error) {
            return error as Error;
        }
    }

    gameplay(): IGameplay {
        try {
            const { baseAddr, rulesetsAddr } = this.getPatterns([
                'baseAddr',
                'rulesetsAddr'
            ]);

            const rulesetAddr = this.process.readInt(
                this.process.readInt(rulesetsAddr - 0xb) + 0x4
            );
            if (rulesetAddr === 0) {
                return 'RulesetAddr is 0';
            }

            const gameplayBase = this.process.readInt(rulesetAddr + 0x68);
            if (gameplayBase === 0) {
                return 'gameplayBase is zero';
            }

            const scoreBase = this.process.readInt(gameplayBase + 0x38);
            if (scoreBase === 0) {
                return 'scoreBase is zero';
            }

            const hpBarBase = this.process.readInt(gameplayBase + 0x40);
            if (hpBarBase === 0) {
                return 'hpBar is zero';
            }

            const { beatmapPP, global } = this.game.getServices([
                'beatmapPP',
                'global'
            ]);

            // [Base - 0x33] + 0x8
            const retries = this.process.readInt(
                this.process.readInt(baseAddr - 0x33) + 0x8
            );
            // [[[Ruleset + 0x68] + 0x38] + 0x28]
            const playerName = this.process.readSharpString(
                this.process.readInt(scoreBase + 0x28)
            );
            // [[[Ruleset + 0x68] + 0x38] + 0x1C] + 0xC ^ [[[Ruleset + 0x68] + 0x38] + 0x1C] + 0x8
            const modsInt =
                this.process.readInt(
                    this.process.readInt(scoreBase + 0x1c) + 0xc
                ) ^
                this.process.readInt(
                    this.process.readInt(scoreBase + 0x1c) + 0x8
                );
            // [[Ruleset + 0x68] + 0x38] + 0x64
            const mode = this.process.readInt(scoreBase + 0x64);
            // [[Ruleset + 0x68] + 0x38] + 0x78
            const score = this.process.readInt(rulesetAddr + 0x100);
            // [[Ruleset + 0x68] + 0x40] + 0x14
            const playerHPSmooth =
                this.process.readDouble(hpBarBase + 0x14) || 0;
            // [[Ruleset + 0x68] + 0x40] + 0x1C
            const playerHP = this.process.readDouble(hpBarBase + 0x1c);
            // [[Ruleset + 0x68] + 0x48] + 0xC
            const accuracy = this.process.readDouble(
                this.process.readInt(gameplayBase + 0x48) + 0xc
            );

            let hit100 = 0;
            let hit300 = 0;
            let hit50 = 0;
            let hitGeki = 0;
            let hitKatu = 0;
            let hitMiss = 0;
            let combo = 0;
            let maxCombo = 0;
            if (global.playTime >= beatmapPP.timings.firstObj - 100) {
                // [[Ruleset + 0x68] + 0x38] + 0x88
                hit100 = this.process.readShort(scoreBase + 0x88);
                // [[Ruleset + 0x68] + 0x38] + 0x8A
                hit300 = this.process.readShort(scoreBase + 0x8a);
                // [[Ruleset + 0x68] + 0x38] + 0x8C
                hit50 = this.process.readShort(scoreBase + 0x8c);
                // [[Ruleset + 0x68] + 0x38] + 0x8E
                hitGeki = this.process.readShort(scoreBase + 0x8e);
                // [[Ruleset + 0x68] + 0x38] + 0x90
                hitKatu = this.process.readShort(scoreBase + 0x90);
                // [[Ruleset + 0x68] + 0x38] + 0x92
                hitMiss = this.process.readShort(scoreBase + 0x92);
                // [[Ruleset + 0x68] + 0x38] + 0x94
                combo = this.process.readShort(scoreBase + 0x94);
                // [[Ruleset + 0x68] + 0x38] + 0x68
                maxCombo = this.process.readShort(scoreBase + 0x68);
            }

            let mods = calculateMods(modsInt, true);
            if (mods instanceof Error)
                mods = Object.assign({}, defaultCalculatedMods);

            return {
                retries,
                playerName,
                mods,
                mode,
                score,
                playerHPSmooth,
                playerHP,
                accuracy,
                hit100,
                hit300,
                hit50,
                hitGeki,
                hitKatu,
                hitMiss,
                sliderEndHits: 0,
                smallTickHits: 0,
                largeTickHits: 0,
                combo,
                maxCombo
            };
        } catch (error) {
            return error as Error;
        }
    }

    keyOverlay(mode: number): IKeyOverlay {
        try {
            const address = this.getPattern('rulesetsAddr');
            const rulesetAddr = this.process.readInt(
                this.process.readInt(address - 0xb) + 0x4
            );
            if (rulesetAddr === 0) return 'rulesetAddr is zero';

            const keyOverlayPtr = this.process.readUInt(rulesetAddr + 0xb0);
            if (keyOverlayPtr === 0) {
                if (mode === 3 || mode === 1) return '';

                return `keyOverlayPtr is zero [${keyOverlayPtr}] (${rulesetAddr}  -  ${address})`;
            }

            // [[Ruleset + 0xB0] + 0x10] + 0x4
            const keyOverlayArrayAddr = this.process.readInt(
                this.process.readInt(keyOverlayPtr + 0x10) + 0x4
            );
            if (keyOverlayArrayAddr === 0) return 'keyOverlayAddr[] is zero';

            const itemsSize = this.process.readInt(keyOverlayArrayAddr + 0x4);
            if (itemsSize < 4) {
                return {
                    K1Pressed: false,
                    K1Count: 0,
                    K2Pressed: false,
                    K2Count: 0,
                    M1Pressed: false,
                    M1Count: 0,
                    M2Pressed: false,
                    M2Count: 0
                };
            }

            return {
                K1Pressed: Boolean(
                    this.process.readByte(
                        this.process.readInt(keyOverlayArrayAddr + 0x8) + 0x1c
                    )
                ),
                K1Count: this.process.readInt(
                    this.process.readInt(keyOverlayArrayAddr + 0x8) + 0x14
                ),
                K2Pressed: Boolean(
                    this.process.readByte(
                        this.process.readInt(keyOverlayArrayAddr + 0xc) + 0x1c
                    )
                ),
                K2Count: this.process.readInt(
                    this.process.readInt(keyOverlayArrayAddr + 0xc) + 0x14
                ),
                M1Pressed: Boolean(
                    this.process.readByte(
                        this.process.readInt(keyOverlayArrayAddr + 0x10) + 0x1c
                    )
                ),
                M1Count: this.process.readInt(
                    this.process.readInt(keyOverlayArrayAddr + 0x10) + 0x14
                ),
                M2Pressed: Boolean(
                    this.process.readByte(
                        this.process.readInt(keyOverlayArrayAddr + 0x14) + 0x1c
                    )
                ),
                M2Count: this.process.readInt(
                    this.process.readInt(keyOverlayArrayAddr + 0x14) + 0x14
                )
            };
        } catch (error) {
            return error as Error;
        }
    }

    hitErrors(): IHitErrors {
        try {
            const rulesetsAddr = this.getPattern('rulesetsAddr');

            const rulesetAddr = this.process.readInt(
                this.process.readInt(rulesetsAddr - 0xb) + 0x4
            );
            if (rulesetAddr === 0) return 'RulesetAddr is 0';

            const gameplayBase = this.process.readInt(rulesetAddr + 0x68);
            if (gameplayBase === 0) return 'gameplayBase is zero';

            const scoreBase = this.process.readInt(gameplayBase + 0x38);
            if (scoreBase === 0) return 'scoreBase is zero';

            const leaderStart = this.getLeaderStart();

            const base = this.process.readInt(scoreBase + 0x38);
            const items = this.process.readInt(base + 0x4);
            const size = this.process.readInt(base + 0xc);

            const errors: Array<number> = [];
            for (let i = 0; i < size; i++) {
                const current = items + leaderStart + 0x4 * i;
                const error = this.process.readInt(current);

                errors.push(error);
            }

            return errors;
        } catch (error) {
            return error as Error;
        }
    }

    global(): IGlobal {
        try {
            const {
                statusPtr,
                menuModsPtr,
                chatCheckerPtr,
                skinDataAddr,
                settingsClassAddr,
                canRunSlowlyAddr,
                rulesetsAddr,
                gameTimePtr
            } = this.getPatterns([
                'statusPtr',
                'menuModsPtr',
                'chatCheckerPtr',
                'skinDataAddr',
                'settingsClassAddr',
                'canRunSlowlyAddr',
                'rulesetsAddr',
                'gameTimePtr'
            ]);

            const status = this.process.readPointer(statusPtr);
            const menuMods = this.process.readPointer(menuModsPtr);
            const chatStatus = this.process.readByte(
                this.process.readInt(chatCheckerPtr)
            );
            const isWatchingReplay =
                this.process.readByte(
                    this.process.readInt(canRunSlowlyAddr + 0x46)
                ) === 1;
            const gameTime = this.process.readPointer(gameTimePtr);
            const memorySongsFolder = this.process.readSharpString(
                this.process.readInt(
                    this.process.readInt(
                        this.process.readInt(settingsClassAddr + 0x8) + 0xb8
                    ) + 0x4
                )
            );

            // [[SettingsClass + 0x8] + 0x4] + 0xC
            const showInterface = Boolean(
                this.process.readByte(
                    this.process.readInt(
                        this.process.readInt(settingsClassAddr + 0x8) + 0x4
                    ) + 0xc
                )
            );

            let isReplayUiHidden = false;
            if (isWatchingReplay) {
                const rulesetAddr = this.process.readInt(
                    this.process.readInt(rulesetsAddr - 0xb) + 0x4
                );
                if (rulesetAddr !== 0) {
                    isReplayUiHidden = Boolean(
                        this.process.readByte(rulesetAddr + 0x1d8)
                    );
                }
            }

            const skinOsuAddr = this.process.readInt(skinDataAddr + 0x7);
            let skinFolder = '';
            if (skinOsuAddr !== 0) {
                const skinOsuBase = this.process.readInt(skinOsuAddr);

                skinFolder = this.process.readSharpString(
                    this.process.readInt(skinOsuBase + 0x44)
                );
            }

            let mods = calculateMods(menuMods, true);
            if (mods instanceof Error)
                mods = Object.assign({}, defaultCalculatedMods);

            return {
                isWatchingReplay,
                isReplayUiHidden,

                showInterface,
                chatStatus,
                status,

                gameTime,
                menuMods: mods,

                skinFolder,
                memorySongsFolder
            };
        } catch (error) {
            return error as Error;
        }
    }

    globalPrecise(): IGlobalPrecise {
        try {
            const playTimeAddr = this.getPattern('playTimeAddr');
            const playTime = this.process.readInt(
                this.process.readInt(playTimeAddr + 0x5)
            );

            return { time: playTime };
        } catch (error) {
            return error as Error;
        }
    }

    menu(previousChecksum: string): IMenu {
        try {
            const baseAddr = this.getPattern('baseAddr');

            const beatmapAddr = this.process.readPointer(baseAddr - 0xc);
            if (beatmapAddr === 0) return 'beatmapAddr is 0';

            const gamemode = this.process.readPointer(baseAddr - 0x33);
            const checksum = this.process.readSharpString(
                this.process.readInt(beatmapAddr + 0x6c)
            );
            const filename = this.process.readSharpString(
                this.process.readInt(beatmapAddr + 0x90)
            );

            if (checksum === previousChecksum || !filename.endsWith('.osu')) {
                return gamemode;
            }

            const plays = this.process.readInt(
                this.process.readInt(baseAddr - 0x33) + 0xc
            );
            const artist = this.process.readSharpString(
                this.process.readInt(beatmapAddr + 0x18)
            );
            const artistOriginal = this.process.readSharpString(
                this.process.readInt(beatmapAddr + 0x1c)
            );
            const title = this.process.readSharpString(
                this.process.readInt(beatmapAddr + 0x24)
            );
            const titleOriginal = this.process.readSharpString(
                this.process.readInt(beatmapAddr + 0x28)
            );

            const ar = this.process.readFloat(beatmapAddr + 0x2c);
            const cs = this.process.readFloat(beatmapAddr + 0x30);
            const hp = this.process.readFloat(beatmapAddr + 0x34);
            const od = this.process.readFloat(beatmapAddr + 0x38);
            const audioFilename = this.process.readSharpString(
                this.process.readInt(beatmapAddr + 0x64)
            );
            const backgroundFilename = this.process.readSharpString(
                this.process.readInt(beatmapAddr + 0x68)
            );
            const folder = this.process.readSharpString(
                this.process.readInt(beatmapAddr + 0x78)
            );
            const creator = this.process.readSharpString(
                this.process.readInt(beatmapAddr + 0x7c)
            );
            const difficulty = this.process.readSharpString(
                this.process.readInt(beatmapAddr + 0xac)
            );
            const mapID = this.process.readInt(beatmapAddr + 0xc8);
            const setID = this.process.readInt(beatmapAddr + 0xcc);
            const rankedStatus = this.process.readInt(beatmapAddr + 0x12c);
            const objectCount = this.process.readInt(beatmapAddr + 0xf8);

            return {
                gamemode,
                checksum,
                filename,
                plays,
                artist,
                artistOriginal,
                title,
                titleOriginal,
                ar,
                cs,
                hp,
                od,
                audioFilename,
                backgroundFilename,
                folder,
                creator,
                difficulty,
                mapID,
                setID,
                rankedStatus,
                objectCount
            };
        } catch (error) {
            return error as Error;
        }
    }

    mp3Length(): IMP3Length {
        try {
            const mp3Length = Math.round(
                this.process.readDouble(
                    this.process.readPointer(
                        this.getPattern('getAudioLengthPtr')
                    ) + 0x4
                )
            );

            return mp3Length;
        } catch (error) {
            return error as Error;
        }
    }

    tourney(): ITourney {
        try {
            const address = this.getPattern('rulesetsAddr');
            const rulesetAddr = this.process.readInt(
                this.process.readInt(address - 0xb) + 0x4
            );
            if (rulesetAddr === 0) return 'RulesetAddr is 0';

            const teamLeftBase = this.process.readInt(rulesetAddr + 0x1c);
            const teamRightBase = this.process.readInt(rulesetAddr + 0x20);

            const ipcState = this.process.readInt(rulesetAddr + 0x54);
            const leftStars = this.process.readInt(teamLeftBase + 0x2c);
            const rightStars = this.process.readInt(teamRightBase + 0x2c);
            const bestOf = this.process.readInt(teamRightBase + 0x30);
            const starsVisible = Boolean(
                this.process.readByte(teamRightBase + 0x38)
            );
            const scoreVisible = Boolean(
                this.process.readByte(teamRightBase + 0x39)
            );
            const firstTeamName = this.process.readSharpString(
                this.process.readInt(
                    this.process.readInt(teamLeftBase + 0x20) + 0x144
                )
            );
            const secondTeamName = this.process.readSharpString(
                this.process.readInt(
                    this.process.readInt(teamRightBase + 0x20) + 0x144
                )
            );
            const firstTeamScore = this.process.readInt(teamLeftBase + 0x28);
            const secondTeamScore = this.process.readInt(teamRightBase + 0x28);

            return {
                ipcState,
                leftStars,
                rightStars,
                bestOf,
                starsVisible,
                scoreVisible,
                firstTeamName,
                secondTeamName,
                firstTeamScore,
                secondTeamScore
            };
        } catch (error) {
            return error as Error;
        }
    }

    tourneyChat(messages: ITourneyManagerChatItem[]): ITourneyChat {
        try {
            if (this.ChatAreaAddr === 0) {
                this.ChatAreaAddr = this.process.scanSync(
                    this.TOURNAMENT_CHAT_ENGINE
                );
            }

            const channelsList = this.process.readPointer(
                this.ChatAreaAddr + 0x1
            );
            const channelsItems = this.process.readInt(channelsList + 0x4);
            const channelsLength = this.process.readInt(channelsItems + 0x4);

            for (let i = channelsLength - 1; i >= 0; i--) {
                try {
                    const current =
                        channelsItems + this.getLeaderStart() + 0x4 * i;

                    const channelAddr = this.process.readInt(current);
                    if (channelAddr === 0) {
                        continue;
                    }

                    const chatTag = this.process.readSharpString(
                        this.process.readInt(channelAddr + 0x4)
                    );
                    if (chatTag !== '#multiplayer') {
                        continue;
                    }

                    const result: ITourneyManagerChatItem[] = [];

                    const messagesAddr = this.process.readInt(
                        channelAddr + 0x10
                    );

                    const messagesItems = this.process.readInt(
                        messagesAddr + 0x4
                    );
                    const messagesSize = this.process.readInt(
                        messagesAddr + 0xc
                    );

                    if (messages.length === messagesSize) {
                        // Not needed an update
                        continue;
                    }

                    for (let m = 0; m < messagesSize; m++) {
                        try {
                            const current =
                                messagesItems + this.getLeaderStart() + 0x4 * m;
                            const currentItem = this.process.readInt(current);

                            // [Base + 0x4]
                            const content = this.process.readSharpString(
                                this.process.readInt(currentItem + 0x4)
                            );
                            // NOTE: Check for empty, and !mp commands
                            if (
                                content === '' ||
                                (!config.showMpCommands &&
                                    content.startsWith('!mp'))
                            ) {
                                continue;
                            }
                            // [Base + 0x8]
                            const timeName = this.process.readSharpString(
                                this.process.readInt(currentItem + 0x8)
                            );
                            const [time] = timeName.split(' ');

                            result.push({
                                time: time.trim(),
                                name: timeName
                                    .replace(time, '')
                                    .replace(/:$/, '')
                                    .trimStart(),
                                content
                            });
                        } catch (exc) {
                            wLogger.debug(
                                'stable',
                                this.pid,
                                'tourneyChat',
                                `message loop ${m}`,
                                exc
                            );
                        }
                    }

                    return result;
                } catch (exc) {
                    wLogger.debug(
                        'stable',
                        this.pid,
                        'tourneyChat',
                        `chat loop ${i}`,
                        exc
                    );
                }
            }

            return false;
        } catch (error) {
            return error as Error;
        }
    }

    tourneyUser(): ITourneyUser {
        try {
            const address = this.process.readPointer(
                this.getPattern('spectatingUserPtr')
            );
            if (!address) return 'Slot is not equiped';

            const userAccuracy = this.process.readDouble(address + 0x4);
            const userRankedScore = this.process.readLong(address + 0xc);
            const userPlayCount = this.process.readInt(address + 0x7c);
            const userGlobalRank = this.process.readInt(address + 0x84);
            const userPP = this.process.readInt(address + 0x9c);
            const userName = this.process.readSharpString(
                this.process.readInt(address + 0x30)
            );
            const userCountry = this.process.readSharpString(
                this.process.readInt(address + 0x2c)
            );
            const userID = this.process.readInt(address + 0x70);

            return {
                id: userID,
                name: userName,
                country: userCountry,
                accuracy: userAccuracy,
                playcount: userPlayCount,
                rankedScore: userRankedScore,
                globalRank: userGlobalRank,
                pp: userPP
            };
        } catch (error) {
            return error as Error;
        }
    }

    leaderboard(): ILeaderboard {
        try {
            const rulesetAddr = this.process.readInt(
                this.process.readInt(this.getPattern('rulesetsAddr') - 0xb) +
                    0x4
            );

            const base = this.process.readInt(rulesetAddr + 0x7c);

            if (base === 0) {
                return [false, undefined, []];
            }

            const address = Math.max(0, this.process.readInt(base + 0x24)); // known as leaderBoardAddr, leaderboardBase
            if (address === 0) {
                return [false, undefined, []];
            }

            const playerBase = this.process.readInt(address + 0x10);
            const isVisible = this.process.readByte(
                this.process.readInt(playerBase + 0x24) + 0x20
            );

            const currentPlayer = this.leaderboardPlayer(playerBase);

            const playersAddr = this.process.readInt(address + 0x4);
            const slotsAmount = this.process.readInt(playersAddr + 0xc);
            if (slotsAmount < 1) {
                return [Boolean(isVisible), currentPlayer, []];
            }

            const result: LeaderboardPlayer[] = [];

            const itemsBase = this.process.readInt(playersAddr + 0x4);
            const itemsSize = this.process.readInt(playersAddr + 0xc);
            const leaderStart = this.getLeaderStart();

            for (let i = 0; i < itemsSize; i++) {
                const current = itemsBase + leaderStart + 0x4 * i;

                const lbEntry = this.leaderboardPlayer(
                    this.process.readInt(current)
                );

                if (!lbEntry) {
                    // break due to un-consistency of leaderboard
                    break;
                }

                result.push(lbEntry);
            }

            return [Boolean(isVisible), currentPlayer, result];
        } catch (error) {
            return error as Error;
        }
    }

    private leaderboardPlayer(base: number): LeaderboardPlayer | undefined {
        const entry = this.process.readInt(base + 0x20);
        if (entry === 0) {
            return undefined;
        }

        const modsXor1 = this.process.readInt(
            this.process.readInt(entry + 0x1c) + 0x8
        );
        const modsXor2 = this.process.readInt(
            this.process.readInt(entry + 0x1c) + 0xc
        );

        const modsInt = modsXor1 ^ modsXor2;

        let mods = calculateMods(modsInt, true);
        if (mods instanceof Error)
            mods = Object.assign({}, defaultCalculatedMods);

        const scoreAddr = this.process.readIntPtr(base + 0x20);
        let userId = 0;
        if (scoreAddr !== 0) {
            const userPtr = this.process.readIntPtr(scoreAddr + 0x48);
            if (userPtr !== 0) {
                userId = this.process.readInt(
                    this.process.readIntPtr(scoreAddr + 0x48) + 0x70
                );
            }
        }

        return {
            userId,
            name: this.process.readSharpString(
                this.process.readInt(base + 0x8)
            ),
            score: this.process.readInt(base + 0x30),
            combo: this.process.readShort(entry + 0x94),
            maxCombo: this.process.readShort(entry + 0x68),
            mods,
            h300: this.process.readShort(entry + 0x8a),
            h100: this.process.readShort(entry + 0x88),
            h50: this.process.readShort(entry + 0x8c),
            h0: this.process.readShort(entry + 0x92),
            team: this.process.readInt(base + 0x40),
            position: this.process.readInt(base + 0x2c),
            isPassing: Boolean(this.process.readByte(base + 0x4b))
        };
    }
}
