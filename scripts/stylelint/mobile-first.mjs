import stylelint from 'stylelint';

const ruleName = 'artist/mobile-first';
const messages = stylelint.utils.ruleMessages(ruleName, {
  upperBound:
    'Write small-screen styles in base rules and use minimum-width queries for larger layouts.',
});

const mobileFirst = (enabled) => (root, result) => {
  if (!stylelint.utils.validateOptions(result, ruleName, {actual: enabled})) {
    return;
  }

  root.walkAtRules(/^media$/i, (node) => {
    const query = node.params.replace(/\/\*[\s\S]*?\*\//g, ' ');
    const upperBound =
      /\bmax-(?:device-)?width\b/i.test(query) ||
      [...query.matchAll(/(?<![\w-])(?:device-)?width\s*([<>=]=?)/gi)].some(
        ([, operator]) => /^[<=]/.test(operator),
      ) ||
      [...query.matchAll(/([<>=]=?)\s*(?:device-)?width\b/gi)].some(
        ([, operator]) => /^[>=]/.test(operator),
      );
    if (upperBound) {
      stylelint.utils.report({
        ruleName,
        result,
        node,
        message: messages.upperBound,
      });
    }
  });
};

mobileFirst.ruleName = ruleName;
mobileFirst.messages = messages;
export default stylelint.createPlugin(ruleName, mobileFirst);
