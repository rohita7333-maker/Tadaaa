/**
 * Edit mode.
 *
 * `invite/[id].tsx` has always pushed `/create?editId=<id>`, and NOTHING read
 * the parameter. The wizard opened blank and `publish()` unconditionally called
 * `createInviteRow`, so pressing the pencil on a live surprise created a
 * DUPLICATE and consumed another invite against the monthly plan limit. The
 * test account's Home list showed two "Maya turns thirty", two "Maya", and
 * "4 of 2 this month on your current plan".
 *
 * No migration is needed: `invites` already carries a permissive UPDATE policy
 * `(auth.uid() = creator_id)`, and `invite_questions` a creator-scoped ALL
 * policy. Verified against the live database, not the `sql/` files.
 *
 * The rules that matter are which columns edit may touch and which it must
 * leave alone, so they live here where they can be tested.
 */
import {
  inviteToDraft,
  inviteUpdatePatch,
  questionPlan,
  type EditableInvite,
} from "../invite-edit";
import { emptyWizardDraft } from "../wizard";
import { toOccasionId } from "../occasions";

function row(over: Partial<EditableInvite> = {}): EditableInvite {
  return {
    id: "inv-1",
    slug: "maya-turns-thirty",
    title: "Maya turns thirty",
    message: "Thirty looks good on you.",
    theme: "golden-hour",
    occasion_type: "birthday",
    reveal_type: "tap",
    countdown_date: null,
    display_timezone: null,
    accept_contributions: false,
    enable_dodge_no: true,
    pin_hash: null,
    pin_hint: null,
    ...over,
  };
}

describe("inviteToDraft — a published row becomes a wizard draft", () => {
  it("carries the words across", () => {
    const { draft } = inviteToDraft(row(), []);
    expect(draft.title).toBe("Maya turns thirty");
    expect(draft.message).toBe("Thirty looks good on you.");
    expect(draft.themeId).toBe("golden-hour");
    expect(draft.occasion).toBe("birthday");
  });

  it("maps reveal_type back to the handoff's style name", () => {
    expect(inviteToDraft(row({ reveal_type: "scroll_story" }), []).draft.revealStyle).toBe("scroll");
    expect(inviteToDraft(row({ reveal_type: "letters" }), []).draft.revealStyle).toBe("letters");
  });

  it("recognises a CUSTOM occasion and refills the name field", () => {
    // A surprise published as "Passed the bar" stores `passed_the_bar`. Editing
    // it must not silently reset the occasion to nothing.
    const { draft } = inviteToDraft(row({ occasion_type: "passed_the_bar" }), []);
    expect(draft.occasion).toBe("custom");
    // Sentence case, not title case: this is what the creator typed, and it
    // must survive a publish → edit → publish round trip unchanged.
    expect(draft.customOccasion).toBe("Passed the bar");
    expect(toOccasionId(draft.customOccasion)).toBe("passed_the_bar");
  });

  it("leaves a built-in occasion alone", () => {
    const { draft } = inviteToDraft(row({ occasion_type: "apology" }), []);
    expect(draft.occasion).toBe("apology");
    expect(draft.customOccasion).toBe("");
  });

  it("derives the schedule mode from countdown_date", () => {
    expect(inviteToDraft(row(), []).draft.scheduleMode).toBe("now");
    const scheduled = inviteToDraft(
      row({ countdown_date: "2030-01-01T00:00:00.000Z", reveal_type: "countdown" }),
      []
    );
    expect(scheduled.draft.scheduleMode).toBe("schedule");
    expect(scheduled.draft.scheduledAt).toBe("2030-01-01T00:00:00.000Z");
  });

  it("shows an existing PIN as on, with no digits", () => {
    // The hash cannot be reversed. The toggle reflects reality; the field stays
    // empty and "empty" means "leave the PIN as it is".
    const { draft } = inviteToDraft(row({ pin_hash: "$2a$…", pin_hint: "The year we met" }), []);
    expect(draft.pinEnabled).toBe(true);
    expect(draft.pin).toBe("");
    expect(draft.pinHint).toBe("The year we met");
  });

  it("brings the first question back into the single question field", () => {
    const { draft } = inviteToDraft(row(), [
      { id: "q1", question_text: "Will you be there?", sort_order: 0 },
    ]);
    expect(draft.question).toBe("Will you be there?");
  });

  it("never carries photos, which live in the bucket and not in the draft", () => {
    expect(inviteToDraft(row(), []).draft.photos).toEqual([]);
  });

  it("opens on the last step, because everything is already filled in", () => {
    expect(inviteToDraft(row(), []).step).toBe(6);
  });

  it("opens earlier when the row could not satisfy a step", () => {
    // A row with no title cannot pass step 2, so dropping the user on step 6
    // would show a Save button over a form they cannot submit.
    expect(inviteToDraft(row({ title: "" }), []).step).toBe(2);
  });
});

