import {RichText} from '@payloadcms/richtext-lexical/react';
import type {JSXConvertersFunction} from '@payloadcms/richtext-lexical/react';
import type {Info} from '../../payload-types';
import {validateURL} from '../../content/validation';
import styles from './FormattedText.module.scss';

const converters: JSXConvertersFunction = ({defaultConverters}) => ({
  ...defaultConverters,
  upload: () => null,
  relationship: () => null,
  link: ({node, nodesToJSX}) => {
    const href = node.fields.url;
    const children = nodesToJSX({nodes: node.children});
    return typeof href === 'string' &&
      (validateURL(href) === true ||
        /^\/(?!\/)|^#|^mailto:|^tel:/.test(href)) ? (
      <a
        href={href}
        target={node.fields.newTab ? '_blank' : undefined}
        rel={node.fields.newTab ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    ) : (
      <>{children}</>
    );
  },
  autolink: ({node, nodesToJSX}) => {
    const href = node.fields.url;
    const children = nodesToJSX({nodes: node.children});
    return typeof href === 'string' && validateURL(href) === true ? (
      <a href={href}>{children}</a>
    ) : (
      <>{children}</>
    );
  },
});

export function FormattedText({data}: {data?: Info['biography']}) {
  return data ? (
    <RichText
      className={`FormattedText ${styles.FormattedText}`}
      data={data}
      converters={converters}
    />
  ) : null;
}
