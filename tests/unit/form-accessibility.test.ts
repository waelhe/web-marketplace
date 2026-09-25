import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { createBookingAction, createReviewAction } from "@/app/bookings/actions";
import { BookingRequestForm, BookingReviewForm } from "@/app/bookings/forms";
import { updateReviewAction } from "@/app/profile/actions";
import { ReviewEditForm } from "@/app/profile/forms";

const actionState = vi.hoisted(() => ({
  current: { status: "idle" } as unknown,
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useActionState: () => [actionState.current, () => undefined, false],
  };
});

vi.mock("@/lib/dal", () => ({
  getSession: vi.fn(async () => ({
    userId: "00000000-0000-4000-8000-000000000001",
    name: null,
    email: "consumer@example.test",
  })),
}));

vi.mock("@/lib/api/server", () => ({
  backendGet: vi.fn(),
  backendSend: vi.fn(),
  backendSendPublic: vi.fn(),
}));

function formData(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }
  return data;
}

function expectFieldError(markup: string, controlId: string, message: string) {
  const control = markup.match(new RegExp(`<[^>]+id="${controlId}"[^>]*>`))?.[0];
  expect(control).toBeDefined();
  expect(control).toContain('aria-invalid="true"');

  const describedBy = control?.match(/aria-describedby="([^"]+)"/)?.[1];
  expect(describedBy).toBeDefined();
  expect(markup).toContain(`id="${describedBy}" role="alert"`);
  expect(markup).toContain(message);
}

test("local validation errors stay associated with their controls", async () => {
  const bookingState = await createBookingAction(
    { status: "idle" },
    formData({
      listingId: "00000000-0000-4000-8000-000000000001",
      startsAt: "2026-10-10T10:00",
      endsAt: "2026-10-09T10:00",
    }),
  );
  expect(bookingState).toEqual({
    status: "error",
    field: "endsAt",
    message: "نهاية الإقامة يجب أن تكون بعد بدايتها.",
  });
  if (bookingState.status !== "error") throw new Error("Expected booking validation error");
  actionState.current = bookingState;
  expectFieldError(
    renderToStaticMarkup(
      createElement(BookingRequestForm, {
        listingId: "00000000-0000-4000-8000-000000000001",
      }),
    ),
    "booking-ends",
    bookingState.message,
  );

  const bookingReviewState = await createReviewAction(
    { status: "idle" },
    formData({
      bookingId: "00000000-0000-4000-8000-000000000001",
      rating: "0",
      comment: "",
    }),
  );
  expect(bookingReviewState).toEqual({
    status: "error",
    field: "rating",
    message: "التقييم رقم بين 1 و5.",
  });
  if (bookingReviewState.status !== "error") {
    throw new Error("Expected booking review validation error");
  }
  actionState.current = bookingReviewState;
  expectFieldError(
    renderToStaticMarkup(
      createElement(BookingReviewForm, {
        bookingId: "00000000-0000-4000-8000-000000000001",
        direction: "consumer",
      }),
    ),
    "review-rating-00000000-0000-4000-8000-000000000001-consumer",
    bookingReviewState.message,
  );

  const profileState = await updateReviewAction(
    { status: "idle" },
    formData({
      reviewId: "00000000-0000-4000-8000-000000000001",
      rating: "0",
      comment: "",
    }),
  );
  expect(profileState).toEqual({
    status: "error",
    field: "rating",
    message: "التقييم رقم بين 1 و5.",
  });
  if (profileState.status !== "error") throw new Error("Expected profile validation error");
  actionState.current = profileState;
  expectFieldError(
    renderToStaticMarkup(
      createElement(ReviewEditForm, {
        reviewId: "00000000-0000-4000-8000-000000000001",
        rating: 5,
        comment: null,
      }),
    ),
    "review-edit-rating-00000000-0000-4000-8000-000000000001",
    profileState.message,
  );
});
