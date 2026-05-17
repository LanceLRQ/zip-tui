import { render } from 'ink-testing-library';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initI18n } from '../../../src/infra/i18n';
import { useAppStore } from '../../../src/store/index';
import { CreateWizard } from '../../../src/tui/pages/CreateWizard';

describe('CreateWizard', () => {
  beforeAll(async () => {
    await initI18n('zh');
  });
  beforeEach(() => {
    useAppStore.getState().wizard.reset();
  });

  it('renders step 0 (archive input)', () => {
    const { lastFrame } = render(<CreateWizard />);
    expect(lastFrame()).toContain('archive name');
  });
});
