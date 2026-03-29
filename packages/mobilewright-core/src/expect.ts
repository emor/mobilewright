import type { Locator } from './locator.js';
import { sleep } from './sleep.js';

const DEFAULT_TIMEOUT = 5_000;
const POLL_INTERVAL = 100;

export interface ExpectOptions {
  timeout?: number;
}

/**
 * Playwright-style expect with auto-retry for mobile locators.
 *
 * Usage:
 *   expect(locator).toBeVisible()
 *   expect(locator).not.toBeVisible()
 *   expect(locator).toHaveText('Hello')
 */
export function expect(locator: Locator): LocatorAssertions {
  return new LocatorAssertions(locator, false);
}

class LocatorAssertions {
  constructor(
    private readonly locator: Locator,
    private readonly negated: boolean,
  ) {}

  get not(): LocatorAssertions {
    return new LocatorAssertions(this.locator, !this.negated);
  }

  async toBeVisible(opts?: ExpectOptions): Promise<void> {
    await this.retryUntil(
      () => this.locator.isVisible({ timeout: 0 }),
      (visible) => (this.negated ? !visible : visible),
      opts?.timeout ?? DEFAULT_TIMEOUT,
      this.negated
        ? 'Expected element to NOT be visible, but it was'
        : 'Expected element to be visible, but it was not',
    );
  }

  async toBeEnabled(opts?: ExpectOptions): Promise<void> {
    await this.retryUntil(
      () => this.locator.isEnabled({ timeout: 0 }),
      (enabled) => (this.negated ? !enabled : enabled),
      opts?.timeout ?? DEFAULT_TIMEOUT,
      this.negated
        ? 'Expected element to NOT be enabled, but it was'
        : 'Expected element to be enabled, but it was not',
    );
  }

  async toHaveText(expected: string | RegExp, opts?: ExpectOptions): Promise<void> {
    await this.assertText(
      (text) => expected instanceof RegExp ? expected.test(text) : text === expected,
      expected, opts,
    );
  }

  async toContainText(expected: string, opts?: ExpectOptions): Promise<void> {
    await this.assertText(
      (text) => text.includes(expected),
      expected, opts,
    );
  }

  async toBeDisabled(opts?: ExpectOptions): Promise<void> {
    await this.retryUntil(
      () => this.locator.isEnabled({ timeout: 0 }),
      (enabled) => (this.negated ? enabled : !enabled),
      opts?.timeout ?? DEFAULT_TIMEOUT,
      this.negated
        ? 'Expected element to NOT be disabled, but it was'
        : 'Expected element to be disabled, but it was not',
    );
  }

  async toBeSelected(opts?: ExpectOptions): Promise<void> {
    await this.retryUntil(
      () => this.locator.isSelected({ timeout: 0 }),
      (selected) => (this.negated ? !selected : selected),
      opts?.timeout ?? DEFAULT_TIMEOUT,
      this.negated
        ? 'Expected element to NOT be selected, but it was'
        : 'Expected element to be selected, but it was not',
    );
  }

  async toHaveFocus(opts?: ExpectOptions): Promise<void> {
    await this.retryUntil(
      () => this.locator.isFocused({ timeout: 0 }),
      (focused) => (this.negated ? !focused : focused),
      opts?.timeout ?? DEFAULT_TIMEOUT,
      this.negated
        ? 'Expected element to NOT have focus, but it did'
        : 'Expected element to have focus, but it did not',
    );
  }

  async toBeChecked(opts?: ExpectOptions): Promise<void> {
    await this.retryUntil(
      () => this.locator.isChecked({ timeout: 0 }),
      (checked) => (this.negated ? !checked : checked),
      opts?.timeout ?? DEFAULT_TIMEOUT,
      this.negated
        ? 'Expected element to NOT be checked, but it was'
        : 'Expected element to be checked, but it was not',
    );
  }

  async toHaveValue(expected: string | RegExp, opts?: ExpectOptions): Promise<void> {
    let lastValue = '';
    await this.retryUntil(
      async () => {
        try { lastValue = await this.locator.getValue({ timeout: 0 }); } catch { lastValue = ''; }
        return lastValue;
      },
      (value) => {
        const matches = expected instanceof RegExp ? expected.test(value) : value === expected;
        return this.negated ? !matches : matches;
      },
      opts?.timeout ?? DEFAULT_TIMEOUT,
      () => this.negated
        ? `Expected element NOT to have value "${expected}", but got "${lastValue}"`
        : `Expected element to have value "${expected}", but got "${lastValue}"`,
    );
  }

  private async assertText(
    predicate: (text: string) => boolean,
    expected: string | RegExp,
    opts?: ExpectOptions,
  ): Promise<void> {
    let lastText = '';
    await this.retryUntil(
      async () => {
        try { lastText = await this.locator.getText({ timeout: 0 }); } catch { lastText = ''; }
        return lastText;
      },
      (text) => {
        const matches = predicate(text);
        return this.negated ? !matches : matches;
      },
      opts?.timeout ?? DEFAULT_TIMEOUT,
      () => this.negated
        ? `Expected element NOT to have text "${expected}", but got "${lastText}"`
        : `Expected element to have text "${expected}", but got "${lastText}"`,
    );
  }

  private async retryUntil<T>(
    poll: () => Promise<T>,
    predicate: (value: T) => boolean,
    timeout: number,
    failMessage: string | (() => string),
  ): Promise<void> {
    const deadline = Date.now() + timeout;

    while (true) {
      if (predicate(await poll())) return;

      if (Date.now() >= deadline) {
        throw new ExpectError(typeof failMessage === 'function' ? failMessage() : failMessage);
      }

      await sleep(POLL_INTERVAL);
    }
  }
}

export class ExpectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExpectError';
  }
}
