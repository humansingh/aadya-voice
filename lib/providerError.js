// Structured failure logging for handler and provider errors.
//
// The user-facing strings in index.html stay deliberately calm and generic
// ("something went wrong"), so a server log is the only place the real cause
// is ever recorded. Logging the bare Error was not enough: a provider 400
// that names the exact rejected parameter read as an indistinguishable 500 in
// the browser, which is how a `temperature` the reasoning models reject
// survived several rounds of debugging. Anything here that identifies the
// failure — HTTP status, provider error code, offending parameter — is worth
// more than the stack trace alone.
//
// Never pass user question text or transcripts to these functions. The audit
// collection deliberately holds no raw transcripts, and these lines land in
// the same deployment logs.

function describeError(error) {
  if (!error || typeof error !== 'object') return { message: String(error) };
  return {
    // OpenAI SDK APIError fields; undefined for an ordinary Error.
    status: error.status,
    code: error.code,
    type: error.type,
    param: error.param,
    message: error.message,
  };
}

function logFailure(scope, error) {
  const detail = describeError(error);
  const metadata = ['status', 'code', 'type', 'param']
    .filter((key) => detail[key] !== undefined && detail[key] !== null)
    .map((key) => `${key}=${detail[key]}`)
    .join(' ');
  console.error(`[${scope}] ${metadata || 'no provider metadata'} :: ${detail.message}`);
  if (error?.stack) console.error(error.stack);
}

module.exports = { describeError, logFailure };
