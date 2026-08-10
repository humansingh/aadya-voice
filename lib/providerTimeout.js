const DEFAULT_TIMEOUT_MS = 15_000;

function timeoutMs() {
  const configured = Number(process.env.PROVIDER_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return Number.isFinite(configured) && configured >= 1000 ? configured : DEFAULT_TIMEOUT_MS;
}

async function withProviderTimeout(run, milliseconds = timeoutMs()) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('provider_timeout')), milliseconds);
  try {
    return await run(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      const timeoutError = new Error('provider_timeout');
      timeoutError.code = 'PROVIDER_TIMEOUT';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { withProviderTimeout, timeoutMs };
