import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';
import type * as Ts from 'typescript';

const ts = createRequire(import.meta.url)(
  join(process.cwd(), 'node_modules/typescript/lib/typescript.js'),
) as typeof Ts;

const source = ts.createSourceFile(
  'FieldRenderer.tsx',
  readFileSync(join(process.cwd(), 'src/components/FieldRenderer.tsx'), 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

function jsxTag(node: Ts.JsxElement | Ts.JsxSelfClosingElement): string {
  return ts.isJsxElement(node)
    ? node.openingElement.tagName.getText(source)
    : node.tagName.getText(source);
}

function attributes(node: Ts.JsxElement | Ts.JsxSelfClosingElement): Ts.JsxAttributes {
  return ts.isJsxElement(node)
    ? node.openingElement.attributes
    : node.attributes;
}

function hasAttribute(node: Ts.JsxElement | Ts.JsxSelfClosingElement, name: string): boolean {
  return attributes(node).properties.some((property) => (
    ts.isJsxAttribute(property) && property.name.getText(source) === name
  ));
}

function className(node: Ts.JsxElement | Ts.JsxSelfClosingElement): string {
  const attribute = attributes(node).properties.find((property) => (
    ts.isJsxAttribute(property) && property.name.getText(source) === 'className'
  ));
  return attribute?.getText(source) ?? '';
}

function descendants(
  root: Ts.Node,
  predicate: (node: Ts.JsxElement | Ts.JsxSelfClosingElement) => boolean,
): Array<Ts.JsxElement | Ts.JsxSelfClosingElement> {
  const matches: Array<Ts.JsxElement | Ts.JsxSelfClosingElement> = [];
  const visit = (node: Ts.Node) => {
    if ((ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) && predicate(node)) {
      matches.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return matches;
}

const focusAreas = descendants(source, (node) => (
  jsxTag(node) === 'label' && hasAttribute(node, 'data-answer-focus-area')
));

test('自定义答案配置将序号和输入框声明为同一焦点区', () => {
  assert.equal(focusAreas.length, 1);
  const focusArea = focusAreas[0];
  assert.match(className(focusArea), /col-span-2/);
  assert.match(className(focusArea), /cursor-text/);

  const spans = descendants(focusArea, (node) => jsxTag(node) === 'span');
  const inputs = descendants(focusArea, (node) => (
    jsxTag(node) === 'input' && hasAttribute(node, 'data-answer-input')
  ));
  assert.equal(spans.length, 1);
  assert.equal(inputs.length, 1);
  assert.ok(hasAttribute(inputs[0], 'aria-label'));
  assert.match(className(inputs[0]), /h-7/);
  assert.match(className(inputs[0]), /cursor-text/);
});

test('答案操作按钮是焦点区之后的三个独立栅格项', () => {
  const focusArea = focusAreas[0];
  assert.ok(ts.isJsxElement(focusArea.parent));
  const siblings = focusArea.parent.children.filter((child): child is Ts.JsxElement | Ts.JsxSelfClosingElement => (
    ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)
  ));
  assert.deepEqual(siblings.map(jsxTag), ['label', 'button', 'button', 'button']);
  assert.match(className(focusArea.parent), /grid-cols-\[1rem_minmax\(0,1fr\)_1\.75rem_1\.75rem_1\.75rem\]/);
});
