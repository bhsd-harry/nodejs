/**
 * 刷新屏幕输出
 * @param str 要输出的字符串
 */
export const refreshStdout = (str: string): void => {
	process.stdout.write(`\x1B[K\x1B[?7l${str}\x1B[?7h\r`);
};
