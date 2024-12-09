import rosu from '@kotrikd/rosu-pp';
import { ClientType, config, wLogger } from '@tosu/common';

import { AbstractInstance } from '@/instances';
import { AbstractState } from '@/states/index';
import { KeyOverlay, LeaderboardPlayer } from '@/states/types';
import { calculateGrade, calculatePassedObjects } from '@/utils/calculators';
import { defaultCalculatedMods, removeDebuffMods } from '@/utils/osuMods';
import { CalculateMods, OsuMods } from '@/utils/osuMods.types';

const defaultLBPlayer = {
    name: '',
    score: 0,
    combo: 0,
    maxCombo: 0,
    mods: Object.assign({}, defaultCalculatedMods),
    h300: 0,
    h100: 0,
    h50: 0,
    h0: 0,
    team: 0,
    position: 0,
    isPassing: false
} as LeaderboardPlayer;

export class Gameplay extends AbstractState {
    isDefaultState: boolean = true;
    isKeyOverlayDefaultState: boolean = true;

    performanceAttributes: rosu.PerformanceAttributes | undefined;
    gradualPerformance: rosu.GradualPerformance | undefined;

    retries: number;
    playerName: string;
    mods: CalculateMods = Object.assign({}, defaultCalculatedMods);
    hitErrors: number[];
    mode: number;
    maxCombo: number;
    score: number;
    hit100: number;
    hit300: number;
    hit50: number;
    hitGeki: number;
    hitKatu: number;
    hitMiss: number;
    sliderEndHits: number;
    smallTickHits: number;
    largeTickHits: number;
    hitMissPrev: number;
    hitUR: number;
    hitSB: number;
    comboPrev: number;
    combo: number;
    playerHPSmooth: number;
    playerHP: number;
    accuracy: number;
    unstableRate: number;
    gradeCurrent: string;
    gradeExpected: string;
    keyOverlay: KeyOverlay;
    isReplayUiHidden: boolean;

    isLeaderboardVisible: boolean = false;
    leaderboardPlayer: LeaderboardPlayer;
    leaderboardScores: LeaderboardPlayer[] = [];

    private cachedkeys: string = '';

    previousState: string = '';
    previousPassedObjects = 0;

    constructor(game: AbstractInstance) {
        super(game);

        this.init();
    }

    init(isRetry?: boolean, from?: string) {
        wLogger.debug(`GD(init) Reset (${isRetry} - ${from})`);

        this.hitErrors = [];
        this.maxCombo = 0;
        this.score = 0;
        this.hit100 = 0;
        this.hit300 = 0;
        this.hit50 = 0;
        this.hitGeki = 0;
        this.hitKatu = 0;
        this.hitMiss = 0;
        this.sliderEndHits = 0;
        this.smallTickHits = 0;
        this.largeTickHits = 0;
        this.hitMissPrev = 0;
        this.hitUR = 0.0;
        this.hitSB = 0;
        this.comboPrev = 0;
        this.combo = 0;
        this.playerHPSmooth = 0.0;
        this.playerHP = 0.0;
        this.accuracy = 100.0;
        this.unstableRate = 0;
        this.gradeCurrent = calculateGrade({
            mods: this.mods.number,
            mode: this.mode,
            hits: {
                300: this.hit300,
                geki: 0,
                100: this.hit100,
                katu: 0,
                50: this.hit50,
                0: this.hitMiss
            }
        });

        this.gradeExpected = this.gradeCurrent;
        this.keyOverlay = {
            K1Pressed: false,
            K1Count: 0,
            K2Pressed: false,
            K2Count: 0,
            M1Pressed: false,
            M1Count: 0,
            M2Pressed: false,
            M2Count: 0
        };
        this.isReplayUiHidden = false;

        this.previousPassedObjects = 0;
        this.gradualPerformance = undefined;
        this.performanceAttributes = undefined;
        // below is data that shouldn't be reseted on retry
        if (isRetry === true) {
            return;
        }

        this.isDefaultState = true;
        this.retries = 0;
        this.playerName = '';
        this.mode = 0;
        this.mods = Object.assign({}, defaultCalculatedMods);
        this.isLeaderboardVisible = false;
        this.leaderboardPlayer = Object.assign({}, defaultLBPlayer);
        this.leaderboardScores = [];
    }

