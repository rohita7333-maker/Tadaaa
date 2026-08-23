/**
 * Jest setup — native module stubs.
 *
 * `src/lib/supabase.ts` imports @react-native-async-storage/async-storage at
 * module scope (it is the auth session store). Any test that transitively
 * imports it therefore hit `NativeModule: AsyncStorage is null` and the WHOLE
 * suite failed to load — silently, because a suite that never runs contributes
 * zero tests to the pass count rather than a visible failure line.
 *
 * `src/lib/__tests__/pin-gate.test.ts` was in exactly that state: 19 tests that
 * had never executed. The package ships an official Jest mock for this; wire it
 * once here rather than per-suite, so the next lib module that needs Supabase
 * does not re-open the same hole.
 */
jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

/**
 * `src/lib/env.ts` throws at import time when EXPO_PUBLIC_SUPABASE_URL /
 * _ANON_KEY are absent — deliberate, so a misconfigured build fails loudly
 * instead of 401-ing three screens deep. Under Jest there is no Expo inlining
 * step, so the same guard killed every suite that reaches supabase.ts.
 *
 * These are syntactically valid placeholders, NOT credentials: no test may make
 * a real network call, and a test that somehow did would fail against this host
 * rather than mutate the live project.
 */
process.env.EXPO_PUBLIC_SUPABASE_URL ||= "http://localhost:54321";
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||= "test-anon-key";
