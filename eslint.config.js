import {jsDoc, node, extend} from '@bhsd/code-standard';

const config = extend(
	'module',
	jsDoc,
	...node,
);

export default config;
