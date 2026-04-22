"use client";

// Mirrors design_handoff_sellfree_landing/components/PortalPhotos.jsx 1:1.
// Placeholder: no backend, no real uploads — File objects are peeked for
// name/size then represented as gradient thumbnails. Mode + rooms persist
// via localStorage so the placeholder feels continuous across reloads.

import { useEffect, useRef, useState } from "react";
import type { PortalData } from "./portal-data";

type Room = { id: string; label: string; group: string; hint: string };
type Shot = {
  id: string;
  name: string;
  size: number;
  grad: [string, string];
};
type RoomBuckets = Record<string, Shot[]>;

const DEFAULT_ROOMS: Room[] = [
  { id: "kitchen", label: "Kitchen", group: "Main", hint: "3–5 photos · wide angle + details" },
  { id: "living", label: "Living room", group: "Main", hint: "Wide shot + 1–2 corners" },
  { id: "dining", label: "Dining area", group: "Main", hint: "Optional if open-plan" },
  { id: "primary-bed", label: "Primary bedroom", group: "Bedrooms", hint: "Wide + closet" },
  { id: "bed-2", label: "Bedroom 2", group: "Bedrooms", hint: "Wide shot" },
  { id: "bed-3", label: "Bedroom 3", group: "Bedrooms", hint: "Wide shot" },
  { id: "primary-bath", label: "Primary bath", group: "Bathrooms", hint: "Wide + vanity detail" },
  { id: "bath-2", label: "Bathroom 2", group: "Bathrooms", hint: "Single wide" },
  { id: "front", label: "Front exterior", group: "Outside", hint: "Curb view in daylight" },
  { id: "back", label: "Backyard", group: "Outside", hint: "Wide + any features" },
  { id: "garage", label: "Garage", group: "Outside", hint: "Optional" },
  { id: "misc", label: "Misc / features", group: "Outside", hint: "Pool, bar, office, etc" },
];

const SAMPLE_GRADS: Array<[string, string]> = [
  ["oklch(0.72 0.08 40)", "oklch(0.55 0.06 50)"],
  ["oklch(0.78 0.06 80)", "oklch(0.62 0.05 100)"],
  ["oklch(0.68 0.07 220)", "oklch(0.48 0.06 260)"],
  ["oklch(0.75 0.09 150)", "oklch(0.58 0.07 170)"],
  ["oklch(0.82 0.06 60)", "oklch(0.66 0.08 30)"],
  ["oklch(0.72 0.08 320)", "oklch(0.54 0.07 300)"],
];

function pickGrad(): [string, string] {
  return SAMPLE_GRADS[Math.floor(Math.random() * SAMPLE_GRADS.length)];
}

type ProBooking = {
  date: string;
  time: string;
  notes: string;
  booked: string;
} | null;

type Mode = "entry" | "guided" | "bulk" | "pro";

export function PhotosSection({ data }: { data: PortalData }) {
  const [mode, setMode] = useState<Mode>("entry");
  const [photos, setPhotos] = useState<RoomBuckets>({});
  const [proBooking, setProBooking] = useState<ProBooking>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once on mount to avoid SSR/CSR mismatch.
  useEffect(() => {
    try {
      const m = localStorage.getItem("sellfree:photos:mode");
      if (m === "entry" || m === "guided" || m === "bulk" || m === "pro") {
        setMode(m);
      }
    } catch {}
    try {
      setPhotos(JSON.parse(localStorage.getItem("sellfree:photos:rooms") || "{}"));
    } catch {}
    try {
      setProBooking(JSON.parse(localStorage.getItem("sellfree:photos:pro") || "null"));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem("sellfree:photos:mode", mode); } catch {}
  }, [mode, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem("sellfree:photos:rooms", JSON.stringify(photos)); } catch {}
  }, [photos, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem("sellfree:photos:pro", JSON.stringify(proBooking)); } catch {}
  }, [proBooking, hydrated]);

  const totalPhotos = Object.values(photos).reduce(
    (a, arr) => a + (arr?.length || 0),
    0,
  );

  if (mode === "entry")
    return (
      <PhotosEntry
        onPick={setMode}
        totalPhotos={totalPhotos}
        proBooking={proBooking}
      />
    );
  if (mode === "guided")
    return (
      <PhotosGuided
        photos={photos}
        setPhotos={setPhotos}
        onBack={() => setMode("entry")}
        total={totalPhotos}
      />
    );
  if (mode === "bulk")
    return (
      <PhotosBulk
        photos={photos}
        setPhotos={setPhotos}
        onBack={() => setMode("entry")}
        total={totalPhotos}
      />
    );
  return (
    <PhotosPro
      booking={proBooking}
      setBooking={setProBooking}
      onBack={() => setMode("entry")}
    />
  );
}

