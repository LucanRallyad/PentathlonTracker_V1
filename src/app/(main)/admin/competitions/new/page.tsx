"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { DISCIPLINE_NAMES } from "@/lib/scoring/constants";

const AGE_CATEGORIES = ["U9", "U11", "U13", "U15", "U17", "U19", "Junior", "Senior", "Masters"];
const COMPETITION_TYPES = ["Individual", "Relay", "Team"];
const DISCIPLINES = ["fencing_ranking", "fencing_de", "obstacle", "swimming", "laser_run", "riding"];

export default function NewCompetitionPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    date: "",
    endDate: "",
    location: "",
    description: "",
  });
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["Individual"]);
  const [selectedAgeCategories, setSelectedAgeCategories] = useState<string[]>(["Senior"]);
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([
    "fencing_ranking",
    "fencing_de",
    "obstacle",
    "swimming",
    "laser_run",
  ]);
  const [eventSchedules, setEventSchedules] = useState<Record<string, { scheduledStart: string; dayLabel: string }>>({
    fencing_ranking: { scheduledStart: "", dayLabel: "" },
    fencing_de: { scheduledStart: "", dayLabel: "" },
    obstacle: { scheduledStart: "", dayLabel: "" },
    swimming: { scheduledStart: "", dayLabel: "" },
    laser_run: { scheduledStart: "", dayLabel: "" },
  });
  const [saving, setSaving] = useState(false);

  const toggleType = (t: string) => {
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const selectAllTypes = () => setSelectedTypes([...COMPETITION_TYPES]);
  const clearAllTypes = () => setSelectedTypes([]);

  const toggleAgeCategory = (cat: string) => {
    setSelectedAgeCategories((prev) =>
      prev.includes(cat) ? prev.filter((x) => x !== cat) : [...prev, cat]
    );
  };

  const selectAllAges = () => setSelectedAgeCategories([...AGE_CATEGORIES]);
  const clearAllAges = () => setSelectedAgeCategories([]);

  const toggleDiscipline = (d: string) => {
    setSelectedDisciplines((prev) => {
      const newSelected = prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d];
      // Initialize schedule for newly added disciplines
      if (!prev.includes(d)) {
        setEventSchedules((schedules) => ({
          ...schedules,
          [d]: { scheduledStart: "", dayLabel: "" },
        }));
      } else {
        // Remove schedule when discipline is removed
        setEventSchedules((schedules) => {
          const { [d]: _, ...rest } = schedules;
          return rest;
        });
      }
      return newSelected;
    });
  };

  const updateEventSchedule = (discipline: string, field: "scheduledStart" | "dayLabel", value: string) => {
    setEventSchedules((prev) => ({
      ...prev,
      [discipline]: {
        ...prev[discipline],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedTypes.length === 0) {
      alert("Please select at least one competition type.");
      return;
    }
    if (selectedAgeCategories.length === 0) {
      alert("Please select at least one age category.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          competitionType: selectedTypes.join(","),
          ageCategory: selectedAgeCategories.join(","),
        }),
      });
      const competition = await res.json();

      // Create events
      for (let i = 0; i < selectedDisciplines.length; i++) {
        const discipline = selectedDisciplines[i];
        const schedule = eventSchedules[discipline] || {};
        await fetch(`/api/competitions/${competition.id}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            discipline,
            sortOrder: i + 1,
            status: "pending",
            scheduledStart: schedule.scheduledStart || null,
            dayLabel: schedule.dayLabel || null,
          }),
        });
      }

      router.push(`/admin`);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TopNav
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Admin", href: "/admin" },
          { label: "New Competition" },
        ]}
      />
      <div className="max-w-[600px] mx-auto px-6 py-12">
        <h1 className="text-[40px] font-bold text-[#37352F] tracking-tight mb-8 leading-tight">
          New Competition
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Field label="Competition Name" required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field"
              placeholder="Calgary Open 2026"
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date" required>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="input-field"
                required
              />
            </Field>
            <Field label="End Date" required>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="input-field"
                required
              />
            </Field>
          </div>

          <Field label="Location" required>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="input-field"
              placeholder="Calgary, AB"
              required
            />
          </Field>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field min-h-[80px] resize-y"
              placeholder="Optional description..."
            />
          </Field>

          <Field label="Competition Type" required>
            <div className="border border-[#E9E9E7] rounded-[3px] p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-[#9B9A97]">
                  {selectedTypes.length} of {COMPETITION_TYPES.length} selected
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllTypes}
                    className="text-[11px] text-[#0B6E99] hover:text-[#095a7d] transition-colors"
                  >
                    Select all
                  </button>
                  <span className="text-[#D3D1CB]">·</span>
                  <button
                    type="button"
                    onClick={clearAllTypes}
                    className="text-[11px] text-[#787774] hover:text-[#37352F] transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="flex gap-x-6 gap-y-1.5">
                {COMPETITION_TYPES.map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer py-0.5">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(t)}
                      onChange={() => toggleType(t)}
                      className="rounded border-[#E9E9E7] text-[#0B6E99] focus:ring-[#0B6E99]"
                    />
                    <span className="text-sm text-[#37352F]">{t}</span>
                  </label>
                ))}
              </div>
            </div>
          </Field>

          <Field label="Age Categories" required>
            <div className="border border-[#E9E9E7] rounded-[3px] p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-[#9B9A97]">
                  {selectedAgeCategories.length} of {AGE_CATEGORIES.length} selected
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllAges}
                    className="text-[11px] text-[#0B6E99] hover:text-[#095a7d] transition-colors"
                  >
                    Select all
                  </button>
                  <span className="text-[#D3D1CB]">·</span>
                  <button
                    type="button"
                    onClick={clearAllAges}
                    className="text-[11px] text-[#787774] hover:text-[#37352F] transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-x-4 gap-y-1.5">
                {AGE_CATEGORIES.map((cat) => (
                  <label key={cat} className="flex items-center gap-2 cursor-pointer py-0.5">
                    <input
                      type="checkbox"
                      checked={selectedAgeCategories.includes(cat)}
                      onChange={() => toggleAgeCategory(cat)}
                      className="rounded border-[#E9E9E7] text-[#0B6E99] focus:ring-[#0B6E99]"
                    />
                    <span className="text-sm text-[#37352F]">{cat}</span>
                  </label>
                ))}
              </div>
            </div>
          </Field>

          <Field label="Events">
            <div className="space-y-2">
              {DISCIPLINES.map((d) => (
                <label key={d} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDisciplines.includes(d)}
                    onChange={() => toggleDiscipline(d)}
                    className="rounded border-[#E9E9E7] text-[#0B6E99] focus:ring-[#0B6E99]"
                  />
                  <span className="text-sm text-[#37352F]">
                    {DISCIPLINE_NAMES[d]}
                    {d === "riding" && <span className="text-xs text-[#9B9A97] ml-1">(Masters only)</span>}
                  </span>
                </label>
              ))}
            </div>
          </Field>

          {selectedDisciplines.length > 0 && (
            <Field label="Event Schedule">
              <div className="border border-[#E9E9E7] rounded-[3px] divide-y divide-[#E9E9E7]">
                {selectedDisciplines.map((discipline) => (
                  <div key={discipline} className="p-4 space-y-3">
                    <div className="font-medium text-sm text-[#37352F] mb-2">
                      {DISCIPLINE_NAMES[discipline]}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-[#787774] mb-1">
                          Scheduled Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={eventSchedules[discipline]?.scheduledStart || ""}
                          onChange={(e) => updateEventSchedule(discipline, "scheduledStart", e.target.value)}
                          className="input-field text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#787774] mb-1">
                          Day Label <span className="text-[#9B9A97]">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={eventSchedules[discipline]?.dayLabel || ""}
                          onChange={(e) => updateEventSchedule(discipline, "dayLabel", e.target.value)}
                          className="input-field text-sm"
                          placeholder="e.g., Saturday, February 8"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#9B9A97] mt-1.5">
                Schedule times are optional and can be added or updated later.
              </p>
            </Field>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-[#0B6E99] rounded-[3px] hover:bg-[#095a7d] transition-colors disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Competition"}
          </button>
        </form>
      </div>

      <style jsx>{`
        .input-field {
          width: 100%;
          padding: 8px 12px;
          font-size: 14px;
          border: 1px solid #E9E9E7;
          border-radius: 3px;
          background: white;
          color: #37352F;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input-field:focus {
          border-color: #0B6E99;
          box-shadow: 0 0 0 2px rgba(11, 110, 153, 0.15);
        }
        .input-field::placeholder {
          color: #9B9A97;
        }
      `}</style>
    </>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#787774] mb-1">
        {label}
        {required && <span className="text-[#E03E3E] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