    resetQuick() {
        wLogger.debug('GD(resetQuick) Reset');

        this.previousPassedObjects = 0;
        this.gradualPerformance = undefined;
        this.performanceAttributes = undefined;
    }

    resetKeyOverlay() {
        if (this.isKeyOverlayDefaultState) {
            return;
        }

        wLogger.debug('GD(resetKeyOverlay) Reset');

        this.keyOverlay.K1Pressed = false;
        this.keyOverlay.K2Pressed = false;
        this.keyOverlay.M1Pressed = false;
        this.keyOverlay.M2Pressed = false;

        this.keyOverlay.K1Count = 0;
        this.keyOverlay.K2Count = 0;
        this.keyOverlay.M1Count = 0;
        this.keyOverlay.M2Count = 0;

        this.isKeyOverlayDefaultState = true;
    }

    updateState() {
        try {
            const menu = this.game.get('menu');
            if (menu === null) {
                return 'not-ready';
            }

            const result = this.game.memory.gameplay();
            if (result instanceof Error) throw result;
            if (typeof result === 'string') {
                wLogger.debug(`GD(updateState) ${result}`);
                return 'not-ready';
            }

            // Resetting default state value, to define other componenets that we have touched gameplay
            // needed for ex like you done with replay watching/gameplay and return to mainMenu, you need alteast one reset to gameplay/resultScreen
            this.isDefaultState = false;

            this.retries = result.retries;
            this.playerName = result.playerName;
            this.mods = result.mods;
            this.mode = result.mode;
            this.score = result.score;
            this.playerHPSmooth = result.playerHPSmooth;
            this.playerHP = result.playerHP;
            this.accuracy = result.accuracy;

            this.hit100 = result.hit100;
            this.hit300 = result.hit300;
            this.hit50 = result.hit50;
            this.hitGeki = result.hitGeki;
            this.hitKatu = result.hitKatu;
            this.hitMiss = result.hitMiss;
            this.sliderEndHits = result.sliderEndHits;
            this.smallTickHits = result.smallTickHits;
            this.largeTickHits = result.largeTickHits;

            this.combo = result.combo;
            this.maxCombo = result.maxCombo;

            if (this.maxCombo > 0) {
                const baseUR = this.calculateUR();
                if (
                    (this.mods.number & OsuMods.DoubleTime) ===
                    OsuMods.DoubleTime
                ) {
                    this.unstableRate = baseUR / 1.5;
                } else if (
                    (this.mods.number & OsuMods.HalfTime) ===
                    OsuMods.HalfTime
                ) {
                    this.unstableRate = baseUR * 1.33;
                } else {
                    this.unstableRate = baseUR;
                }
            }

            if (this.comboPrev > this.maxCombo) {
                this.comboPrev = 0;
            }
            if (
                this.combo < this.comboPrev &&
                this.hitMiss === this.hitMissPrev
            ) {
                this.hitSB += 1;
            }
            this.hitMissPrev = this.hitMiss;
            this.comboPrev = this.combo;

            this.updateGrade(menu.objectCount);
            this.updateStarsAndPerformance();
            this.updateLeaderboard();

            this.resetReportCount('GD(updateState)');
        } catch (exc) {
            this.reportError(
                'GD(updateState)',
                10,
                `GD(updateState) ${(exc as any).message}`
            );
            wLogger.debug(exc);
        }
    }

