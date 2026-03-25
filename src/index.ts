import * as fs from 'fs';
import * as path from 'path';
import {Session} from 'inspector/promises';
import {styleText} from 'util';
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
