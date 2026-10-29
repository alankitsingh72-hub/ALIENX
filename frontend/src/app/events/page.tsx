"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Flame,
  Plus,
  ScrollText,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { api, type Event } from "@/lib/api";
import { useAuth } from "@/lib/store";

const EVENT_TYPES = ["Quizathon", "Hackathon", "Ideathon", "Buildathon", "Innovathon"] as const;

export default function EventsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [timeframe, setTimeframe] = useState<"all" | "upcoming" | "ongoing" | "past">("all");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [rulesModalEvent, setRulesModalEvent] = useState<Event | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<string>("Quizathon");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [prizes, setPrizes] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [duration, setDuration] = useState("24 Hours");
  const [maxParticipants, setMaxParticipants] = useState(300);
  const [errorMsg, setErrorMsg] = useState("");

  const { data: events, isLoading } = useQuery({
    queryKey: ["events", timeframe, selectedType],
    queryFn: () => {
      const params = new URLSearchParams();
      if (timeframe !== "all") params.append("timeframe", timeframe);
      if (selectedType !== "All") params.append("event_type", selectedType);
      const query = params.toString() ? `?${params.toString()}` : "";
      return api<Event[]>(`/events${query}`);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (eventId: number) => api<{ registered: boolean; message: string }>(`/events/${eventId}/register`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (newEvent: Partial<Event>) => api<Event>("/events", { method: "POST", body: JSON.stringify(newEvent) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Failed to create event");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId: number) => api<void>(`/events/${eventId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  const resetForm = () => {
    setTitle("");
    setEventType("Quizathon");
    setDescription("");
    setRules("");
    setPrizes("");
    setStartTime("");
    setEndTime("");
    setDuration("24 Hours");
    setMaxParticipants(300);
    setErrorMsg("");
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !startTime || !endTime) {
      setErrorMsg("Please fill in all mandatory event fields");
      return;
    }
    createMutation.mutate({
      title,
      event_type: eventType,
      description,
      rules,
      prizes,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      duration,
      max_participants: Number(maxParticipants),
      is_published: true,
    });
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type.toLowerCase()) {
      case "quizathon":
        return "bg-amber-500/10 text-amber-700 border-amber-200";
      case "hackathon":
        return "bg-purple-500/10 text-purple-700 border-purple-200";
      case "ideathon":
        return "bg-emerald-500/10 text-emerald-700 border-emerald-200";
      case "buildathon":
        return "bg-cyan-500/10 text-cyan-700 border-cyan-200";
      case "innovathon":
        return "bg-rose-500/10 text-rose-700 border-rose-200";
      default:
        return "bg-blue-500/10 text-blue-700 border-blue-200";
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "ongoing":
        return "bg-emerald-50 text-emerald-700 border-emerald-300 animate-pulse";
      case "upcoming":
        return "bg-blue-50 text-blue-700 border-blue-300";
      case "past":
        return "bg-slate-100 text-slate-500 border-slate-300";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <AppShell
      currentPath="/events"
      title="Competitive Events"
      subtitle="Quizathons, Hackathons, Ideathons, Buildathons & Innovathons"
      action={
        user?.role !== "student" ? (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-teal px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition"
          >
            <Plus size={16} />
            Create Event
          </button>
        ) : null
      }
    >
      {/* Overview Banner */}
      <div className="mb-8 rounded-3xl border border-slate-200 bg-gradient-to-r from-[#102a43] via-[#1b3d5d] to-[#0f4c81] p-6 text-white shadow-sm md:p-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-teal-200 backdrop-blur-md">
            <Trophy size={14} /> National Campus Challenges 2026
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
            ALIENX Technical & Innovation Arena
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Showcase your engineering prowess across algorithmic Quizathons, 48-hour continuous Hackathons,
            sustainable Ideathons, full-stack Buildathons, and enterprise Innovathons.
          </p>
        </div>
      </div>

      {/* Filters: Timeframe tabs + Type pills */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Timeframe tabs */}
        <div className="flex rounded-2xl bg-slate-200/80 p-1 text-xs font-semibold text-slate-600">
          {(["all", "upcoming", "ongoing", "past"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`rounded-xl px-4 py-2 capitalize transition ${
                timeframe === t ? "bg-white text-navy shadow-sm" : "hover:text-navy"
              }`}
            >
              {t === "all" ? "All Events" : t}
            </button>
          ))}
        </div>

        {/* Event Type pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setSelectedType("All")}
            className={`rounded-xl border px-3 py-1.5 font-medium transition ${
              selectedType === "All"
                ? "border-teal bg-teal text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            All Types
          </button>
          {EVENT_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`rounded-xl border px-3 py-1.5 font-medium transition ${
                selectedType === type
                  ? "border-teal bg-teal text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Event Listing Grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white p-6" />
          ))}
        </div>
      ) : events && events.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const startDateStr = new Date(event.start_time).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const percentFilled = Math.min(100, Math.round((event.registration_count / (event.max_participants || 1)) * 100));

            return (
              <div
                key={event.id}
                className="group flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition hover:border-teal/40 hover:shadow-md"
              >
                <div>
                  {/* Card Header badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded-xl border px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase ${getTypeBadgeStyle(
                        event.event_type
                      )}`}
                    >
                      {event.event_type}
                    </span>
                    <span
                      className={`rounded-xl border px-2.5 py-1 text-[11px] font-semibold capitalize ${getStatusBadgeStyle(
                        event.status
                      )}`}
                    >
                      {event.status === "ongoing" ? "● Ongoing Now" : event.status}
                    </span>
                  </div>

                  <h3 className="mt-3.5 text-base font-bold text-navy group-hover:text-teal transition">
                    {event.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600">
                    {event.description}
                  </p>

                  {/* Metadata Chips */}
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-teal" />
                      <span>Starts: {startDateStr}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-teal" />
                      <span>Duration: {event.duration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={13} className="text-teal" />
                      <span>
                        {event.registration_count} / {event.max_participants} Registered
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar of Capacity */}
                  <div className="mt-2.5">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percentFilled > 80 ? "bg-amber-500" : "bg-teal"
                        }`}
                        style={{ width: `${percentFilled}%` }}
                      />
                    </div>
                  </div>

                  {/* Prizes preview if any */}
                  {event.prizes && (
                    <div className="mt-3.5 rounded-xl bg-amber-500/5 p-2.5 text-[11px] text-amber-800 border border-amber-200/50">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Trophy size={13} className="text-amber-600" /> Prize Highlights
                      </div>
                      <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-amber-700/90 whitespace-pre-line">
                        {event.prizes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <button
                    onClick={() => setRulesModalEvent(event)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-navy transition"
                  >
                    <ScrollText size={14} /> Rules & Info
                  </button>

                  <div className="flex items-center gap-2">
                    {user?.role === "student" && event.status !== "past" && (
                      <button
                        onClick={() => registerMutation.mutate(event.id)}
                        disabled={registerMutation.isPending}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                          event.is_registered
                            ? "bg-slate-100 text-rose-600 hover:bg-rose-50 border border-rose-200"
                            : "bg-teal text-white hover:opacity-90 shadow-sm"
                        }`}
                      >
                        {event.is_registered ? "Registered (Cancel)" : "Register Now"}
                      </button>
                    )}

                    {user?.role !== "student" && (
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete event "${event.title}"?`)) {
                            deleteMutation.mutate(event.id);
                          }
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Delete Event"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Calendar size={36} className="mx-auto text-slate-400" />
          <h3 className="mt-3 text-sm font-bold text-navy">No Events Found</h3>
          <p className="mt-1 text-xs text-slate-500">
            There are no {timeframe !== "all" ? timeframe : ""} {selectedType !== "All" ? selectedType : ""} events matching your filter.
          </p>
        </div>
      )}

      {/* Rules & Guidelines Modal */}
      {rulesModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-xl border px-2.5 py-0.5 text-[10px] font-bold uppercase ${getTypeBadgeStyle(
                    rulesModalEvent.event_type
                  )}`}
                >
                  {rulesModalEvent.event_type}
                </span>
                <h3 className="text-base font-bold text-navy">{rulesModalEvent.title}</h3>
              </div>
              <button
                onClick={() => setRulesModalEvent(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs leading-relaxed text-slate-600">
              <div>
                <h4 className="font-bold text-navy">Description</h4>
                <p className="mt-1 text-slate-600">{rulesModalEvent.description}</p>
              </div>

              {rulesModalEvent.rules && (
                <div>
                  <h4 className="font-bold text-navy">Rules & Regulations</h4>
                  <p className="mt-1 whitespace-pre-line text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100">
                    {rulesModalEvent.rules}
                  </p>
                </div>
              )}

              {rulesModalEvent.prizes && (
                <div>
                  <h4 className="font-bold text-navy">Prizes & Recognition</h4>
                  <p className="mt-1 whitespace-pre-line text-amber-800 bg-amber-50/50 rounded-xl p-3 border border-amber-200/50">
                    {rulesModalEvent.prizes}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 text-[11px] text-slate-500">
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <div className="font-bold text-navy">Start Time</div>
                  <div>{new Date(rulesModalEvent.start_time).toLocaleString()}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <div className="font-bold text-navy">End Time</div>
                  <div>{new Date(rulesModalEvent.end_time).toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setRulesModalEvent(null)}
                className="rounded-xl bg-navy px-5 py-2 text-xs font-semibold text-white hover:opacity-90 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-navy">Publish New Challenge / Event</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                <AlertCircle size={15} /> {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700">Event Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. National Full-Stack Buildathon 2026"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Event Type *</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Duration *</label>
                  <input
                    type="text"
                    required
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 24 Hours / 3 Days"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700">Description *</label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed description of the competitive challenge..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Start Time (UTC) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">End Time (UTC) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Rules & Regulations</label>
                  <textarea
                    rows={2}
                    value={rules}
                    onChange={(e) => setRules(e.target.value)}
                    placeholder="Code requirements, anti-plagiarism rules..."
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Prizes & Awards</label>
                  <textarea
                    rows={2}
                    value={prizes}
                    onChange={(e) => setPrizes(e.target.value)}
                    placeholder="Cash awards, fellowships, certificates..."
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700">Max Participants</label>
                <input
                  type="number"
                  min={10}
                  max={5000}
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-xl bg-teal px-5 py-2 text-xs font-semibold text-white hover:opacity-90 shadow-sm"
                >
                  {createMutation.isPending ? "Creating..." : "Publish Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

