import stylelint from 'stylelint';
import selectorParser from 'postcss-selector-parser';
import path from 'node:path';

const ruleName = 'artist/component-root';
const messages = stylelint.utils.ruleMessages(ruleName, {
  root: 'Use one top-level class block and nest all component selectors inside it.',
  name: (expected) =>
    `Name the component root class .${expected} to match the component module.`,
  escape:
    'Keep selectors inside the component root. Nest descendants and states without escaping or renaming the ancestor.',
});

function parentRule(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.type === 'rule') return parent;
  }
}

function isKeyframe(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (
      parent.type === 'atrule' &&
      /^(?:-\w+-)?keyframes$/i.test(parent.name)
    ) {
      return true;
    }
  }
  return false;
}

const componentRoot = (enabled) => (root, result) => {
  if (!stylelint.utils.validateOptions(result, ruleName, {actual: enabled})) {
    return;
  }

  const report = (node, message) =>
    stylelint.utils.report({ruleName, result, node, message});
  let component;
  const filename = root.source?.input.file;
  const expectedName = filename?.endsWith('.module.scss')
    ? path.basename(filename, '.module.scss')
    : undefined;

  root.walkAtRules('at-root', (node) => report(node, messages.escape));
  root.walkRules((node) => {
    if (isKeyframe(node)) return;

    let selectors;
    try {
      selectors = selectorParser().astSync(node.selector);
    } catch {
      report(node, messages.escape);
      return;
    }

    const ancestor = parentRule(node);
    if (!ancestor) {
      const selector = selectors.first;
      if (
        component ||
        node.parent !== root ||
        selectors.nodes.length !== 1 ||
        selector.nodes.length !== 1 ||
        selector.first.type !== 'class'
      ) {
        report(node, messages.root);
      }
      component ??= node;
      if (
        expectedName &&
        selector.nodes.length === 1 &&
        selector.first.type === 'class' &&
        selector.first.value !== expectedName
      ) {
        report(node, messages.name(expectedName));
      }
    }

    let escapes = false;
    selectors.walkPseudos((pseudo) => {
      if (pseudo.value === ':global') escapes = true;
    });
    selectors.walkNesting((nesting) => {
      const selector = nesting.parent;
      if (selector.parent !== selectors || selector.first !== nesting) {
        escapes = true;
      }
      const next = nesting.next();
      if (next?.type === 'tag') escapes = true;
    });
    if (ancestor === component) {
      selectors.each((selector) => {
        if (selector.first?.type !== 'nesting') return;
        // A sibling after the root selects outside the component. A sibling
        // after a descendant stays inside it.
        const combinator = selector.nodes.find(
          (part) => part.type === 'combinator',
        );
        if (combinator && ['+', '~', '||'].includes(combinator.value.trim())) {
          escapes = true;
        }
      });
    }
    if (escapes) report(node, messages.escape);
  });
};

componentRoot.ruleName = ruleName;
componentRoot.messages = messages;
export default stylelint.createPlugin(ruleName, componentRoot);