    updateKeyOverlay() {
        try {
            const result = this.game.memory.keyOverlay(this.mode);
            if (result instanceof Error) throw result;
            if (typeof result === 'string') {
                if (result === '') return;

                wLogger.debug(`GD(updateKeyOverlay)`, result);
                return 'not-ready';
            }

            if (result.K1Count < 0 || result.K1Count > 1_000_000) {
                result.K1Pressed = false;
                result.K1Count = 0;
            }
            if (result.K2Count < 0 || result.K2Count > 1_000_000) {
                result.K2Pressed = false;
                result.K2Count = 0;
            }
            if (result.M1Count < 0 || result.M1Count > 1_000_000) {
                result.M1Pressed = false;
                result.M1Count = 0;
            }
            if (result.M2Count < 0 || result.M2Count > 1_000_000) {
                result.M2Pressed = false;
                result.M2Count = 0;
            }

            this.keyOverlay = result;
            this.isKeyOverlayDefaultState = false;

            const keysLine = `${this.keyOverlay.K1Count}:${this.keyOverlay.K2Count}:${this.keyOverlay.M1Count}:${this.keyOverlay.M2Count}`;
            if (this.cachedkeys !== keysLine) {
                wLogger.debug(`GD(updateKeyOverlay) updated ${keysLine}`);
                this.cachedkeys = keysLine;
            }

            this.resetReportCount('GD(updateKeyOverlay)');
        } catch (exc) {
            this.reportError(
                'GD(updateKeyOverlay)',
                10,
                `GD(updateKeyOverlay) ${(exc as any).message}`
            );
            wLogger.debug(exc);
        }
    }

    updateHitErrors() {
        try {
            const result = this.game.memory.hitErrors();
            if (result instanceof Error) throw result;
            if (typeof result === 'string') {
                if (result === '') return;

                wLogger.debug(`GD(updateHitErrors)`, result);
                return 'not-ready';
            }

            this.hitErrors = result;

            this.resetReportCount('GD(updateHitErrors)');
        } catch (exc) {
            this.reportError(
                'GD(updateHitErrors)',
                50,
                `GD(updateHitErrors) ${(exc as any).message}`
            );
            wLogger.debug(exc);
        }
    }

    // IMPROVE, WE DONT NEED TO SUM EVERY HITERROR EACH TIME (for future)
    private calculateUR(): number {
        if (this.hitErrors.length < 1) {
            return 0;
        }

        let totalAll = 0.0;
        for (const hit of this.hitErrors) {
            totalAll += hit;
        }

        const average = totalAll / this.hitErrors.length;
        let variance = 0;
        for (const hit of this.hitErrors) {
            variance += Math.pow(hit - average, 2);
        }
        variance = variance / this.hitErrors.length;

        return Math.sqrt(variance) * 10;
    }

    private updateGrade(objectCount: number) {
        const remaining =
            objectCount - this.hit300 - this.hit100 - this.hit50 - this.hitMiss;

        this.gradeCurrent = calculateGrade({
            mods: this.mods.number,
            mode: this.mode,
            hits: {
                300: this.hit300,
                geki: 0,
                100: this.hit100,
                katu: 0,
                50: this.hit50,
                0: this.hitMiss
            }
        });

        this.gradeExpected = calculateGrade({
            mods: this.mods.number,
            mode: this.mode,
            hits: {
                300: this.hit300 + remaining,
                geki: 0,
                100: this.hit100,
                katu: 0,
                50: this.hit50,
                0: this.hitMiss
            }
        });
    }

    private updateLeaderboard() {
        try {
            const result = this.game.memory.leaderboard();
            if (result instanceof Error) throw result;

            this.isLeaderboardVisible = result[0];
            this.leaderboardPlayer =
                result[1] || Object.assign({}, defaultLBPlayer);
            this.leaderboardScores = result[2];

            this.resetReportCount('GD(updateLeaderboard)');
        } catch (exc) {
            this.reportError(
                'GD(updateLeaderboard)',
                10,
                `GD(updateLeaderboard) ${(exc as any).message}`
            );
            wLogger.debug(exc);
        }
    }

