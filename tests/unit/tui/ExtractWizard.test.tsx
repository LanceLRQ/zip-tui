import { render } from 'ink-testing-library';
import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '../../../src/infra/i18n';
import { ExtractWizard } from '../../../src/tui/pages/ExtractWizard';

describe('ExtractWizard', () => {
  beforeAll(async () => {
    await initI18n('zh');
  });

  it('renders the archive-path step', () => {
    const { lastFrame } = render(<ExtractWizard />);
    expect(lastFrame()).toContain('archive path');
  });
});