function PhotosEntry({
  onPick,
  totalPhotos,
  proBooking,
}: {
  onPick: (m: Mode) => void;
  totalPhotos: number;
  proBooking: ProBooking;
}) {
  return (
    <div className="portal-section">
      <div className="portal-section-head">
        <div>
          <div className="eyebrow">Photos · before listing goes live</div>
          <h1 className="portal-h1">How should we photograph your home?</h1>
          <p className="portal-lede">
            Pro photos sell homes ~32% faster. Pick a path — we&apos;ll guide
            you through it. You can switch anytime before listing goes live.
          </p>
        </div>
        <div className="portal-head-chip">
          {totalPhotos > 0
            ? `${totalPhotos} uploaded`
            : proBooking
            ? `Pro shoot booked ${proBooking.date}`
            : "Not started"}
        </div>
      </div>

      <div className="photos-entry-grid">
        <button className="photo-path-card photo-path-pro" onClick={() => onPick("pro")}>
          <div className="photo-path-ribbon">Included with your plan</div>
          <div className="photo-path-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7h3l2-2h6l2 2h3a1 1 0 011 1v11a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </div>
          <div className="photo-path-name">Book a pro photographer</div>
          <p className="photo-path-desc">
            A local pro comes by for a 60-minute shoot. 25+ retouched photos +
            3D tour delivered within 48 hours. Most sellers choose this.
          </p>
          <ul className="photo-path-points">
            <li>HDR interior + drone exterior</li>
            <li>3D Matterport walkthrough</li>
            <li>Retouched &amp; color-corrected</li>
            <li>Delivered in 48 hours</li>
          </ul>
          <div className="photo-path-foot">
            <span className="photo-path-tag">Recommended</span>
            <span className="photo-path-cta">Book shoot →</span>
          </div>
        </button>

        <button className="photo-path-card photo-path-guided" onClick={() => onPick("guided")}>
          <div className="photo-path-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 9l3-2 3 2 3-2 3 2 3-2 3 2v10H3V9z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d="M3 19h18M9 14h6" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </div>
          <div className="photo-path-name">Guided walkthrough</div>
          <p className="photo-path-desc">
            Upload your own photos, room by room. We&apos;ll tell you what shots
            to take, give framing tips, and auto-enhance before they go live.
          </p>
          <ul className="photo-path-points">
            <li>Room-by-room checklist</li>
            <li>Shot-type guidance per room</li>
            <li>AI auto-enhancement</li>
            <li>Free — do it on your schedule</li>
          </ul>
          <div className="photo-path-foot">
            <span
              className="photo-path-tag"
              style={{ background: "var(--bone-2)", color: "var(--ink)" }}
            >
              DIY
            </span>
            <span className="photo-path-cta">Start walkthrough →</span>
          </div>
        </button>

        <button className="photo-path-card photo-path-bulk" onClick={() => onPick("bulk")}>
          <div className="photo-path-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v10m0-10l-4 4m4-4l4 4M5 19h14"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="photo-path-name">Bulk upload</div>
          <p className="photo-path-desc">
            Already have photos ready? Drop them all at once. We&apos;ll
            auto-categorize them into rooms using our classifier.
          </p>
          <ul className="photo-path-points">
            <li>Drag-and-drop up to 100 at once</li>
            <li>Auto-sorted into rooms</li>
            <li>Manual edits after</li>
            <li>Fastest if photos already exist</li>
          </ul>
          <div className="photo-path-foot">
            <span
              className="photo-path-tag"
              style={{ background: "var(--bone-2)", color: "var(--ink)" }}
            >
              Fast
            </span>
            <span className="photo-path-cta">Upload all →</span>
          </div>
        </button>
      </div>

      <div className="photos-tip-strip">
        <div className="photos-tip-k">TIP</div>
        <div>
          <strong>Listings with pro photos sell 32% faster</strong> and for
          ~$3,400 more in your zip code (Austin MLS, 2024 data). Your plan{" "}
          <em>includes</em> a pro shoot — no extra fee.
        </div>
      </div>
    </div>
  );
}