describe("inviteUpdatePatch — what edit is allowed to write", () => {
  const draft = {
    ...emptyWizardDraft(),
    occasion: "apology",
    title: " Sorry, properly ",
    message: " I mean it. ",
    themeId: "midnight-romance",
    revealStyle: "countdown" as const,
    scheduleMode: "schedule" as const,
    scheduledAt: "2030-06-01T18:00:00.000Z",
    timezone: "Europe/London",
    contributionsOpen: true,
    dodgingNo: false,
  };

  it("writes the wizard-owned columns, trimmed", () => {
    const patch = inviteUpdatePatch(draft);
    expect(patch.title).toBe("Sorry, properly");
    expect(patch.message).toBe("I mean it.");
    expect(patch.theme).toBe("midnight-romance");
    expect(patch.occasion_type).toBe("apology");
    expect(patch.reveal_type).toBe("countdown");
    expect(patch.countdown_date).toBe("2030-06-01T18:00:00.000Z");
    expect(patch.display_timezone).toBe("Europe/London");
    expect(patch.accept_contributions).toBe(true);
    expect(patch.enable_dodge_no).toBe(false);
  });

  it("NEVER touches the slug, the expiry, payment, activity or the story plaques", () => {
    // Each of these is owned elsewhere: the slug is already shared, `expires_at`
    // belongs to "Extend link", `is_paid` to checkout, `is_active` to the
    // pause control, and `events` to the Scroll Story plan the wizard does not
    // collect — writing [] here would silently erase it.
    const patch = inviteUpdatePatch(draft) as unknown as Record<string, unknown>;
    for (const forbidden of [
      "slug",
      "expires_at",
      "is_paid",
      "is_active",
      "events",
      "creator_id",
      "view_count",
      "response_count",
      "pin_hash",
    ]) {
      expect(Object.prototype.hasOwnProperty.call(patch, forbidden)).toBe(false);
    }
  });

  it("clears countdown_date when the reveal no longer counts down", () => {
    const patch = inviteUpdatePatch({ ...draft, revealStyle: "tap", scheduleMode: "now" });
    expect(patch.countdown_date).toBeNull();
  });

  it("publishes a renamed custom occasion under its new id", () => {
    const patch = inviteUpdatePatch({
      ...draft,
      occasion: "custom",
      customOccasion: "New job",
    });
    expect(patch.occasion_type).toBe("new_job");
  });
});

describe("questionPlan — one question field, a table that can hold many", () => {
  const existing = [{ id: "q1", question_text: "Old text", sort_order: 0 }];

  it("inserts when there was none", () => {
    expect(questionPlan([], "Will you be there?")).toEqual({
      insert: "Will you be there?",
      updateId: null,
      deleteIds: [],
    });
  });

  it("updates the first one in place, keeping its id and its answers", () => {
    // Deleting and reinserting would cascade the answers already collected.
    expect(questionPlan(existing, "New text")).toEqual({
      insert: null,
      updateId: "q1",
      deleteIds: [],
    });
  });

  it("does nothing when the text is unchanged", () => {
    expect(questionPlan(existing, "Old text")).toEqual({
      insert: null,
      updateId: null,
      deleteIds: [],
    });
  });

  it("deletes when the field is cleared", () => {
    expect(questionPlan(existing, "   ")).toEqual({
      insert: null,
      updateId: null,
      deleteIds: ["q1"],
    });
  });

  it("removes extras beyond the first, which the wizard cannot represent", () => {
    const many = [
      { id: "q1", question_text: "Keep", sort_order: 0 },
      { id: "q2", question_text: "Drop", sort_order: 1 },
    ];
    expect(questionPlan(many, "Keep")).toEqual({
      insert: null,
      updateId: null,
      deleteIds: ["q2"],
    });
  });

  it("does nothing at all for an empty field and no rows", () => {
    expect(questionPlan([], "")).toEqual({ insert: null, updateId: null, deleteIds: [] });
  });
});
