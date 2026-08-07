import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import JSZip from 'jszip';

const runtimeTemplates = [
  {
    zip: 'public/builtin/layaProjectModel/Game1_LT.zip',
    source: 'public/builtin/layaProjectModel/Game1_LT/src/view/game_lt/Components/FractionInput.ts',
    entry: 'src/view/game_lt/Components/FractionInput.ts',
  },
  {
    zip: 'public/builtin/layaProjectModel/Game1_HW.zip',
    source: 'public/builtin/layaProjectModel/Game1_HW/src/view/game_hw/Components/FractionInput.ts',
    entry: 'src/view/game_hw/Components/FractionInput.ts',
  },
  {
    zip: 'public/builtin/layaProjectModel/Game1_PREVIEW.zip',
    source: 'public/builtin/layaProjectModel/Game1_PREVIEW/src/view/game_preview/Components/FractionInput.ts',
    entry: 'src/view/game_preview/Components/FractionInput.ts',
  },
];

const runtimeFiles = runtimeTemplates.map(({ source }) => source);

function readRuntime(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

function compileMethod(relativePath: string, methodName: string, parameterName: string) {
  const source = readRuntime(relativePath);
  const methodMatch = new RegExp(`(?:public|private)\\s+${methodName}\\(`).exec(source);
  const methodStart = methodMatch?.index ?? -1;
  const bodyStart = source.indexOf('{', methodStart);
  assert.ok(methodStart >= 0 && bodyStart > methodStart, `${relativePath} 缺少 ${methodName}`);

  let depth = 0;
  for (let index = bodyStart; index < source.length; index++) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) {
        const body = source
          .slice(bodyStart, index + 1)
          .replace(/:\s*any/g, '')
          .replace(/\s+as\s+KlInputImage\[\]/g, '');
        return `function execute(${parameterName}) ${body}`;
      }
    }
  }

  throw new Error(`${relativePath} 的 ${methodName} 方法体不完整`);
}

test('分数输入框从当前页面查找键盘，不依赖 SDK 私有事件表', () => {
  for (const relativePath of runtimeFiles) {
    const source = readRuntime(relativePath);
    assert.doesNotMatch(source, /\["events"\]|\["_events"\]/);
    assert.doesNotMatch(source, /handels is not iterable/);
    assert.match(source, /node instanceof KlBaseKeyboard/);
    assert.match(source, /node\.getChildAt\(i\)/);
    assert.match(source, /KlKeyboardEvent\.instance\.offAllCaller\(input\)/);
  }
});

test('正课、作业和预习的分数键盘注册实现保持一致', () => {
  const blocks = runtimeFiles.map((relativePath) => {
    const source = readRuntime(relativePath).replace(/\r\n/g, '\n');
    const start = source.indexOf('public removeInputFormKeyBorad');
    const end = source.indexOf('get parentsIsHide');
    assert.ok(start >= 0 && end > start, `${relativePath} 缺少键盘注册实现`);
    return source.slice(start, end);
  });

  assert.equal(blocks[1], blocks[0]);
  assert.equal(blocks[2], blocks[0]);
});

test('单个和多个页面键盘都能被收集且各执行一次', () => {
  class Keyboard {
    destroyed = false;
    numChildren = 0;
    getChildAt() {
      return undefined;
    }
  }

  const createNode = (children: unknown[] = []) => ({
    destroyed: false,
    numChildren: children.length,
    getChildAt: (index: number) => children[index],
  });
  const executeSource = compileMethod(runtimeFiles[0], 'eachAllKeyBorad', 'func');
  const keyboard1 = new Keyboard();
  const keyboard2 = new Keyboard();

  for (const keyboards of [[keyboard1], [keyboard1, keyboard2]]) {
    const view = createNode([createNode(keyboards)]);
    const execute = new Function(
      'VipThink',
      'KlBaseKeyboard',
      `${executeSource}; return execute;`,
    )({ viewMgr: { currPage: { currView: view } } }, Keyboard) as (func: (keyboard: Keyboard) => void) => void;
    const visited: Keyboard[] = [];
    execute((keyboard) => visited.push(keyboard));
    assert.deepEqual(visited, keyboards);
  }
});

