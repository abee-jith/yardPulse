"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ApiError, apiRequest, getPayloadData, TOKEN_KEY } from "@/lib/api";

type ContainerSummary = {
  id: string;
  container_no: string;
  status: string;
  yard_location: string | null;
};
type ContainerDetail = ContainerSummary & {
  holds?: Hold[];
  events?: ContainerEvent[];
  appointments?: Appointment[];
};
type Hold = {
  holdType?: string;
  hold_type?: string;
  releasedAt?: string | null;
  released_at?: string | null;
  note?: string | null;
};
type ContainerEvent = {
  eventType?: string;
  event_type?: string;
  occurredAt?: string;
  occurred_at?: string;
  details?: unknown;
};
type Appointment = {
  id: string;
  slotStart?: string;
  slot_start?: string;
  truckPlate?: string;
  truck_plate?: string;
  status: string;
};
type ContainerPage = {
  items: ContainerSummary[];
  nextCursor: string | null;
};
type ChatMessage = { role: "assistant" | "user"; text: string };

const STATUSES = ["On vessel", "In yard", "Departed"];
const DUBAI_TIME_ZONE = "Asia/Dubai";

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load data.";
}

function getActiveHolds(container?: ContainerDetail) {
  return (container?.holds ?? []).filter(
    (hold) => !(hold.releasedAt ?? hold.released_at),
  );
}

function formatDubaiDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DUBAI_TIME_ZONE,
  }).format(new Date(value));
}

