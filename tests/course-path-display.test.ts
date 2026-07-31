import assert from 'node:assert/strict';
import test from 'node:test';
import { formatCoursePathTail, joinCoursePathForDisplay } from '../src/utils/coursePathDisplay';

test('课件路径在 Windows 与 POSIX 下都显示末尾两级目录', () => {
  assert.equal(formatCoursePathTail('/Users/rex/courses/A'), 'courses / A');
  assert.equal(formatCoursePathTail('C:\\work\\courses\\A'), 'courses / A');
  assert.equal(formatCoursePathTail('/A'), 'A');
});

test('最终目标路径展示沿用所选目录的分隔符', () => {
  assert.equal(joinCoursePathForDisplay('/Users/rex/courses/', 'A'), '/Users/rex/courses/A');
  assert.equal(joinCoursePathForDisplay('C:\\work\\courses\\', 'A'), 'C:\\work\\courses\\A');
  assert.equal(joinCoursePathForDisplay('C:\\', 'A'), 'C:\\A');
});
