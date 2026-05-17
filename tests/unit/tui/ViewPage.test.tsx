import { render } from 'ink-testing-library';
import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '../../../src/infra/i18n';
import { ViewPage } from '../../../src/tui/pages/ViewPage';

describe('ViewPage', () => {
  beforeAll(async () => {
    await initI18n('zh');
  });

  it('renders the path input', () => {
    const { lastFrame } = render(<ViewPage />);
    expect(lastFrame()).toContain('archive path');
  });
});
