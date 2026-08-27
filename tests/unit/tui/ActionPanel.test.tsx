import { render } from 'ink-testing-library';
import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '../../../src/infra/i18n';
import { ActionPanel } from '../../../src/tui/components/ActionPanel';

const CREATE_CMD = { cmd: '7z', args: ['a', '-mx6', '/w/proj/proj.7z', 'src', 'docs'] };
const EXTRACT_CMD = { cmd: 'unzip', args: ['-o', '/dl/release.zip', '-d', '/dl/release'] };

describe('ActionPanel compress mode', () => {
  beforeAll(async () => {
    await initI18n('zh');
  });

  it('shows the format, level and output fields', () => {
    const { lastFrame } = render(
      <ActionPanel
        kind="compress"
        title="压缩 2 项"
        format="7z"
        level={6}
        output="/w/proj/proj.7z"
        command={CREATE_CMD}
        focusField={0}
      />,
    );
    const out = lastFrame() ?? '';
    expect(out).toContain('格式');
    expect(out).toContain('级别');
    expect(out).toContain('输出');
    expect(out).toContain('7z');
    expect(out).toContain('6');
  });

  // the whole point of this panel is that the command is visible before
  // anything runs, not on a later step
  it('shows the command that will run', () => {
    const { lastFrame } = render(
      <ActionPanel
        kind="compress"
        title="压缩 2 项"
        format="7z"
        level={6}
        output="/w/proj/proj.7z"
        command={CREATE_CMD}
        focusField={0}
      />,
    );
    expect(lastFrame() ?? '').toContain('7z a -mx6');
  });

  it('marks which field has focus', () => {
    const frames = [0, 1, 2].map(
      (f) =>
        render(
          <ActionPanel
            kind="compress"
            title="t"
            format="7z"
            level={6}
            output="/o.7z"
            command={CREATE_CMD}
            focusField={f}
          />,
        ).lastFrame() ?? '',
    );
    expect(new Set(frames).size).toBe(3);
  });
});

describe('ActionPanel extract mode', () => {
  beforeAll(async () => {
    await initI18n('zh');
  });

  it('shows scope and target instead of format and level', () => {
    const { lastFrame } = render(
      <ActionPanel
        kind="extract"
        title="解压 release.zip"
        output="/dl/release"
        scopeLabel="全部"
        command={EXTRACT_CMD}
        focusField={0}
      />,
    );
    const out = lastFrame() ?? '';
    expect(out).toContain('范围');
    expect(out).toContain('目标');
    expect(out).toContain('全部');
    expect(out).not.toContain('级别');
  });

  // the extraction default depends on what is inside the archive, so the user
  // has to be able to read the resolved path in full
  it('shows the resolved target path in full', () => {
    const { lastFrame } = render(
      <ActionPanel
        kind="extract"
        title="t"
        output="/dl/release"
        scopeLabel="全部"
        command={EXTRACT_CMD}
        focusField={0}
      />,
    );
    expect(lastFrame() ?? '').toContain('/dl/release');
  });
});

describe('ActionPanel messages', () => {
  beforeAll(async () => {
    await initI18n('zh');
  });

  // a collision is not an error — you may well want to proceed — but it must
  // not look like everything is fine either
  it('shows a warning without looking like a failure', () => {
    const { lastFrame } = render(
      <ActionPanel
        kind="extract"
        title="t"
        output="/dl/release"
        scopeLabel="全部"
        command={EXTRACT_CMD}
        focusField={0}
        warning="目标已存在"
      />,
    );
    expect(lastFrame() ?? '').toContain('目标已存在');
  });

  it('shows an error', () => {
    const { lastFrame } = render(
      <ActionPanel
        kind="compress"
        title="t"
        format="7z"
        level={6}
        output=""
        command={CREATE_CMD}
        focusField={0}
        error="输出路径不能为空"
      />,
    );
    expect(lastFrame() ?? '').toContain('输出路径不能为空');
  });

  it('shows a warning and an error at the same time when both apply', () => {
    const { lastFrame } = render(
      <ActionPanel
        kind="compress"
        title="t"
        format="7z"
        level={6}
        output="/o.7z"
        command={CREATE_CMD}
        focusField={0}
        warning="目标已存在"
        error="磁盘空间不足"
      />,
    );
    const out = lastFrame() ?? '';
    expect(out).toContain('目标已存在');
    expect(out).toContain('磁盘空间不足');
  });

  it('says how to run and how to cancel', () => {
    const { lastFrame } = render(
      <ActionPanel
        kind="compress"
        title="t"
        format="7z"
        level={6}
        output="/o.7z"
        command={CREATE_CMD}
        focusField={0}
      />,
    );
    const out = lastFrame() ?? '';
    expect(out).toContain('Enter');
    expect(out).toContain('Esc');
  });
});

describe('ActionPanel preview height', () => {
  beforeAll(async () => {
    await initI18n('zh');
  });

  const many = Array.from({ length: 20 }, (_, i) => `some-project-directory/source-${i}.ts`);
  const LONG_CMD = { cmd: '7z', args: ['a', '-mx6', '/w/proj/proj.7z', ...many] };

  // losing the way out is far worse than losing the tail of a command whose
  // item count the title already states
  it('keeps the controls visible when the command is clipped', () => {
    const { lastFrame } = render(
      <ActionPanel
        kind="compress"
        title="压缩 20 项"
        format="7z"
        level={6}
        output="/w/proj/proj.7z"
        command={LONG_CMD}
        focusField={0}
        previewRows={4}
      />,
    );
    const out = lastFrame() ?? '';
    expect(out).toContain('Esc');
    expect(out).toContain('Enter');
  });

  it('still shows the start of the command so its shape is readable', () => {
    const { lastFrame } = render(
      <ActionPanel
        kind="compress"
        title="压缩 20 项"
        format="7z"
        level={6}
        output="/w/proj/proj.7z"
        command={LONG_CMD}
        focusField={0}
        previewRows={4}
      />,
    );
    expect(lastFrame() ?? '').toContain('7z a -mx6');
  });
});
