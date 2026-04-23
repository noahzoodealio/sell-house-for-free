// Vitest alias target for `server-only`. The real package throws on
// import — only the Next bundler's RSC layer treats it as a no-op. In
// unit tests we want to exercise server-only modules directly, so this
// stub is a no-op.
export {};