    private updateStarsAndPerformance() {
        try {
            const t1 = performance.now();
            if (!config.calculatePP) {
                wLogger.debug(
                    'GD(updateStarsAndPerformance) pp calculation disabled'
                );
                return;
            }

            const { global, beatmapPP, menu } = this.game.getServices([
                'global',
                'beatmapPP',
                'menu'
            ]);

            if (!global.gameFolder) {
                wLogger.debug(
                    'GD(updateStarsAndPerformance) game folder not found'
                );
                return;
            }

            const currentBeatmap = beatmapPP.getCurrentBeatmap();
            if (!currentBeatmap) {
                wLogger.debug(
                    "GD(updateStarsAndPerformance) can't get current map"
                );
                return;
            }

            const currentState = `${menu.checksum}:${menu.gamemode}:${this.mods.checksum}:${menu.mp3Length}`;
            const isUpdate = this.previousState !== currentState;

            // update precalculated attributes
            if (
                isUpdate ||
                !this.gradualPerformance ||
                !this.performanceAttributes
            ) {
                if (this.gradualPerformance) this.gradualPerformance.free();
                if (this.performanceAttributes)
                    this.performanceAttributes.free();

                const difficulty = new rosu.Difficulty({
                    mods: removeDebuffMods(this.mods.array),
                    lazer: this.game.client === ClientType.lazer
                });
                this.gradualPerformance = new rosu.GradualPerformance(
                    difficulty,
                    currentBeatmap
                );

                this.performanceAttributes = new rosu.Performance({
                    mods: removeDebuffMods(this.mods.array),
                    lazer: this.game.client === ClientType.lazer
                }).calculate(currentBeatmap);

                this.previousState = currentState;
            }

            if (!this.gradualPerformance || !this.performanceAttributes) {
                wLogger.debug(
                    `GD(updateStarsAndPerformance) One of things not ready. GP:${this.gradualPerformance === undefined} - PA:${this.performanceAttributes === undefined}`
                );
                return;
            }

            const passedObjects = calculatePassedObjects(
                this.mode,
                this.hit300,
                this.hit100,
                this.hit50,
                this.hitMiss,
                this.hitKatu,
                this.hitGeki
            );

            const offset = passedObjects - this.previousPassedObjects;
            if (offset <= 0) return;

            const scoreParams: rosu.ScoreState = {
                maxCombo: this.maxCombo,
                misses: this.hitMiss,
                n50: this.hit50,
                n100: this.hit100,
                n300: this.hit300,
                nKatu: this.hitKatu,
                nGeki: this.hitGeki,
                sliderEndHits: this.sliderEndHits,
                osuSmallTickHits: this.smallTickHits,
                osuLargeTickHits: this.largeTickHits
            };

            const currPerformance = this.gradualPerformance.nth(
                scoreParams,
                offset - 1
            )!;

            const fcPerformance = new rosu.Performance({
                mods: removeDebuffMods(this.mods.array),
                misses: 0,
                accuracy: this.accuracy,
                lazer: this.game.client === ClientType.lazer
            }).calculate(this.performanceAttributes);
            const t2 = performance.now();

            if (currPerformance) {
                beatmapPP.updateCurrentAttributes(
                    currPerformance.difficulty.stars,
                    currPerformance.pp
                );

                beatmapPP.updatePPAttributes('curr', currPerformance);
            }

            if (fcPerformance) {
                beatmapPP.currAttributes.fcPP = fcPerformance.pp;
                beatmapPP.updatePPAttributes('fc', fcPerformance);
            }

            this.previousPassedObjects = passedObjects;

            wLogger.debug(
                `GD(updateStarsAndPerformance) [${(t2 - t1).toFixed(2)}ms] elapsed time`
            );

            this.resetReportCount('GD(updateStarsAndPerformance)');
        } catch (exc) {
            this.reportError(
                'GD(updateStarsAndPerformance)',
                10,
                `GD(updateStarsAndPerformance) ${(exc as any).message}`
            );
            wLogger.debug(exc);
        }
    }
}