function nextAssistantMessage(input: string) {
  const normalized = input.toLowerCase();
  if (normalized.includes("book") || normalized.includes("appointment")) {
    return "Select a container, then choose an available date, a whole-hour slot from 06:00 to 21:00 Dubai time, and enter the truck plate. Containers with an active hold or a status other than In yard cannot be booked.";
  }
  if (normalized.includes("hold")) {
    return "Active holds are shown on the selected container. An active hold makes that container ineligible for an appointment.";
  }
  if (normalized.includes("search") || normalized.includes("container")) {
    return "Use the search box to find a container number. You can also filter by status or whether an active hold is present.";
  }
  return "I can help with container search, active holds, and appointment booking. What would you like to know?";
}

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [authorized, setAuthorized] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [activeHold, setActiveHold] = useState("");
  const [selectedNo, setSelectedNo] = useState("");
  const [date, setDate] = useState("");
  const [hour, setHour] = useState("");
  const [plate, setPlate] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hi! Ask me about container search, holds, or booking an appointment.",
    },
  ]);
  const bookingInFlight = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.replace("/login");
      return;
    }
    apiRequest("/v1/me")
      .then(() => setAuthorized(true))
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          router.replace("/login");
        } else {
          setAuthorized(true);
        }
      });
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const containersQuery = useInfiniteQuery({
    queryKey: ["containers", search, status, activeHold],
    enabled: authorized,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: "25" });
      if (search) params.set("q", search);
      if (status) params.set("status", status);
      if (activeHold) params.set("has_active_hold", activeHold);
      if (pageParam) params.set("cursor", pageParam);
      const response = await apiRequest<ContainerSummary[]>(
        `/v1/containers?${params.toString()}`,
      );
      const items = getPayloadData(response) ?? [];
      return {
        items,
        nextCursor:
          (response as typeof response & { page?: { next_cursor?: string | null } })
            .page?.next_cursor ?? null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const selectedQuery = useQuery({
    queryKey: ["container", selectedNo],
    enabled: authorized && Boolean(selectedNo),
    queryFn: async () => {
      const response = await apiRequest<ContainerDetail>(
        `/v1/containers/${encodeURIComponent(selectedNo)}`,
      );
      const container = getPayloadData(response);
      if (!container) throw new Error("Container details were missing from the API response.");
      return container;
    },
  });

  const container = selectedQuery.data;
  const activeHolds = useMemo(() => getActiveHolds(container), [container]);
  const activeAppointment = container?.appointments?.find(
    (appointment) => appointment.status === "Booked",
  );
  const eligibilityReason =
    container && container.status !== "In yard"
      ? "Only containers with status In yard can be booked."
      : activeHolds.length > 0
        ? "This container has an active hold."
        : activeAppointment
          ? "This container already has an active appointment."
          : "";
  const canBook = Boolean(container && !eligibilityReason);
  const pages = containersQuery.data?.pages ?? [];
  const items = pages.flatMap((page) => page.items);

  const bookingMutation = useMutation({
    mutationFn: async (request: {
      key: string;
      containerNo: string;
      slotStart: string;
      truckPlate: string;
    }) => {
      return apiRequest<Appointment>("/v1/appointments", {
        method: "POST",
        headers: { "Idempotency-Key": request.key },
        body: JSON.stringify({
          container_no: request.containerNo,
          slot_start: request.slotStart,
          truck_plate: request.truckPlate,
        }),
      });
    },
    onSuccess: async (response, request) => {
      const appointment =
        getPayloadData(response) ??
        (response.body?.data as Appointment | undefined);
      if (appointment) {
        queryClient.setQueryData<ContainerDetail>(
          ["container", request.containerNo],
          (current) =>
            current
              ? {
                  ...current,
                  appointments: [
                    ...(current.appointments ?? []).filter(
                      (item) => item.id !== appointment.id,
                    ),
                    appointment,
                  ],
                }
              : current,
        );
      }
      setBookingSuccess("Appointment booked successfully.");
      setBookingError("");
      await queryClient.invalidateQueries({
        queryKey: ["container", request.containerNo],
      });
      await queryClient.invalidateQueries({ queryKey: ["containers"] });
    },
    onError: (error) => {
      setBookingError(messageFrom(error));
      setBookingSuccess("");
    },
  });

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!container || !canBook || bookingInFlight.current) return;
    bookingInFlight.current = true;
    setBookingError("");
    setBookingSuccess("");
    try {
      const idempotencyKey = crypto.randomUUID();
      await bookingMutation.mutateAsync({
        key: idempotencyKey,
        containerNo: container.container_no,
        slotStart: `${date}T${hour}:00:00+04:00`,
        truckPlate: plate.trim(),
      });
      setDate("");
      setHour("");
      setPlate("");
    } catch {
      // The mutation error is shown from its onError handler.
    } finally {
      bookingInFlight.current = false;
    }
  }

  function submitChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    setMessages((current) => [
      ...current,
      { role: "user", text },
      { role: "assistant", text: nextAssistantMessage(text) },
    ]);
    setChatInput("");
  }

  function signOut() {
    localStorage.removeItem(TOKEN_KEY);
    queryClient.clear();
    router.replace("/login");
  }

  if (!authorized) {
    return (
      <main className="grid min-h-screen place-items-center text-sm text-[var(--muted)]">
        Checking your session…
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <a href="/" className="flex items-center gap-3 font-bold">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--green)] text-white">Y</span>
            YardPulse
          </a>
          <button
            className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold hover:bg-[var(--paper)]"
            onClick={signOut}
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-7">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[var(--green)]">
            Terminal workspace
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Container dashboard</h1>
          <p className="mt-2 text-[var(--muted)]">
            Find containers, review activity, and schedule a yard appointment.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.45fr)]">
          <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <h2 className="text-lg font-bold">Find a container</h2>
            <label className="mt-4 block text-sm font-medium">
              Search container number
              <input
                className="mt-2 w-full rounded-xl border border-[var(--line)] px-4 py-3"
                placeholder="e.g. ABCD1234567"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Status
                <select
                  className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-3"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="">All statuses</option>
                  {STATUSES.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Active hold
                <select
                  className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-3"
                  value={activeHold}
                  onChange={(event) => setActiveHold(event.target.value)}
                >
                  <option value="">Any</option>
                  <option value="true">Has active hold</option>
                  <option value="false">No active hold</option>
                </select>
              </label>
            </div>

            {containersQuery.isPending && (
              <p className="py-8 text-center text-sm text-[var(--muted)]">Loading containers…</p>
            )}
            {containersQuery.isError && (
              <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">
                <p role="alert">{messageFrom(containersQuery.error)}</p>
                <button
                  className="mt-2 font-semibold underline"
                  onClick={() => void containersQuery.refetch()}
                >
                  Try again
                </button>
              </div>
            )}
            {!containersQuery.isPending && !containersQuery.isError && items.length === 0 && (
              <p className="py-10 text-center text-sm text-[var(--muted)]">
                No containers match those filters.
              </p>
            )}
            {items.length > 0 && (
              <ul className="mt-5 divide-y divide-[var(--line)]">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-[var(--paper)] ${selectedNo === item.container_no ? "bg-[#edf6f1]" : ""}`}
                      onClick={() => {
                        setSelectedNo(item.container_no);
                        setBookingError("");
                        setBookingSuccess("");
                      }}
                    >
                      <span>
                        <span className="block font-semibold">{item.container_no}</span>
                        <span className="mt-1 block text-xs text-[var(--muted)]">
                          {item.yard_location ?? "Location unavailable"}
                        </span>
                      </span>
                      <span className="rounded-full bg-[#edf2ef] px-3 py-1 text-xs font-medium">
                        {item.status}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {containersQuery.hasNextPage && (
              <button
                className="mt-4 w-full rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-semibold hover:bg-[var(--paper)] disabled:opacity-50"
                onClick={() => void containersQuery.fetchNextPage()}
                disabled={containersQuery.isFetchingNextPage}
              >
                {containersQuery.isFetchingNextPage ? "Loading…" : "Load more"}
              </button>
            )}
          </section>

          <div className="space-y-6">
            <section className="min-h-56 rounded-2xl border border-[var(--line)] bg-white p-5">
              {!selectedNo && (
                <div className="grid min-h-44 place-items-center text-center">
                  <div>
                    <span className="text-3xl">⌕</span>
                    <p className="mt-2 font-semibold">Select a container</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Its status, holds, events, and booking options will appear here.
                    </p>
                  </div>
                </div>
              )}
              {selectedQuery.isPending && selectedNo && (
                <p className="py-12 text-center text-sm text-[var(--muted)]">Loading container details…</p>
              )}
              {selectedQuery.isError && (
                <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
                  {messageFrom(selectedQuery.error)}
                </div>
              )}
              {container && (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                        Container details
                      </p>
                      <h2 className="mt-1 text-2xl font-bold">{container.container_no}</h2>
                    </div>
                    <span className="rounded-full bg-[#e8f4ee] px-3 py-1.5 text-sm font-semibold text-[var(--green-dark)]">
                      {container.status}
                    </span>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-[var(--paper)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Yard location</p>
                      <p className="mt-1 font-semibold">{container.yard_location ?? "Not assigned"}</p>
                    </div>
                    <div className="rounded-xl bg-[var(--paper)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Active holds</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {activeHolds.length ? activeHolds.map((hold, index) => (
                          <span key={`${hold.holdType ?? hold.hold_type}-${index}`} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                            {hold.holdType ?? hold.hold_type ?? "Hold"}
                          </span>
                        )) : <span className="text-sm text-[var(--muted)]">None</span>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="font-bold">Events</h3>
                    {(container.events ?? []).length === 0 ? (
                      <p className="mt-3 text-sm text-[var(--muted)]">No events recorded.</p>
                    ) : (
                      <ol className="mt-3 space-y-3">
                        {[...(container.events ?? [])]
                          .sort((a, b) =>
                            new Date(b.occurredAt ?? b.occurred_at ?? 0).getTime() -
                            new Date(a.occurredAt ?? a.occurred_at ?? 0).getTime(),
                          )
                          .map((event, index) => (
                            <li key={`${event.occurredAt ?? event.occurred_at}-${index}`} className="flex gap-3">
                              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[var(--green)]" />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold">{event.eventType ?? event.event_type ?? "Container event"}</p>
                                <p className="mt-0.5 text-xs text-[var(--muted)]">
                                  {formatDubaiDate(event.occurredAt ?? event.occurred_at)}
                                  {event.details ? ` · ${JSON.stringify(event.details)}` : ""}
                                </p>
                              </div>
                            </li>
                          ))}
                      </ol>
                    )}
                  </div>
                </>
              )}
            </section>

            {container && (
              <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
                <h2 className="text-lg font-bold">Book a yard appointment</h2>
                {eligibilityReason && (
                  <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Booking unavailable: {eligibilityReason}
                  </p>
                )}
                {activeAppointment && (
                  <div className="mt-3 rounded-xl bg-[#edf6f1] px-4 py-3 text-sm">
                    <p className="font-semibold">Appointment {activeAppointment.status}</p>
                    <p className="mt-1 text-[var(--muted)]">
                      {formatDubaiDate(activeAppointment.slotStart ?? activeAppointment.slot_start)}
                      {" · "}
                      {activeAppointment.truckPlate ?? activeAppointment.truck_plate}
                    </p>
                  </div>
                )}
                <form onSubmit={submitBooking} className="mt-4">
                  <fieldset disabled={!canBook || bookingMutation.isPending} className="grid gap-3 sm:grid-cols-3">
                    <label className="text-sm font-medium">
                      Date
                      <input
                        className="mt-2 w-full rounded-xl border border-[var(--line)] px-3 py-3"
                        type="date"
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                        required
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Hour (Dubai)
                      <select
                        className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-3"
                        value={hour}
                        onChange={(event) => setHour(event.target.value)}
                        required
                      >
                        <option value="">Select hour</option>
                        {Array.from({ length: 16 }, (_, index) => index + 6).map((value) => (
                          <option key={value} value={String(value).padStart(2, "0")}>
                            {String(value).padStart(2, "0")}:00
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-medium">
                      Truck plate
                      <input
                        className="mt-2 w-full rounded-xl border border-[var(--line)] px-3 py-3"
                        value={plate}
                        onChange={(event) => setPlate(event.target.value)}
                        maxLength={20}
                        required
                      />
                    </label>
                  </fieldset>
                  {bookingError && (
                    <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
                      {bookingError}
                    </p>
                  )}
                  {bookingSuccess && (
                    <p role="status" className="mt-3 rounded-xl bg-[#edf6f1] px-4 py-3 text-sm text-[var(--green-dark)]">
                      {bookingSuccess}
                    </p>
                  )}
                  <button
                    className="mt-4 rounded-xl bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--green-dark)] disabled:cursor-not-allowed disabled:opacity-50"
                    type="submit"
                    disabled={!canBook || bookingMutation.isPending || !date || !hour || !plate.trim()}
                  >
                    {bookingMutation.isPending ? "Booking…" : "Book"}
                  </button>
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    Slots are on the hour from 06:00–21:00 Dubai time.
                  </p>
                </form>
              </section>
            )}

            <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">YardPulse assistant</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">Ask about search, holds, and booking.</p>
                </div>
                <span className="rounded-full bg-[var(--paper)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
                  Help
                </span>
              </div>
              <div aria-live="polite" className="mt-4 max-h-56 space-y-3 overflow-y-auto rounded-xl bg-[var(--paper)] p-3">
                {messages.map((message, index) => (
                  <div key={index} className={`max-w-[90%] rounded-xl px-3 py-2 text-sm leading-5 ${message.role === "user" ? "ml-auto bg-[var(--green)] text-white" : "bg-white"}`}>
                    {message.text}
                  </div>
                ))}
              </div>
              <form className="mt-3 flex gap-2" onSubmit={submitChat}>
                <input
                  className="min-w-0 flex-1 rounded-xl border border-[var(--line)] px-4 py-3 text-sm"
                  placeholder="Ask a question…"
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                />
                <button
                  className="rounded-xl bg-[var(--green)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--green-dark)] disabled:opacity-50"
                  type="submit"
                  disabled={!chatInput.trim()}
                >
                  Send
                </button>
              </form>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
