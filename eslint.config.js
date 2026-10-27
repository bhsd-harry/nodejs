import {jsDoc, node, extend, getOxlintConfig} from '@bhsd/code-standard';

const config = getOxlintConfig(extend(
	'module',
	jsDoc,
	...node,
));

export default config;