test('动态分数输入格重复加入键盘时保持去重', () => {
  const executeSource = compileMethod(runtimeFiles[0], 'addInputToKeyBorad', 'input');
  const input = { camp: 'fraction' };
  const matchingKeyboard = { camp: 'fraction', _campInputs: [], _allInputs: [] };
  const otherKeyboard = { camp: 'number', _campInputs: [], _allInputs: [] };
  const execute = new Function(`${executeSource}; return execute;`)() as (input: typeof input) => void;
  const context = {
    eachAllKeyBorad: (func: (keyboard: typeof matchingKeyboard) => void) => {
      func(matchingKeyboard);
      func(otherKeyboard);
    },
  };

  execute.call(context, input);
  execute.call(context, input);

  assert.deepEqual(matchingKeyboard._campInputs, [input]);
  assert.deepEqual(otherKeyboard._campInputs, []);
  assert.deepEqual(matchingKeyboard._allInputs, [input]);
  assert.deepEqual(otherKeyboard._allInputs, [input]);
});

test('分子或分母获得焦点时分数键禁用并置灰，离开后恢复', () => {
  class Key {
    destroyed = false;
    numChildren = 0;
    output = '<_>';
    disabled = false;
    gray = false;
    mouseEnabled = true;
    getChildAt() {
      return undefined;
    }
  }

  const fractionKey = new Key();
  const keyboard = {
    destroyed: false,
    numChildren: 1,
    getChildAt: () => fractionKey,
  };
  const executeSource = compileMethod(runtimeFiles[0], 'setFractionKeysDisabled', 'disabled');
  const execute = new Function('KlKey', `${executeSource}; return execute;`)(Key) as (disabled: boolean) => void;
  const context = {
    eachAllKeyBorad: (func: (node: typeof keyboard) => void) => func(keyboard),
  };

  execute.call(context, true);
  assert.equal(fractionKey.disabled, true);
  assert.equal(fractionKey.gray, true);
  assert.equal(fractionKey.mouseEnabled, false);

  execute.call(context, false);
  assert.equal(fractionKey.disabled, false);
  assert.equal(fractionKey.gray, false);
  assert.equal(fractionKey.mouseEnabled, true);
});

test('分数结构删除按完整令牌处理且内部重绘不会反向写回', () => {
  for (const relativePath of runtimeFiles) {
    const source = readRuntime(relativePath);
    assert.match(source, /let values = this\.analysisFormula\(this\.fontClipValue\)/);
    assert.match(source, /last\.charAt\(0\) == "<" \|\| last\.charAt\(0\) == "\["/);
    assert.match(source, /values\.pop\(\)/);
    assert.doesNotMatch(source, /match\(\/\[<\.\+\?>\]\/g\)/);
    assert.match(source, /if \(this\.isUpdatingValue\) return/);
    assert.match(source, /try \{[\s\S]*?this\.removeAllInput\(\)[\s\S]*?finally \{[\s\S]*?this\.isUpdatingValue = false/);
  }

  const normalizeSource = compileMethod(runtimeFiles[0], 'normalizeChildValue', 'value');
  const normalize = new Function(`${normalizeSource}; return execute;`)() as (value: string) => string;
  assert.equal(normalize(' '), '');
  assert.equal(normalize('12'), '12');

  const parseSource = compileMethod(runtimeFiles[0], 'analysisFormula', '_str');
  const parse = new Function(`${parseSource}; return execute;`)() as (value: string) => string[];
  const deleteLast = (value: string) => {
    const values = parse(value);
    const last = values[values.length - 1] || '';
    if (last.charAt(0) === '<' || last.charAt(0) === '[') values.pop();
    else if (last) values[values.length - 1] = last.slice(0, -1);
    return values.join('');
  };

  assert.equal(deleteLast('12<3_4>'), '12');
  assert.equal(deleteLast('12[3<4_5>]'), '12');
  assert.equal(deleteLast('123'), '12');
});

test('分数子输入格标记和禁用态实现三份模板一致', () => {
  const blocks = runtimeFiles.map((relativePath) => readRuntime(relativePath).replace(/\r\n/g, '\n'));
  for (const source of blocks) {
    assert.match(source, /KlKeyboardEvent\.instance\.on\(KlKeyboardEvent\.ACTIVE, this, this\.onActiveInput\)/);
    assert.match(source, /input1\["isFractionLeafInput"\] = true/);
  }
  assert.equal(blocks[1], blocks[0]);
  assert.equal(blocks[2], blocks[0]);
});

test('正课、作业和预习模板 zip 均包含最新分数输入框实现', async () => {
  for (const template of runtimeTemplates) {
    const zip = await JSZip.loadAsync(readFileSync(join(process.cwd(), template.zip)));
    const archivedSource = await zip.file(template.entry)?.async('string');
    assert.ok(archivedSource, `${template.zip} 缺少 ${template.entry}`);
    assert.equal(archivedSource, readRuntime(template.source));
  }
});
