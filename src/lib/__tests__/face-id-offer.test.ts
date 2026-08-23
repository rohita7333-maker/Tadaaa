import { shouldOfferFaceId } from "../face-id-offer";

describe("shouldOfferFaceId", () => {
  const base = {
    signInCount: 2,
    alreadyAsked: false,
    alreadyEnabled: false,
    available: true,
  };

  it("offers on the SECOND sign-in, never the first", () => {
    // The handoff: "Face ID is offered on the second launch, never on first
    // sign-in." Asking during sign-up is asking someone to trust an app they
    // have not used yet.
    expect(shouldOfferFaceId({ ...base, signInCount: 1 })).toBe(false);
    expect(shouldOfferFaceId(base)).toBe(true);
  });

  it("keeps offering on later sign-ins until it has been asked", () => {
    expect(shouldOfferFaceId({ ...base, signInCount: 7 })).toBe(true);
  });

  it("asks only once, ever", () => {
    expect(shouldOfferFaceId({ ...base, alreadyAsked: true })).toBe(false);
  });

  it("does not ask when the lock is already on", () => {
    expect(shouldOfferFaceId({ ...base, alreadyEnabled: true })).toBe(false);
  });

  it("does not ask on a phone that cannot do it", () => {
    expect(shouldOfferFaceId({ ...base, available: false })).toBe(false);
  });

  it("treats a zero or negative count as a first launch", () => {
    expect(shouldOfferFaceId({ ...base, signInCount: 0 })).toBe(false);
    expect(shouldOfferFaceId({ ...base, signInCount: -3 })).toBe(false);
  });
});
