import * as assert from 'assert';

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