function PhotosPro({
  booking,
  setBooking,
  onBack,
}: {
  booking: ProBooking;
  setBooking: (b: ProBooking) => void;
  onBack: () => void;
}) {
  const [date, setDate] = useState(booking ? "" : "");
  const [time, setTime] = useState(booking?.time || "10:00 AM");
  const [notes, setNotes] = useState(booking?.notes || "");
  const [confirmed, setConfirmed] = useState(!!booking);

  const days: Array<{ iso: string; label: string; num: number; month: string }> = [];
  const now = new Date();
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push({
      iso: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      num: d.getDate(),
      month: d.toLocaleDateString("en-US", { month: "short" }),
    });
  }
  const times = ["8:00 AM", "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM"];

  function confirm() {
    const d = days.find((x) => x.iso === date);
    setBooking({
      date: d ? `${d.month} ${d.num}` : date,
      time,
      notes,
      booked: new Date().toISOString(),
    });
    setConfirmed(true);
  }

  if (confirmed && booking) {
    return (
      <div className="portal-section">
        <button className="photo-backlink" onClick={onBack}>← Photos</button>
        <div className="portal-section-head">
          <div>
            <div className="eyebrow">Photo shoot · confirmed</div>
            <h1 className="portal-h1">You&apos;re booked.</h1>
            <p className="portal-lede">
              Mateo Alvarez, your local pro, will be at your door on {booking.date}{" "}
              at {booking.time}. Expect ~60 minutes.
            </p>
          </div>
          <div
            className="portal-head-chip"
            style={{
              background: "var(--lime)",
              borderColor: "var(--lime-deep)",
              color: "var(--ink)",
            }}
          >
            <span className="dot-blink" /> Confirmed
          </div>
        </div>

        <div className="pro-confirm-card">
          <div className="pro-confirm-photographer">
            <div className="pro-avatar" style={{ background: "oklch(0.72 0.1 40)" }}>MA</div>
            <div>
              <div className="eyebrow">Your photographer</div>
              <div className="pro-confirm-name">Mateo Alvarez</div>
              <div className="pro-confirm-meta">8 yrs · 420+ Austin homes · 4.98 ★</div>
            </div>
          </div>
          <div className="pro-confirm-meta-grid">
            <div><div className="tc-k">Date</div><div className="tc-v">{booking.date}</div></div>
            <div><div className="tc-k">Arrival</div><div className="tc-v">{booking.time}</div></div>
            <div><div className="tc-k">Duration</div><div className="tc-v">~60 min</div></div>
            <div><div className="tc-k">Delivered</div><div className="tc-v">48 hrs after</div></div>
          </div>
          <div className="pro-confirm-actions">
            <button className="btn btn-dark" onClick={() => setConfirmed(false)}>Reschedule</button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setBooking(null);
                setConfirmed(false);
                onBack();
              }}
            >
              Cancel booking
            </button>
          </div>
        </div>

        <div className="portal-card">
          <div className="portal-card-head">
            <div>
              <div className="eyebrow">Before Mateo arrives</div>
              <h3>A short prep checklist</h3>
            </div>
          </div>
          <ol className="pro-checklist">
            <li><span>1</span><div><strong>Declutter counters + surfaces</strong><p>Kitchen counters, bathroom vanities, coffee tables. Less is more.</p></div></li>
            <li><span>2</span><div><strong>Open all curtains &amp; blinds</strong><p>Natural light is everything. Mateo will also bring 2 flashes.</p></div></li>
            <li><span>3</span><div><strong>Hide personal items</strong><p>Family photos, prescriptions, pet bowls. Put them in a drawer for the hour.</p></div></li>
            <li><span>4</span><div><strong>Turn on every light in the house</strong><p>Even in rooms that won&apos;t be shot — glow in the background looks great.</p></div></li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-section">
      <button className="photo-backlink" onClick={onBack}>← Photos</button>
      <div className="portal-section-head">
        <div>
          <div className="eyebrow">Book pro photographer · included with plan</div>
          <h1 className="portal-h1">Pick a time.</h1>
          <p className="portal-lede">
            We&apos;ll send Mateo Alvarez — local, 420+ shoots, highest-rated in
            Austin. He&apos;ll bring equipment for drone + 3D tour.
          </p>
        </div>
      </div>

      <div className="pro-book-grid">
        <div className="portal-card">
          <div className="eyebrow">Select a date</div>
          <div className="pro-dates">
            {days.map((d) => (
              <button
                key={d.iso}
                className={"pro-date " + (date === d.iso ? "sel" : "")}
                onClick={() => setDate(d.iso)}
              >
                <div className="pro-date-dow">{d.label}</div>
                <div className="pro-date-num">{d.num}</div>
                <div className="pro-date-mon">{d.month}</div>
              </button>
            ))}
          </div>

          <div className="eyebrow" style={{ marginTop: 28 }}>Arrival time</div>
          <div className="pro-times">
            {times.map((t) => (
              <button
                key={t}
                className={"pro-time " + (time === t ? "sel" : "")}
                onClick={() => setTime(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="eyebrow" style={{ marginTop: 28 }}>Notes for Mateo (optional)</div>
          <textarea
            className="pro-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Parking quirks, pets, rooms to skip, gate code..."
            rows={3}
          />

          <button
            className="btn btn-dark"
            style={{ width: "100%", justifyContent: "center", marginTop: 20 }}
            onClick={confirm}
            disabled={!date}
          >
            {date
              ? `Confirm ${days.find((x) => x.iso === date)?.label} at ${time}`
              : "Pick a date to continue"}
          </button>
        </div>

        <div>
          <div
            className="portal-card"
            style={{
              background: "var(--ink)",
              color: "var(--bone)",
              borderColor: "var(--ink)",
            }}
          >
            <div className="pro-photographer">
              <div className="pro-avatar" style={{ background: "oklch(0.72 0.1 40)" }}>MA</div>
              <div>
                <div className="eyebrow" style={{ color: "var(--lime-deep)" }}>Your photographer</div>
                <div className="pro-confirm-name">Mateo Alvarez</div>
              </div>
            </div>
            <div className="pro-stats">
              <div><div className="ppn" style={{ fontSize: 28 }}>420+</div><div className="ppk">Austin shoots</div></div>
              <div><div className="ppn" style={{ fontSize: 28 }}>4.98</div><div className="ppk">Avg rating</div></div>
              <div><div className="ppn" style={{ fontSize: 28 }}>48h</div><div className="ppk">Turnaround</div></div>
            </div>
            <div className="pro-specs">
              <div>✓ Sony A7R V — 61MP full-frame</div>
              <div>✓ DJI Mavic 3 drone (licensed)</div>
              <div>✓ Matterport Pro3 3D scanner</div>
              <div>✓ 2 portable HDR flashes</div>
            </div>
          </div>

          <div className="pro-price-card">
            <div>
              <div className="eyebrow">Shoot cost</div>
              <div className="pro-price-line">
                <span style={{ textDecoration: "line-through", color: "var(--muted)" }}>$495</span>{" "}
                <strong>Included</strong>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Part of your Full-Service Lite plan
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhotosGuided({
  photos,
  setPhotos,
  onBack,
  total,
}: {
  photos: RoomBuckets;
  setPhotos: React.Dispatch<React.SetStateAction<RoomBuckets>>;
  onBack: () => void;
  total: number;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const groups = Array.from(new Set(DEFAULT_ROOMS.map((r) => r.group)));

  function addPhotosTo(roomId: string, files: FileList | File[] | null) {
    const list = files ? Array.from(files) : [];
    const shots: Shot[] = list.map((f, i) => ({
      id: `${roomId}-${Date.now()}-${i}`,
      name: (f as File).name,
      size: (f as File).size,
      grad: pickGrad(),
    }));
    setPhotos((prev) => ({ ...prev, [roomId]: [...(prev[roomId] || []), ...shots] }));
  }
  function removePhoto(roomId: string, photoId: string) {
    setPhotos((prev) => ({
      ...prev,
      [roomId]: (prev[roomId] || []).filter((p) => p.id !== photoId),
    }));
  }
  function addDemo(roomId: string) {
    const n = 2 + Math.floor(Math.random() * 2);
    const shots: Shot[] = Array.from({ length: n }, (_, i) => ({
      id: `${roomId}-${Date.now()}-${i}`,
      name: `demo-${i}.jpg`,
      size: 2_400_000,
      grad: pickGrad(),
    }));
    setPhotos((prev) => ({ ...prev, [roomId]: [...(prev[roomId] || []), ...shots] }));
  }

  const pct = Math.round(
    (DEFAULT_ROOMS.filter((r) => (photos[r.id] || []).length > 0).length /
      DEFAULT_ROOMS.length) *
      100,
  );

  return (
    <div className="portal-section">
      <button className="photo-backlink" onClick={onBack}>← Photos</button>
      <div className="portal-section-head">
        <div>
          <div className="eyebrow">Guided walkthrough · room by room</div>
          <h1 className="portal-h1">Which room first?</h1>
          <p className="portal-lede">
            Start anywhere. We&apos;ll walk you through shots per room with
            framing tips. You can pause and come back — your progress saves
            automatically.
          </p>
        </div>
        <div className="photos-progress-chip">
          <div className="photos-progress-wrap">
            <div className="photos-progress-fill" style={{ width: pct + "%" }} />
          </div>
          <span>{total} photos · {pct}%</span>
        </div>
      </div>

      {groups.map((group) => {
        const rooms = DEFAULT_ROOMS.filter((r) => r.group === group);
        return (
          <div key={group} className="photos-group">
            <h3 className="photos-group-title">{group}</h3>
            <div className="photos-rooms">
              {rooms.map((room) => {
                const shots = photos[room.id] || [];
                return (
                  <div
                    key={room.id}
                    className={"photo-room-row " + (shots.length > 0 ? "has-shots" : "")}
                  >
                    <div className="photo-room-head">
                      <div>
                        <div className="photo-room-name">{room.label}</div>
                        <div className="photo-room-hint">{room.hint}</div>
                      </div>
                      <div className="photo-room-actions">
                        {shots.length > 0 && (
                          <button
                            className="photo-room-edit"
                            onClick={() => setOpen(open === room.id ? null : room.id)}
                            aria-label="Manage photos"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path
                                d="M15 4l5 5L9 20H4v-5L15 4z"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        )}
                        <button
                          className="photo-room-add"
                          onClick={() => setOpen(room.id)}
                        >
                          <span>+</span> {shots.length > 0 ? `Add to ${room.label.toLowerCase()}` : room.label}
                        </button>
                      </div>
                    </div>

                    {shots.length > 0 && (
                      <div className="photo-room-thumbs">
                        {shots.map((s, i) => (
                          <div
                            key={s.id}
                            className="photo-thumb"
                            style={{ background: `linear-gradient(135deg, ${s.grad[0]}, ${s.grad[1]})` }}
                          >
                            <span className="photo-thumb-n">{i + 1}</span>
                            {open === room.id && (
                              <button
                                className="photo-thumb-x"
                                onClick={() => removePhoto(room.id, s.id)}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {open === room.id && (
                      <RoomUploader
                        room={room}
                        existing={shots.length}
                        onFiles={(files) => addPhotosTo(room.id, files)}
                        onDemo={() => addDemo(room.id)}
                        onClose={() => setOpen(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="photos-complete-bar">
        <div>
          <div className="eyebrow">When you&apos;re done</div>
          <div
            style={{
              fontFamily: "var(--sf-font-display)",
              fontSize: 22,
              lineHeight: 1.1,
              marginTop: 4,
            }}
          >
            {total >= 12
              ? "Nice — you have enough to go live."
              : `Add ${Math.max(0, 12 - total)} more photos to meet our minimum.`}
          </div>
        </div>
        <button className="btn btn-dark" disabled={total < 12}>
          Submit photos for review
        </button>
      </div>
    </div>
  );
}

function RoomUploader({
  room,
  existing,
  onFiles,
  onDemo,
  onClose,
}: {
  room: Room;
  existing: number;
  onFiles: (files: FileList | null) => void;
  onDemo: () => void;
  onClose: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [drag, setDrag] = useState(false);

  const tips: Record<string, string[]> = {
    kitchen: [
      "Shoot from the doorway, widest angle",
      "Counters empty — hide small appliances",
      "One detail shot: range or island",
      "Lights on, including under-cabinet",
    ],
    living: [
      "Stand in doorway, corner to corner",
      "Sofa should be centered or rule-of-thirds",
      "Fluff pillows, fold throws",
      "Remove remotes and cables",
    ],
    dining: [
      "Include table fully in frame",
      "Table set (or cleared — not half-full)",
      "Show connection to kitchen if open",
    ],
    "primary-bed": [
      "Shoot from doorway corner",
      "Bed made, pillows standing",
      "Show closet interior if walk-in",
    ],
    "primary-bath": [
      "Stand in doorway, wide",
      "Mirror shows no people",
      "Towels folded, counters clear",
      "Detail: vanity or shower tile",
    ],
    front: [
      "Shoot from sidewalk — don't cut off roof",
      "Mid-morning or golden hour",
      "Cars out of driveway",
      "Include mailbox / house number",
    ],
    back: [
      "Widest possible angle",
      "Patio furniture arranged",
      "Pool: shoot across water toward house",
    ],
  };
  const defaultTips = [
    "Wide-angle, horizontal format",
    "Natural light — blinds open",
    "Remove personal items from frame",
    "Take 2–3 angles, pick the best later",
  ];
  const showTips = tips[room.id] || defaultTips;

  return (
    <div className="room-uploader">
      <div className="room-uploader-grid">
        <div
          className={"room-dropzone " + (drag ? "drag" : "")}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            onFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => onFiles(e.target.files)}
          />
          <div className="room-dropzone-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3M12 4v12m0-12l-4 4m4-4l4 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="room-dropzone-title">
            Drop photos of your {room.label.toLowerCase()}
          </div>
          <div className="room-dropzone-sub">
            or click to browse · JPG, PNG, HEIC up to 40MB each
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 14,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <span className="chip-mini">Camera roll</span>
            <span className="chip-mini">iCloud</span>
            <span className="chip-mini">Google Photos</span>
          </div>
        </div>

        <div className="room-tips">
          <div className="eyebrow">Shot tips · {room.label}</div>
          <ol className="room-tips-list">
            {showTips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
          <button className="room-demo-btn" onClick={onDemo}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 3v18l15-9L5 3z" fill="currentColor" />
            </svg>
            Add demo photos (for preview)
          </button>
        </div>
      </div>

      <div className="room-uploader-foot">
        <span>{existing} uploaded · min 2 per room recommended</span>
        <button className="btn btn-ghost" onClick={onClose}>
          Done with {room.label.toLowerCase()}
        </button>
      </div>
    </div>
  );
}

function PhotosBulk({
  photos,
  setPhotos,
  onBack,
  total,
}: {
  photos: RoomBuckets;
  setPhotos: React.Dispatch<React.SetStateAction<RoomBuckets>>;
  onBack: () => void;
  total: number;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [drag, setDrag] = useState(false);
  const [classifying, setClassifying] = useState(false);

  function handleFiles(files: FileList | File[] | null) {
    if (!files || (files as FileList).length === undefined) return;
    const arr = Array.from(files as FileList | File[]);
    if (!arr.length) return;
    setClassifying(true);
    setTimeout(() => {
      const buckets: RoomBuckets = {};
      arr.forEach((f, i) => {
        const room = DEFAULT_ROOMS[i % DEFAULT_ROOMS.length].id;
        if (!buckets[room]) buckets[room] = [];
        buckets[room].push({
          id: `bulk-${Date.now()}-${i}`,
          name: (f as File).name,
          size: (f as File).size ?? 0,
          grad: pickGrad(),
        });
      });
      setPhotos((prev) => {
        const next = { ...prev };
        Object.keys(buckets).forEach((k) => {
          next[k] = [...(next[k] || []), ...buckets[k]];
        });
        return next;
      });
      setClassifying(false);
    }, 1400);
  }
  function addDemoBatch() {
    const fakes = Array.from({ length: 18 }, (_, i) => ({
      name: `demo-${i}.jpg`,
      size: 2_400_000,
    }));
    handleFiles(fakes as unknown as File[]);
  }

  return (
    <div className="portal-section">
      <button className="photo-backlink" onClick={onBack}>← Photos</button>
      <div className="portal-section-head">
        <div>
          <div className="eyebrow">Bulk upload · auto-classify</div>
          <h1 className="portal-h1">Drop everything at once.</h1>
          <p className="portal-lede">
            Our classifier will sort them into rooms (kitchen, bedrooms, bath,
            exterior, etc). You can re-label anything that&apos;s wrong.
          </p>
        </div>
      </div>

      <div
        className={
          "bulk-drop " + (drag ? "drag " : "") + (classifying ? "classifying " : "")
        }
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !classifying && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        {classifying ? (
          <>
            <div className="bulk-drop-icon">
              <div
                className="pl-spinner"
                style={{ width: 32, height: 32, borderWidth: 3 }}
              />
            </div>
            <div className="bulk-drop-title">Sorting your photos into rooms...</div>
            <div className="bulk-drop-sub">
              Running our room classifier. Takes about a second per photo.
            </div>
          </>
        ) : (
          <>
            <div className="bulk-drop-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3M12 4v12m0-12l-4 4m4-4l4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="bulk-drop-title">Drag photos anywhere in this box</div>
            <div className="bulk-drop-sub">
              or click to browse · up to 100 photos, HEIC/JPG/PNG up to 40MB each
            </div>
            <button
              className="btn btn-ghost"
              style={{ marginTop: 18 }}
              onClick={(e) => {
                e.stopPropagation();
                addDemoBatch();
              }}
            >
              + Add 18 demo photos
            </button>
          </>
        )}
      </div>

      {total > 0 && (
        <div className="portal-card">
          <div className="portal-card-head">
            <div>
              <div className="eyebrow">Auto-classified — review + adjust</div>
              <h3>Your {total} photos, sorted</h3>
            </div>
            <button className="doc-action" onClick={() => setPhotos({})}>
              Clear all
            </button>
          </div>
          <div className="bulk-rooms">
            {DEFAULT_ROOMS.filter((r) => (photos[r.id] || []).length > 0).map((room) => {
              const shots = photos[room.id] || [];
              return (
                <div key={room.id} className="bulk-room">
                  <div className="bulk-room-head">
                    <div className="bulk-room-name">{room.label}</div>
                    <div className="bulk-room-count">
                      {shots.length} photo{shots.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="photo-room-thumbs">
                    {shots.map((s, i) => (
                      <div
                        key={s.id}
                        className="photo-thumb"
                        style={{ background: `linear-gradient(135deg, ${s.grad[0]}, ${s.grad[1]})` }}
                      >
                        <span className="photo-thumb-n">{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
