import {jsDoc, node, extend} from '@bhsd/code-standard';

export default extend(
	jsDoc,
	...node,
	{
		rules: {
			'n/no-unsupported-features/node-builtins': [
				2,
				{
					allowExperimental: true,
					ignores: ['util.styleText'],
				},
			],
		},
	},
);
