import * as fs from 'fs';
import * as path from 'path';
import {Session} from 'inspector/promises';
import {styleText} from 'util';
import * as assert from 'assert';
import type {Profiler} from 'inspector';

declare interface ProfileNode extends Pick<Profiler.ProfileNode, 'callFrame' | 'hitCount'> {
	positionTicks: Record<number, number>;
}

/**
 * Adds the ticks to the myTicks object.
 * @param myTicks ticks记录对象
 * @param positionTicks positionTicks数组
 */
const addTicks = (myTicks: Record<number, number>, positionTicks?: Profiler.PositionTickInfo[]): void => {
	if (positionTicks) {
		for (const {line, ticks} of positionTicks) {
			myTicks[line] = (myTicks[line] ?? 0) + ticks;
		}
	}
};

/**
 * 进行性能分析，生成prof.json和prof-summary.json文件
 * @param callback 要分析的函数
 * @param dir 输出文件夹路径
 */
export const profile = async (callback: () => void | Promise<void>, dir: string): Promise<void> => {
	const session = new Session();
	session.connect();
	await session.post('Profiler.enable');
	await session.post('Profiler.start');
	await callback();
	const {nodes} = (await session.post('Profiler.stop')).profile;
	const useful = nodes.filter(
			({callFrame: {url}, hitCount, children}) => url.startsWith('file:///')
				&& (hitCount || children),
		),
		summary: ProfileNode[] = [];
	for (const {callFrame, hitCount, positionTicks} of useful) {
		const existing = summary.find(
				({callFrame: {scriptId, lineNumber, columnNumber}}) => callFrame.scriptId === scriptId
					&& callFrame.lineNumber === lineNumber && callFrame.columnNumber === columnNumber,
			),
			myTicks: Record<number, number> = {};
		addTicks(myTicks, positionTicks);
		if (existing) {
			if (hitCount) {
				existing.hitCount = (existing.hitCount ?? 0) + hitCount;
			}
			addTicks(existing.positionTicks, positionTicks);
		} else {
			summary.push({callFrame, hitCount, positionTicks: myTicks});
		}
	}
	fs.writeFileSync(path.join(dir, 'prof.json'), `${JSON.stringify(useful, null, '\t')}\n`);
	fs.writeFileSync(
		path.join(dir, 'prof-summary.json'),
		`${JSON.stringify(summary, null, '\t')}\n`,
	);
	session.disconnect();
};

/**
 * 刷新屏幕输出
 * @param str 要输出的字符串
 */
export const refreshStdout = (str: string): void => {
	process.stdout.moveCursor(-process.stdout.columns, 0);
	process.stdout.clearLine(0);
	process.stdout.write(`\x1B[?7l${str}\x1B[?7h\r`);
};

/**
 * 将字符串以绿色显示
 * @param str 要显示的字符串
 */
export const green = (str: string): string => styleText('green', str);

/**
 * 将字符串以黄色显示
 * @param str 要显示的字符串
 */
export const yellow = (str: string): string => styleText('yellow', str);

/**
 * 将字符串以红色显示
 * @param str 要显示的字符串
 */
export const red = (str: string): string => styleText('red', str);

/**
 * 将字符串以蓝色显示
 * @param str 要显示的字符串
 */
export const blue = (str: string): string => styleText('blue', str);

export class ReplacableString {
	/** @param input 要替换的字符串 */
	constructor(public input: string) {}

	/**
	 * 替换并确认
	 * @param searchValue 查找的字符串或正则表达式
	 * @param replaceValue 替换的字符串
	 * @param g 是否全局正则表达式
	 * @throws `RangeError` 查找全局正则表达式
	 */
	replace(searchValue: string | RegExp, replaceValue: string, g?: boolean): this {
		if (!g && typeof searchValue === 'object' && searchValue.global) {
			throw new RangeError('search value must not be a global RegExp', {cause: searchValue});
		}
		const {input} = this;
		this.input = input.replace(searchValue, replaceValue);
		assert.notStrictEqual(this.input, input, `replace failed: ${searchValue}`);
		return this;
	}

	/**
	 * 替换全部并检查替换次数
	 * @param searchValue 查找的字符串或正则表达式
	 * @param replaceValue 替换的字符串
	 * @param count 预期替换的次数
	 * @throws `RangeError` 查找的不是字符串或全局正则表达式
	 */
	replaceAll(searchValue: string | RegExp, replaceValue: string, count: number): this {
		const {input} = this,
			msg = `replaceAll failed: ${searchValue}`;
		if (typeof searchValue === 'string') {
			assert.strictEqual(input.split(searchValue).length - 1, count, msg);
		} else if (searchValue.global) {
			// eslint-disable-next-line regexp/prefer-regexp-exec
			assert.strictEqual(input.match(searchValue)?.length, count, msg);
		} else {
			throw new RangeError('search value must be a string or a global RegExp', {cause: searchValue});
		}
		this.input = input.replaceAll(searchValue, replaceValue);
		return this;
	}
}
